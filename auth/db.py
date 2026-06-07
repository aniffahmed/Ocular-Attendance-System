"""SQLite auth tables (same DB file as attendance)."""
from __future__ import annotations

import sqlite3

DEPARTMENTS: list[tuple[str, str]] = [
    ("CSE", "Computer Science and Engineering"),
    ("IT", "Information Technology"),
    ("ECE", "Electronics and Communication Engineering"),
    ("EEE", "Electrical and Electronics Engineering"),
    ("MECH", "Mechanical Engineering"),
    ("CE", "Civil Engineering"),
    ("AI&DS", "Artificial Intelligence and Data Science"),
    ("MCA", "Master of Computer Applications"),
    ("MBA", "Master of Business Administration"),
]

SCHEDULE_BLOCKS: list[tuple[int, str, int | None, str, str, str]] = [
    (1, "period", 1, "Period 1", "09:00", "09:45"),
    (2, "period", 2, "Period 2", "09:45", "10:30"),
    (3, "break", None, "Break", "10:30", "10:45"),
    (4, "period", 3, "Period 3", "10:45", "11:30"),
    (5, "period", 4, "Period 4", "11:30", "12:15"),
    (6, "lunch", None, "Lunch", "12:15", "13:00"),
    (7, "period", 5, "Period 5", "13:00", "13:45"),
    (8, "period", 6, "Period 6", "13:45", "14:30"),
    (9, "break", None, "Break", "14:30", "14:45"),
    (10, "period", 7, "Period 7", "14:45", "15:30"),
    (11, "period", 8, "Period 8", "15:30", "16:15"),
]


def init_auth_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            date TEXT,
            time TEXT,
            department_code TEXT,
            period_number INTEGER
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (
                role IN ('institution', 'staff', 'student', 'parent')
            ),
            full_name TEXT,
            attendance_name TEXT,
            department_code TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS student_parent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_user_id INTEGER NOT NULL,
            parent_user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(student_user_id, parent_user_id),
            FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS parent_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_user_id INTEGER NOT NULL,
            student_user_id INTEGER NOT NULL,
            attendance_pct REAL NOT NULL,
            message TEXT NOT NULL,
            mock_email_json TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            read_flag INTEGER DEFAULT 0,
            FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_parent_alerts_parent ON parent_alerts(parent_user_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        CREATE TABLE IF NOT EXISTS attendance_policy (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            period_minutes INTEGER NOT NULL DEFAULT 45,
            required_percentage REAL NOT NULL DEFAULT 90.0,
            recognition_cooldown_seconds INTEGER NOT NULL DEFAULT 6,
            session_gap_tolerance_seconds INTEGER NOT NULL DEFAULT 20,
            updated_at TEXT DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO attendance_policy (
            id,
            period_minutes,
            required_percentage,
            recognition_cooldown_seconds,
            session_gap_tolerance_seconds
        ) VALUES (1, 45, 90.0, 6, 20);

        CREATE TABLE IF NOT EXISTS attendance_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            session_date TEXT NOT NULL,
            period_number INTEGER,
            department_code TEXT,
            class_section_id INTEGER,
            first_seen_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            active_seconds INTEGER NOT NULL DEFAULT 0,
            min_required_seconds INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
                status IN ('in_progress', 'present', 'partial_review', 'absent')
            ),
            review_required INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(name, session_date, period_number, department_code)
        );

        CREATE INDEX IF NOT EXISTS idx_attendance_sessions_lookup
        ON attendance_sessions(session_date, name, period_number);

        CREATE TABLE IF NOT EXISTS department_catalog (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS schedule_blocks (
            block_order INTEGER PRIMARY KEY,
            block_type TEXT NOT NULL CHECK (block_type IN ('period', 'break', 'lunch')),
            period_number INTEGER,
            label TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS class_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_code TEXT NOT NULL,
            batch_year INTEGER NOT NULL,
            section_name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(department_code, batch_year, section_name),
            FOREIGN KEY (department_code) REFERENCES department_catalog(code) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS class_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_section_id INTEGER NOT NULL,
            student_user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(class_section_id, student_user_id),
            FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE,
            FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS class_timetable (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_section_id INTEGER NOT NULL,
            weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
            period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 8),
            subject_name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(class_section_id, weekday, period_number),
            FOREIGN KEY (class_section_id) REFERENCES class_sections(id) ON DELETE CASCADE
        );
        """
    )

    columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(attendance_sessions)").fetchall()
    }
    if "reviewed_by_user_id" not in columns:
        conn.execute("ALTER TABLE attendance_sessions ADD COLUMN reviewed_by_user_id INTEGER")
    if "reviewed_note" not in columns:
        conn.execute("ALTER TABLE attendance_sessions ADD COLUMN reviewed_note TEXT")
    if "reviewed_at" not in columns:
        conn.execute("ALTER TABLE attendance_sessions ADD COLUMN reviewed_at TEXT")
    if "department_code" not in columns:
        conn.execute("ALTER TABLE attendance_sessions ADD COLUMN department_code TEXT")
    if "period_number" not in columns:
        conn.execute("ALTER TABLE attendance_sessions ADD COLUMN period_number INTEGER")
    if "class_section_id" not in columns:
        conn.execute("ALTER TABLE attendance_sessions ADD COLUMN class_section_id INTEGER")

    user_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(users)").fetchall()
    }
    if "user_code" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN user_code TEXT")
    if "department_code" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN department_code TEXT")
    conn.execute(
        """
        UPDATE users
        SET user_code = COALESCE(NULLIF(TRIM(user_code), ''), printf('USR-%06d', id))
        WHERE user_code IS NULL OR TRIM(user_code) = ''
        """
    )

    attendance_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(attendance)").fetchall()
    }
    if "department_code" not in attendance_columns:
        conn.execute("ALTER TABLE attendance ADD COLUMN department_code TEXT")
    if "period_number" not in attendance_columns:
        conn.execute("ALTER TABLE attendance ADD COLUMN period_number INTEGER")

    link_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(student_parent)").fetchall()
    }
    if "linked_at" not in link_columns:
        conn.execute("ALTER TABLE student_parent ADD COLUMN linked_at TEXT")
    conn.execute(
        """
        UPDATE student_parent
        SET linked_at = COALESCE(linked_at, created_at, datetime('now'))
        WHERE linked_at IS NULL
        """
    )

    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role_name_code ON users(role, full_name, user_code)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_users_department_code ON users(department_code)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_attendance_department_date ON attendance(department_code, date)")
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_attendance_ledger_filter
        ON attendance(date, department_code, period_number, name)
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_student_parent_student ON student_parent(student_user_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_student_parent_parent ON student_parent(parent_user_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_attendance_review_queue ON attendance_sessions(status, review_required, session_date)")
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_attendance_sessions_ledger
        ON attendance_sessions(session_date, department_code, period_number, name, status)
        """
    )

    conn.executemany(
        "INSERT OR IGNORE INTO department_catalog (code, name) VALUES (?, ?)",
        DEPARTMENTS,
    )
    conn.executemany(
        """
        INSERT OR IGNORE INTO schedule_blocks (
            block_order, block_type, period_number, label, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        SCHEDULE_BLOCKS,
    )
    conn.commit()


def user_count(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()
    return int(row["c"]) if row else 0
