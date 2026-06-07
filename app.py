import json
import logging
import os
import re
import sqlite3
import subprocess
import sys
import threading
import time
from datetime import datetime
from typing import Any, Optional

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import google.generativeai as genai

from auth.alerts import run_attendance_alerts
from auth.db import init_auth_tables, user_count
from auth.decorators import current_user_from_token, require_auth, require_roles
from auth.jwt_utils import create_access_token
from ml_services.capture_student import run_capture

# Load environment and configure module logger
load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "attendance.db")
RECOGNITION_SCRIPT = os.path.join(BASE_DIR, "recognition", "recognize_faces.py")
TRAIN_SCRIPT = os.path.join(BASE_DIR, "training", "train_svm.py")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# --- Phase 1: ML session state (single capture + single recognition process) ---
_ml_lock = threading.Lock()
_capture_thread: Optional[threading.Thread] = None
_capture_stop_event: Optional[threading.Event] = None
_recognition_process: Optional[subprocess.Popen] = None
_ml_last_message: str = ""
_train_thread: Optional[threading.Thread] = None


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _init_db() -> None:
    conn = get_db_connection()
    try:
        init_auth_tables(conn)
    finally:
        conn.close()


_init_db()


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def parse_iso_datetime(value: str | None) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def get_attendance_policy(conn: sqlite3.Connection) -> dict[str, Any]:
    row = conn.execute(
        """
        SELECT period_minutes, required_percentage, recognition_cooldown_seconds, session_gap_tolerance_seconds
        FROM attendance_policy
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return {
            "period_minutes": 45,
            "required_percentage": 90.0,
            "recognition_cooldown_seconds": 6,
            "session_gap_tolerance_seconds": 20,
        }
    out = dict(row)
    out["min_required_seconds"] = int(
        round(float(out["period_minutes"]) * 60.0 * float(out["required_percentage"]) / 100.0)
    )
    return out


def session_row_to_api(row: sqlite3.Row) -> dict[str, Any]:
    """Convert an `attendance_sessions` row to API-friendly fields.

    Args:
        row: sqlite3.Row from `attendance_sessions`.

    Returns:
        Dictionary with normalized time/duration fields used by the API.
    """
    d = dict(row)
    first_seen = parse_iso_datetime(d.get("first_seen_at"))
    last_seen = parse_iso_datetime(d.get("last_seen_at"))
    d["time"] = first_seen.strftime("%H:%M:%S") if first_seen else None
    d["duration_seconds"] = int(d.get("active_seconds") or 0)
    d["duration_minutes"] = round((int(d.get("active_seconds") or 0) / 60.0), 2)
    d["required_minutes"] = round((int(d.get("min_required_seconds") or 0) / 60.0), 2)
    d["first_seen"] = d.get("first_seen_at")
    d["last_seen"] = d.get("last_seen_at")
    if first_seen and last_seen:
        d["seen_window_seconds"] = max(0, int((last_seen - first_seen).total_seconds()))
    else:
        d["seen_window_seconds"] = 0
    return d


def legacy_attendance_row_to_api(row: sqlite3.Row) -> dict[str, Any]:
    """Convert a legacy `attendance` table row to the current API shape."""
    d = dict(row)
    d["status"] = "present"
    d["duration_seconds"] = None
    d["duration_minutes"] = None
    d["required_minutes"] = None
    d["review_required"] = 0
    d["first_seen"] = (
        f"{d.get('date')}T{d.get('time')}" if d.get("date") and d.get("time") else None
    )
    d["last_seen"] = d["first_seen"]
    return d


def normalize_department_code(raw_value: Any) -> Optional[str]:
    """Normalize a department code input to an uppercase string or None."""
    code = str(raw_value or "").strip().upper()
    return code or None


def department_exists(conn: sqlite3.Connection, code: Optional[str]) -> bool:
    """Check whether a department code exists in the catalog.

    A None or empty code is treated as valid (no-op).
    """
    if not code:
        return True
    row = conn.execute(
        "SELECT 1 FROM department_catalog WHERE code = ? LIMIT 1",
        (code,),
    ).fetchone()
    return row is not None


def resolve_period_from_time(conn: sqlite3.Connection, time_hhmm: str) -> Optional[int]:
    """Resolve a schedule period number for a HH:MM time string.

    Returns the period_number or None when no matching block is found.
    """
    row = conn.execute(
        """
        SELECT period_number
        FROM schedule_blocks
        WHERE block_type = 'period'
          AND period_number IS NOT NULL
          AND start_time <= ?
          AND end_time > ?
        ORDER BY block_order
        LIMIT 1
        """,
        (time_hhmm, time_hhmm),
    ).fetchone()
    return int(row["period_number"]) if row and row["period_number"] is not None else None


def make_attendance_name_seed(value: str) -> str:
    """Create a filesystem/label-safe seed from a user name or email.

    Falls back to the literal 'student' if the value yields an empty seed.
    """
    seed = re.sub(r"[^a-z0-9]+", "_", (value or "").strip().lower()).strip("_")
    return seed or "student"


def validate_sql(sql: str) -> tuple[bool, str]:
    """Simple validation for user-provided SQL from the chat assistant.

    Only a narrow whitelist of SELECT queries that reference `attendance`
    are allowed. This function returns (is_valid, error_message).
    """
    normalized = re.sub(r"\s+", " ", sql.strip()).lower()
    if not normalized.startswith("select "):
        return False, "Only SELECT queries are allowed."
    if " attendance " not in f" {normalized} ":
        return False, "Query must target the attendance table."
    blocked = ["insert ", "update ", "delete ", "drop ", "alter ", "pragma ", "attach "]
    if any(token in normalized for token in blocked):
        return False, "Unsafe SQL detected."
    return True, ""


def build_gemini_prompt(user_question: str) -> str:
    """Return a prompt instructing Gemini to produce SQLite SELECT queries."""
    return f"""
You are an assistant that converts natural language to SQLite SQL.

Database schema:
Table: attendance
Columns:
- id (INTEGER)
- name (TEXT)
- date (TEXT)
- time (TEXT)

Rules:
1) Return valid SQLite SELECT query only.
2) Never write INSERT/UPDATE/DELETE/ALTER/DROP.
3) Use only table/columns listed above.
4) If user provides a date like "March 16th", convert it to YYYY-MM-DD when possible.
5) If asking for absent students, infer as: no rows on that date.

