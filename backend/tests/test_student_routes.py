# backend/tests/test_student_routes.py
import json
from bson import ObjectId

def test_get_student(client, test_user):
    student_id = str(test_user["_id"])
    response = client.get(f"/api/students/{student_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == student_id

def test_enroll_course(client, test_user):
    # Create test course
    course = {"name": "Test Course", "student_ids": [], "lecturer_id": ObjectId()}
    course_id = str(client.application.mongo.db.courses.insert_one(course).inserted_id)

    payload = {}
    student_id = str(test_user["_id"])
    response = client.post(f"/api/students/{student_id}/courses/{course_id}/enroll", json=payload)
    assert response.status_code == 200
    assert "Enrolled in course" in response.get_json()["message"]
