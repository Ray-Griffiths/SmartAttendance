# backend/tests/conftest.py
import os
import sys
import pytest

# Ensure backend package dir is on sys.path so 'app' can be imported when tests
# are executed from the repository root or other working directories.
HERE = os.path.dirname(__file__)  # backend/tests
BACKEND_DIR = os.path.dirname(HERE)     # backend
REPO_ROOT = os.path.dirname(BACKEND_DIR) # repo root
# Ensure both the repo root and backend dir are on sys.path so imports like
# 'backend.app' and 'app' resolve depending on how tests are invoked.
for p in (REPO_ROOT, BACKEND_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

# Try importing the application package using either layout: 'app' or 'backend.app'
try:
    from app import create_app
    from app.database import mongo
except ModuleNotFoundError:
    from backend.app import create_app
    from backend.app.database import mongo
from bson import ObjectId

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "MONGO_DB_NAME": "smartattendance_test",  # separate test DB
        "JWT_ACCESS_TOKEN_EXPIRES": 3600
    })

    with app.app_context():
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def test_user(app):
    """Create a sample student user in the test DB."""
    user = {
        "name": "Test Student",
        "email": "teststudent@example.com",
        "index_number": "20250099",
    }
    result = mongo.db.students.insert_one(user)
    user["_id"] = result.inserted_id
    return user
