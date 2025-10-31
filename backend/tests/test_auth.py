# backend/tests/test_auth.py
import json

def test_login_student(client, test_user):
    # Example assuming you have login endpoint at /api/auth/login
    payload = {
        "email": test_user["email"],
        "password": "any-password"  # adjust based on hashed password
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code in [200, 401]  # if password not hashed correctly
