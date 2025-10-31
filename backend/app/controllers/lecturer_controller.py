# backend/app/controllers/lecturer_controller.py
from bson import ObjectId
from backend.app.database import mongo
from datetime import datetime, timedelta
import uuid
import os
import qrcode
import io
import base64

# -------------------- Courses --------------------
def create_course(lecturer_id, data):
    """
    Create a new course by a lecturer.
    """
    try:
        if not data.get("name"):
            return {"error": "Course name is required"}, 400

        course_doc = {
            "name": data.get("name"),
            "description": data.get("description"),
            "lecturer_id": ObjectId(lecturer_id),
            "student_ids": [],
            "created_at": datetime.utcnow()
        }

        course_id = mongo.db.courses.insert_one(course_doc).inserted_id
        return {"message": "Course created", "course_id": str(course_id)}, 201

    except Exception as e:
        return {"error": str(e)}, 500

def get_courses_by_lecturer(lecturer_id):
    """
    Retrieve all courses assigned to a specific lecturer.
    """
    try:
        courses = mongo.db.courses.find({"lecturer_id": ObjectId(lecturer_id)})
        return [{
            "id": str(c["_id"]),
            "name": c["name"],
            "description": c.get("description"),
            "student_count": len(c.get("student_ids", []))
        } for c in courses], 200
    except Exception as e:
        return {"error": str(e)}, 500

# -------------------- Sessions --------------------
def create_session(course_id, data):
    """
    Create a new session for a course with optional geolocation and QR code.
    """
    try:
        course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
        if not course:
            return {"error": "Course not found"}, 404

        # Validate QR expiration minutes
        qr_expires_in = data.get("qr_expires_in_minutes", 15)
        try:
            qr_expires_in = int(qr_expires_in)
        except ValueError:
            return {"error": "qr_expires_in_minutes must be an integer"}, 400

        session_doc = {
            "course_id": ObjectId(course_id),
            "session_date": data.get("session_date"),
            "start_time": data.get("start_time"),
            "end_time": data.get("end_time"),
            "is_active": True,
            "qr_code_uuid": str(uuid.uuid4()),
            "expires_at": datetime.utcnow() + timedelta(minutes=qr_expires_in),
            "location": data.get("location"),  # Optional dict with 'lat' and 'lng'
            "created_at": datetime.utcnow()
        }

        session_id = mongo.db.sessions.insert_one(session_doc).inserted_id

        # Generate QR code base64
        qr_base_url = os.getenv("QR_BASE_URL", "http://localhost:5000/api/attendance/scan")
        qr_data = f"{qr_base_url}/{session_doc['qr_code_uuid']}"
        qr_img = qrcode.make(qr_data)
        buffer = io.BytesIO()
        qr_img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "message": "Session created",
            "session_id": str(session_id),
            "qr_code_uuid": session_doc["qr_code_uuid"],
            "qr_code_base64": qr_base64,
            "expires_at": session_doc["expires_at"].isoformat(),
            "location_required": bool(session_doc["location"])
        }, 201

    except Exception as e:
        return {"error": str(e)}, 500

def get_sessions_by_course(course_id):
    """
    Retrieve all sessions for a course.
    """
    try:
        sessions = mongo.db.sessions.find({"course_id": ObjectId(course_id)})
        return [{
            "id": str(s["_id"]),
            "session_date": s.get("session_date"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "is_active": s.get("is_active", True),
            "qr_code_uuid": s.get("qr_code_uuid"),
            "expires_at": s.get("expires_at").isoformat() if s.get("expires_at") else None,
            "location_required": bool(s.get("location"))
        } for s in sessions], 200
    except Exception as e:
        return {"error": str(e)}, 500

def deactivate_session(session_id):
    """
    Mark a session as inactive.
    """
    try:
        result = mongo.db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"is_active": False}}
        )
        if result.matched_count == 0:
            return {"error": "Session not found"}, 404
        return {"message": "Session deactivated"}, 200
    except Exception as e:
        return {"error": str(e)}, 500
