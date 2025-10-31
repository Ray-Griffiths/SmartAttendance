from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from geopy.distance import geodesic
from flask_jwt_extended import jwt_required, get_jwt_identity
import os

from backend.app.database import mongo
from backend.app.utils.serializers import serialize_attendance
from backend.app.middlewares.role_required import role_required

attendance_bp = Blueprint("attendance_bp", __name__, url_prefix="/api/attendance")

# ======================= Config =======================
ALLOWED_RADIUS_METERS = int(os.getenv("ALLOWED_RADIUS_METERS", 100))

# ======================= Helper Functions =======================
def get_current_user():
    """Retrieve user details using JWT identity."""
    user_id = get_jwt_identity()
    if not ObjectId.is_valid(user_id):
        return None
    return (
        mongo.db.admins.find_one({"_id": ObjectId(user_id)})
        or mongo.db.lecturers.find_one({"_id": ObjectId(user_id)})
        or mongo.db.students.find_one({"_id": ObjectId(user_id)})
    )

def check_lecturer_or_admin_access(session_id):
    """Ensure only admin or session lecturer can view session attendance."""
    user = get_current_user()
    if not user:
        return None, jsonify({"error": "Access denied"}), 403

    # Admins can view all
    if user.get("role") == "admin":
        return user, None, None

    # For lecturers, verify ownership of session's course
    if user.get("role") == "lecturer":
        session = mongo.db.sessions.find_one({"_id": ObjectId(session_id)})
        if not session:
            return None, jsonify({"error": "Session not found"}), 404

        course = mongo.db.courses.find_one({
            "_id": session["course_id"],
            "lecturer_id": user["_id"]
        })
        if not course:
            return None, jsonify({"error": "Access denied"}), 403

    return user, None, None

# ======================= Student Attendance Submission =======================
@attendance_bp.route("/<session_id>/submit", methods=["POST"])
@jwt_required()
@role_required(["student"])
def submit_attendance(session_id):
    """
    Student submits attendance via QR scan.
    Expected JSON body:
    {
        "qr_code_uuid": "...",
        "latitude": 5.6037,      # optional if no geolocation restriction
        "longitude": -0.1870
    }
    """
    student_id = get_jwt_identity()
    data = request.get_json() or {}

    qr_uuid = data.get("qr_code_uuid")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not qr_uuid:
        return jsonify({"error": "QR code UUID required"}), 400

    # Fetch session
    session = mongo.db.sessions.find_one({
        "_id": ObjectId(session_id),
        "qr_code_uuid": qr_uuid
    })
    if not session:
        return jsonify({"error": "Invalid or expired QR code"}), 404

    # Check QR expiration
    if session.get("expires_at") and datetime.utcnow() > session["expires_at"]:
        return jsonify({"error": "QR code has expired"}), 403

    # If location check is enabled
    if session.get("location"):
        if latitude is None or longitude is None:
            return jsonify({"error": "Location required for this session"}), 400

        session_loc = (session["location"]["lat"], session["location"]["lng"])
        student_loc = (latitude, longitude)
        distance = geodesic(session_loc, student_loc).meters

        if distance > ALLOWED_RADIUS_METERS:
            return jsonify({
                "error": f"You are outside the allowed area ({ALLOWED_RADIUS_METERS}m limit)"
            }), 403

    # Find student
    student = mongo.db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        return jsonify({"error": "Student not found"}), 404

    # Prevent duplicate attendance
    existing = mongo.db.attendance.find_one({
        "session_id": ObjectId(session_id),
        "student_id": ObjectId(student_id)
    })
    if existing:
        return jsonify({"error": "Attendance already submitted"}), 400

    # Record attendance
    attendance_doc = {
        "session_id": ObjectId(session_id),
        "student_id": ObjectId(student_id),
        "course_id": session["course_id"],
        "timestamp": datetime.utcnow(),
        "status": "present",
        "latitude": latitude,
        "longitude": longitude
    }

    mongo.db.attendance.insert_one(attendance_doc)
    return jsonify({
        "message": "Attendance submitted successfully",
        "session_id": str(session["_id"]),
        "timestamp": attendance_doc["timestamp"].isoformat()
    }), 200

# ======================= Get Session Attendance =======================
@attendance_bp.route("/<session_id>", methods=["GET"])
@jwt_required()
@role_required(["admin", "lecturer"])
def get_session_attendance(session_id):
    """Admin or Lecturer can retrieve attendance records for a session."""
    _, err_response, err_code = check_lecturer_or_admin_access(session_id)
    if err_response:
        return err_response, err_code

    attendance_records = mongo.db.attendance.find({"session_id": ObjectId(session_id)})
    return jsonify([serialize_attendance(a) for a in attendance_records]), 200

# ======================= Get Student Attendance Summary =======================
@attendance_bp.route("/student/<student_id>", methods=["GET"])
@jwt_required()
def get_student_attendance_summary(student_id):
    """Student or admin can view a student's attendance history."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Access denied"}), 403

    # Only admin or the student themself
    if user.get("role") == "student" and str(user["_id"]) != student_id:
        return jsonify({"error": "Access denied"}), 403

    records = mongo.db.attendance.find({"student_id": ObjectId(student_id)})
    return jsonify([serialize_attendance(r) for r in records]), 200
