# backend/app/controllers/attendance_controller.py
from backend.app.database import mongo
from bson import ObjectId
from datetime import datetime
from geopy.distance import geodesic
import os

# Optional: Allowed radius for geolocation (meters)
ALLOWED_RADIUS_METERS = int(os.getenv("ALLOWED_RADIUS_METERS", 100))


# -------------------- Attendance --------------------
def mark_attendance(session_id, qr_uuid, student_index, latitude=None, longitude=None):
    """
    Record attendance for a student in a session.
    - Prevent duplicate attendance.
    - Optionally enforce geolocation.
    """
    try:
        # 1️⃣ Fetch session
        session = mongo.db.sessions.find_one({"_id": ObjectId(session_id), "qr_code_uuid": qr_uuid, "is_active": True})
        if not session:
            return {"error": "Invalid session or QR code"}, 404

        # 2️⃣ Check QR expiration
        if session.get("expires_at") and datetime.utcnow() > session["expires_at"]:
            return {"error": "QR code expired"}, 403

        # 3️⃣ Geolocation validation if session requires it
        session_location = session.get("location")
        if session_location:
            if latitude is None or longitude is None:
                return {"error": "Location required for this session"}, 400

            distance = geodesic((latitude, longitude), (session_location["lat"], session_location["lng"])).meters
            if distance > ALLOWED_RADIUS_METERS:
                return {"error": f"Outside allowed area ({ALLOWED_RADIUS_METERS}m)"}, 403

        # 4️⃣ Fetch student
        student = mongo.db.students.find_one({"index_number": student_index})
        if not student:
            return {"error": "Student not found"}, 404

        # 5️⃣ Check duplicate attendance
        if mongo.db.attendance.find_one({"session_id": ObjectId(session_id), "student_id": student["_id"]}):
            return {"error": "Attendance already submitted"}, 400

        # 6️⃣ Record attendance
        attendance_doc = {
            "session_id": ObjectId(session_id),
            "student_id": student["_id"],
            "student_index_number": student_index,
            "timestamp": datetime.utcnow(),
            "status": "present",
            "latitude": latitude,
            "longitude": longitude
        }
        mongo.db.attendance.insert_one(attendance_doc)

        return {"message": "Attendance submitted"}, 201

    except Exception as e:
        return {"error": str(e)}, 500


def get_session_attendance(session_id):
    """
    Retrieve all attendance records for a session.
    """
    try:
        records = mongo.db.attendance.find({"session_id": ObjectId(session_id)})
        return [
            {
                "id": str(r["_id"]),
                "student_id": str(r["student_id"]),
                "student_index_number": r.get("student_index_number"),
                "timestamp": r.get("timestamp"),
                "status": r.get("status"),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude")
            } for r in records
        ], 200

    except Exception:
        return {"error": "Invalid session ID"}, 400