User question:
{user_question}
""".strip()


def configure_gemini() -> bool:
    """Configure the Gemini client if an API key is present.

    Returns True when configured, False otherwise.
    """
    if not GEMINI_API_KEY:
        return False
    genai.configure(api_key=GEMINI_API_KEY)
    return True


def _start_alert_workers() -> None:
    """Start background threads that run attendance alert checks periodically."""

    def once_after_delay() -> None:
        time.sleep(INITIAL_ALERT_DELAY_SEC)
        try:
            conn = get_db_connection()
            run_attendance_alerts(conn)
            conn.close()
        except Exception as exc:  # preserve original logging behavior
            app.logger.exception("Initial alert check failed: %s", exc)

    def loop() -> None:
        while True:
            time.sleep(ALERT_CHECK_INTERVAL_SEC)
            try:
                conn = get_db_connection()
                run_attendance_alerts(conn)
                conn.close()
            except Exception as exc:
                app.logger.exception("Scheduled alert check failed: %s", exc)

    threading.Thread(target=once_after_delay, daemon=True).start()
    threading.Thread(target=loop, daemon=True).start()


_start_alert_workers()


@app.get("/api/users/me")
@require_auth
def auth_me(user):
    """Return current authenticated user's basic profile.

    Args:
        user: JWT-decoded token payload provided by `require_auth` decorator.

    Returns:
        JSON response with user record or 404 if not found.
    """
    uid = int(user["sub"])
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, user_code, email, role, full_name, attendance_name, department_code FROM users WHERE id = ?",
            (uid,),
        ).fetchone()
        if not row:
            return jsonify({"success": False, "error": "User not found"}), 404
        return jsonify({"success": True, "user": dict(row)})
    finally:
        conn.close()


@app.post("/api/users")
@require_roles("institution")
def create_user(user):
    """Create a new user account.

    Args:
        user: Authenticated requester provided by `require_roles` decorator.

    Returns:
        JSON response with created user info or an error.
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    full_name = (payload.get("full_name") or "").strip()
    role = (payload.get("role") or "").strip().lower()
    attendance_name = (payload.get("attendance_name") or "").strip() or None
    user_code = (payload.get("user_code") or "").strip().upper() or None
    department_code = normalize_department_code(payload.get("department_code"))

    if role not in ("staff", "student", "parent"):
        return jsonify(
            {"success": False, "error": "Invalid role (use staff, student, or parent)"},
        ), 400
    if not email or not password:
        return jsonify({"success": False, "error": "email and password are required"}), 400
    if role == "student" and not attendance_name:
        return jsonify(
            {"success": False, "error": "attendance_name required for student (SVM label, e.g. john_doe)"},
        ), 400
    if user_code and not re.fullmatch(r"[A-Z0-9_-]{3,32}", user_code):
        return jsonify({"success": False, "error": "user_code must be 3-32 chars (A-Z, 0-9, _, -)"}), 400

    conn = get_db_connection()
    try:
        if not department_exists(conn, department_code):
            return jsonify({"success": False, "error": "Invalid department_code"}), 400
        conn.execute(
            """
            INSERT INTO users (email, password_hash, role, full_name, attendance_name, user_code, department_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email,
                generate_password_hash(password),
                role,
                full_name or None,
                attendance_name,
                user_code,
                department_code,
            ),
        )
        conn.commit()
        new_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
        if not user_code:
            user_code = f"USR-{int(new_id):06d}"
            conn.execute("UPDATE users SET user_code = ? WHERE id = ?", (user_code, new_id))
            conn.commit()
        return jsonify(
            {
                "success": True,
                "user": {
                    "id": new_id,
                    "user_code": user_code,
                    "email": email,
                    "role": role,
                    "full_name": full_name,
                    "attendance_name": attendance_name,
                    "department_code": department_code,
                },
            }
        )
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Email already exists"}), 409
    finally:
        conn.close()


@app.get("/api/auth/status")
def auth_status() -> Any:
    """Return whether the system needs bootstrap (no users yet)."""
    conn = get_db_connection()
    try:
        cnt = user_count(conn)
        return jsonify({"success": True, "needs_bootstrap": cnt == 0, "user_count": cnt})
    finally:
        conn.close()


@app.post("/api/auth/bootstrap")
def auth_bootstrap() -> Any:
    """Create the initial `institution` account when no users exist.

    Expects JSON `email` and `password`. Returns a JWT token on success.
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    full_name = (payload.get("full_name") or "").strip() or None

    if not email or not password:
        return jsonify({"success": False, "error": "email and password are required"}), 400

    conn = get_db_connection()
    try:
        if user_count(conn) > 0:
            return jsonify({"success": False, "error": "Bootstrap already completed"}), 409
        conn.execute(
            "INSERT INTO users (email, password_hash, role, full_name, user_code) VALUES (?, ?, 'institution', ?, ?)",
            (email, generate_password_hash(password), full_name, None),
        )
        conn.commit()
        row = conn.execute("SELECT id, email, role FROM users WHERE email = ?", (email,)).fetchone()
        uid = int(row["id"])
        token = create_access_token(uid, row["email"], row["role"])
        logger.info("Bootstrap created institution account: %s", email)
        return jsonify({"success": True, "token": token})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Email already exists"}), 409
    finally:
        conn.close()


@app.post("/api/auth/login")
def auth_login() -> Any:
    """Authenticate a user and return a JWT access token.

    Expects JSON `email` and `password`.
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")

    if not email or not password:
        return jsonify({"success": False, "error": "email and password are required"}), 400

    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, email, password_hash, role FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if not row or not check_password_hash(row["password_hash"], password):
            return jsonify({"success": False, "error": "Invalid credentials"}), 401
        uid = int(row["id"])
        token = create_access_token(uid, row["email"], row["role"])
        logger.info("User login: %s", email)
        return jsonify({"success": True, "token": token})
    finally:
        conn.close()


@app.get("/api/auth/me")
@require_auth
def auth_me_alias(user) -> Any:
    """Alias for `/api/users/me` used by frontend preflight and auth checks."""
    uid = int(user["sub"])
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, user_code, email, role, full_name, attendance_name, department_code FROM users WHERE id = ?",
            (uid,),
        ).fetchone()
        if not row:
            return jsonify({"success": False, "error": "User not found"}), 404
        return jsonify({"success": True, "user": dict(row)})
    finally:
        conn.close()


@app.post("/api/link-parent")
@require_roles("institution", "staff")
def link_parent(user):
    """Link a parent account to a student account.

    Expects `student_user_id` and `parent_user_id` in the JSON payload.
    """
    payload = request.get_json(silent=True) or {}
    try:
        student_uid = int(payload.get("student_user_id"))
        parent_uid = int(payload.get("parent_user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "student_user_id and parent_user_id required"}), 400

    conn = get_db_connection()
    try:
        st = conn.execute(
            "SELECT id, role FROM users WHERE id = ?", (student_uid,)
        ).fetchone()
        pr = conn.execute(
            "SELECT id, role FROM users WHERE id = ?", (parent_uid,)
        ).fetchone()
        if not st or st["role"] != "student":
            return jsonify({"success": False, "error": "Invalid student user"}), 400
        if not pr or pr["role"] != "parent":
            return jsonify({"success": False, "error": "Invalid parent user"}), 400
        conn.execute(
            "INSERT OR IGNORE INTO student_parent (student_user_id, parent_user_id, linked_at) VALUES (?, ?, datetime('now'))",
            (student_uid, parent_uid),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Linked parent to student."})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
    finally:
        conn.close()


@app.delete("/api/link-parent")
@require_roles("institution", "staff")
def unlink_parent(user):
    """Unlink a parent from a student.

    Expects `student_user_id` and `parent_user_id` in the JSON payload.
    """
    payload = request.get_json(silent=True) or {}
    try:
        student_uid = int(payload.get("student_user_id"))
        parent_uid = int(payload.get("parent_user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "student_user_id and parent_user_id required"}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            "DELETE FROM student_parent WHERE student_user_id = ? AND parent_user_id = ?",
            (student_uid, parent_uid),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Parent-student link removed."})
    finally:
        conn.close()


@app.get("/api/admin/links")
@require_roles("institution", "staff")
def admin_list_links(user):
    """Return list of parent-student links for administration.

    Requires institution or staff role.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                sp.student_user_id,
                su.user_code AS student_user_code,
                su.full_name AS student_full_name,
                su.email AS student_email,
                sp.parent_user_id,
                pu.user_code AS parent_user_code,
                pu.full_name AS parent_full_name,
                pu.email AS parent_email,
                COALESCE(sp.linked_at, sp.created_at) AS linked_at
            FROM student_parent sp
            JOIN users su ON su.id = sp.student_user_id
            JOIN users pu ON pu.id = sp.parent_user_id
            ORDER BY datetime(COALESCE(sp.linked_at, sp.created_at)) DESC, sp.student_user_id ASC
            """
        ).fetchall()
        return jsonify({"success": True, "links": rows_to_dicts(rows)})
    finally:
        conn.close()


@app.put("/api/admin/users/<int:user_id>")
@require_roles("institution")
def admin_update_user(user, user_id: int):
    """Update a user's profile and role (admin only).

    Args:
        user: Requester token.
        user_id: ID of the user being updated.
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    full_name = (payload.get("full_name") or "").strip() or None
    role = (payload.get("role") or "").strip().lower()
    attendance_name = (payload.get("attendance_name") or "").strip() or None
    password = str(payload.get("password") or "")
    user_code = (payload.get("user_code") or "").strip().upper()
    department_code = normalize_department_code(payload.get("department_code"))

    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    if role not in ("staff", "student", "parent"):
        return jsonify({"success": False, "error": "Invalid role"}), 400
    if role == "student" and not attendance_name:
        return jsonify({"success": False, "error": "attendance_name required for student"}), 400
    if not user_code or not re.fullmatch(r"[A-Z0-9_-]{3,32}", user_code):
        return jsonify({"success": False, "error": "user_code must be 3-32 chars (A-Z, 0-9, _, -)"}), 400

    conn = get_db_connection()
    try:
        if not department_exists(conn, department_code):
            return jsonify({"success": False, "error": "Invalid department_code"}), 400
        existing = conn.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not existing:
            return jsonify({"success": False, "error": "User not found"}), 404

        if role == "student" and not attendance_name:
            seed = make_attendance_name_seed(full_name or email.split("@")[0])
            attendance_name = f"{seed}_{int(user_id)}"

        conn.execute(
            """
            UPDATE users
            SET email = ?, role = ?, full_name = ?, attendance_name = ?, user_code = ?, department_code = ?
            WHERE id = ?
            """,
            (
                email,
                role,
                full_name,
                attendance_name if role == "student" else None,
                user_code,
                department_code,
                user_id,
            ),
        )

        if password:
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (generate_password_hash(password), user_id),
            )

        if existing["role"] != role:
            if role != "student":
                conn.execute("DELETE FROM student_parent WHERE student_user_id = ?", (user_id,))
            if role != "parent":
                conn.execute("DELETE FROM student_parent WHERE parent_user_id = ?", (user_id,))

        conn.commit()
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Email or user_code already exists"}), 409
    finally:
        conn.close()


