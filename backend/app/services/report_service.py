# backend/services/report_service.py
from datetime import datetime
from bson import ObjectId
from app.database import mongo
from app.utils.serializers import serialize_attendance

def generate_attendance_report(course_id, start_date=None, end_date=None):
    """
    Generate a list of attendance records for a course within an optional date range.
    """
    query = {"course_id": ObjectId(course_id)}
    if start_date and end_date:
        query["timestamp"] = {
            "$gte": datetime.fromisoformat(start_date),
            "$lte": datetime.fromisoformat(end_date)
        }

    records = list(mongo.db.attendance.find(query))
    return [serialize_attendance(r) for r in records]

def summarize_course_attendance(course_id):
    """
    Summarize attendance counts per student for a course.
    """
    pipeline = [
        {"$match": {"course_id": ObjectId(course_id)}},
        {"$group": {"_id": "$student_id", "attendance_count": {"$sum": 1}}},
    ]
    summary = list(mongo.db.attendance.aggregate(pipeline))
    for s in summary:
        s["student_id"] = str(s["_id"])
        del s["_id"]
    return summary
