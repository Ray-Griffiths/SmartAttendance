from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from flask_bcrypt import Bcrypt
from backend.app.database import mongo

# Initialize bcrypt
bcrypt = Bcrypt()

# -------------------------------
# Role Constants
# -------------------------------
ROLE_ADMIN = "admin"
ROLE_LECTURER = "lecturer"
ROLE_STUDENT = "student"
ROLE_CHOICES = {ROLE_ADMIN, ROLE_LECTURER, ROLE_STUDENT}


def _oid(val):
    """Ensure consistent ObjectId conversion."""
    if val is None:
        return None
    return ObjectId(val) if not isinstance(val, ObjectId) else val


class User:
    """Base User model for authentication and role management."""

    collection_name = "users"

    def __init__(
        self,
        username: str,
        email: str,
        password: Optional[str] = None,
        role: str = ROLE_STUDENT,
        active: bool = True,
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        **extra,
    ):
        if role not in ROLE_CHOICES:
            raise ValueError(f"Invalid role '{role}'. Must be one of {ROLE_CHOICES}")

        self._id = _oid(_id)
        self.username = username
        self.email = email.lower()
        self.password_hash = (
            bcrypt.generate_password_hash(password).decode("utf-8")
            if password
            else None
        )
        self.role = role
        self.active = bool(active)
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.extra = extra or {}

    # -------------------------------
    # MongoDB Collection Access
    # -------------------------------
    @classmethod
    def collection(cls):
        return mongo.db[cls.collection_name]

    @property
    def id(self) -> Optional[str]:
        """Return string version of Mongo _id."""
        return str(self._id) if self._id else None

    # -------------------------------
    # Password Management
    # -------------------------------
    def set_password(self, password: str):
        """Hashes and sets a new password."""
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        self.updated_at = datetime.utcnow()

    def check_password(self, password: str) -> bool:
        """Verifies password against bcrypt hash."""
        return bool(
            self.password_hash
            and bcrypt.check_password_hash(self.password_hash, password)
        )

    # -------------------------------
    # Mongo Conversion Helpers
    # -------------------------------
    def to_mongo(self) -> Dict[str, Any]:
        """Converts this instance into a MongoDB document."""
        doc = {
            "username": self.username,
            "email": self.email,
            "password_hash": self.password_hash,
            "role": self.role,
            "active": self.active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            **(self.extra or {}),
        }
        if self._id:
            doc["_id"] = self._id
        return doc

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> Optional["User"]:
        """Creates a User instance from a MongoDB document."""
        if not doc:
            return None

        u = cls(
            username=doc.get("username"),
            email=doc.get("email"),
            password=None,  # hashed already
            role=doc.get("role", ROLE_STUDENT),
            active=doc.get("active", True),
            _id=doc.get("_id"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )
        u.password_hash = doc.get("password_hash")

        # store additional fields
        known = {
            "_id",
            "username",
            "email",
            "password_hash",
            "role",
            "active",
            "created_at",
            "updated_at",
        }
        u.extra = {k: v for k, v in doc.items() if k not in known}
        return u

    # -------------------------------
    # CRUD Operations
    # -------------------------------
    def save(self) -> "User":
        """Insert or update the user in MongoDB."""
        self.updated_at = datetime.utcnow()
        doc = self.to_mongo()
        if self._id:
            self.collection().update_one({"_id": self._id}, {"$set": doc})
        else:
            result = self.collection().insert_one(doc)
            self._id = result.inserted_id
        return self

    def delete(self) -> bool:
        """Deletes this user from MongoDB."""
        if not self._id:
            return False
        res = self.collection().delete_one({"_id": self._id})
        return res.deleted_count == 1

    # -------------------------------
    # Query Helpers
    # -------------------------------
    @classmethod
    def find_by_id(cls, id_val: str) -> Optional["User"]:
        doc = cls.collection().find_one({"_id": _oid(id_val)})
        return cls.from_mongo(doc)

    @classmethod
    def find_by_username(cls, username: str) -> Optional["User"]:
        doc = cls.collection().find_one({"username": username})
        return cls.from_mongo(doc)

    @classmethod
    def find_by_email(cls, email: str) -> Optional["User"]:
        doc = cls.collection().find_one({"email": email.lower()})
        return cls.from_mongo(doc)

    @classmethod
    def find_all(cls, role: Optional[str] = None):
        """Returns all users or all users by role."""
        query = {"role": role} if role else {}
        return [cls.from_mongo(doc) for doc in cls.collection().find(query)]

    # -------------------------------
    # Indexes
    # -------------------------------
    @classmethod
    def ensure_indexes(cls):
        """Ensure required MongoDB indexes are in place."""
        cls.collection().create_index("username", unique=True)
        cls.collection().create_index("email", unique=True)
        cls.collection().create_index("role")
        cls.collection().create_index("active")
