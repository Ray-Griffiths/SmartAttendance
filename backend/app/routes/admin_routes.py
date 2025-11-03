# backend/app/routes/admin_routes.py

from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity
from werkzeug.security import generate_password_hash
from flask_sock import Sock  # ✅ Added
import json, time, threading

from backend.app.database import mongo
from backend.app.middlewares.role_required import role_required
from backend.app.utils.serializers import serialize_user, serialize_course, serialize_student

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api/admin")


# ===================== Helper Functions =======================

def get_course_or_404(course_id):
    try:
        course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
        if not course:
            return None, jsonify({"error": "Course not found"}), 404
        return course, None, None
    except Exception:
        return None, jsonify({"error": "Invalid course ID"}), 400


def get_user_or_404(user_id):
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None, jsonify({"error": "User not found"}), 404
        return user, None, None
    except Exception:
        return None, jsonify({"error": "Invalid user ID"}), 400


# ===================== User Management =======================

@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@role_required(["admin"])
def create_user():
    data = request.get_json() or {}
    if not all([data.get("username"), data.get("email"), data.get("role")]):
        return jsonify({"error": "username, email, and role are required"}), 400

    if mongo.db.users.find_one({"email": data["email"]}):
        return jsonify({"error": "Email already exists"}), 409

    password_hash = (
        generate_password_hash(data.get("password")) if data.get("password") else ""
    )

    user_doc = {
        "username": data["username"],
        "email": data["email"],
        "password_hash": password_hash,
        "role": data["role"],
        "created_at": datetime.utcnow(),
    }
    user_id = mongo.db.users.insert_one(user_doc).inserted_id
    return jsonify({"message": "User created", "user_id": str(user_id)}), 201


@admin_bp.route("/users/<user_id>", methods=["PUT"])
@jwt_required()
@role_required(["admin"])
def update_user(user_id):
    user, err_response, err_code = get_user_or_404(user_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    update_doc = {k: data[k] for k in ["username", "email", "role"] if k in data}
    if data.get("password"):
        update_doc["password_hash"] = generate_password_hash(data["password"])

    mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
    return jsonify({"message": "User updated"}), 200


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def delete_user(user_id):
    result = mongo.db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"message": "User deleted"}), 200


# ===================== Course Management =======================

@admin_bp.route("/courses", methods=["POST"])
@jwt_required()
@role_required(["admin"])
def create_course():
    data = request.get_json() or {}
    if not all([data.get("name"), data.get("lecturer_id")]):
        return jsonify({"error": "name and lecturer_id are required"}), 400

    course_doc = {
        "name": data["name"],
        "description": data.get("description"),
        "lecturer_id": ObjectId(data["lecturer_id"]),
        "student_ids": [],
        "created_at": datetime.utcnow(),
    }
    course_id = mongo.db.courses.insert_one(course_doc).inserted_id
    return jsonify({"message": "Course created", "course_id": str(course_id)}), 201


@admin_bp.route("/courses", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_all_courses():
    courses = mongo.db.courses.find()
    return jsonify([serialize_course(c) for c in courses]), 200


@admin_bp.route("/courses/<course_id>", methods=["PUT"])
@jwt_required()
@role_required(["admin"])
def update_course(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    update_doc = {}
    if "name" in data:
        update_doc["name"] = data["name"]
    if "description" in data:
        update_doc["description"] = data["description"]
    if "lecturer_id" in data:
        update_doc["lecturer_id"] = ObjectId(data["lecturer_id"])

    mongo.db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_doc})
    return jsonify({"message": "Course updated"}), 200


