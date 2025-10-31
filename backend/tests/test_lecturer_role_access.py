import pytest
from backend.app.database import mongo
from bson import ObjectId
from flask_jwt_extended import create_access_token


def make_token(app, user_id):
    # create_access_token requires app context/config
    with app.app_context():
        return create_access_token(identity=str(user_id))


def test_lecturer_can_access_courses(client, app):
    # create lecturer
    lecturer = {
        "username": "lecturer1",
        "email": "lecturer1@example.com",
        "password_hash": "fakehash",
        "role": "lecturer"
    }
    res = mongo.db.lecturers.insert_one(lecturer)
    lecturer_id = res.inserted_id

    token = make_token(app, lecturer_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/lecturer/courses", headers=headers)
    assert resp.status_code == 200


def test_student_cannot_access_lecturer_routes(client, app):
    # create student
    student = {
        "username": "student1",
        "email": "student1@example.com",
        "index_number": "2025001"
    }
    res = mongo.db.students.insert_one(student)
    student_id = res.inserted_id

    token = make_token(app, student_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/lecturer/courses", headers=headers)
    assert resp.status_code in (401, 403)


def test_no_token_denied(client):
    resp = client.get("/api/lecturer/courses")
    assert resp.status_code == 401
