# backend/models/student.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.app.database import mongo
from .user import User, _oid, ROLE_STUDENT


class Student(User):
    """
    Student model extending User with student-specific data.
    Each student has inherited user fields + matric number, program, year, and courses.
    """

    collection_name = "students"

    def __init__(
        self,
        username: str,
        email: str,
        password: Optional[str] = None,
        matric_number: Optional[str] = None,
        program: Optional[str] = None,
        year: Optional[int] = 1,
        courses: Optional[List[ObjectId]] = None,
        user_id: Optional[ObjectId] = None,  # optional link to user collection
        active: bool = True,
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **extra,
    ):
        super().__init__(
            username=username,
            email=email,
            password=password,
            role=ROLE_STUDENT,
            active=active,
            _id=_id,
            created_at=created_at,
            updated_at=updated_at,
            **extra,
        )
        self.matric_number = matric_number
        self.program = program
        self.year = int(year) if year is not None else 1
        self.courses = [_oid(c) for c in (courses or [])]
        self.user_id = _oid(user_id)

    # --------------------------
    # Conversion Helpers
    # --------------------------
    def to_mongo(self) -> Dict[str, Any]:
        doc = super().to_mongo()
        doc.update({
            "matric_number": self.matric_number,
            "program": self.program,
            "year": self.year,
            "courses": self.courses,
        })
        if self.user_id:
            doc["user_id"] = self.user_id
        return doc

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["Student"]:
        if not doc:
            return None
        s = cls(
            username=doc.get("username"),
            email=doc.get("email"),
            password=None,
            matric_number=doc.get("matric_number"),
            program=doc.get("program"),
            year=doc.get("year"),
            courses=doc.get("courses", []),
            user_id=doc.get("user_id"),
            active=doc.get("active", True),
            _id=doc.get("_id"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )
        s.password_hash = doc.get("password_hash")
        return s

    def to_json(self) -> Dict[str, Any]:
        """Return JSON-safe dict."""
        return {
            "id": str(self._id) if self._id else None,
            "username": self.username,
            "email": self.email,
            "matric_number": self.matric_number,
            "program": self.program,
            "year": self.year,
            "courses": [str(c) for c in self.courses],
            "user_id": str(self.user_id) if self.user_id else None,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    # --------------------------
    # CRUD Methods
    # --------------------------
    @classmethod
    def create(cls, data: Dict[str, Any]) -> Optional["Student"]:
        student = cls(**data)
        now = datetime.utcnow()
        doc = student.to_mongo()
        doc["created_at"] = now
        doc["updated_at"] = now
        result = cls.collection().insert_one(doc)
        student._id = result.inserted_id
        return student

    @classmethod
    def find_by_id(cls, student_id: str) -> Optional["Student"]:
        doc = cls.collection().find_one({"_id": _oid(student_id)})
        return cls.from_mongo(doc)

    @classmethod
    def find_by_matric(cls, matric: str) -> Optional["Student"]:
        doc = cls.collection().find_one({"matric_number": matric})
        return cls.from_mongo(doc)

    @classmethod
    def find_by_email(cls, email: str) -> Optional["Student"]:
        doc = cls.collection().find_one({"email": email})
        return cls.from_mongo(doc)

    @classmethod
    def find_all(cls, filters: Optional[Dict[str, Any]] = None) -> List["Student"]:
        query = filters or {}
        results = cls.collection().find(query)
        return [cls.from_mongo(doc) for doc in results]

    @classmethod
    def update_student(cls, student_id: str, updates: Dict[str, Any]) -> bool:
        updates["updated_at"] = datetime.utcnow()
        res = cls.collection().update_one(
            {"_id": _oid(student_id)},
            {"$set": updates},
        )
        return res.modified_count > 0

    @classmethod
    def delete_student(cls, student_id: str) -> bool:
        res = cls.collection().delete_one({"_id": _oid(student_id)})
        return res.deleted_count > 0

    # --------------------------
    # Course Management
    # --------------------------
    @classmethod
    def add_course(cls, student_id: str, course_id: str) -> bool:
        res = cls.collection().update_one(
            {"_id": _oid(student_id)},
            {
                "$addToSet": {"courses": _oid(course_id)},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return res.modified_count > 0

    @classmethod
    def remove_course(cls, student_id: str, course_id: str) -> bool:
        res = cls.collection().update_one(
            {"_id": _oid(student_id)},
            {
                "$pull": {"courses": _oid(course_id)},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return res.modified_count > 0

    @classmethod
    def find_by_course(cls, course_id: str) -> List["Student"]:
        results = cls.collection().find({"courses": _oid(course_id)})
        return [cls.from_mongo(doc) for doc in results]

    # --------------------------
    # Indexes
    # --------------------------
    @classmethod
    def ensure_indexes(cls):
        cls.collection().create_index("matric_number", unique=True, sparse=True)
        cls.collection().create_index("email", unique=True)
        cls.collection().create_index("user_id", sparse=True)
        cls.collection().create_index("courses")
        cls.collection().create_index("program")
        cls.collection().create_index("year")
        cls.collection().create_index("active")
