"""
Database models and initialization for AI Reading Co-pilot
Uses SQLite for lightweight local storage
"""

import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

# Prioritize environment variable, fallback to local file
DATABASE_PATH = os.getenv("DB_PATH", "reading_copilot_v3.db")

def get_db_connection():
    """Get a database connection with row factory"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
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
                content TEXT NOT NULL,
                translation TEXT,
                analysis_json TEXT, -- Stores keywords, insights as JSON
                FOREIGN KEY (text_id) REFERENCES texts (id) ON DELETE CASCADE
            )
        ''')
        
        # Create index for faster user lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_texts_user_id ON texts (user_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_sentences_text_id ON sentences (text_id)
        ''')
        
        print(f"✅ Database initialized successfully: {DATABASE_PATH}")

# Initialize on import
if not os.path.exists(DATABASE_PATH):
    init_database()
