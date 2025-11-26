# backend/app/routes/admin_routes.py
# SmartAttendance — Final Elite Admin Panel API (2025)
# All your original routes preserved, all modern features added, bugs fixed

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt, decode_token
from flask_sock import Sock
from bson import ObjectId
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import json
import time
import urllib.parse

from backend.app.database import mongo
from backend.app.middlewares.role_required import role_required
from backend.app.schemas.system_log_schema import SystemLogSchema
from backend.app.utils.serializers import (
    serialize_user, serialize_course, serialize_student,
    serialize_session, serialize_attendance_log
)

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api/admin")


# ===================== Helper Functions =======================

def get_collection_by_role(role: str):
    return {"admin": "admins", "lecturers": "lecturers", "lecturer": "lecturers", "student": "students"}.get(role.lower())


def get_user_or_404(user_id):
    """Find user across all role-specific collections."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None, jsonify({"error": "Invalid user ID"}), 400

    for col, role_name in [("admins", "admin"), ("lecturers", "lecturer"), ("students", "student")]:
        user = mongo.db[col].find_one({"_id": oid})
        if user:
            user["role"] = role_name
            return user, None, None
    return None, jsonify({"error": "User not found"}), 404


def get_course_or_404(course_id):
    try:
        oid = ObjectId(course_id)
    except Exception:
        return None, jsonify({"error": "Invalid course ID"}), 400

    course = mongo.db.courses.find_one({"_id": oid})
    if not course:
        return None, jsonify({"error": "Course not found"}), 404
    return course, None, None


# ===================== USER MANAGEMENT (FIXED + ENHANCED) =======================

@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@role_required(["admin"])
def create_user():
    data = request.get_json() or {}
    # Debug: print sanitized payload (mask password)
    try:
        dbg = {k: (v if k != 'password' else ('*' * len(v) if isinstance(v, str) else '***')) for k, v in data.items()}
        print(f"[DEBUG] create_user payload: {dbg}")
    except Exception:
        print("[DEBUG] create_user payload: <unprintable>")
    if not all([data.get("username"), data.get("email"), data.get("role")]):
        return jsonify({"error": "username, email, and role are required"}), 400

    role = data["role"].lower()
    col_name = get_collection_by_role(role)
    if not col_name:
        return jsonify({"error": "Invalid role"}), 400

    # check email uniqueness across all role collections
    existing = mongo.db.admins.find_one({"email": data["email"]}) \
        or mongo.db.lecturers.find_one({"email": data["email"]}) \
        or mongo.db.students.find_one({"email": data["email"]})
    if existing:
        return jsonify({"error": "Email already exists"}), 409

    try:
        password_hash = generate_password_hash(data.get("password", "TempPass2025!"))

        user_doc = {
            "username": data["username"],
            "email": data["email"],
            "password_hash": password_hash,
            "role": role,
            "created_at": datetime.utcnow(),
            **data.get("extra", {})
        }
        user_id = mongo.db[col_name].insert_one(user_doc).inserted_id
        return jsonify({"message": "User created", "user_id": str(user_id)}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] create_user failed: {e}")
        return jsonify({"error": "Failed to create user", "details": str(e)}), 500


@admin_bp.route("/users/<user_id>", methods=["PUT"])
@jwt_required()
@role_required(["admin"])
def update_user(user_id):
    user, err_response, err_code = get_user_or_404(user_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    update_doc = {}
    if "username" in data:
        update_doc["username"] = data["username"]
    if "email" in data:
        # ensure new email doesn't collide with other users
        new_email = data["email"]
        # check across all collections except the current user document
        col_name = get_collection_by_role(user["role"])
        existing = (mongo.db.admins.find_one({"email": new_email, "_id": {"$ne": ObjectId(user_id)}})
                    or mongo.db.lecturers.find_one({"email": new_email, "_id": {"$ne": ObjectId(user_id)}})
                    or mongo.db.students.find_one({"email": new_email, "_id": {"$ne": ObjectId(user_id)}}))
        if existing:
            return jsonify({"error": "Email already in use"}), 409
        update_doc["email"] = new_email
    if "password" in data:
        update_doc["password_hash"] = generate_password_hash(data["password"])

    col_name = get_collection_by_role(user["role"])
    mongo.db[col_name].update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
    return jsonify({"message": "User updated"}), 200


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def delete_user(user_id):
    user, err_response, err_code = get_user_or_404(user_id)
    if err_response:
        return err_response, err_code

    col_name = get_collection_by_role(user["role"])
    result = mongo.db[col_name].delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"message": "User deleted"}), 200


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_all_users():
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        limit = max(1, min(100, int(request.args.get("limit", 50))))
    except ValueError:
        limit = 50

    search = request.args.get("search", "").strip()
    role_filter = request.args.get("role")

    query = {}
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"username": regex}, {"email": regex}]

    users = []
    total = 0

    if role_filter and role_filter.lower() in ["admin", "lecturer", "student"]:
        col = get_collection_by_role(role_filter.lower())
        cursor = mongo.db[col].find(query).skip((page - 1) * limit).limit(limit)
        total = mongo.db[col].count_documents(query)
        for u in cursor:
            u["role"] = role_filter.lower()
            users.append(u)
    else:
        # collect users from all role collections
        for col, role in [("admins", "admin"), ("lecturers", "lecturer"), ("students", "student")]:
            cursor = mongo.db[col].find(query)
            for u in cursor:
                u["role"] = role
                users.append(u)
        total = sum(mongo.db[c].count_documents(query) for c in ["admins", "lecturers", "students"])
        # manual pagination fallback
        users = users[(page - 1) * limit: page * limit]

    return jsonify({
        "users": [serialize_user(u) for u in users],
        "pagination": {"page": page, "limit": limit, "total": total}
    })


# ===================== COURSE MANAGEMENT — YOUR ORIGINAL PERFECT ROUTES =======================

@admin_bp.route("/courses", methods=["POST"])
@jwt_required()
@role_required(["admin"])
def create_course():
    print("[DEBUG] Create course request received")
    data = request.get_json() or {}
    print(f"[DEBUG] Request payload: {data}")
    if not data.get("name"):
        return jsonify({"error": "Course name is required"}), 400
    if not data.get("lecturer_id"):
        return jsonify({"error": "lecturer_id is required"}), 400

    # Validate lecturer_id format
    lecturer_raw = data.get("lecturer_id")
    try:
        lecturer_obj_id = ObjectId(lecturer_raw)
    except Exception as e:
        print(f"[WARN] Invalid lecturer_id provided: {lecturer_raw} -> {e}")
        return jsonify({"error": "Invalid lecturer_id"}), 400

    # Ensure lecturer exists
    lecturer = mongo.db.lecturers.find_one({"_id": lecturer_obj_id})
    if not lecturer:
        print(f"[WARN] Lecturer not found for id: {lecturer_raw}")
        return jsonify({"error": "Lecturer not found"}), 404

    try:
        course_doc = {
            "name": data["name"],
            "description": data.get("description"),
            "lecturer_id": lecturer_obj_id,
            "student_ids": [],
            "created_at": datetime.utcnow(),
        }
        course_id = mongo.db.courses.insert_one(course_doc).inserted_id
        # Fetch and return the serialized course object so clients have canonical data
        created = mongo.db.courses.find_one({"_id": course_id})
        return jsonify(serialize_course(created)), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] create_course failed: {e}")
        return jsonify({"error": f"Failed to create course: {str(e)}"}), 500


@admin_bp.route("/courses", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_all_courses():
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        limit = max(1, min(200, int(request.args.get("limit", 50))))
    except ValueError:
        limit = 50

    courses = mongo.db.courses.find().skip((page - 1) * limit).limit(limit)
    total = mongo.db.courses.count_documents({})
    return jsonify({
        "courses": [serialize_course(c) for c in courses],
        "pagination": {"page": page, "limit": limit, "total": total}
    })


@admin_bp.route("/courses/<course_id>", methods=["PUT"])
@jwt_required()
@role_required(["admin"])
def update_course(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    update_doc = {}
    if "name" in data:
        update_doc["name"] = data["name"]
    if "description" in data:
        update_doc["description"] = data["description"]
    # Accept either `lecturer_id` (snake_case) or `lecturerId` (camelCase) from clients
    lecturer_val = None
    if "lecturer_id" in data:
        lecturer_val = data["lecturer_id"]
    elif "lecturerId" in data:
        lecturer_val = data["lecturerId"]

    if lecturer_val is not None:
        try:
            update_doc["lecturer_id"] = ObjectId(lecturer_val)
        except Exception:
            return jsonify({"error": "Invalid lecturer_id"}), 400

    if update_doc:
        mongo.db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_doc})

    # Fetch and return the canonical updated course object to help clients keep state in sync
    updated_course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not updated_course:
        return jsonify({"error": "Course not found after update"}), 404
    return jsonify(serialize_course(updated_course)), 200


@admin_bp.route("/courses/<course_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def delete_course(course_id):
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course ID"}), 400

    result = mongo.db.courses.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({"message": "Course deleted"}), 200


# ===================== COURSE-STUDENT LINKING — YOUR ORIGINAL PERFECT ROUTES =======================

@admin_bp.route("/courses/<course_id>/students", methods=["POST"])
@jwt_required()
@role_required(["admin"])
def add_student_to_course(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id required"}), 400

    try:
        student_oid = ObjectId(student_id)
    except Exception:
        return jsonify({"error": "Invalid student_id"}), 400

    # ensure not already enrolled
    if student_oid in course.get("student_ids", []):
        return jsonify({"error": "Student already enrolled"}), 400

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$push": {"student_ids": student_oid}}
    )
    return jsonify({"message": "Student added to course"}), 200


@admin_bp.route("/courses/<course_id>/students/<student_id>", methods=["DELETE"])
@jwt_required()
@role_required(["admin"])
def remove_student_from_course(course_id, student_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    try:
        student_oid = ObjectId(student_id)
    except Exception:
        return jsonify({"error": "Invalid student_id"}), 400

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"student_ids": student_oid}}
    )
    return jsonify({"message": "Student removed from course"}), 200


@admin_bp.route("/courses/<course_id>/students", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_course_students(course_id):
    course, err_response, err_code = get_course_or_404(course_id)
    if err_response:
        return err_response, err_code

    students = mongo.db.students.find({"_id": {"$in": course.get("student_ids", [])}})
    return jsonify([serialize_student(s) for s in students]), 200


# ===================== DASHBOARD & LIVE FEED =======================

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_dashboard():
    now = datetime.utcnow()
    return jsonify({
        "stats": {
            "total_students": mongo.db.students.count_documents({}),
            "total_lecturers": mongo.db.lecturers.count_documents({}),
            "total_courses": mongo.db.courses.count_documents({}),
            "total_sessions": mongo.db.sessions.count_documents({}),
            "active_sessions": mongo.db.sessions.count_documents({
                "status": "active",
                "qr_expiry": {"$gt": now}
            })
        }
    })


@admin_bp.route("/dashboard/live", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_live_dashboard():
    now = datetime.utcnow()
    active = list(mongo.db.sessions.find({"status": "active", "qr_expiry": {"$gt": now}}))
    recent = list(mongo.db.attendance.find({
        "timestamp": {"$gte": now - timedelta(minutes=3)}
    }).sort("timestamp", -1).limit(20))

    return jsonify({
        "active_sessions": [serialize_session(s) for s in active],
        "live_feed": [serialize_attendance_log(a) for a in recent],
        "updated_at": now.isoformat()
    })


# ===================== ANALYTICS & INSIGHTS =======================

@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_admin_analytics():
    """Return high-level counts used by the Admin dashboard frontend.

    Matches the shape expected by the frontend `getAnalytics()`:
    {
      "totalUsers": int,
      "totalLecturers": int,
      "totalStudents": int,
      "totalCourses": int,
      "totalSessions": int,
      "lastUpdated": isoformat string
    }
    """
    try:
        admins_count = mongo.db.admins.count_documents({})
        lecturers_count = mongo.db.lecturers.count_documents({})
        students_count = mongo.db.students.count_documents({})
        courses_count = mongo.db.courses.count_documents({})
        sessions_count = mongo.db.sessions.count_documents({})

        return jsonify({
            "totalUsers": admins_count + lecturers_count + students_count,
            "totalLecturers": lecturers_count,
            "totalStudents": students_count,
            "totalCourses": courses_count,
            "totalSessions": sessions_count,
            "lastUpdated": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        print(f"[ERROR] get_admin_analytics failed: {e}")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/analytics/attendance-trends", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def attendance_trends():
    try:
        days = max(1, int(request.args.get("days", 30)))
    except ValueError:
        days = 30

    pipeline = [
        {"$match": {"timestamp": {"$gte": datetime.utcnow() - timedelta(days=days)}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "present": {"$sum": {"$cond": [{"$eq": ["$status", "present"]}, 1, 0]}},
            "total": {"$sum": 1}
        }},
        {"$project": {"date": "$_id", "rate": {"$round": [{"$multiply": [{"$divide": ["$present", "$total"]}, 100]}, 2]}}},
        {"$sort": {"date": 1}}
    ]
    return jsonify(list(mongo.db.attendance.aggregate(pipeline)))


@admin_bp.route("/courses/<course_id>/analytics", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_course_analytics(course_id):
    """Return analytics for a specific course used by the frontend.

    Response shape:
    {
      "course_id": str,
      "course_name": str,
      "total_students": int,
      "total_sessions": int,
      "attended_sessions": int,
      "absent_sessions": int,
      "attendance_rate": float
    }
    """
    course, err_resp, err_code = get_course_or_404(course_id)
    if err_resp:
        return err_resp, err_code

    try:
        course_oid = ObjectId(course_id)
        total_students = len(course.get("student_ids", []))
        total_sessions = mongo.db.sessions.count_documents({"course_id": course_oid})

        attended_sessions = mongo.db.attendance.count_documents({"course_id": course_oid, "status": "present"})
        absent_sessions = mongo.db.attendance.count_documents({"course_id": course_oid, "status": "absent"})

        attendance_rate = 0.0
        if total_sessions > 0 and total_students > 0:
            # Each present record counts one student in one session
            # Normalize by (total_sessions * total_students)
            attendance_rate = round((attended_sessions / (total_sessions * total_students)) * 100, 2)

        return jsonify({
            "course_id": str(course_oid),
            "course_name": course.get("name"),
            "total_students": total_students,
            "total_sessions": total_sessions,
            "attended_sessions": attended_sessions,
            "absent_sessions": absent_sessions,
            "attendance_rate": attendance_rate,
            # Provide legacy-friendly property name expected by frontend
            "avgAttendance": attendance_rate
        }), 200
    except Exception as e:
        print(f"[ERROR] get_course_analytics failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/analytics/chronic-absentees", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def chronic_absentees():
    try:
        threshold = float(request.args.get("threshold", 60))
    except ValueError:
        threshold = 60.0

    pipeline = [
        {"$group": {
            "_id": "$student_id",
            "present": {"$sum": {"$cond": [{"$eq": ["$status", "present"]}, 1, 0]}},
            "total": {"$sum": 1}
        }},
        {"$match": {"total": {"$gte": 5}}},
        {"$project": {
            "student_id": "$_id",
            "rate": {"$round": [{"$multiply": [{"$divide": ["$present", "$total"]}, 100]}, 2]}
        }},
        {"$match": {"rate": {"$lt": threshold}}},
        {"$sort": {"rate": 1}},
        {"$limit": 30}
    ]
    results = list(mongo.db.attendance.aggregate(pipeline))
    for r in results:
        # r["student_id"] is likely an ObjectId, ensure we query correctly
        try:
            sid = r.get("student_id")
            s = mongo.db.students.find_one({"_id": sid}) if sid is not None else None
            if s:
                r["student"] = serialize_student(s)
        except Exception:
            pass
    return jsonify(results)


# ===================== SECURITY & SETTINGS =======================

@admin_bp.route("/security/suspicious", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def suspicious_activity():
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    high_freq = list(mongo.db.attendance.aggregate([
        {"$group": {"_id": "$device_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 12}}}
    ]))
    return jsonify({
        "geofence_violations": mongo.db.security_logs.count_documents({
            "type": "geofence_violation", "timestamp": {"$gte": today}
        }),
        "high_frequency_devices": high_freq
    })


@admin_bp.route("/settings", methods=["GET", "PUT"])
@jwt_required()
@role_required(["admin"])
def system_settings():
    doc = mongo.db.settings.find_one({"_id": "global"}) or {}
    defaults = {
        "institution_name": "SmartAttendance",
        "geofence_radius_meters": 50,
        "session_auto_expire_minutes": 90,
        "primary_color": "#2563eb"
    }
    settings = {**defaults, **doc}

    if request.method == "GET":
        return jsonify(settings)

    data = request.get_json() or {}
    mongo.db.settings.update_one({"_id": "global"}, {"$set": data}, upsert=True)
    return jsonify({"message": "Settings updated"}), 200


# ===================== SECURE REAL-TIME WEBSOCKET =======================

def register_admin_ws(sock: Sock):
    @sock.route("/api/admin/ws")
    def admin_ws(ws):
        try:
            # token may be provided in query string as ?token=...
            token = urllib.parse.parse_qs(ws.environ.get("QUERY_STRING", "")).get("token", [None])[0]
            if not token:
                ws.send(json.dumps({"error": "Token required"}))
                ws.close()
                return

            # attempt to decode token to inspect roles, fallback to a verify step if needed
            try:
                decoded = decode_token(token)
                claims = decoded.get("claims", {}) or decoded
            except Exception:
                ws.send(json.dumps({"error": "Invalid token"}))
                ws.close()
                return

            roles = claims.get("roles", []) or claims.get("role", [])
            # normalize single role string to list
            if isinstance(roles, str):
                roles = [roles]

            if "admin" not in roles:
                ws.send(json.dumps({"error": "Admin access required"}))
                ws.close()
                return

            ws.send(json.dumps({"status": "connected", "message": "Live admin feed active"}))

            while True:
                try:
                    now = datetime.utcnow()
                    data = {
                        "time": now.strftime("%H:%M:%S"),
                        "active_sessions": mongo.db.sessions.count_documents({
                            "status": "active", "qr_expiry": {"$gt": now}
                        }),
                        "recent_markings": mongo.db.attendance.count_documents({
                            "timestamp": {"$gte": now - timedelta(minutes=1)}
                        }),
                        "total_students": mongo.db.students.count_documents({}),
                        "system": "online"
                    }
                    ws.send(json.dumps(data))
                    time.sleep(4)
                except Exception:
                    # break out of the while loop on socket send/read errors
                    break
        except Exception as e:
            print(f"WS Error: {e}")
            try:
                ws.close()
            except Exception:
                pass

# ===================== SYSTEM LOGS WITH ADVANCED FILTERING =======================

@admin_bp.route("/logs", methods=["GET"])
@jwt_required()
@role_required(["admin"])
def get_system_logs():
    """
    Fetch system logs with optional filters:
    - user_id
    - role
    - level (info, warning, error)
    - action
    - date range: start_date, end_date
    Supports pagination with page & limit.
    """
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        limit = max(1, min(200, int(request.args.get("limit", 50))))
    except ValueError:
        limit = 50

    query = {}

    # Filters
    user_id = request.args.get("user_id")
    if user_id:
        try:
            query["user_id"] = str(ObjectId(user_id))
        except Exception:
            return jsonify({"error": "Invalid user_id"}), 400

    role = request.args.get("role")
    if role:
        query["role"] = role.lower()

    level = request.args.get("level")
    if level:
        query["level"] = level.lower()

    action = request.args.get("action")
    if action:
        query["action"] = {"$regex": action, "$options": "i"}

    # Date range filter
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    if start_date or end_date:
        query["timestamp"] = {}
        from datetime import datetime
        if start_date:
            try:
                query["timestamp"]["$gte"] = datetime.fromisoformat(start_date)
            except Exception:
                return jsonify({"error": "Invalid start_date format"}), 400
        if end_date:
            try:
                query["timestamp"]["$lte"] = datetime.fromisoformat(end_date)
            except Exception:
                return jsonify({"error": "Invalid end_date format"}), 400

    # Fetch logs from MongoDB
    logs_cursor = mongo.db.system_logs.find(query).sort("timestamp", -1).skip((page - 1) * limit).limit(limit)
    total = mongo.db.system_logs.count_documents(query)

    # Serialize logs
    schema = SystemLogSchema(many=True)
    logs_data = schema.dump(list(logs_cursor))

    return jsonify({
        "logs": logs_data,
        "pagination": {"page": page, "limit": limit, "total": total}
    })
