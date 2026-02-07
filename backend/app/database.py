"""
Database models and initialization for AI Reading Co-pilot
Uses SQLite for lightweight local storage
"""

import sqlite3
import os
import re
from contextlib import contextmanager

# Prioritize environment variable, fallback to local file
DATABASE_PATH = os.getenv("DB_PATH", "reading_copilot_v3.db")

def get_db_connection():
    """Get a database connection with row factory"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # SQLite defaults foreign key checks to OFF per connection.
    # Enable it explicitly so ON DELETE CASCADE works reliably.
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager

def get_db():
    """Context manager for database connections"""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_database():
    """Initialize database tables"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                credits INTEGER DEFAULT 100,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Texts table (Simplified)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS texts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                scaffolding_data TEXT,  -- AI processed data as JSON
                reading_mode TEXT DEFAULT 'flow', -- flow | learn
                scaffold_level INTEGER DEFAULT 2,   -- 1, 2, 3
                vocab_level TEXT DEFAULT 'B1',      -- A1-C2
                current_paragraph_id INTEGER,       -- ID of last active paragraph
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        # Migration: Add columns if they don't exist
        try:
            cursor.execute('ALTER TABLE texts ADD COLUMN scaffolding_data TEXT')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE texts ADD COLUMN reading_mode TEXT DEFAULT "flow"')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE texts ADD COLUMN scaffold_level INTEGER DEFAULT 2')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE texts ADD COLUMN vocab_level TEXT DEFAULT "B1"')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE texts ADD COLUMN current_paragraph_id INTEGER')
        except sqlite3.OperationalError:
            pass

        # Migration: Add credits column to users if it doesn't exist
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 100')
            # Give existing users 100 credits
            cursor.execute('UPDATE users SET credits = 100 WHERE credits IS NULL')
        except sqlite3.OperationalError:
            pass

        # Sentences table (Replaced Paragraphs table)
        # Flat model: Text -> Sentences
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sentences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text_id INTEGER NOT NULL,
                sentence_index INTEGER NOT NULL, -- Global order in text
                paragraph_index INTEGER, -- Paragraph order in text
                sentence_in_paragraph INTEGER, -- Sentence order within paragraph
                content TEXT NOT NULL,
                translation TEXT,
                analysis_json TEXT, -- Stores keywords, insights as JSON
                source_engine TEXT, -- e.g. pymupdf
                segmentation_confidence REAL, -- 0.0 - 1.0
                FOREIGN KEY (text_id) REFERENCES texts (id) ON DELETE CASCADE
            )
        ''')

        # Migration: keep sentence metadata fields in sync with newer schema
        try:
            cursor.execute('ALTER TABLE sentences ADD COLUMN source_engine TEXT')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE sentences ADD COLUMN segmentation_confidence REAL')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE sentences ADD COLUMN paragraph_index INTEGER')
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute('ALTER TABLE sentences ADD COLUMN sentence_in_paragraph INTEGER')
        except sqlite3.OperationalError:
            pass

        # Backfill for legacy rows created before paragraph-level metadata existed.
        cursor.execute('''
            SELECT DISTINCT text_id
            FROM sentences
            WHERE paragraph_index IS NULL OR sentence_in_paragraph IS NULL
        ''')
        text_ids_to_backfill = [row[0] for row in cursor.fetchall()]

        def _paragraph_spans(content: str):
            if not content or not content.strip():
                return []

            spans = []
            segments = re.split(r'(\n\s*\n+)', content)
            offset = 0

            for seg in segments:
                if not seg:
                    continue

                if re.fullmatch(r'\n\s*\n+', seg):
                    offset += len(seg)
                    continue

                stripped = seg.strip()
                if stripped:
                    rel_start = seg.find(stripped)
                    start = offset + (rel_start if rel_start >= 0 else 0)
                    end = start + len(stripped)
                    spans.append((start, end))

                offset += len(seg)

            if not spans:
                stripped = content.strip()
                start = content.find(stripped)
                spans.append((start if start >= 0 else 0, (start if start >= 0 else 0) + len(stripped)))

            return spans

        for text_id in text_ids_to_backfill:
            cursor.execute("SELECT content FROM texts WHERE id = ?", (text_id,))
            text_row = cursor.fetchone()
            if not text_row:
                continue

            text_content = text_row[0] or ""
            spans = _paragraph_spans(text_content)
            if not spans:
                spans = [(0, max(len(text_content), 1))]

            cursor.execute(
                "SELECT id, content FROM sentences WHERE text_id = ? ORDER BY sentence_index ASC",
                (text_id,)
            )
            sentence_rows = cursor.fetchall()

            search_cursor = 0
            fallback_paragraph_index = 0
            sentence_counter_by_paragraph = {}

            for sentence_id, sentence_content in sentence_rows:
                sentence_text = (sentence_content or "").strip()
                paragraph_index = fallback_paragraph_index

                if sentence_text and text_content:
                    pos = text_content.find(sentence_text, search_cursor)
                    if pos == -1:
                        pos = text_content.find(sentence_text)

                    if pos != -1:
                        search_cursor = pos + len(sentence_text)

                        matched_index = None
                        for idx, (start, end) in enumerate(spans):
                            if start <= pos < end:
                                matched_index = idx
                                break

                        if matched_index is None:
                            matched_index = 0 if pos < spans[0][0] else len(spans) - 1

                        paragraph_index = matched_index
                        fallback_paragraph_index = matched_index

                sentence_in_paragraph = sentence_counter_by_paragraph.get(paragraph_index, 0)
                sentence_counter_by_paragraph[paragraph_index] = sentence_in_paragraph + 1

                cursor.execute(
                    '''
                    UPDATE sentences
                    SET paragraph_index = ?, sentence_in_paragraph = ?
                    WHERE id = ?
                    ''',
                    (paragraph_index, sentence_in_paragraph, sentence_id)
                )
        
        # Create index for faster user lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_texts_user_id ON texts (user_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_sentences_text_id ON sentences (text_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_sentences_text_para_sent
            ON sentences (text_id, paragraph_index, sentence_in_paragraph)
        ''')
        
        print(f"✅ Database initialized successfully: {DATABASE_PATH}")

# Initialize on import for first-run local scripts.
if not os.path.exists(DATABASE_PATH):
    init_database()
