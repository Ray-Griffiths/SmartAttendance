# backend/app/utils/serializers.py
def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "username": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role"),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
    }

def serialize_course(course):
    return {
        "id": str(course["_id"]),
        "name": course.get("name"),
        "description": course.get("description"),
        "lecturer_id": str(course.get("lecturer_id")) if course.get("lecturer_id") else None,
        "student_ids": [str(sid) for sid in course.get("student_ids", [])],
        "created_at": course.get("created_at").isoformat() if course.get("created_at") else None
    }

def serialize_student(student):
    return {
        "id": str(student["_id"]),
        "name": student.get("name"),
        "index_number": student.get("index_number"),
        "email": student.get("email"),
        "created_at": student.get("created_at").isoformat() if student.get("created_at") else None
    }

def serialize_attendance(att):
    return {
        "id": str(att["_id"]),
        "session_id": str(att["session_id"]),
        "student_id": str(att["student_id"]),
        "student_index_number": att.get("student_index_number"),
        "timestamp": att.get("timestamp").isoformat() if att.get("timestamp") else None,
        "status": att.get("status"),
        "latitude": att.get("latitude"),
        "longitude": att.get("longitude")
    }

def serialize_session(session):
    return {
        "id": str(session.get("_id")),
        "course_id": str(session.get("course_id")) if session.get("course_id") else None,
        "lecturer_id": str(session.get("lecturer_id")) if session.get("lecturer_id") else None,
        "qr_code": session.get("qr_code"),
        "qr_expiry": session.get("qr_expiry").isoformat() if session.get("qr_expiry") else None,
        "gps_location": session.get("gps_location"),
        "status": session.get("status"),
        "created_at": session.get("created_at").isoformat() if session.get("created_at") else None
    }

def serialize_attendance_log(log):
    return {
        "id": str(log["_id"]),
        "attendance_id": str(log.get("attendance_id")) if log.get("attendance_id") else None,
        "student_id": str(log.get("student_id")) if log.get("student_id") else None,
        "session_id": str(log.get("session_id")) if log.get("session_id") else None,
        "status": log.get("status"),
        "timestamp": log.get("timestamp").isoformat() if log.get("timestamp") else None,
        "latitude": log.get("latitude"),
        "longitude": log.get("longitude"),
        "extra": log.get("extra")
    }