@app.delete("/api/admin/users/<int:user_id>")
@require_roles("institution")
def admin_delete_user(user, user_id: int):
    """Delete a user account (admin only).

    Prevents deleting the currently authenticated institution owner.
    """
    requester_id = int(user["sub"])
    if requester_id == user_id:
        return jsonify({"success": False, "error": "You cannot delete your own account."}), 400

    conn = get_db_connection()
    try:
        row = conn.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return jsonify({"success": False, "error": "User not found"}), 404
        if row["role"] == "institution":
            return jsonify({"success": False, "error": "Institution account cannot be deleted."}), 403

        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return jsonify({"success": True, "message": "User deleted."})
    finally:
        conn.close()


@app.get("/api/admin/users/<int:user_id>/details")
@require_roles("institution", "staff")
def admin_user_details(user, user_id: int):
    """Return detailed user info including parent/student links and attendance summary.

    Args:
        user: Requester token.
        user_id: Target user id.
    """
    conn = get_db_connection()
    try:
        user_row = conn.execute(
            """
            SELECT id, user_code, email, role, full_name, attendance_name, created_at
                  , department_code
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        if not user_row:
            return jsonify({"success": False, "error": "User not found"}), 404

        parent_rows = conn.execute(
            """
            SELECT p.id, p.user_code, p.email, p.full_name
            FROM student_parent sp
            JOIN users p ON p.id = sp.parent_user_id
            WHERE sp.student_user_id = ?
            ORDER BY p.id ASC
            """,
            (user_id,),
        ).fetchall()
        student_rows = conn.execute(
            """
            SELECT s.id, s.user_code, s.email, s.full_name
            FROM student_parent sp
            JOIN users s ON s.id = sp.student_user_id
            WHERE sp.parent_user_id = ?
            ORDER BY s.id ASC
            """,
            (user_id,),
        ).fetchall()

        summary = None
        if user_row["attendance_name"]:
            row = conn.execute(
                """
                SELECT
                    COUNT(*) AS total_sessions,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN status = 'partial_review' THEN 1 ELSE 0 END) AS partial_count,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
                    MAX(last_seen_at) AS last_seen_at
                FROM attendance_sessions
                WHERE name = ?
                """,
                (user_row["attendance_name"],),
            ).fetchone()
            summary = {
                "total_sessions": int(row["total_sessions"] or 0),
                "present_count": int(row["present_count"] or 0),
                "partial_count": int(row["partial_count"] or 0),
                "absent_count": int(row["absent_count"] or 0),
                "last_seen_at": row["last_seen_at"],
            }

        return jsonify(
            {
                "success": True,
                "user": dict(user_row),
                "links": {
                    "parents": rows_to_dicts(parent_rows),
                    "students": rows_to_dicts(student_rows),
                },
                "attendance_summary": summary,
            }
        )
    finally:
        conn.close()


@app.get("/api/parent/alerts")
@require_roles("parent")
def parent_alerts(user) -> Any:
    """Return recent alerts for the authenticated parent user."""
    uid = int(user["sub"])
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, student_user_id, attendance_pct, message, mock_email_json, created_at, read_flag
            FROM parent_alerts
            WHERE parent_user_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 100
            """,
            (uid,),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            try:
                d["mock_email"] = json.loads(d.pop("mock_email_json", "{}"))
            except json.JSONDecodeError:
                d["mock_email"] = {}
            out.append(d)
        return jsonify({"success": True, "alerts": out})
    finally:
        conn.close()


@app.get("/api/admin/users")
@require_roles("institution", "staff")
def admin_list_users(user) -> Any:
    """List users with optional role filter and search query."""
    role = (request.args.get("role") or "").strip().lower()
    q = (request.args.get("q") or "").strip().lower()
    conn = get_db_connection()
    try:
        sql = """
            SELECT id, user_code, email, role, full_name, attendance_name, created_at, department_code
            FROM users
            WHERE 1=1
        """
        params: list[Any] = []
        if role in ("institution", "staff", "student", "parent"):
            sql += " AND role = ?"
            params.append(role)
        if q:
            like = f"%{q}%"
            sql += " AND (LOWER(COALESCE(full_name, '')) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(user_code, '')) LIKE ? OR LOWER(role) LIKE ?)"
            params.extend([like, like, like, like])
        sql += " ORDER BY id ASC"
        rows = conn.execute(sql, tuple(params)).fetchall()
        return jsonify({"success": True, "users": rows_to_dicts(rows)})
    finally:
        conn.close()


