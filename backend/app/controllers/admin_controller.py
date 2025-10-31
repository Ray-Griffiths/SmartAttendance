# backend/app/controllers/admin_controller.py
from bson import ObjectId
from datetime import datetime
from backend.app.database import mongo
from backend.app.utils.serializers import serialize_user, serialize_course, serialize_student

# -------------------- Users --------------------
def create_user(data):
    if not all([data.get("username"), data.get("email"), data.get("role")]):
        return {"error": "username, email, and role are required"}, 400

    if mongo.db.users.find_one({"email": data["email"]}):
        return {"error": "Email already exists"}, 409

    user_doc = {
        "username": data["username"],
        "email": data["email"],
        "password_hash": data.get("password_hash", ""),
        "role": data["role"],
        "created_at": datetime.utcnow()
    }
    user_id = mongo.db.users.insert_one(user_doc).inserted_id
    return {"message": "User created", "user_id": str(user_id)}, 201

def get_all_users():
    users = mongo.db.users.find()
    return [serialize_user(u) for u in users], 200

def get_user(user_id):
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return {"error": "User not found"}, 404
    return serialize_user(user), 200

def update_user(user_id, data):
    update_doc = {k: data[k] for k in ["username", "email", "role"] if k in data}
    if data.get("password_hash"):
        update_doc["password_hash"] = data["password_hash"]

    result = mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        return {"error": "User not found"}, 404
    return {"message": "User updated"}, 200

def delete_user(user_id):
    result = mongo.db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        return {"error": "User not found"}, 404
    return {"message": "User deleted"}, 200

# -------------------- Courses --------------------
def create_course(data):
    if not all([data.get("name"), data.get("lecturer_id")]):
        return {"error": "name and lecturer_id are required"}, 400

    course_doc = {
        "name": data["name"],
        "description": data.get("description"),
        "lecturer_id": ObjectId(data["lecturer_id"]),
        "student_ids": [],
        "created_at": datetime.utcnow()
    }
    course_id = mongo.db.courses.insert_one(course_doc).inserted_id
    return {"message": "Course created", "course_id": str(course_id)}, 201

def get_all_courses():
    courses = mongo.db.courses.find()
    return [serialize_course(c) for c in courses], 200

def get_course(course_id):
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return {"error": "Course not found"}, 404
    return serialize_course(course), 200

def update_course(course_id, data):
    update_doc = {}
    if "name" in data:
        update_doc["name"] = data["name"]
    if "description" in data:
        update_doc["description"] = data["description"]
    if "lecturer_id" in data:
        update_doc["lecturer_id"] = ObjectId(data["lecturer_id"])

    result = mongo.db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        return {"error": "Course not found"}, 404
    return {"message": "Course updated"}, 200

def delete_course(course_id):
    result = mongo.db.courses.delete_one({"_id": ObjectId(course_id)})
    if result.deleted_count == 0:
        return {"error": "Course not found"}, 404
    return {"message": "Course deleted"}, 200

# -------------------- Course-Student Linking --------------------
def add_student_to_course(course_id, student_id):
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return {"error": "Course not found"}, 404

    if ObjectId(student_id) in course.get("student_ids", []):
        return {"error": "Student already enrolled"}, 400

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$push": {"student_ids": ObjectId(student_id)}}
    )
    return {"message": "Student added to course"}, 200

def remove_student_from_course(course_id, student_id):
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return {"error": "Course not found"}, 404

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"student_ids": ObjectId(student_id)}}
    )
    return {"message": "Student removed from course"}, 200

def get_course_students(course_id):
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return {"error": "Course not found"}, 404

    students = mongo.db.students.find({"_id": {"$in": course.get("student_ids", [])}})
    return [serialize_student(s) for s in students], 200
