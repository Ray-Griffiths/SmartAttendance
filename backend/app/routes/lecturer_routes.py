from flask import Blueprint, jsonify, request
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from geopy.distance import geodesic
import uuid
import os
import qrcode
import io
import base64

from backend.app.database import mongo
from backend.app.middlewares.role_required import role_required
from backend.app.utils.serializers import serialize_course, serialize_student, serialize_attendance

lecturer_bp = Blueprint("lecturer_bp", __name__, url_prefix="/api/lecturer")

# =====================================================
#                    Helper Functions
# =====================================================
def serialize_session(session):
    """Custom serializer for attendance sessions."""
    return {
        "id": str(session["_id"]),
        "qr_code_uuid": session.get("qr_code_uuid"),
        "is_active": session.get("is_active"),
        "session_date": session.get("session_date"),
        "start_time": session.get("start_time"),
        "end_time": session.get("end_time"),
        "location": session.get("location"),
        "created_at": session.get("created_at").isoformat() if session.get("created_at") else None,
        "expires_at": session.get("expires_at").isoformat() if session.get("expires_at") else None,
        "location_required": bool(session.get("location")),
    }

def get_my_course(course_id, lecturer_id):
    """Return course owned by the lecturer."""
    if not ObjectId.is_valid(course_id):
        return None
    return mongo.db.courses.find_one({
        "_id": ObjectId(course_id),
        "lecturer_id": ObjectId(lecturer_id)
    })

# =====================================================
#             CORS Preflight Support for Vite
# =====================================================
@lecturer_bp.before_request
def handle_options():
    """Allow frontend to make preflight requests (CORS)."""
    if request.method == "OPTIONS":
        response = jsonify({"ok": True})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        return response

# =====================================================
#                       Dashboard
# =====================================================
@lecturer_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_dashboard():
    """Fetch lecturer dashboard overview."""
    lecturer_id = get_jwt_identity()

    # Fetch lecturer's courses
    courses = mongo.db.courses.find({"lecturer_id": ObjectId(lecturer_id)})
    courses_list = [serialize_course(c) for c in courses]

    # Fetch currently active sessions
    active_sessions = mongo.db.sessions.find({
        "is_active": True,
        "expires_at": {"$gt": datetime.utcnow()}
    })

    return jsonify({
        "courses": courses_list,
        "active_sessions": [serialize_session(s) for s in active_sessions],
    }), 200

# =====================================================
#                       Courses
# =====================================================
@lecturer_bp.route("/courses", methods=["POST"])
@jwt_required()
@role_required(["lecturer"])
def create_course():
    """Create a new course for the logged-in lecturer."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}

    if not data.get("name"):
        return jsonify({"error": "Course name is required"}), 400

    course_doc = {
        "name": data["name"],
        "description": data.get("description", ""),
        "lecturer_id": ObjectId(lecturer_id),
        "student_ids": [],
        "created_at": datetime.utcnow()
    }

    course_id = mongo.db.courses.insert_one(course_doc).inserted_id
    return jsonify({
        "message": "Course created successfully",
        "course_id": str(course_id)
    }), 201


@lecturer_bp.route("/courses", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_my_courses():
    """Retrieve all courses owned by the lecturer."""
    lecturer_id = get_jwt_identity()
    courses = mongo.db.courses.find({"lecturer_id": ObjectId(lecturer_id)})
    return jsonify([serialize_course(c) for c in courses]), 200


@lecturer_bp.route("/courses/<course_id>", methods=["PUT"])
@jwt_required()
@role_required(["lecturer"])
def update_course(course_id):
    """Update a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}
    course = get_my_course(course_id, lecturer_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    update_doc = {}
    if data.get("name"):
        update_doc["name"] = data["name"]
    if data.get("description"):
        update_doc["description"] = data["description"]

    if update_doc:
        mongo.db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_doc})
        return jsonify({"message": "Course updated successfully"}), 200
    return jsonify({"message": "No changes made"}), 200


@lecturer_bp.route("/courses/<course_id>", methods=["DELETE"])
@jwt_required()
@role_required(["lecturer"])
def delete_course(course_id):
    """Delete a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    result = mongo.db.courses.delete_one({
        "_id": ObjectId(course_id),
        "lecturer_id": ObjectId(lecturer_id)
    })

    if result.deleted_count == 0:
        return jsonify({"error": "Course not found"}), 404

    return jsonify({"message": "Course deleted successfully"}), 200

# =====================================================
#               Student Management
# =====================================================
@lecturer_bp.route("/courses/<course_id>/students", methods=["POST"])
@jwt_required()
@role_required(["lecturer"])
def add_student_to_course(course_id):
    """Enroll a student into a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}
    student_id = data.get("student_id")

    if not student_id:
        return jsonify({"error": "Missing student_id"}), 400

    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$addToSet": {"student_ids": ObjectId(student_id)}}
    )
    return jsonify({"message": "Student added successfully"}), 200


@lecturer_bp.route("/courses/<course_id>/students/<student_id>", methods=["DELETE"])
@jwt_required()
@role_required(["lecturer"])
def remove_student_from_course(course_id, student_id):
    """Remove a student from a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"student_ids": ObjectId(student_id)}}
    )
    return jsonify({"message": "Student removed successfully"}), 200


@lecturer_bp.route("/courses/<course_id>/students", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_course_students(course_id):
    """Retrieve students enrolled in a course."""
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    students = mongo.db.students.find({"_id": {"$in": course.get("student_ids", [])}})
    return jsonify([serialize_student(s) for s in students]), 200

# =====================================================
#                  Session / Attendance
# =====================================================
@lecturer_bp.route("/courses/<course_id>/sessions", methods=["POST"])
@jwt_required()
@role_required(["lecturer"])
def create_session(course_id):
    """Create a new class session (QR-based)."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}
    course = get_my_course(course_id, lecturer_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    qr_expires_in = int(data.get("qr_expires_in_minutes", 15))
    location = data.get("location")

    session_doc = {
        "course_id": ObjectId(course_id),
        "session_date": data.get("session_date"),
        "start_time": data.get("start_time"),
        "end_time": data.get("end_time"),
        "is_active": True,
        "qr_code_uuid": str(uuid.uuid4()),
        "expires_at": datetime.utcnow() + timedelta(minutes=qr_expires_in),
        "location": location,
        "created_at": datetime.utcnow()
    }

    session_id = mongo.db.sessions.insert_one(session_doc).inserted_id

    qr_base_url = os.getenv("QR_BASE_URL", "http://localhost:5000/api/students/scan")
    qr_data = f"{qr_base_url}/{session_doc['qr_code_uuid']}"
    qr_img = qrcode.make(qr_data)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return jsonify({
        "message": "Session created successfully",
        "session_id": str(session_id),
        "qr_code_uuid": session_doc["qr_code_uuid"],
        "qr_code_base64": qr_base64,
        "expires_at": session_doc["expires_at"].isoformat(),
        "location_required": bool(location)
    }), 201


@lecturer_bp.route("/courses/<course_id>/sessions", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_course_sessions(course_id):
    """Retrieve all sessions for a course."""
    sessions = mongo.db.sessions.find({"course_id": ObjectId(course_id)})
    return jsonify([serialize_session(s) for s in sessions]), 200