@app.post("/api/admin/check-alerts")
@require_roles("institution", "staff")
def admin_check_alerts(user) -> Any:
    """Run attendance alert generation immediately and return results."""
    conn = get_db_connection()
    try:
        created = run_attendance_alerts(conn)
        return jsonify(
            {"success": True, "generated": len(created), "mock_emails": created}
        )
    finally:
        conn.close()


def _capture_busy() -> bool:
    global _capture_thread
    return _capture_thread is not None and _capture_thread.is_alive()


def _recognition_busy() -> bool:
    global _recognition_process
    if _recognition_process is None:
        return False
    return _recognition_process.poll() is None


def _capture_worker(student_name: str) -> None:
    global _ml_last_message, _capture_thread, _capture_stop_event
    stop_ev = _capture_stop_event

    def on_status(msg: str) -> None:
        global _ml_last_message
        _ml_last_message = msg

    try:
        result = run_capture(
            student_name,
            base_dir=BASE_DIR,
            stop_event=stop_ev,
            on_status=on_status,
        )
        _ml_last_message = json.dumps(result)
    finally:
        with _ml_lock:
            _capture_thread = None
            _capture_stop_event = None


@app.post("/api/register")
@require_roles("institution", "staff")
def api_register(user):
    """
    Start webcam registration in a background thread.
    Images go to dataset/<student_name>/ (same as capture/capture_faces.py).
    FaceNet embeddings are created when you run training (POST /api/train or training/train_svm.py).
    """
    global _capture_thread, _capture_stop_event, _ml_last_message

    payload = request.get_json(silent=True) or {}
    student_name = (payload.get("student_name") or payload.get("name") or "").strip()
    if not student_name:
        return jsonify({"success": False, "error": "student_name is required"}), 400

    with _ml_lock:
        if _capture_busy():
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Capture already running. Close the window or POST /api/stop_capture.",
                    }
                ),
                409,
            )
        _capture_stop_event = threading.Event()
        _ml_last_message = ""
        _capture_thread = threading.Thread(
            target=_capture_worker,
            args=(student_name,),
            daemon=True,
        )
        _capture_thread.start()

    return jsonify(
        {
            "success": True,
            "message": "Registration capture started. Use the OpenCV window (s=save, q=quit).",
            "student_name": student_name.lower().replace(" ", "_"),
        }
    )


@app.post("/api/stop_capture")
@require_roles("institution", "staff")
def api_stop_capture(user) -> Any:
    """Signal an active registration capture to stop and clear worker state."""
    global _capture_stop_event, _capture_thread
    with _ml_lock:
        if _capture_stop_event:
            _capture_stop_event.set()
        th = _capture_thread
    if th and th.is_alive():
        th.join(timeout=5.0)
    with _ml_lock:
        _capture_thread = None
        _capture_stop_event = None
    return jsonify({"success": True, "message": "Stop signal sent."})


@app.post("/api/start_session")
@require_roles("institution", "staff")
def api_start_session(user):
    """Run recognition/recognize_faces.py in a subprocess (live attendance → SQLite)."""
    global _recognition_process

    payload = request.get_json(silent=True) or {}
    department_code = normalize_department_code(payload.get("department_code"))
    try:
        period_minutes = int(payload.get("period_minutes")) if payload.get("period_minutes") is not None else None
        required_percentage = float(payload.get("required_percentage")) if payload.get("required_percentage") is not None else None
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid period/percentage payload"}), 400

    if period_minutes is not None and (period_minutes <= 0 or period_minutes > 240):
        return jsonify({"success": False, "error": "period_minutes must be 1..240"}), 400
    if required_percentage is not None and (required_percentage <= 0 or required_percentage > 100):
        return jsonify({"success": False, "error": "required_percentage must be 1..100"}), 400

    if period_minutes is not None or required_percentage is not None:
        conn = get_db_connection()
        try:
            current = get_attendance_policy(conn)
            conn.execute(
                """
                UPDATE attendance_policy
                SET period_minutes = ?, required_percentage = ?, updated_at = datetime('now')
                WHERE id = 1
                """,
                (
                    period_minutes if period_minutes is not None else int(current["period_minutes"]),
                    required_percentage if required_percentage is not None else float(current["required_percentage"]),
                ),
            )
            conn.commit()
        finally:
            conn.close()

    conn = get_db_connection()
    active_period_number: Optional[int] = None
    try:
        if not department_exists(conn, department_code):
            return jsonify({"success": False, "error": "Invalid department_code"}), 400
        active_period_number = resolve_period_from_time(conn, datetime.now().strftime("%H:%M"))
    finally:
        conn.close()

    if not os.path.isfile(RECOGNITION_SCRIPT):
        return jsonify({"success": False, "error": "recognize_faces.py not found."}), 500

    with _ml_lock:
        if _recognition_busy():
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Live session already running. POST /api/stop_session first.",
                    }
                ),
                409,
            )
        try:
            session_env = os.environ.copy()
            if department_code:
                session_env["OCULAR_DEPARTMENT_CODE"] = department_code
            else:
                session_env.pop("OCULAR_DEPARTMENT_CODE", None)
            if active_period_number is not None:
                session_env["OCULAR_PERIOD_NUMBER"] = str(active_period_number)
            else:
                session_env.pop("OCULAR_PERIOD_NUMBER", None)
            _recognition_process = subprocess.Popen(
                [sys.executable, RECOGNITION_SCRIPT],
                cwd=BASE_DIR,
                env=session_env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
            )
        except Exception as exc:
            return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify(
        {
            "success": True,
            "message": "Live recognition started (OpenCV window). Press q in the window to stop, or POST /api/stop_session.",
            "department_code": department_code,
            "period_number": active_period_number,
            "pid": _recognition_process.pid,
        }
    )


@app.post("/api/stop_session")
@require_roles("institution", "staff")
def api_stop_session(user) -> Any:
    """Stop a running recognition subprocess used for live sessions."""
    global _recognition_process
    with _ml_lock:
        proc = _recognition_process
    if proc is None or proc.poll() is not None:
        with _ml_lock:
            _recognition_process = None
        return jsonify({"success": True, "message": "No active session."})

    try:
        proc.terminate()
        proc.wait(timeout=10)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass
    with _ml_lock:
        _recognition_process = None
    return jsonify({"success": True, "message": "Live session stopped."})


def _train_worker() -> None:
    global _ml_last_message
    if not os.path.isfile(TRAIN_SCRIPT):
        return
    try:
        subprocess.run([sys.executable, TRAIN_SCRIPT], cwd=BASE_DIR, check=True)
        _ml_last_message = "train_complete"
    except subprocess.CalledProcessError as exc:
        _ml_last_message = f"train_failed: {exc}"


@app.post("/api/train")
@require_roles("institution", "staff")
def api_train(user):
    """Rebuild FaceNet + SVM models from dataset/ (runs training/train_svm.py)."""
    global _train_thread
    if not os.path.isfile(TRAIN_SCRIPT):
        return jsonify({"success": False, "error": "train_svm.py not found."}), 500

    with _ml_lock:
        if _train_thread is not None and _train_thread.is_alive():
            return jsonify({"success": False, "error": "Training already running."}), 409
        _train_thread = threading.Thread(target=_train_worker, daemon=True)
        _train_thread.start()

    return jsonify(
        {
            "success": True,
            "message": "Training started in background. Watch the terminal for progress.",
        }
    )


