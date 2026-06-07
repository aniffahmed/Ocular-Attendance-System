import sqlite3
import logging
import os

logger = logging.getLogger(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "attendance.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    date TEXT,
    time TEXT,
    department_code TEXT,
    period_number INTEGER
)
""")

conn.commit()
conn.close()

logger.info("Database created successfully at %s", DB_PATH)
