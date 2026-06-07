from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALG = "HS256"
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),  # <--- THIS IS THE MAGIC FIX
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    if extra:
        reserved = {"sub", "exp", "iat", "email", "role"}
        for key, val in extra.items():
            if key not in reserved:
                payload[key] = val
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
