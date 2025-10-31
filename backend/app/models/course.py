# backend/models/course.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo
from .user import _oid


class Course:
    """
    Course model representing a course in the SmartAttendance system.
    Each course can have multiple lecturers and enrolled students.
    """

    collection_name = "courses"

    def __init__(
        self,
        code: str,
        title: str,
        description: Optional[str] = None,
        lecturer_ids: Optional[List[ObjectId]] = None,
        student_ids: Optional[List[ObjectId]] = None,
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **extra,
    ):
        self._id = _oid(_id)
        self.code = code.upper()
        self.title = title
        self.description = description
        self.lecturer_ids = [_oid(x) for x in (lecturer_ids or [])]
        self.student_ids = [_oid(x) for x in (student_ids or [])]
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.extra = extra or {}

    # -------------------------
    # MongoDB Collection Access
    # -------------------------
    @classmethod
    def collection(cls):
        return mongo.db[cls.collection_name]

    # -------------------------
    # Serialization Helpers
    # -------------------------
    def to_mongo(self) -> Dict[str, Any]:
        doc = {
            "code": self.code,
            "title": self.title,
            "description": self.description,
            "lecturer_ids": self.lecturer_ids,
            "student_ids": self.student_ids,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            **(self.extra or {}),
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    def to_json(self) -> Dict[str, Any]:
        """Return JSON-serializable representation"""
        return {
            "id": str(self._id) if self._id else None,
            "code": self.code,
            "title": self.title,
            "description": self.description,
            "lecturers": [str(x) for x in self.lecturer_ids],
            "students": [str(x) for x in self.student_ids],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["Course"]:
        """Reconstruct object from MongoDB document"""
        if not doc:
            return None
        return cls(
            code=doc.get("code"),
            title=doc.get("title"),
            description=doc.get("description"),
            lecturer_ids=doc.get("lecturer_ids", []),
            student_ids=doc.get("student_ids", []),
            _id=doc.get("_id"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )

    # -------------------------
    # CRUD Operations
    # -------------------------
    def save(self) -> "Course":
        """Insert or update course"""
        now = datetime.utcnow()
        self.updated_at = now
        doc = self.to_mongo()

        if self._id:
            self.collection().update_one({"_id": self._id}, {"$set": doc})
        else:
            doc["created_at"] = now
            result = self.collection().insert_one(doc)
            self._id = result.inserted_id
        return self

    @classmethod
    def create(cls, data: Dict[str, Any]) -> "Course":
        """Insert new course"""
        course = cls(**data)
        return course.save()

    @classmethod
    def find_by_id(cls, course_id: str) -> Optional["Course"]:
        doc = cls.collection().find_one({"_id": _oid(course_id)})
        return cls.from_mongo(doc)

    @classmethod
    def find_by_code(cls, code: str) -> Optional["Course"]:
        doc = cls.collection().find_one({"code": code.upper()})
        return cls.from_mongo(doc)

    @classmethod
    def find_all(cls, filters: Optional[Dict[str, Any]] = None) -> List["Course"]:
        query = filters or {}
        cursor = cls.collection().find(query).sort("code", 1)
        return [cls.from_mongo(doc) for doc in cursor]

    @classmethod
    def update_course(cls, course_id: str, updates: Dict[str, Any]) -> bool:
        """Update a course document"""
        updates["updated_at"] = datetime.utcnow()
        res = cls.collection().update_one(
            {"_id": _oid(course_id)},
            {"$set": updates},
        )
        return res.modified_count > 0

    @classmethod
    def delete_course(cls, course_id: str) -> bool:
        """Delete a course"""
        res = cls.collection().delete_one({"_id": _oid(course_id)})
        return res.deleted_count > 0

    # -------------------------
    # Relationship Management
    # -------------------------
    @classmethod
    def add_student(cls, course_id: str, student_id: str) -> bool:
        res = cls.collection().update_one(
            {"_id": _oid(course_id)},
            {
                "$addToSet": {"student_ids": _oid(student_id)},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return res.modified_count > 0

    @classmethod
    def remove_student(cls, course_id: str, student_id: str) -> bool:
        res = cls.collection().update_one(
            {"_id": _oid(course_id)},
            {
                "$pull": {"student_ids": _oid(student_id)},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return res.modified_count > 0

    @classmethod
    def add_lecturer(cls, course_id: str, lecturer_id: str) -> bool:
        res = cls.collection().update_one(
            {"_id": _oid(course_id)},
            {
                "$addToSet": {"lecturer_ids": _oid(lecturer_id)},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return res.modified_count > 0

    @classmethod
    def remove_lecturer(cls, course_id: str, lecturer_id: str) -> bool:
        res = cls.collection().update_one(
            {"_id": _oid(course_id)},
            {
                "$pull": {"lecturer_ids": _oid(lecturer_id)},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return res.modified_count > 0

    @classmethod
    def find_by_lecturer(cls, lecturer_id: str) -> List["Course"]:
        """Find all courses taught by a lecturer"""
        results = cls.collection().find({"lecturer_ids": _oid(lecturer_id)})
        return [cls.from_mongo(doc) for doc in results]

    @classmethod
    def find_by_student(cls, student_id: str) -> List["Course"]:
        """Find all courses where a student is enrolled"""
        results = cls.collection().find({"student_ids": _oid(student_id)})
        return [cls.from_mongo(doc) for doc in results]

    # -------------------------
    # Index Management
    # -------------------------
    @classmethod
    def ensure_indexes(cls):
        """Create database indexes for performance and uniqueness"""
        cls.collection().create_index("code", unique=True)
        cls.collection().create_index("title")
        cls.collection().create_index("student_ids")
        cls.collection().create_index("lecturer_ids")
        cls.collection().create_index("created_at")
        cls.collection().create_index("updated_at")
