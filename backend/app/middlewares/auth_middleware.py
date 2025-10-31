# backend/app/middlewares/auth_middleware.py
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from functools import wraps

def jwt_required_custom(fn):
    """Custom JWT required decorator with error handling."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as e:
            return jsonify({"error": "Unauthorized or invalid token", "details": str(e)}), 401
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """
    Returns the current user object from JWT identity.
    Example: {"user_id": "...", "role": "..."}
    """
    return get_jwt_identity() or {}


def get_current_user_id():
    """Convenience method to get only the user_id from the JWT."""
    identity = get_jwt_identity() or {}
    return identity.get("user_id")


def get_current_user_role():
    """Convenience method to get only the role from the JWT."""
    identity = get_jwt_identity() or {}
    return identity.get("role")
