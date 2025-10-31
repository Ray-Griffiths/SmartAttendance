# backend/models/attendance.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo
from .user import _oid

# ------------------------
# Attendance Status Choices
# ------------------------
STATUS_PRESENT = "present"
STATUS_ABSENT = "absent"
STATUS_LATE = "late"
STATUS_EXCUSED = "excused"

STATUS_CHOICES = {STATUS_PRESENT, STATUS_ABSENT, STATUS_LATE, STATUS_EXCUSED}


class Attendance:
    """
    Attendance model for SmartAttendance system.
    Tracks a student's attendance for a given session.
    Each (session_id, student_id) pair is unique.
    """

    collection_name = "attendance"

    def __init__(
        self,
        session_id: str,
        student_id: str,
        status: str = STATUS_ABSENT,
        marked_at: Optional[datetime] = None,
        marked_by: Optional[str] = None,
        note: Optional[str] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _oid(_id)
        self.session_id = _oid(session_id)
        self.student_id = _oid(student_id)

        if status not in STATUS_CHOICES:
            raise ValueError(f"status must be one of {STATUS_CHOICES}")

        self.status = status
        self.marked_at = marked_at or datetime.utcnow()
        self.marked_by = _oid(marked_by) if marked_by else None
        self.note = note

    # -------------------------
    # MongoDB Collection Access
    # -------------------------
    @classmethod
    def collection(cls):
        return mongo.db[cls.collection_name]

    # -------------------------
    # Serialization
    # -------------------------
    def to_mongo(self) -> Dict[str, Any]:
        """Convert instance to MongoDB-compatible document"""
        doc = {
            "session_id": self.session_id,
            "student_id": self.student_id,
            "status": self.status,
            "marked_at": self.marked_at,
            "marked_by": self.marked_by,
            "note": self.note,
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    def to_json(self) -> Dict[str, Any]:
        """Return JSON-serializable dictionary"""
        return {
            "id": str(self._id) if self._id else None,
            "session_id": str(self.session_id),
            "student_id": str(self.student_id),
            "status": self.status,
            "marked_at": self.marked_at.isoformat() if self.marked_at else None,
            "marked_by": str(self.marked_by) if self.marked_by else None,
            "note": self.note,
        }

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["Attendance"]:
        """Recreate instance from MongoDB document"""
        if not doc:
            return None
        return cls(
            session_id=doc.get("session_id"),
            student_id=doc.get("student_id"),
            status=doc.get("status", STATUS_ABSENT),
            marked_at=doc.get("marked_at"),
            marked_by=doc.get("marked_by"),
            note=doc.get("note"),
            _id=doc.get("_id"),
        )

    # -------------------------
    # CRUD Operations
    # -------------------------
    def save(self) -> "Attendance":
        """
        Upsert: ensures one record per (session_id, student_id).
        """
        self.marked_at = datetime.utcnow()
        doc = self.to_mongo()

        result = self.collection().find_one_and_update(
            {"session_id": self.session_id, "student_id": self.student_id},
            {"$set": doc},
            upsert=True,
            return_document=True,
        )

        if result and "_id" in result:
            self._id = result["_id"]
        else:
            inserted = self.collection().insert_one(doc)
            self._id = inserted.inserted_id
        return self

    @classmethod
    def create(cls, data: Dict[str, Any]) -> "Attendance":
        """Create and save a new attendance record"""
        att = cls(**data)
        return att.save()

    @classmethod
    def find_by_id(cls, attendance_id: str) -> Optional["Attendance"]:
        doc = cls.collection().find_one({"_id": _oid(attendance_id)})
        return cls.from_mongo(doc)

    @classmethod
    def delete_record(cls, attendance_id: str) -> bool:
        """Delete an attendance record"""
        res = cls.collection().delete_one({"_id": _oid(attendance_id)})
        return res.deleted_count > 0

    # -------------------------
    # Business Logic
    # -------------------------
    @classmethod
    def mark(
        cls,
        session_id: str,
        student_id: str,
        status: str,
        marked_by: Optional[str] = None,
        note: Optional[str] = None,
    ) -> "Attendance":
        """Mark or update a student's attendance status"""
        if status not in STATUS_CHOICES:
            raise ValueError(f"Invalid status: {status}")
        att = cls(
            session_id=session_id,
            student_id=student_id,
            status=status,
            marked_by=marked_by,
            note=note,
        )
        return att.save()

    @classmethod
    def get_for_session(cls, session_id: str) -> List["Attendance"]:
        """Get all attendance records for a specific session"""
        cursor = cls.collection().find({"session_id": _oid(session_id)})
        return [cls.from_mongo(doc) for doc in cursor]

    @classmethod
    def get_for_student(cls, student_id: str, limit: int = 100) -> List["Attendance"]:
        """Get recent attendance history for a student"""
        cursor = (
            cls.collection()
            .find({"student_id": _oid(student_id)})
            .sort("marked_at", -1)
            .limit(limit)
        )
        return [cls.from_mongo(doc) for doc in cursor]

    @classmethod
    def count_summary_for_student(cls, student_id: str) -> Dict[str, int]:
        """
        Returns a summary count of attendance statuses for a student
        across all sessions.
        """
        pipeline = [
            {"$match": {"student_id": _oid(student_id)}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        results = list(cls.collection().aggregate(pipeline))
        summary = {r["_id"]: r["count"] for r in results}
        for status in STATUS_CHOICES:
            summary.setdefault(status, 0)
        return summary

    @classmethod
    def get_for_course(cls, course_id: str) -> List["Attendance"]:
        """
        Returns attendance records for all sessions belonging to a course.
        (Assumes sessions store course_id references.)
        """
        from .session import Session  # avoid circular import
        session_ids = [s._id for s in Session.find_by_course(course_id)]
        if not session_ids:
            return []
        cursor = cls.collection().find({"session_id": {"$in": session_ids}})
        return [cls.from_mongo(doc) for doc in cursor]

    # -------------------------
    # Index Management
    # -------------------------
    @classmethod
    def ensure_indexes(cls):
        """Ensures proper indexing for performance"""
        cls.collection().create_index(
            [("session_id", 1), ("student_id", 1)], unique=True
        )
        cls.collection().create_index("student_id")
        cls.collection().create_index("session_id")
        cls.collection().create_index("status")
        cls.collection().create_index("marked_at")
