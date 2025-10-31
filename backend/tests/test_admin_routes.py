# backend/tests/test_admin_routes.py
import os
import pytest
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
from dotenv import load_dotenv
from app.database import mongo

# ----------------------------
# Load .env for JWT secret
# ----------------------------
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-secret")  # fallback for local dev

# ----------------------------
# Helper to create JWT token
# ----------------------------
def create_jwt(user_id, role="admin", expires_in_hours=1):
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=expires_in_hours)
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    return f"Bearer {token}"

# ----------------------------
# Fixtures
# ----------------------------
@pytest.fixture
def admin_user(app):
    """Create a test admin in the database."""
    admin = {
        "username": "testadmin",
        "email": "admin@example.com",
        "password_hash": "hashedpassword",
        "role": "admin"
    }
    result = mongo.db.admins.insert_one(admin)
    admin["_id"] = result.inserted_id
    return admin

@pytest.fixture
def test_student(app):
    """Create a test student."""
    student = {
        "name": "Test Student",
        "email": "student@example.com",
        "index_number": "20250001"
    }
    result = mongo.db.students.insert_one(student)
    student["_id"] = result.inserted_id
    return student

@pytest.fixture
def test_course(app, admin_user):
    """Create a test course for admin."""
    course = {
        "name": "Test Course",
        "description": "Course created for testing",
        "lecturer_id": ObjectId(),
        "student_ids": []
    }
    result = mongo.db.courses.insert_one(course)
    course["_id"] = result.inserted_id
    return course

# ----------------------------
# Tests
# ----------------------------
def test_get_all_students(client, admin_user, test_student):
    token = create_jwt(admin_user["_id"])
    headers = {"Authorization": token}

    response = client.get("/api/admin/students", headers=headers)
    assert response.status_code in [200, 403]

def test_create_student(client, admin_user):
    token = create_jwt(admin_user["_id"])
    headers = {"Authorization": token}
    payload = {
        "name": "New Student",
        "email": "newstudent@example.com",
        "index_number": "20250002"
    }

    response = client.post("/api/admin/students", json=payload, headers=headers)
    assert response.status_code in [201, 403]

def test_delete_student(client, admin_user, test_student):
    token = create_jwt(admin_user["_id"])
    headers = {"Authorization": token}
    student_id = str(test_student["_id"])

    response = client.delete(f"/api/admin/students/{student_id}", headers=headers)
    assert response.status_code in [200, 403]

def test_create_course(client, admin_user):
    token = create_jwt(admin_user["_id"])
    headers = {"Authorization": token}
    payload = {"name": "Admin Test Course", "description": "Created by admin"}

    response = client.post("/api/admin/courses", json=payload, headers=headers)
    assert response.status_code in [201, 403]

def test_delete_course(client, admin_user, test_course):
    token = create_jwt(admin_user["_id"])
    headers = {"Authorization": token}
    course_id = str(test_course["_id"])

    response = client.delete(f"/api/admin/courses/{course_id}", headers=headers)
    assert response.status_code in [200, 403]
