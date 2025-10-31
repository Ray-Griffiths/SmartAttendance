# backend/models/__init__.py
from .user import User
from .student import Student
from .course import Course
from .session import Session
from .attendance import Attendance
from .setting import Setting
from .system_log import SystemLog
from flask_pymongo import PyMongo

mongo = PyMongo()


__all__ = [
    "User",
    "Student",
    "Course",
    "Session",
    "Attendance",
    "Setting",
    "SystemLog",
]

def ensure_all_indexes():
    """
    Create indexes for all major collections on startup.
    Called from app/__init__.py after database initialization.
    """
    User.ensure_indexes()
    Student.ensure_indexes()
    Course.ensure_indexes()
    Session.ensure_indexes()
    Attendance.ensure_indexes()
    SystemLog.ensure_indexes()
