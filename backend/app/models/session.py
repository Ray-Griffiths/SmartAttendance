# backend/models/session.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo
from .user import _oid


class Session:
    """
    Represents a specific class (event) tied to a Course.
    """
    collection_name = "sessions"

    def __init__(
        self,
        course_id: str,
        session_date: datetime,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        location: Optional[str] = None,
        topic: Optional[str] = None,
        created_by: Optional[str] = None,
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **extra,
    ):
        self._id = _oid(_id)
        self.course_id = _oid(course_id)
        # store session_date as date or datetime (caller should provide datetime)
        self.session_date = session_date
        self.start_time = start_time
        self.end_time = end_time
        self.location = location
        self.topic = topic
        self.created_by = _oid(created_by) if created_by else None
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.extra = extra or {}

    @classmethod
    def collection(cls):
        return mongo.db[cls.collection_name]

    def to_mongo(self) -> Dict[str, Any]:
        doc = {
            "course_id": self.course_id,
            "session_date": self.session_date,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "location": self.location,
            "topic": self.topic,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            **(self.extra or {}),
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["Session"]:
        if not doc:
            return None
        return cls(
            course_id=doc.get("course_id"),
            session_date=doc.get("session_date"),
            start_time=doc.get("start_time"),
            end_time=doc.get("end_time"),
            location=doc.get("location"),
            topic=doc.get("topic"),
            created_by=doc.get("created_by"),
            _id=doc.get("_id"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )

    def save(self) -> "Session":
        self.updated_at = datetime.utcnow()
        doc = self.to_mongo()
        if self._id:
            self.collection().update_one({"_id": self._id}, {"$set": doc})
        else:
            res = self.collection().insert_one(doc)
            self._id = res.inserted_id
        return self

    def delete(self) -> bool:
        if not self._id:
            return False
        res = self.collection().delete_one({"_id": self._id})
        return res.deleted_count == 1

    @classmethod
    def find_by_id(cls, id_val: str) -> Optional["Session"]:
        doc = cls.collection().find_one({"_id": _oid(id_val)})
        return cls.from_mongo(doc)

    @classmethod
    def find_for_course(cls, course_id: str, limit: int = 50) -> List["Session"]:
        cursor = cls.collection().find({"course_id": _oid(course_id)}).sort("session_date", -1).limit(limit)
        return [cls.from_mongo(d) for d in cursor]

    @classmethod
    def upcoming_for_course(cls, course_id: str, from_date: datetime = None, limit: int = 20) -> List["Session"]:
        q = {"course_id": _oid(course_id)}
        if from_date:
            q["session_date"] = {"$gte": from_date}
        cursor = cls.collection().find(q).sort("session_date", 1).limit(limit)
        return [cls.from_mongo(d) for d in cursor]

    @classmethod
    def ensure_indexes(cls):
        cls.collection().create_index([("course_id", 1), ("session_date", -1)])
