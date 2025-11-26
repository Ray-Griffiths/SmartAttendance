from flask import Blueprint, jsonify, request
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from geopy.distance import geodesic

from backend.app.database import mongo
from backend.app.utils.serializers import serialize_student, serialize_course, serialize_attendance
from backend.app.middlewares.role_required import role_required

student_bp = Blueprint("student_bp", __name__, url_prefix="/api/student")

# ======================= Helper Functions =======================
def check_student_or_admin_access(student_id):
    """Verify if the current user is the student themselves or an admin."""
    user_id = get_jwt_identity()
    user = (
        mongo.db.admins.find_one({"_id": ObjectId(user_id)}) or
        mongo.db.students.find_one({"_id": ObjectId(user_id)})
    )
    if not user:
        return None, jsonify({"error": "Access denied"}), 403
    if user.get("role") == "student" and str(user["_id"]) != student_id:
        return None, jsonify({"error": "Access denied"}), 403
    return user, None, None


# ======================= Student CRUD =======================
@student_bp.route("/", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_students():
    """Admin only: List all students."""
    students = mongo.db.students.find()
    return jsonify([serialize_student(s) for s in students]), 200


@student_bp.route("/<student_id>", methods=["GET"])
@jwt_required()
def get_student(student_id):
    _, err_response, err_code = check_student_or_admin_access(student_id)
    if err_response:
        return err_response, err_code

    student = mongo.db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(serialize_student(student)), 200


@student_bp.route("/<student_id>", methods=["PUT"])
@jwt_required()
def update_student(student_id):
    _, err_response, err_code = check_student_or_admin_access(student_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    mongo.db.students.update_one({"_id": ObjectId(student_id)}, {"$set": data})
    return jsonify({"message": "Student updated successfully"}), 200


@student_bp.route("/<student_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def delete_student(student_id):
    mongo.db.students.delete_one({"_id": ObjectId(student_id)})
    return jsonify({"message": "Student deleted successfully"}), 200


# ======================= Enrollment / Courses =======================
@student_bp.route("/<student_id>/courses", methods=["GET"])
@jwt_required()
def get_student_courses(student_id):
    _, err_response, err_code = check_student_or_admin_access(student_id)
    if err_response:
        return err_response, err_code

    courses = mongo.db.courses.find({"student_ids": ObjectId(student_id)})
    return jsonify([serialize_course(c) for c in courses]), 200


@student_bp.route("/<student_id>/courses/<course_id>/enroll", methods=["POST"])
@jwt_required()
def enroll_in_course(student_id, course_id):
    user_id = get_jwt_identity()
    if str(user_id) != student_id:
        return jsonify({"error": "Students can only enroll themselves"}), 403

    student = mongo.db.students.find_one({"_id": ObjectId(student_id)})
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not student or not course:
        return jsonify({"error": "Student or course not found"}), 404

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$addToSet": {"student_ids": ObjectId(student_id)}}
    )
    return jsonify({"message": f"Enrolled in course {course['name']}"}), 200


@student_bp.route("/<student_id>/courses/<course_id>/unenroll", methods=["POST"])
@jwt_required()
def unenroll_from_course(student_id, course_id):
    user_id = get_jwt_identity()
    if str(user_id) != student_id:
        return jsonify({"error": "Students can only unenroll themselves"}), 403

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"student_ids": ObjectId(student_id)}}
    )
    return jsonify({"message": f"Unenrolled from course {course_id}"}), 200


# ======================= Attendance =======================
@student_bp.route("/<student_id>/attendance", methods=["GET"])
@jwt_required()
def get_student_attendance(student_id):
    _, err_response, err_code = check_student_or_admin_access(student_id)
    if err_response:
        return err_response, err_code

    attendance_records = mongo.db.attendance.find({"student_id": ObjectId(student_id)})
    return jsonify([serialize_attendance(a) for a in attendance_records]), 200


# ======================= Dashboard =======================
@student_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    """Get student dashboard."""
    student_id = get_jwt_identity()
    student = mongo.db.students.find_one({"_id": ObjectId(student_id)})

    if not student:
        return jsonify({"error": "Student not found"}), 404

    # Get enrolled courses
    courses = mongo.db.courses.find({"student_ids": ObjectId(student_id)})
    courses_list = [serialize_course(c) for c in courses]

    # Get recent attendance
    recent_attendance = mongo.db.attendance.find(
        {"student_id": ObjectId(student_id)}
    ).sort("timestamp", -1).limit(10)

    return jsonify({
        "student": serialize_student(student),
        "courses": courses_list,
        "recent_attendance": [serialize_attendance(a) for a in recent_attendance]
    }), 200


# ======================= QR Code Scan =======================
@student_bp.route("/scan", methods=["POST"])
@jwt_required()
def scan_qr():
    """Scan QR code to mark attendance."""
    student_id = get_jwt_identity()
    data = request.get_json() or {}
    qr_data = data.get("qr_data")

    if not qr_data:
        return jsonify({"message": "QR data required"}), 400

    # Extract UUID from QR code data
    qr_uuid = qr_data.split("/")[-1] if "/" in qr_data else qr_data
    session = mongo.db.sessions.find_one({
        "qr_code_uuid": qr_uuid,
        "is_active": True
    })

    if not session:
        return jsonify({"message": "Invalid or inactive QR code"}), 404

    # Check expiration
    if session.get("expires_at") and datetime.utcnow() > session["expires_at"]:
        return jsonify({"message": "QR code has expired"}), 400

    # Check if already marked
    existing = mongo.db.attendance.find_one({
        "session_id": session["_id"],
        "student_id": ObjectId(student_id)
    })
    if existing:
        return jsonify({"message": "Attendance already marked"}), 400

    # Check geolocation if provided
    if session.get("location") and data.get("location"):
        session_loc = (session["location"]["lat"], session["location"]["lng"])
        student_loc = (data["location"]["latitude"], data["location"]["longitude"])
        distance = geodesic(session_loc, student_loc).meters
        if distance > 100:
            return jsonify({"message": "You are too far from the class location"}), 400

    # Record attendance
    attendance_doc = {
        "session_id": session["_id"],
        "student_id": ObjectId(student_id),
        "course_id": session["course_id"],
        "timestamp": datetime.utcnow(),
        "status": "present"
    }

    mongo.db.attendance.insert_one(attendance_doc)
    return jsonify({
        "message": "Attendance marked successfully",
        "session_id": str(session["_id"]),
        "marked_at": attendance_doc["timestamp"].isoformat()
    }), 200
