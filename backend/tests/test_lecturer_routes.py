# backend/tests/test_lecturer_routes.py
import json

def test_create_course(client):
    payload = {"name": "New Test Course", "description": "Test description"}
    response = client.post("/api/lecturer/courses", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert "course_id" in data
