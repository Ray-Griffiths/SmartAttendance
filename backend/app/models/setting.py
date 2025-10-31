# backend/models/setting.py
from typing import Any, Dict, Optional
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo

class Setting:
    """
    Global system settings (e.g., institution name, timezone, auto-close time, etc.)
    Stores key-value pairs with automatic upsert and timestamp tracking.
    """
    collection_name = "settings"

    def __init__(
        self,
        key: str,
        value: Any,
        _id: Optional[ObjectId] = None,
        updated_at: Optional[datetime] = None,
    ):
        self._id = _id
        self.key = key
        self.value = value
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def collection(cls):
        return mongo.db[cls.collection_name]

    def to_mongo(self) -> Dict[str, Any]:
        doc = {"key": self.key, "value": self.value, "updated_at": self.updated_at}
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["Setting"]:
        if not doc:
            return None
        return cls(
            key=doc.get("key"),
            value=doc.get("value"),
            _id=doc.get("_id"),
            updated_at=doc.get("updated_at"),
        )

    def save(self):
        """Insert or update a setting value."""
        self.updated_at = datetime.utcnow()
        doc = self.to_mongo()
        result = self.collection().find_one_and_update(
            {"key": self.key},
            {"$set": doc},
            upsert=True,
            return_document=True,
        )
        if result and "_id" in result:
            self._id = result["_id"]

    @classmethod
    def get(cls, key: str, default: Any = None) -> Any:
        doc = cls.collection().find_one({"key": key})
        return doc.get("value") if doc else default

    @classmethod
    def all(cls) -> Dict[str, Any]:
        """Return all settings as a dictionary."""
        return {d["key"]: d["value"] for d in cls.collection().find()}

    @classmethod
    def delete(cls, key: str) -> bool:
        """Delete a setting by key."""
        res = cls.collection().delete_one({"key": key})
        return res.deleted_count == 1

    @classmethod
    def ensure_indexes(cls):
        """Ensure fast lookups for keys."""
        cls.collection().create_index("key", unique=True)
