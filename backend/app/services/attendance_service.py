# backend/services/attendance_service.py
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo
from backend.app.services.geo_service import is_within_radius

def validate_session(qr_uuid):
    """Validate if the session exists and is active."""
    session = mongo.db.sessions.find_one({"qr_code_uuid": qr_uuid})
    if not session or not session.get("is_active"):
        return None, "Session is inactive or invalid."
    if session.get("expires_at") and session["expires_at"] < datetime.utcnow():
        return None, "QR code has expired."
    return session, None

def mark_attendance(student_id, session, student_location=None):
    """Mark attendance for a student, optionally validating their location."""
    course_id = session["course_id"]

    if session.get("location") and not is_within_radius(student_location, session["location"], 150):
        return {"error": "You are too far from the class location."}, 400

    # Prevent double attendance
    existing = mongo.db.attendance.find_one({
        "student_id": ObjectId(student_id),
        "session_id": session["_id"]
    })
    if existing:
        return {"error": "Attendance already recorded."}, 400

    record = {
        "student_id": ObjectId(student_id),
        "course_id": course_id,
        "session_id": session["_id"],
        "timestamp": datetime.utcnow()
    }
    mongo.db.attendance.insert_one(record)
    return {"message": "Attendance marked successfully."}, 200
