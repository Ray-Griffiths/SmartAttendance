# app/middlewares/role_required.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from backend.app.database import mongo
from bson import ObjectId
import os

# Configurable mode
USE_JWT_ROLE = os.getenv("USE_JWT_ROLE", "False").lower() == "true"


def role_required(allowed_roles):
    """
    Decorator to check if the user has one of the allowed roles.
    Works in two modes:
      - USE_JWT_ROLE=True → use role info from JWT
      - USE_JWT_ROLE=False → verify role from database
    The DB lookup will attempt to convert the identity to an ObjectId when possible
    to avoid mismatches between stored ObjectId _id fields and string JWT identities.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                identity = get_jwt_identity()
                if not identity:
                    return jsonify({"error": "Unauthorized"}), 401

                # --- JWT role mode ---
                if USE_JWT_ROLE and isinstance(identity, dict):
                    user_role = identity.get("role", "").lower()
                    if user_role not in [r.lower() for r in allowed_roles]:
                        return jsonify({
                            "error": "Forbidden",
                            "message": f"Access denied. Required roles: {allowed_roles}"
                        }), 403
                    return fn(*args, **kwargs)

                # --- DB role mode ---
                # identity may be a string user id, an object with an 'id' field, or an ObjectId
                user_id_raw = identity if isinstance(identity, str) else (identity.get("id") if isinstance(identity, dict) else None)

                # If we can't extract an id, treat as unauthorized
                if not user_id_raw:
                    return jsonify({"error": "Unauthorized"}), 401

                # Try to convert string id to ObjectId when possible
                user_lookup_id = user_id_raw
                try:
                    if isinstance(user_id_raw, str) and ObjectId.is_valid(user_id_raw):
                        user_lookup_id = ObjectId(user_id_raw)
                except Exception:
                    # leave lookup id as-is if conversion fails
                    user_lookup_id = user_id_raw

                # Users may be stored in separate collections (admins, lecturers, students).
                # Try to find the user across the known user collections.
                USER_COLLECTIONS = ["admins", "lecturers", "students"]
                user = None
                for col in USER_COLLECTIONS:
                    try:
                        user = mongo.db[col].find_one({"_id": user_lookup_id})
                        if user:
                            break
                    except Exception:
                        # ignore collection-level errors and continue
                        user = None

                if not user:
                    return jsonify({"error": "User not found"}), 404

                # Some collections may not include an explicit 'role' field; infer role from collection name
                user_role = user.get("role") if user.get("role") else ("lecturer" if col == "lecturers" else ("student" if col == "students" else "admin"))
                if user_role.lower() not in [r.lower() for r in allowed_roles]:
                    return jsonify({
                        "error": "Forbidden",
                        "message": f"Access denied. Required roles: {allowed_roles}"
                    }), 403

                return fn(*args, **kwargs)

            except Exception as e:
                return jsonify({
                    "error": "Authorization error",
                    "details": str(e)
                }), 500

        return wrapper

    return decorator
