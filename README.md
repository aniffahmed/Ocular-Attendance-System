# Ocular Attendance System

Face-recognition attendance demo: Flask backend, ML capture/train/recognition scripts, and a React frontend.
---

## Quick summary
- Backend: `app.py` — Flask REST API for users, classes, attendance, ML orchestration.
- Frontend: `frontend/` — React + Vite UI.
- DB: demo SQLite at `database/attendance.db`.
- ML: capture → train → recognize (capture, training, recognition scripts).

---

## Features
- JWT-based authentication and role decorators (`auth/`).
- Live recognition runs in a separate process to isolate OpenCV/ML workloads.
- Threaded webcam capture for registration; background training worker for model builds.
- Backwards-compatible handling of legacy attendance records alongside modern `attendance_sessions`.
- Basic tests under `accuracy_test/` using `pytest`.

---

## Quickstart (local)
Prereqs: Python 3.10+, Node 18+ (for frontend).

Install deps and run backend:

```powershell
conda activate dl_attendance_v2  # or use your venv
pip install -r requirements.txt
python app.py
```

Frontend (separate terminal):

```powershell
cd frontend
npm install
npm run dev
```

Demo sequence: register → train → start session:
- `POST /api/register` {"student_name": "john_doe"} (OpenCV window)
- `POST /api/train`
- `POST /api/start_session`

---

## Testing
- `pytest` is the test runner (pinned as `pytest==9.0.3` in `requirements.txt`).
- Run the smoke test:

```powershell
python -m pytest accuracy_test/test_accuracy.py -q
```

Add more tests under `accuracy_test/` or `tests/` for endpoints and helpers.

---

## Configuration & secrets
- Use `.env` for local secrets (do not commit). See `.env.example` if present.
- Optional LLM vars: `GEMINI_API_KEY`, `GEMINI_MODEL`.

---
