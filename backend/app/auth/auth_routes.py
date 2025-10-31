# backend/app/auth/auth_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import timedelta
from backend.app.database import mongo
from backend.app.auth.auth_utils import hash_password, verify_password, generate_tokens
from backend.app.auth.decorators import role_required, admin_required, lecturer_required, student_required

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")

# ================== Register ==================
@auth_bp.route("/register", methods=["POST"])
@jwt_required(optional=True)  # allow registration without login for lecturers
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "student")  # default role

    if not all([name, email, password]):
        return jsonify({"error": "Missing required fields"}), 400

    if role not in ["admin", "lecturer", "student"]:
        return jsonify({"error": "Invalid role"}), 400

    # Only admin can create admin or student accounts
    if role in ["admin", "student"]:
        creator_id = get_jwt_identity()
        creator = mongo.db.users.find_one({"_id": ObjectId(creator_id)}) if creator_id else None
        if not creator or creator.get("role") != "admin":
            return jsonify({"error": "Only admin can create students or admins"}), 403

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    hashed_pw = hash_password(password)
    user_doc = {
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": role,
        "created_at": None  # Optional: add datetime.utcnow() if needed
    }
    mongo.db.users.insert_one(user_doc)
    return jsonify({"message": f"{role.capitalize()} registered successfully"}), 201


# ================== Login ==================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Missing credentials"}), 400

    user = mongo.db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token, refresh_token = generate_tokens(str(user["_id"]), user["role"])

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }), 200


# ================== Refresh Token ==================
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    identity = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(identity)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    access_token, _ = generate_tokens(str(user["_id"]), user["role"])
    return jsonify({"access_token": access_token}), 200


# ================== Profile ==================
@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    identity = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(identity)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }), 200


# ================== Change Password ==================
@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    data = request.get_json() or {}
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not all([old_password, new_password]):
        return jsonify({"error": "Missing fields"}), 400

    identity = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(identity)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not verify_password(old_password, user["password"]):
        return jsonify({"error": "Incorrect old password"}), 401

    new_hash = hash_password(new_password)
    mongo.db.users.update_one({"_id": ObjectId(identity)}, {"$set": {"password": new_hash}})
    return jsonify({"message": "Password updated successfully"}), 200


# ================== Protected Test ==================
@auth_bp.route("/protected/admin", methods=["GET"])
@admin_required
def admin_test():
    return jsonify({"message": "Hello, Admin!"}), 200


@auth_bp.route("/protected/lecturer", methods=["GET"])
@lecturer_required
def lecturer_test():
    return jsonify({"message": "Hello, Lecturer!"}), 200


@auth_bp.route("/protected/student", methods=["GET"])
@student_required
def student_test():
    return jsonify({"message": "Hello, Student!"}), 200
