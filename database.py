"""
Database models and initialization for AI Reading Co-pilot
Uses SQLite for lightweight local storage
"""

import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

DATABASE_PATH = "reading_copilot.db"

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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')

        # Paragraphs table (New)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS paragraphs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text_id INTEGER NOT NULL,
                sequence INTEGER NOT NULL,
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
            CREATE INDEX IF NOT EXISTS idx_paragraphs_text_id ON paragraphs (text_id)
        ''')
        
        print("✅ Database initialized successfully")

# Initialize on import
if not os.path.exists(DATABASE_PATH):
    init_database()
