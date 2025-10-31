from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, decode_token
)
from flask_mail import Message
from datetime import datetime, timedelta
from bson import ObjectId
from functools import wraps
from backend.app.database import mongo
import bcrypt
import secrets

# =====================================================
# Blueprint Setup
# =====================================================
auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")

# Ensure JWT Config Exists (Prevents KeyError)
def ensure_jwt_config():
    app = current_app
    app.config.setdefault("JWT_SECRET_KEY", "super-secret-key")
    app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1))
    app.config.setdefault("JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=30))
    app.config.setdefault("JWT_TOKEN_LOCATION", ["headers"])
    app.config.setdefault("JWT_HEADER_NAME", "Authorization")
    app.config.setdefault("JWT_HEADER_TYPE", "Bearer")


# =====================================================
# Helper Functions
# =====================================================
USER_COLLECTIONS = ["admins", "lecturers", "students"]

def find_user_by_email(email):
    for col in USER_COLLECTIONS:
        user = mongo.db[col].find_one({"email": email})
        if user:
            return user, col
    return None, None


def find_user_by_id(user_id):
    for col in USER_COLLECTIONS:
        user = mongo.db[col].find_one({"_id": ObjectId(user_id)})
        if user:
            return user, col
    return None, None


def get_collection_by_role(role):
    return "students" if role == "student" else "lecturers" if role == "lecturer" else "admins"


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# =====================================================
# Role-Based Decorators
# =====================================================
def role_required(required_role):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user, _ = find_user_by_id(user_id)
            if not user or user.get("role", "").lower() != required_role:
                return jsonify({"error": "Access forbidden: insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


admin_required = role_required("admin")
lecturer_required = role_required("lecturer")
student_required = role_required("student")


# =====================================================
# Register (Frontend-Compatible)
# =====================================================
@auth_bp.route("/register", methods=["POST"])
@jwt_required(optional=True)
def register():
    ensure_jwt_config()
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "student").lower()  # 🔹 Force lowercase

    if not all([name, email, password]):
        return jsonify({"message": "Missing required fields"}), 400

    if role not in ["admin", "lecturer", "student"]:
        return jsonify({"message": "Invalid role"}), 400

    existing_user, _ = find_user_by_email(email)
    if existing_user:
        return jsonify({"message": "Email already registered"}), 409

    # Split full name into first and last name for consistency
    first_name, last_name = (name.split(" ", 1) + [""])[:2]

    user_doc = {
        "username": name,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "student_id": data.get("student_id"),
        "department": data.get("department"),
        "is_verified": False,
        "created_at": datetime.utcnow()
    }

    collection = get_collection_by_role(role)
    result = mongo.db[collection].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    access_token = create_access_token(identity=str(user_doc["_id"]))
    refresh_token = create_refresh_token(identity=str(user_doc["_id"]))

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user_doc["_id"]),
            "name": name,
            "email": user_doc["email"],
            "role": user_doc["role"].lower(),  # 🔹 Ensure lowercase in response
            "is_active": True,
            "is_verified": False,
            "created_at": user_doc["created_at"].isoformat()
        }
    }), 201


# =====================================================
# Login
# =====================================================
@auth_bp.route("/login", methods=["POST"])
def login():
    ensure_jwt_config()
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"message": "Missing email or password"}), 400

    user, _ = find_user_by_email(email)
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user["_id"]))
    refresh_token = create_refresh_token(identity=str(user["_id"]))

    # 🔹 Normalize role
    role = str(user.get("role", "")).lower()

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user["_id"]),
            "name": user.get("username", ""),
            "email": user["email"],
            "role": role,  # 🔹 lowercase for frontend
            "student_id": user.get("student_id"),
            "department": user.get("department"),
            "is_active": True,
            "is_verified": user.get("is_verified", False),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        }
    }), 200


# =====================================================
# Refresh Token
# =====================================================
@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    ensure_jwt_config()
    data = request.get_json() or {}
    try:
        token_data = decode_token(data.get("refresh_token"))
        user_id = token_data["sub"]
        new_access_token = create_access_token(identity=user_id)
        return jsonify({"access_token": new_access_token}), 200
    except Exception:
        return jsonify({"message": "Invalid refresh token"}), 401


# =====================================================
# Get Current User
# =====================================================
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user, _ = find_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": str(user["_id"]),
        "name": user.get("username"),
        "email": user["email"],
        "role": user.get("role", "").lower(),  # 🔹 Ensure lowercase
        "student_id": user.get("student_id"),
        "department": user.get("department"),
        "is_active": True,
        "is_verified": user.get("is_verified", False),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
    }), 200


# =====================================================
# Change Password
# =====================================================
@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    data = request.get_json() or {}
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not all([old_password, new_password]):
        return jsonify({"error": "Missing fields"}), 400

    user_id = get_jwt_identity()
    user, col = find_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not bcrypt.checkpw(old_password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Incorrect old password"}), 401

    new_hash = hash_password(new_password)
    mongo.db[col].update_one({"_id": ObjectId(user_id)}, {"$set": {"password_hash": new_hash}})
    return jsonify({"message": "Password updated successfully"}), 200


# =====================================================
# Forgot Password
# =====================================================
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email required"}), 400

    user, col = find_user_by_email(email)
    if not user:
        return jsonify({"error": "No user with that email"}), 404

    reset_token = secrets.token_urlsafe(32)
    mongo.db.password_resets.insert_one({
        "user_id": user["_id"],
        "token": reset_token,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=1)
    })

    reset_link = f"{request.host_url}reset-password/{reset_token}"
    msg = Message(
        subject="SmartAttendance Password Reset",
        sender=current_app.config.get("MAIL_USERNAME"),
        recipients=[email],
        body=f"Hi {user['username']},\n\nClick below to reset your password:\n{reset_link}\n\nThis link expires in 1 hour.\n\n- SmartAttendance Team"
    )

    mail = current_app.extensions.get("mail")
    if not mail:
        return jsonify({"error": "Mail service not configured"}), 500

    mail.send(msg)
    return jsonify({"message": "Password reset email sent"}), 200


# =====================================================
# Reset Password
# =====================================================
@auth_bp.route("/reset-password/<token>", methods=["POST"])
def reset_password(token):
    data = request.get_json() or {}
    new_password = data.get("new_password")
    if not new_password:
        return jsonify({"error": "New password required"}), 400

    reset_doc = mongo.db.password_resets.find_one({"token": token})
    if not reset_doc or reset_doc["expires_at"] < datetime.utcnow():
        return jsonify({"error": "Invalid or expired token"}), 400

    user_id = reset_doc["user_id"]
    new_hash = hash_password(new_password)
    for col in USER_COLLECTIONS:
        if mongo.db[col].find_one({"_id": user_id}):
            mongo.db[col].update_one({"_id": user_id}, {"$set": {"password_hash": new_hash}})
            break

    mongo.db.password_resets.delete_one({"_id": reset_doc["_id"]})
    return jsonify({"message": "Password has been reset successfully"}), 200


# =====================================================
# Logout
# =====================================================
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out successfully"}), 200
