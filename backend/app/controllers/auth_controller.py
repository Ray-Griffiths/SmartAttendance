# backend/app/controllers/auth_controller.py
import os
from datetime import datetime
from backend.app.database import mongo
from backend.app.auth.auth_utils import hash_password, verify_password, generate_tokens

# Detect whether to embed role in JWT or not
USE_JWT_ROLE = os.getenv("USE_JWT_ROLE", "True").lower() == "true"

# -------------------- Authentication --------------------
def register_user(name, email, password, role="student"):
    """Register a new user into the system."""
    if mongo.db.users.find_one({"email": email}):
        return {"error": "Email already exists"}, 400

    user_doc = {
        "name": name.strip(),
        "email": email.lower().strip(),
        "password": hash_password(password),
        "role": role.lower(),
        "created_at": datetime.utcnow()
    }

    user_id = mongo.db.users.insert_one(user_doc).inserted_id

    return {
        "message": "User registered successfully",
        "user": {
            "id": str(user_id),
            "name": user_doc["name"],
            "email": user_doc["email"],
            "role": user_doc["role"]
        }
    }, 201


def login_user(email, password):
    """Authenticate user credentials and issue JWT tokens."""
    user = mongo.db.users.find_one({"email": email.lower().strip()})
    if not user or not verify_password(password, user["password"]):
        return {"error": "Invalid credentials"}, 401

    # Identity structure depends on USE_JWT_ROLE setting
    identity = (
        {"id": str(user["_id"]), "role": user["role"]}
        if USE_JWT_ROLE
        else str(user["_id"])
    )

    access_token, refresh_token = generate_tokens(
        user_id=identity if isinstance(identity, str) else identity["id"],
        role=user["role"]
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }, 200
