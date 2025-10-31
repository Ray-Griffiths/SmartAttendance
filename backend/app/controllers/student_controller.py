# backend/app/controllers/student_controller.py
from bson import ObjectId
from backend.app.database import mongo
from datetime import datetime

# -------------------- Courses --------------------
def get_enrolled_courses(student_id):
    """
    Retrieve all courses a student is enrolled in.
    """
    try:
        courses = mongo.db.courses.find({"student_ids": ObjectId(student_id)})
        return [{
            "id": str(c["_id"]),
            "name": c["name"],
            "description": c.get("description"),
            "lecturer_id": str(c["lecturer_id"]),
            "student_count": len(c.get("student_ids", []))
        } for c in courses], 200
    except Exception as e:
        return {"error": str(e)}, 500

# -------------------- Sessions --------------------
def get_course_sessions_for_student(student_id, course_id):
    """
    Retrieve sessions for a course, only if the student is enrolled.
    """
    try:
        # Ensure student is enrolled
        course = mongo.db.courses.find_one({"_id": ObjectId(course_id), "student_ids": ObjectId(student_id)})
        if not course:
            return {"error": "Not enrolled in this course"}, 403

        sessions = mongo.db.sessions.find({"course_id": ObjectId(course_id)})
        return [{
            "id": str(s["_id"]),
            "session_date": s.get("session_date"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "is_active": s.get("is_active", True),
            "qr_code_uuid": s.get("qr_code_uuid"),
            "expires_at": s.get("expires_at").isoformat() if s.get("expires_at") else None,
            "location": s.get("location")
        } for s in sessions], 200

    except Exception as e:
        return {"error": str(e)}, 500

# -------------------- Attendance --------------------
def get_attendance_for_course(student_id, course_id):
    """
    Retrieve attendance records for a student in a specific course.
    """
    try:
        # Ensure student is enrolled
        course = mongo.db.courses.find_one({"_id": ObjectId(course_id), "student_ids": ObjectId(student_id)})
        if not course:
            return {"error": "Not enrolled in this course"}, 403

        # Fetch attendance
        attendance_records = mongo.db.attendance.find({
            "student_id": ObjectId(student_id),
            "session_id": {"$in": [s["_id"] for s in mongo.db.sessions.find({"course_id": ObjectId(course_id)})]}
        })

        return [{
            "session_id": str(a["session_id"]),
            "status": a.get("status"),
            "timestamp": a.get("timestamp").isoformat() if a.get("timestamp") else None,
            "latitude": a.get("latitude"),
            "longitude": a.get("longitude")
        } for a in attendance_records], 200

    except Exception as e:
        return {"error": str(e)}, 500