@app.get("/api/ml/status")
@require_roles("institution", "staff")
def api_ml_status(user) -> Any:
    """Return status of ML background tasks (capture, recognition, training)."""
    with _ml_lock:
        cap_on = _capture_busy()
        rec_on = _recognition_busy()
        train_on = _train_thread is not None and _train_thread.is_alive()
        msg = _ml_last_message
        pid = _recognition_process.pid if _recognition_process and rec_on else None

    return jsonify(
        {
            "success": True,
            "capture_running": cap_on,
            "session_running": rec_on,
            "training_running": train_on,
            "recognition_pid": pid,
            "last_message": msg,
        }
    )


@app.get("/api/attendance/policy")
@require_roles("institution", "staff")
def attendance_policy_get(user) -> Any:
    """Retrieve the current attendance policy settings."""
    conn = get_db_connection()
    try:
        return jsonify({"success": True, "policy": get_attendance_policy(conn)})
    finally:
        conn.close()


@app.put("/api/attendance/policy")
@require_roles("institution", "staff")
def attendance_policy_put(user) -> Any:
    """Update attendance policy values (minutes, percentage, cooldown, gap)."""
    payload = request.get_json(silent=True) or {}
    try:
        period_minutes = int(payload.get("period_minutes"))
        required_percentage = float(payload.get("required_percentage"))
        cooldown = int(payload.get("recognition_cooldown_seconds"))
        gap = int(payload.get("session_gap_tolerance_seconds"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid policy payload"}), 400

    if period_minutes <= 0 or period_minutes > 240:
        return jsonify({"success": False, "error": "period_minutes must be 1..240"}), 400
    if required_percentage <= 0 or required_percentage > 100:
        return jsonify({"success": False, "error": "required_percentage must be 1..100"}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE attendance_policy
            SET period_minutes = ?, required_percentage = ?,
                recognition_cooldown_seconds = ?, session_gap_tolerance_seconds = ?,
                updated_at = datetime('now')
            WHERE id = 1
            """,
            (period_minutes, required_percentage, cooldown, gap),
        )
        conn.commit()
        return jsonify({"success": True, "policy": get_attendance_policy(conn)})
    finally:
        conn.close()


@app.get("/api/attendance/review-queue")
@require_roles("institution", "staff")
def attendance_review_queue_get(user) -> Any:
    """List attendance sessions that require manual review or flagged entries."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT s.id, s.name, s.session_date AS date, s.first_seen_at, s.last_seen_at,
                   s.active_seconds, s.min_required_seconds, s.status, s.review_required,
                   s.period_number, s.department_code, s.reviewed_note, s.reviewed_at,
                   u.full_name AS student_full_name
            FROM attendance_sessions s
            LEFT JOIN users u ON u.attendance_name = s.name AND u.role = 'student'
            WHERE s.status = 'partial_review' OR s.review_required = 1
            ORDER BY s.session_date DESC, s.first_seen_at DESC
            """
        ).fetchall()
        out = []
        for r in rows:
            item = session_row_to_api(r)
            item["student_full_name"] = r["student_full_name"]
            out.append(item)
        return jsonify({"success": True, "data": out})
    finally:
        conn.close()


@app.post("/api/attendance/review/<int:session_id>/decision")
@require_roles("institution", "staff")
def attendance_review_decision(user, session_id: int) -> Any:
    """Apply a present/absent decision to a specific attendance session."""
    payload = request.get_json(silent=True) or {}
    decision = (payload.get("decision") or "").strip().lower()
    note = (payload.get("note") or "").strip()
    if decision not in ("present", "absent"):
        return jsonify({"success": False, "error": "decision must be present or absent"}), 400

    reviewer_id = int(user["sub"])
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT id, name, session_date, first_seen_at, status, review_required, department_code, period_number
            FROM attendance_sessions
            WHERE id = ?
            """,
            (session_id,),
        ).fetchone()
        if not row:
            return jsonify({"success": False, "error": "Session not found"}), 404

        conn.execute(
            """
            UPDATE attendance_sessions
            SET status = ?,
                review_required = 0,
                reviewed_by_user_id = ?,
                reviewed_note = ?,
                reviewed_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
            """,
            (decision, reviewer_id, note or None, session_id),
        )

        if decision == "present":
            existing = conn.execute(
                "SELECT 1 FROM attendance WHERE name = ? AND date = ? AND COALESCE(period_number, 0) = COALESCE(?, 0) LIMIT 1",
                (row["name"], row["session_date"], row["period_number"]),
            ).fetchone()
            if not existing:
                dt = parse_iso_datetime(row["first_seen_at"])
                mark_time = dt.strftime("%H:%M:%S") if dt else "00:00:00"
                conn.execute(
                    "INSERT INTO attendance (name, date, time, department_code, period_number) VALUES (?, ?, ?, ?, ?)",
                    (row["name"], row["session_date"], mark_time, row["department_code"], row["period_number"]),
                )

        conn.commit()
        return jsonify({"success": True, "message": f"Session marked as {decision}."})
    finally:
        conn.close()


@app.get("/api/class/departments")
@require_roles("institution", "staff")
def class_departments_get(user):
    """Return available department codes and names."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT code, name FROM department_catalog ORDER BY code"
        ).fetchall()
        return jsonify({"success": True, "data": rows_to_dicts(rows)})
    finally:
        conn.close()


@app.get("/api/class/schedule/blocks")
@require_roles("institution", "staff")
def class_schedule_blocks_get(user):
    """Return configured schedule blocks (periods and labels)."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT block_order, block_type, period_number, label, start_time, end_time
            FROM schedule_blocks
            ORDER BY block_order
            """
        ).fetchall()
        return jsonify({"success": True, "data": rows_to_dicts(rows)})
    finally:
        conn.close()


@app.get("/api/class/sections")
@require_roles("institution", "staff")
def class_sections_get(user):
    """List class sections with roster counts and labels."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT cs.id, cs.department_code, d.name AS department_name,
                   cs.batch_year, cs.section_name,
                   printf('%s %s-%s', cs.department_code, cs.batch_year, cs.section_name) AS class_label,
                   COUNT(ce.id) AS roster_count
            FROM class_sections cs
            JOIN department_catalog d ON d.code = cs.department_code
            LEFT JOIN class_enrollments ce ON ce.class_section_id = cs.id
            GROUP BY cs.id, cs.department_code, d.name, cs.batch_year, cs.section_name
            ORDER BY cs.department_code, cs.batch_year, cs.section_name
            """
        ).fetchall()
        return jsonify({"success": True, "data": rows_to_dicts(rows)})
    finally:
        conn.close()


@app.post("/api/class/sections")
@require_roles("institution", "staff")
def class_sections_post(user):
    """Create a new class section for a department and batch year."""
    payload = request.get_json(silent=True) or {}
    dept = (payload.get("department_code") or "").strip().upper()
    section = (payload.get("section_name") or "").strip().upper()
    try:
        batch_year = int(payload.get("batch_year"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "batch_year is required"}), 400
    if not dept or not section:
        return jsonify({"success": False, "error": "department_code and section_name are required"}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO class_sections (department_code, batch_year, section_name) VALUES (?, ?, ?)",
            (dept, batch_year, section),
        )
        conn.commit()
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Section already exists"}), 409
    finally:
        conn.close()


@app.get("/api/class/sections/<int:section_id>/timetable")
@require_roles("institution", "staff")
def class_timetable_get(user, section_id: int):
    """Return timetable entries for a given class section."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, class_section_id, weekday, period_number, subject_name
            FROM class_timetable
            WHERE class_section_id = ?
            ORDER BY weekday, period_number
            """,
            (section_id,),
        ).fetchall()
        return jsonify({"success": True, "data": rows_to_dicts(rows)})
    finally:
        conn.close()


@app.put("/api/class/sections/<int:section_id>/timetable")
@require_roles("institution", "staff")
def class_timetable_put(user, section_id: int):
    """Replace timetable entries for a class section.

    Expects JSON `entries` list with `weekday`, `period_number`, and `subject_name`.
    """
    payload = request.get_json(silent=True) or {}
    entries = payload.get("entries") or []
    if not isinstance(entries, list):
        return jsonify({"success": False, "error": "entries must be a list"}), 400

    normalized: list[tuple[int, int, str]] = []
    for e in entries:
        try:
            weekday = int(e.get("weekday"))
            period_number = int(e.get("period_number"))
        except (TypeError, ValueError):
            return jsonify({"success": False, "error": "weekday and period_number must be integers"}), 400
        subject = (e.get("subject_name") or "").strip()
        if not subject:
            continue
        if weekday < 0 or weekday > 6 or period_number < 1 or period_number > 8:
            return jsonify({"success": False, "error": "Invalid weekday or period_number"}), 400
        normalized.append((weekday, period_number, subject))

    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM class_timetable WHERE class_section_id = ?", (section_id,))
        conn.executemany(
            """
            INSERT INTO class_timetable (class_section_id, weekday, period_number, subject_name)
            VALUES (?, ?, ?, ?)
            """,
            [(section_id, w, p, s) for (w, p, s) in normalized],
        )
        conn.commit()
        return jsonify({"success": True, "count": len(normalized)})
    finally:
        conn.close()


@app.get("/api/class/attendance/partition")
@require_roles("institution", "staff")
def class_attendance_partition_get(user):
    date_str = (request.args.get("date") or datetime.now().strftime("%Y-%m-%d")).strip()
    dept_filter = normalize_department_code(request.args.get("department_code"))

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
        return jsonify({"success": False, "error": "date must be YYYY-MM-DD"}), 400

    conn = get_db_connection()
    try:
        if dept_filter and not department_exists(conn, dept_filter):
            return jsonify({"success": False, "error": "Invalid department_code"}), 400

        dept_rows = conn.execute(
            "SELECT code, name FROM department_catalog ORDER BY code"
        ).fetchall()

        session_sql = """
            SELECT
                s.id,
                s.name,
                COALESCE(u.user_code, '') AS user_code,
                COALESCE(u.full_name, '') AS full_name,
                COALESCE(NULLIF(s.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED') AS department_code,
                s.period_number,
                s.status,
                s.first_seen_at AS marked_at,
                'session' AS source
            FROM attendance_sessions s
            LEFT JOIN users u ON u.attendance_name = s.name AND u.role = 'student'
            WHERE s.session_date = ?
        """
        session_params: list[Any] = [date_str]
        if dept_filter:
            session_sql += " AND COALESCE(NULLIF(s.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED') = ?"
            session_params.append(dept_filter)
        session_sql += " ORDER BY department_code, period_number, marked_at"

        session_rows = conn.execute(session_sql, tuple(session_params)).fetchall()

        legacy_sql = """
            SELECT
                a.id,
                a.name,
                COALESCE(u.user_code, '') AS user_code,
                COALESCE(u.full_name, '') AS full_name,
                COALESCE(NULLIF(a.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED') AS department_code,
                NULL AS period_number,
                'present' AS status,
                printf('%sT%s', a.date, a.time) AS marked_at,
                'legacy' AS source
            FROM attendance a
            LEFT JOIN users u ON u.attendance_name = a.name AND u.role = 'student'
            WHERE a.date = ?
              AND NOT EXISTS (
                SELECT 1
                FROM attendance_sessions s
                WHERE s.name = a.name AND s.session_date = a.date
              )
        """
        legacy_params: list[Any] = [date_str]
        if dept_filter:
            legacy_sql += " AND COALESCE(NULLIF(a.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED') = ?"
            legacy_params.append(dept_filter)
        legacy_sql += " ORDER BY department_code, marked_at"

        legacy_rows = conn.execute(legacy_sql, tuple(legacy_params)).fetchall()

        combined = [dict(r) for r in session_rows] + [dict(r) for r in legacy_rows]
        combined.sort(
            key=lambda r: (
                str(r.get("department_code") or ""),
                r.get("period_number") if r.get("period_number") is not None else 99,
                str(r.get("marked_at") or ""),
                str(r.get("name") or ""),
            )
        )

        period_keys = [1, 2, 3, 4, 5, 6, 7, 8]
        matrix: dict[str, dict[str, Any]] = {}
        for item in combined:
            dept = str(item.get("department_code") or "UNASSIGNED").upper()
            if dept not in matrix:
                matrix[dept] = {
                    "department_code": dept,
                    "total": 0,
                    "legacy_count": 0,
                    "present": 0,
                    "partial_review": 0,
                    "absent": 0,
                    "period_counts": {f"P{p}": 0 for p in period_keys},
                }
            node = matrix[dept]
            node["total"] += 1
            status = str(item.get("status") or "present").lower()
            if status in ("present", "partial_review", "absent"):
                node[status] += 1
            if item.get("period_number") in period_keys:
                node["period_counts"][f"P{int(item['period_number'])}"] += 1
            else:
                node["legacy_count"] += 1

        matrix_rows = sorted(matrix.values(), key=lambda d: d["department_code"])
        return jsonify(
            {
                "success": True,
                "date": date_str,
                "department_filter": dept_filter,
                "departments": rows_to_dicts(dept_rows),
                "matrix": matrix_rows,
                "rows": combined,
            }
        )
    finally:
        conn.close()


@app.get("/api/class/attendance/ledger")
@require_roles("institution", "staff")
def class_attendance_ledger_get(user):
    date_str = (request.args.get("date") or datetime.now().strftime("%Y-%m-%d")).strip()
    dept_filter = normalize_department_code(request.args.get("department_code"))

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
        return jsonify({"success": False, "error": "date must be YYYY-MM-DD"}), 400

    conn = get_db_connection()
    try:
        if dept_filter and not department_exists(conn, dept_filter):
            return jsonify({"success": False, "error": "Invalid department_code"}), 400

        dept_rows = conn.execute(
            "SELECT code, name FROM department_catalog ORDER BY code"
        ).fetchall()

        period_rows = conn.execute(
            """
            SELECT period_number, label, start_time, end_time
            FROM schedule_blocks
            WHERE block_type = 'period' AND period_number IS NOT NULL
            ORDER BY period_number
            """
        ).fetchall()
        periods = [dict(r) for r in period_rows]
        period_numbers = [int(r["period_number"]) for r in period_rows] or [1, 2, 3, 4, 5, 6, 7, 8]

        roster_sql = """
            SELECT
                u.id AS student_user_id,
                COALESCE(u.user_code, '') AS user_code,
                COALESCE(u.attendance_name, '') AS attendance_name,
                COALESCE(u.full_name, '') AS full_name,
                COALESCE(NULLIF(u.department_code, ''), 'UNASSIGNED') AS department_code
            FROM users u
            WHERE u.role = 'student'
        """
        roster_params: list[Any] = []
        if dept_filter:
            roster_sql += " AND UPPER(COALESCE(NULLIF(u.department_code, ''), 'UNASSIGNED')) = ?"
            roster_params.append(dept_filter)
        roster_sql += " ORDER BY department_code, full_name, user_code"
        roster_rows = conn.execute(roster_sql, tuple(roster_params)).fetchall()

        session_sql = """
            SELECT
                s.name AS attendance_name,
                COALESCE(NULLIF(s.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED') AS department_code,
                s.period_number,
                s.status,
                s.first_seen_at AS marked_at
            FROM attendance_sessions s
            LEFT JOIN users u ON u.attendance_name = s.name AND u.role = 'student'
            WHERE s.session_date = ?
              AND s.period_number IS NOT NULL
        """
        session_params: list[Any] = [date_str]
        if dept_filter:
            session_sql += " AND UPPER(COALESCE(NULLIF(s.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED')) = ?"
            session_params.append(dept_filter)
        session_rows = conn.execute(session_sql, tuple(session_params)).fetchall()

        # Backward compatibility: map legacy attendance records without period_number using schedule block time windows.
        legacy_sql = """
            SELECT
                a.name AS attendance_name,
                COALESCE(NULLIF(a.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED') AS department_code,
                a.period_number,
                a.time,
                printf('%sT%s', a.date, a.time) AS marked_at
            FROM attendance a
            LEFT JOIN users u ON u.attendance_name = a.name AND u.role = 'student'
            WHERE a.date = ?
              AND NOT EXISTS (
                SELECT 1
                FROM attendance_sessions s
                WHERE s.name = a.name
                  AND s.session_date = a.date
                  AND COALESCE(s.period_number, 0) = COALESCE(a.period_number, 0)
              )
        """
        legacy_params: list[Any] = [date_str]
        if dept_filter:
            legacy_sql += " AND UPPER(COALESCE(NULLIF(a.department_code, ''), NULLIF(u.department_code, ''), 'UNASSIGNED')) = ?"
            legacy_params.append(dept_filter)
        legacy_rows = conn.execute(legacy_sql, tuple(legacy_params)).fetchall()

        score_map = {"present": 3, "partial_review": 2, "in_progress": 1, "absent": 0}
        marks: dict[tuple[str, str, int], dict[str, Any]] = {}

        for r in session_rows:
            period_number = r["period_number"]
            if period_number is None:
                continue
            try:
                p = int(period_number)
            except (TypeError, ValueError):
                continue
            if p not in period_numbers:
                continue
            status = str(r["status"] or "absent").lower()
            key = (str(r["attendance_name"] or ""), str(r["department_code"] or "UNASSIGNED"), p)
            existing = marks.get(key)
            incoming = {
                "status": "P" if status == "present" else "A",
                "status_raw": status,
                "marked_at": r["marked_at"],
                "score": score_map.get(status, 0),
            }
            if existing is None or incoming["score"] > existing["score"] or (
                incoming["score"] == existing["score"] and str(incoming["marked_at"] or "") > str(existing.get("marked_at") or "")
            ):
                marks[key] = incoming

        for r in legacy_rows:
            period_number = r["period_number"]
            if period_number is None:
                period_number = resolve_period_from_time(conn, str(r["time"] or "")[:5])
            if period_number is None:
                continue
            try:
                p = int(period_number)
            except (TypeError, ValueError):
                continue
            if p not in period_numbers:
                continue
            key = (str(r["attendance_name"] or ""), str(r["department_code"] or "UNASSIGNED"), p)
            existing = marks.get(key)
            incoming = {
                "status": "P",
                "status_raw": "legacy_present",
                "marked_at": r["marked_at"],
                "score": 3,
            }
            if existing is None or str(incoming["marked_at"] or "") > str(existing.get("marked_at") or ""):
                marks[key] = incoming

        rows: list[dict[str, Any]] = []
        for student in roster_rows:
            student_row = dict(student)
            dept = str(student_row.get("department_code") or "UNASSIGNED")
            attendance_name = str(student_row.get("attendance_name") or "")
            period_cells: dict[str, dict[str, Any]] = {}
            present_count = 0
            absent_count = 0
            last_marked_at: Optional[str] = None

            for p in period_numbers:
                key = f"P{p}"
                mark = marks.get((attendance_name, dept, p))
                if mark:
                    cell_status = mark["status"]
                    status_raw = mark["status_raw"]
                    marked_at = mark.get("marked_at")
                else:
                    cell_status = "A"
                    status_raw = "absent"
                    marked_at = None
                if cell_status == "P":
                    present_count += 1
                else:
                    absent_count += 1
                if marked_at and (not last_marked_at or marked_at > last_marked_at):
                    last_marked_at = marked_at
                period_cells[key] = {
                    "status": cell_status,
                    "status_raw": status_raw,
                    "marked_at": marked_at,
                }

            student_row["periods"] = period_cells
            student_row["present_count"] = present_count
            student_row["absent_count"] = absent_count
            student_row["last_marked_at"] = last_marked_at
            rows.append(student_row)

        summary = {
            "total_students": len(rows),
            "period_totals": {
                f"P{p}": {
                    "present": sum(1 for r in rows if r["periods"][f"P{p}"]["status"] == "P"),
                    "absent": sum(1 for r in rows if r["periods"][f"P{p}"]["status"] != "P"),
                }
                for p in period_numbers
            },
        }

        return jsonify(
            {
                "success": True,
                "date": date_str,
                "department_filter": dept_filter,
                "departments": rows_to_dicts(dept_rows),
                "periods": periods,
                "rows": rows,
                "summary": summary,
                "generated_at": datetime.now().isoformat(timespec="seconds"),
            }
        )
    finally:
        conn.close()


@app.get("/api/system/logs")
@require_roles("institution", "staff")
def system_logs(user) -> Any:
    """Fetch recent system logs aggregated from users, alerts, and attendance."""
    try:
        limit_raw = request.args.get("limit", "120")
        try:
            limit = int(limit_raw)
        except ValueError:
            limit = 120
        limit = max(10, min(limit, 500))

        conn = get_db_connection()
        rows = conn.execute(
            """
            SELECT created_at AS ts,
                   'user' AS source,
                   printf('New account created: %s (%s)', email, role) AS message,
                   role AS level
            FROM users
            WHERE created_at IS NOT NULL

            UNION ALL

            SELECT created_at AS ts,
                   'alerts' AS source,
                   printf('Parent alert generated for student_user_id=%d (%.1f%%)', student_user_id, attendance_pct) AS message,
                   'warn' AS level
            FROM parent_alerts
            WHERE created_at IS NOT NULL

            UNION ALL

            SELECT printf('%sT%s', date, time) AS ts,
                   'attendance' AS source,
                     printf('Attendance marked: %s on %s at %s [%s]', name, date, time, COALESCE(department_code, '-')) AS message,
                   'info' AS level
            FROM attendance

            ORDER BY ts DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        conn.close()
        return jsonify({"success": True, "data": rows_to_dicts(rows)})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/attendance")
@require_auth
def get_attendance(user):
    """Return attendance records appropriate to the requesting role.

    - `institution` and `staff` receive all sessions and legacy attendance.
    - `student` receives only their own records.
    - `parent` receives records for linked students.

    Preserves existing behavior and response shape.
    """
    try:
        role = user.get("role")
        uid = int(user["sub"])
        conn = get_db_connection()
        session_rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_sessions'"
        ).fetchone()
        if session_rows:
            if role in ("institution", "staff"):
                session_data = conn.execute(
                    """
                    SELECT id, name, session_date AS date, first_seen_at, last_seen_at,
                           active_seconds, min_required_seconds, status, review_required,
                           period_number, department_code
                    FROM attendance_sessions
                    ORDER BY session_date DESC, first_seen_at DESC
                    """
                ).fetchall()
                legacy_data = conn.execute(
                    """
                    SELECT a.id, a.name, a.date, a.time, a.department_code, a.period_number
                    FROM attendance a
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM attendance_sessions s
                        WHERE s.name = a.name
                          AND s.session_date = a.date
                          AND COALESCE(s.period_number, 0) = COALESCE(a.period_number, 0)
                    )
                    ORDER BY a.date DESC, a.time DESC
                    """
                ).fetchall()
            elif role == "student":
                aname = user.get("attendance_name")
                if not aname:
                    row = conn.execute(
                        "SELECT attendance_name FROM users WHERE id = ?", (uid,)
                    ).fetchone()
                    aname = row["attendance_name"] if row else None
                if not aname:
                    conn.close()
                    return jsonify(
                        {"success": False, "error": "Student has no attendance_name set"}
                    ), 400
                session_data = conn.execute(
                    """
                    SELECT id, name, session_date AS date, first_seen_at, last_seen_at,
                           active_seconds, min_required_seconds, status, review_required,
                           period_number, department_code
                    FROM attendance_sessions
                    WHERE name = ?
                    ORDER BY session_date DESC, first_seen_at DESC
                    """,
                    (aname,),
                ).fetchall()
                legacy_data = conn.execute(
                    """
                    SELECT a.id, a.name, a.date, a.time, a.department_code, a.period_number
                    FROM attendance a
                    WHERE a.name = ?
                      AND NOT EXISTS (
                        SELECT 1
                        FROM attendance_sessions s
                        WHERE s.name = a.name
                          AND s.session_date = a.date
                          AND COALESCE(s.period_number, 0) = COALESCE(a.period_number, 0)
                    )
                    ORDER BY a.date DESC, a.time DESC
                    """,
                    (aname,),
                ).fetchall()
            elif role == "parent":
                session_data = conn.execute(
                    """
                    SELECT s.id, s.name, s.session_date AS date, s.first_seen_at, s.last_seen_at,
                           s.active_seconds, s.min_required_seconds, s.status, s.review_required,
                           s.period_number, s.department_code
                    FROM attendance_sessions s
                    INNER JOIN users u ON u.attendance_name = s.name
                    INNER JOIN student_parent sp ON sp.student_user_id = u.id AND sp.parent_user_id = ?
                    ORDER BY s.session_date DESC, s.first_seen_at DESC
                    """,
                    (uid,),
                ).fetchall()
                legacy_data = conn.execute(
                    """
                    SELECT a.id, a.name, a.date, a.time, a.department_code, a.period_number
                    FROM attendance a
                    INNER JOIN users u ON u.attendance_name = a.name
                    INNER JOIN student_parent sp ON sp.student_user_id = u.id AND sp.parent_user_id = ?
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM attendance_sessions s
                        WHERE s.name = a.name
                          AND s.session_date = a.date
                          AND COALESCE(s.period_number, 0) = COALESCE(a.period_number, 0)
                    )
                    ORDER BY a.date DESC, a.time DESC
                    """,
                    (uid,),
                ).fetchall()
            else:
                conn.close()
                return jsonify({"success": False, "error": "Forbidden"}), 403

            out: list[dict[str, Any]] = [session_row_to_api(r) for r in session_data]
            out.extend(legacy_attendance_row_to_api(r) for r in legacy_data)
            out.sort(
                key=lambda d: (
                    str(d.get("date") or ""),
                    str(d.get("first_seen") or d.get("time") or ""),
                ),
                reverse=True,
            )
            conn.close()
            return jsonify({"success": True, "data": out})

        # Fallback for legacy deployments with only attendance table.
        if role in ("institution", "staff"):
            rows = conn.execute(
                """
                SELECT id, name, date, time, department_code, period_number FROM attendance
                ORDER BY date DESC, time DESC
                """
            ).fetchall()
        elif role == "student":
            aname = user.get("attendance_name")
            if not aname:
                row = conn.execute(
                    "SELECT attendance_name FROM users WHERE id = ?", (uid,)
                ).fetchone()
                aname = row["attendance_name"] if row else None
            if not aname:
                conn.close()
                return jsonify(
                    {"success": False, "error": "Student has no attendance_name set"}
                ), 400
            rows = conn.execute(
                """
                SELECT id, name, date, time, department_code, period_number FROM attendance
                WHERE name = ?
                ORDER BY date DESC, time DESC
                """,
                (aname,),
            ).fetchall()
        elif role == "parent":
            rows = conn.execute(
                """
                SELECT a.id, a.name, a.date, a.time, a.department_code, a.period_number
                FROM attendance a
                INNER JOIN users u ON u.attendance_name = a.name
                INNER JOIN student_parent sp ON sp.student_user_id = u.id AND sp.parent_user_id = ?
                ORDER BY a.date DESC, a.time DESC
                """,
                (uid,),
            ).fetchall()
        else:
            conn.close()
            return jsonify({"success": False, "error": "Forbidden"}), 403
        conn.close()
        out = []
        for r in rows:
            d = dict(r)
            d["status"] = "present"
            d["duration_minutes"] = None
            d["required_minutes"] = None
            d["period_number"] = d.get("period_number")
            d["department_code"] = d.get("department_code")
            out.append(d)
        return jsonify({"success": True, "data": out})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.post("/api/chat")
@require_roles("institution", "staff")
def smart_chat(user):
    """Convert a natural language question into a safe SELECT query via Gemini
    and return the resulting attendance rows and a short summary.

    Requires GEMINI_API_KEY to be set in the environment.
    """
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return jsonify({"success": False, "error": "Question is required."}), 400

    if not configure_gemini():
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Missing GEMINI_API_KEY environment variable.",
                }
            ),
            500,
        )

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        prompt = build_gemini_prompt(question)
        llm_response = model.generate_content(prompt)
        sql = (llm_response.text or "").strip().replace("```sqlite", "").replace("```sql", "").replace("```", "").strip()

        is_valid, error_msg = validate_sql(sql)
        if not is_valid:
            return jsonify({"success": False, "error": error_msg, "sql": sql}), 400

        conn = get_db_connection()
        rows = conn.execute(sql).fetchall()
        conn.close()
        result_rows = rows_to_dicts(rows)

        summary_prompt = f"""
User question: {question}
Executed SQL: {sql}
Query result rows (JSON): {json.dumps(result_rows, ensure_ascii=True)}

Respond in concise, professor-friendly English.
If result is empty, clearly say no matching attendance records were found.
""".strip()
        summary_response = model.generate_content(summary_prompt)
        answer = (summary_response.text or "").strip()

        return jsonify(
            {
                "success": True,
                "sql": sql,
                "rows": result_rows,
                "answer": answer,
            }
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
