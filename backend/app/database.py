# backend/app/database.py
from flask_pymongo import PyMongo

# Create a single PyMongo instance (shared app-wide)
mongo = PyMongo()


def init_db(app):
    """
    Initialize the MongoDB connection and ensure indexes are created.
    """
    mongo.init_app(app)

    # Import models here to avoid circular imports
    try:
        from app.models import ensure_all_indexes
        ensure_all_indexes()
    except ImportError:
        # If models or ensure_all_indexes isn't ready yet, just skip
        print("⚠️  Skipping ensure_all_indexes (not found)")

    return mongo
