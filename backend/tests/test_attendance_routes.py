# backend/tests/test_attendance_routes.py
import json
from bson import ObjectId

def test_mark_attendance(client, test_user):
    # Create test session
    session = {"course_id": ObjectId(), "session_date": "2025-10-24"}
    session_id = str(client.application.mongo.db.sessions.insert_one(session).inserted_id)

    payload = {"status": "present"}
    student_id = str(test_user["_id"])
    response = client.post(f"/api/attendance/{session_id}/mark/{student_id}", json=payload)
    assert response.status_code in [200, 201]
