from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from bson import ObjectId
from backend.app.database import mongo

# ======================= Role-Based Decorators =======================

def role_required(required_role):
    """
    Decorator to restrict access to a specific role.
    Passes `current_user` and `current_user_id` to the route.
    Example:
        @role_required("admin")
        def admin_route(current_user, current_user_id):
            ...
    """
    def wrapper(fn):
        @wraps(fn)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                current_user = None

                # Look for user in all collections
                for col in ["admins", "lecturers", "students"]:
                    found = mongo.db[col].find_one({"_id": ObjectId(user_id)})
                    if found:
                        current_user = found
                        break

                if not current_user or current_user.get("role") != required_role:
                    return jsonify({"error": f"Access denied: '{required_role}' role required"}), 403

                # Pass current user info to route
                kwargs["current_user"] = current_user
                kwargs["current_user_id"] = str(current_user["_id"])

            except Exception as e:
                return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401

            return fn(*args, **kwargs)
        return decorated_function
    return wrapper


def roles_required(*allowed_roles):
    """
    Decorator to allow multiple roles access.
    Passes `current_user` and `current_user_id` to the route.
    Example:
        @roles_required("admin", "lecturer")
        def shared_route(current_user, current_user_id):
            ...
    """
    def wrapper(fn):
        @wraps(fn)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                current_user = None

                # Look for user in all collections
                for col in ["admins", "lecturers", "students"]:
                    found = mongo.db[col].find_one({"_id": ObjectId(user_id)})
                    if found:
                        current_user = found
                        break

                if not current_user or current_user.get("role") not in allowed_roles:
                    return jsonify({
                        "error": "Access denied: insufficient role",
                        "allowed_roles": allowed_roles
                    }), 403

                # Pass current user info to route
                kwargs["current_user"] = current_user
                kwargs["current_user_id"] = str(current_user["_id"])

            except Exception as e:
                return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401

            return fn(*args, **kwargs)
        return decorated_function
    return wrapper


# --- Quick-use decorators ---
admin_required = role_required("admin")
lecturer_required = role_required("lecturer")
student_required = role_required("student")
