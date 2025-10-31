# backend/models/system_log.py
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo
from .user import _oid


class SystemLog:
    """
    Audit trail for system events, errors, and key user actions.
    Provides simple APIs for logging, retrieval, and indexing.
    """
    collection_name = "system_logs"

    def __init__(
        self,
        action: str,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        level: str = "info",
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
    ):
        self._id = _oid(_id)
        self.action = action
        self.user_id = _oid(user_id) if user_id else None
        self.details = details or {}
        self.level = level
        self.created_at = created_at or datetime.utcnow()

    # -----------------------------
    # Mongo Collection
    # -----------------------------
    @classmethod
    def collection(cls):
        return mongo.db[cls.collection_name]

    # -----------------------------
    # Serialization Helpers
    # -----------------------------
    def to_mongo(self) -> Dict[str, Any]:
        doc = {
            "action": self.action,
            "user_id": self.user_id,
            "details": self.details,
            "level": self.level,
            "created_at": self.created_at,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    def to_json(self) -> Dict[str, Any]:
        """Return JSON-safe dictionary for API responses."""
        return {
            "id": str(self._id),
            "action": self.action,
            "user_id": str(self.user_id) if self.user_id else None,
            "details": self.details,
            "level": self.level,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["SystemLog"]:
        """Recreate SystemLog instance from MongoDB document."""
        if not doc:
            return None
        return cls(
            action=doc.get("action"),
            user_id=doc.get("user_id"),
            details=doc.get("details"),
            level=doc.get("level", "info"),
            _id=doc.get("_id"),
            created_at=doc.get("created_at"),
        )

    # -----------------------------
    # CRUD / Business Logic
    # -----------------------------
    def save(self) -> "SystemLog":
        self.collection().insert_one(self.to_mongo())
        return self

    @classmethod
    def log(
        cls,
        action: str,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        level: str = "info",
    ) -> "SystemLog":
        """Shortcut to log a system action."""
        entry = cls(action, user_id, details, level)
        return entry.save()

    @classmethod
    def find_recent(cls, limit: int = 50) -> List["SystemLog"]:
        """Retrieve recent system logs (newest first)."""
        cursor = cls.collection().find().sort("created_at", -1).limit(limit)
        return [cls.from_mongo(d) for d in cursor]

    # -----------------------------
    # Index Management
    # -----------------------------
    @classmethod
    def ensure_indexes(cls):
        cls.collection().create_index("user_id")
        cls.collection().create_index("level")
        cls.collection().create_index("created_at")
        cls.collection().create_index([("level", 1), ("created_at", -1)])