@admin_bp.route("/courses/<course_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def delete_course(course_id):
    result = mongo.db.courses.delete_one({"_id": ObjectId(course_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({"message": "Course deleted"}), 200


# ===================== Course-Student Linking =======================

@admin_bp.route("/courses/<course_id>/students", methods=["POST"])
@jwt_required()
@role_required(["admin"])
def add_student_to_course(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id required"}), 400

    if ObjectId(student_id) in course.get("student_ids", []):
        return jsonify({"error": "Student already enrolled"}), 400

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$push": {"student_ids": ObjectId(student_id)}},
    )
    return jsonify({"message": "Student added to course"}), 200


@admin_bp.route("/courses/<course_id>/students/<student_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def remove_student_from_course(course_id, student_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"student_ids": ObjectId(student_id)}},
    )
    return jsonify({"message": "Student removed from course"}), 200


@admin_bp.route("/courses/<course_id>/students", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_course_students(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    students = mongo.db.students.find({"_id": {"$in": course.get("student_ids", [])}})
    return jsonify([serialize_student(s) for s in students]), 200


# ===================== Dashboard & Stats =======================

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_dashboard():
    total_students = mongo.db.students.count_documents({})
    total_lecturers = mongo.db.lecturers.count_documents({})
    total_courses = mongo.db.courses.count_documents({})
    total_sessions = mongo.db.sessions.count_documents({})

    return jsonify({
        "stats": {
            "total_students": total_students,
            "total_lecturers": total_lecturers,
            "total_courses": total_courses,
            "total_sessions": total_sessions,
        }
    }), 200


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_all_users():
    admins = list(mongo.db.admins.find())
    lecturers = list(mongo.db.lecturers.find())
    students = list(mongo.db.students.find())

    all_users = []

    for admin in admins:
        admin["role"] = "admin"
        all_users.append(serialize_user(admin))

    for lecturer in lecturers:
        lecturer["role"] = "lecturer"
        all_users.append(serialize_user(lecturer))

    for student in students:
        student["role"] = "student"
        all_users.append(serialize_user(student))

    return jsonify(all_users), 200


# ===================== Analytics & Logs =======================

@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_admin_analytics():
    try:
        users_count = mongo.db.users.count_documents({})
        lecturers_count = mongo.db.lecturers.count_documents({})
        students_count = mongo.db.students.count_documents({})
        attendance_records = mongo.db.attendance.count_documents({})
        return jsonify({
            "total_users": users_count,
            "total_lecturers": lecturers_count,
            "total_students": students_count,
            "attendance_records": attendance_records
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/logs", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_system_logs():
    try:
        logs = list(mongo.db.system_logs.find().sort("timestamp", -1).limit(100))
        for log in logs:
            log["_id"] = str(log["_id"])
        return jsonify({"logs": logs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===================== Course Analytics =======================

@admin_bp.route("/courses/<course_id>/analytics", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_course_analytics(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    course_id_obj = ObjectId(course_id)
    total_students = len(course.get("student_ids", []))
    total_sessions = mongo.db.sessions.count_documents({"course_id": course_id_obj})

    attended_sessions = mongo.db.attendance.count_documents(
        {"course_id": course_id_obj, "status": "present"}
    )
    absent_sessions = mongo.db.attendance.count_documents(
        {"course_id": course_id_obj, "status": "absent"}
    )

    attendance_rate = 0
    if total_sessions > 0 and total_students > 0:
        attendance_rate = round(
            (attended_sessions / (total_sessions * total_students)) * 100, 2
        )

    return jsonify({
        "course_id": str(course_id_obj),
        "course_name": course.get("name"),
        "total_students": total_students,
        "total_sessions": total_sessions,
        "attended_sessions": attended_sessions,
        "absent_sessions": absent_sessions,
        "attendance_rate": attendance_rate,
    }), 200


# ===================== ✅ Real-Time WebSocket =======================

def register_admin_ws(sock: Sock):
    @sock.route("/api/admin/ws")
    def admin_ws(ws):
        """WebSocket endpoint for live admin analytics updates"""
        try:
            # Basic token extraction
            query = ws.environ.get("QUERY_STRING", "")
            token = None
            if query.startswith("token="):
                token = query.replace("token=", "")
            if not token:
                ws.send(json.dumps({"error": "Missing token"}))
                ws.close()
                return

            ws.send(json.dumps({"status": "connected", "message": "Admin WS ready"}))

            # Stream periodic updates
            while True:
                data = {
                    "timestamp": time.strftime("%H:%M:%S"),
                    "total_students": mongo.db.students.count_documents({}),
                    "total_lecturers": mongo.db.lecturers.count_documents({}),
                    "total_courses": mongo.db.courses.count_documents({}),
                    "total_sessions": mongo.db.sessions.count_documents({}),
                }
                ws.send(json.dumps(data))
                time.sleep(5)

        except Exception as e:
            print("❌ WebSocket error:", str(e))
            try:
                ws.close()
            except:
                pass
