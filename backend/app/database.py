# backend/app/database.py
from flask_pymongo import PyMongo

# Create a single PyMongo instance (shared app-wide)
mongo = PyMongo()


def init_db(app):
    """
    Initialize the MongoDB connection and ensure indexes are created.
    """
    mongo.init_app(app)

    # Import and call ensure_all_indexes from models to set up database indexes
    try:
        from app.models import ensure_all_indexes
        with app.app_context():
            ensure_all_indexes()
            print("[OK] Database indexes ensured")
    except ImportError as e:
        print(f"[WARN] Could not ensure indexes (import error): {e}")
    except Exception as e:
        print(f"[WARN] Error ensuring indexes: {e}")

    return mongo
