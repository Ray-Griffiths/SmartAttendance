# backend/utils/serializers.py
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
