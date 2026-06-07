"""Parent attendance alerts: % below threshold → mock email payload stored in DB."""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timedelta
from typing import Any

# Rolling window: count distinct present days vs expected school days in that window.
WINDOW_DAYS = int(os.getenv("ATTENDANCE_WINDOW_DAYS", "30"))
EXPECTED_DAYS = int(os.getenv("ATTENDANCE_EXPECTED_DAYS", "20"))
THRESHOLD_PCT = float(os.getenv("ATTENDANCE_ALERT_THRESHOLD", "75"))


def _cutoff_date() -> str:
    d = datetime.utcnow().date() - timedelta(days=WINDOW_DAYS)
    return d.isoformat()


def attendance_percentage(conn: sqlite3.Connection, attendance_name: str) -> float:
    if not attendance_name:
        return 0.0
    cutoff = _cutoff_date()
    row = conn.execute(
        """
        SELECT COUNT(DISTINCT date) AS c
        FROM attendance
        WHERE name = ? AND date >= ?
        """,
        (attendance_name, cutoff),
    ).fetchone()
    present = int(row["c"] or 0) if row else 0
    if EXPECTED_DAYS <= 0:
        return 100.0
    return min(100.0, round((present / EXPECTED_DAYS) * 100.0, 2))


def run_attendance_alerts(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """
    For each student with parents linked, if pct < THRESHOLD, insert alert (dedupe last 7 days).
    Returns list of created mock payloads for logging.
    created: list[dict]
    """
    created: list[dict[str, Any]] = []
    students = conn.execute(
        """
        SELECT u.id, u.email, u.full_name, u.attendance_name
        FROM users u
        WHERE u.role = 'student' AND u.attendance_name IS NOT NULL AND u.attendance_name != ''
        """
    ).fetchall()

    for stu in students:
        sid = stu["id"]
        pct = attendance_percentage(conn, stu["attendance_name"])
        if pct >= THRESHOLD_PCT:
            continue

        parents = conn.execute(
            """
            SELECT u.id, u.email, u.full_name
            FROM student_parent sp
            JOIN users u ON u.id = sp.parent_user_id
            WHERE sp.student_user_id = ?
            """,
            (sid,),
        ).fetchall()

        for par in parents:
            dup = conn.execute(
                """
                SELECT 1 FROM parent_alerts
                WHERE parent_user_id = ? AND student_user_id = ?
                  AND datetime(created_at) >= datetime('now', '-7 days')
                LIMIT 1
                """,
                (par["id"], sid),
            ).fetchone()
            if dup:
                continue

            student_label = stu["attendance_name"].replace("_", " ").title()
            mock_email = {
                "to": par["email"],
                "subject": f"Ocular: Attendance notice for {student_label}",
                "body": (
                    f"Dear {par['full_name'] or 'Parent'},\n\n"
                    f"Student {student_label}'s attendance over the last {WINDOW_DAYS} days "
                    f"is approximately {pct}%, which is below the {THRESHOLD_PCT}% threshold "
                    f"(expected ~{EXPECTED_DAYS} session days in the monitoring window).\n\n"
                    "Please contact the institution if you have questions.\n\n"
                    "— Ocular Smart Attendance"
                ),
                "attendance_pct": pct,
                "student_attendance_name": stu["attendance_name"],
                "threshold_pct": THRESHOLD_PCT,
            }
            conn.execute(
                """
                INSERT INTO parent_alerts (parent_user_id, student_user_id, attendance_pct, message, mock_email_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    par["id"],
                    sid,
                    pct,
                    mock_email["body"],
                    json.dumps(mock_email),
                ),
            )
            created.append(mock_email)
    conn.commit()
    return created
