from __future__ import annotations

from functools import wraps
from typing import Callable, Optional, TypeVar

from flask import jsonify, request

from auth.jwt_utils import decode_token
import logging

# Module logger
logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., tuple])


def get_bearer_token() -> Optional[str]:
    auth = request.headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def current_user_from_token() -> Optional[dict]:
    token = get_bearer_token()
    if not token:
        logger.warning("No token found in Authorization headers")
        return None
    try:
        user_data = decode_token(token)
        logger.info("Token decoded successfully: %s", user_data)
        return user_data
    except Exception as e:
        logger.warning("Token rejected: %s", str(e))
        return None


def require_auth(f: F) -> F:
    @wraps(f)
    def wrapped(*args, **kwargs):
        user = current_user_from_token()
        if not user:
            return jsonify({"success": False, "error": "Unauthorized"}), 401
        return f(*args, user=user, **kwargs)

    return wrapped  # type: ignore


def require_roles(*allowed: str) -> Callable[[F], F]:
    def decorator(f: F) -> F:
        @wraps(f)
        def wrapped(*args, **kwargs):
            user = current_user_from_token()
            if not user:
                return jsonify({"success": False, "error": "Unauthorized"}), 401
            role = user.get("role")
            if role not in allowed:
                return jsonify({"success": False, "error": "Forbidden"}), 403
            return f(*args, user=user, **kwargs)

        return wrapped  # type: ignore

    return decorator
