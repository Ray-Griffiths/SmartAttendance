from flask import Blueprint, jsonify, request
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from geopy.distance import geodesic
import uuid
import os
import qrcode
import io
import base64

from backend.app.database import mongo
from backend.app.middlewares.role_required import role_required
from backend.app.utils.serializers import serialize_course, serialize_student, serialize_attendance
from flask_sock import Sock
import json, time
import csv
import traceback
from flask import make_response, send_file, current_app

lecturer_bp = Blueprint("lecturer_bp", __name__, url_prefix="/api/lecturer")

# =====================================================
#                    Helper Functions
# =====================================================
def serialize_session(session):
    """Custom serializer for attendance sessions."""
    return {
        "id": str(session["_id"]),
        "qr_code_uuid": session.get("qr_code_uuid"),
        "is_active": session.get("is_active"),
        "session_date": session.get("session_date"),
        "start_time": session.get("start_time"),
        "end_time": session.get("end_time"),
        "location": session.get("location"),
        "created_at": session.get("created_at").isoformat() if session.get("created_at") else None,
        "expires_at": session.get("expires_at").isoformat() if session.get("expires_at") else None,
        "location_required": bool(session.get("location")),
    }

def get_my_course(course_id, lecturer_id):
    """Return course owned by the lecturer."""
    if not ObjectId.is_valid(course_id):
        return None
    return mongo.db.courses.find_one({
        "_id": ObjectId(course_id),
        "lecturer_id": ObjectId(lecturer_id)
    })

# =====================================================
#             CORS Preflight Support for Vite
# =====================================================
@lecturer_bp.before_request
def handle_options():
    """Allow frontend to make preflight requests (CORS)."""
    if request.method == "OPTIONS":
        response = jsonify({"ok": True})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        return response

# =====================================================
#                       Dashboard
# =====================================================
@lecturer_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_dashboard():
    """Fetch lecturer dashboard overview."""
    lecturer_id = get_jwt_identity()

    # Fetch lecturer's courses
    courses = mongo.db.courses.find({"lecturer_id": ObjectId(lecturer_id)})
    courses_list = [serialize_course(c) for c in courses]

    # Fetch currently active sessions
    active_sessions = mongo.db.sessions.find({
        "is_active": True,
        "expires_at": {"$gt": datetime.utcnow()}
    })

    return jsonify({
        "courses": courses_list,
        "active_sessions": [serialize_session(s) for s in active_sessions],
    }), 200

# =====================================================
#                       Courses
# =====================================================
@lecturer_bp.route("/courses", methods=["POST"])
@jwt_required()
@role_required(["lecturer"])
def create_course():
    """Create a new course for the logged-in lecturer."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}

    if not data.get("name"):
        return jsonify({"error": "Course name is required"}), 400

    course_doc = {
        "name": data["name"],
        "description": data.get("description", ""),
        "lecturer_id": ObjectId(lecturer_id),
        "student_ids": [],
        "created_at": datetime.utcnow()
    }

    course_id = mongo.db.courses.insert_one(course_doc).inserted_id
    return jsonify({
        "message": "Course created successfully",
        "course_id": str(course_id)
    }), 201


@lecturer_bp.route("/courses", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_my_courses():
    """Retrieve all courses owned by the lecturer."""
    lecturer_id = get_jwt_identity()
    courses = mongo.db.courses.find({"lecturer_id": ObjectId(lecturer_id)})
    return jsonify([serialize_course(c) for c in courses]), 200


@lecturer_bp.route("/courses/<course_id>", methods=["PUT"])
@jwt_required()
@role_required(["lecturer"])
def update_course(course_id):
    """Update a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}
    course = get_my_course(course_id, lecturer_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    update_doc = {}
    if data.get("name"):
        update_doc["name"] = data["name"]
    if data.get("description"):
        update_doc["description"] = data["description"]

    if update_doc:
        mongo.db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_doc})
        return jsonify({"message": "Course updated successfully"}), 200
    return jsonify({"message": "No changes made"}), 200


@lecturer_bp.route("/courses/<course_id>", methods=["DELETE"])
@jwt_required()
@role_required(["lecturer"])
def delete_course(course_id):
    """Delete a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    result = mongo.db.courses.delete_one({
        "_id": ObjectId(course_id),
        "lecturer_id": ObjectId(lecturer_id)
    })

    if result.deleted_count == 0:
        return jsonify({"error": "Course not found"}), 404

    return jsonify({"message": "Course deleted successfully"}), 200

# =====================================================
#               Student Management
# =====================================================
@lecturer_bp.route("/courses/<course_id>/students", methods=["POST"])
@jwt_required()
@role_required(["lecturer"])
def add_student_to_course(course_id):
    """Enroll a student into a lecturer's course. Accept student_id or indexNumber."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}
    student_id = data.get("student_id")
    index_number = data.get("indexNumber")

    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    # If indexNumber provided, look up or create the student
    if index_number:
        existing = mongo.db.students.find_one({"indexNumber": index_number})
        if existing:
            student_id = existing["_id"]
        else:
            # Create new student
            new_student = {
                "indexNumber": index_number,
                "name": data.get("name", index_number),
                "email": data.get("email"),
                "created_at": datetime.utcnow()
            }
            result = mongo.db.students.insert_one(new_student)
            student_id = result.inserted_id
    
    if not student_id:
        return jsonify({"error": "Missing student_id or indexNumber"}), 400

    # Ensure student_id is an ObjectId
    if isinstance(student_id, str):
        student_id = ObjectId(student_id)

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$addToSet": {"student_ids": student_id}}
    )
    
    # Return the added student data
    student = mongo.db.students.find_one({"_id": student_id})
    return jsonify({
        "message": "Student added successfully",
        "student": serialize_student(student)
    }), 200


@lecturer_bp.route("/courses/<course_id>/students/<student_id>", methods=["DELETE"])
@jwt_required()
@role_required(["lecturer"])
def remove_student_from_course(course_id, student_id):
    """Remove a student from a lecturer’s course."""
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    mongo.db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"student_ids": ObjectId(student_id)}}
    )
    return jsonify({"message": "Student removed successfully"}), 200


@lecturer_bp.route("/courses/<course_id>/students", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_course_students(course_id):
    """Retrieve students enrolled in a course."""
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    students = mongo.db.students.find({"_id": {"$in": course.get("student_ids", [])}})
    return jsonify([serialize_student(s) for s in students]), 200

# =====================================================
#                  Session / Attendance
# =====================================================
@lecturer_bp.route("/courses/<course_id>/sessions", methods=["POST"])
@jwt_required()
@role_required(["lecturer"])
def create_session(course_id):
    """Create a new class session (QR-based)."""
    lecturer_id = get_jwt_identity()
    data = request.get_json() or {}
    course = get_my_course(course_id, lecturer_id)

    if not course:
        return jsonify({"error": "Course not found"}), 404

    qr_expires_in = int(data.get("qr_expires_in_minutes", 15))
    location = data.get("location")

    session_doc = {
        "course_id": ObjectId(course_id),
        "session_date": data.get("session_date"),
        "start_time": data.get("start_time"),
        "end_time": data.get("end_time"),
        "is_active": True,
        "qr_code_uuid": str(uuid.uuid4()),
        "expires_at": datetime.utcnow() + timedelta(minutes=qr_expires_in),
        "location": location,
        "created_at": datetime.utcnow()
    }

    session_id = mongo.db.sessions.insert_one(session_doc).inserted_id

    qr_base_url = os.getenv("QR_BASE_URL", "http://localhost:5000/api/students/scan")
    qr_data = f"{qr_base_url}/{session_doc['qr_code_uuid']}"
    qr_img = qrcode.make(qr_data)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return jsonify({
        "message": "Session created successfully",
        "session_id": str(session_id),
        "qr_code_uuid": session_doc["qr_code_uuid"],
        "qr_code_base64": qr_base64,
        "expires_at": session_doc["expires_at"].isoformat(),
        "location_required": bool(location)
    }), 201


@lecturer_bp.route("/courses/<course_id>/sessions", methods=["GET"])
@jwt_required()
@role_required(["lecturer"])
def get_course_sessions(course_id):
    """Retrieve all sessions for a course."""
    sessions = mongo.db.sessions.find({"course_id": ObjectId(course_id)})
    return jsonify([serialize_session(s) for s in sessions]), 200


# ===================== ✅ Real-Time WebSocket (Lecturer) =======================

def register_lecturer_ws(sock: Sock):
    @sock.route('/api/courses/ws/lecturer')
    def courses_ws(ws):
        """WebSocket endpoint for lecturer course updates (minimal heartbeat)."""
        try:
            query = ws.environ.get('QUERY_STRING', '')
            token = None
            if query.startswith('token='):
                token = query.replace('token=', '')
            if not token:
                ws.send(json.dumps({'error': 'Missing token'}))
                ws.close()
                return

            ws.send(json.dumps({'status': 'connected', 'message': 'Lecturer courses WS ready'}))
            while True:
                # Light heartbeat - in real app, push actual course events
                ws.send(json.dumps({'timestamp': time.strftime('%H:%M:%S'), 'type': 'heartbeat'}))
                time.sleep(10)
        except Exception as e:
            print(f'❌ Lecturer WS error: {e}')
            try:
                ws.close()
            except:
                pass

    @sock.route('/api/attendance/ws/<session_id>')
    def attendance_ws(ws, session_id):
        """WebSocket endpoint for attendance updates for a session (minimal)."""
        try:
            query = ws.environ.get('QUERY_STRING', '')
            token = None
            if query.startswith('token='):
                token = query.replace('token=', '')
            if not token:
                ws.send(json.dumps({'error': 'Missing token'}))
                ws.close()
                return

            ws.send(json.dumps({'status': 'connected', 'session': session_id}))
            while True:
                # In production, push real attendance events; here send heartbeat
                ws.send(json.dumps({'timestamp': time.strftime('%H:%M:%S'), 'session': session_id, 'type': 'heartbeat'}))
                time.sleep(10)
        except Exception as e:
            print(f'❌ Attendance WS error: {e}')
            try:
                ws.close()
            except:
                pass

    # Compatibility endpoint used by `LecturerDashboard`
    @sock.route('/api/lecturer/ws')
    def lecturer_ws(ws):
        """Generic lecturer WebSocket endpoint (heartbeat + simple updates)."""
        try:
            query = ws.environ.get('QUERY_STRING', '')
            token = None
            if query.startswith('token='):
                token = query.replace('token=', '')
            if not token:
                ws.send(json.dumps({'error': 'Missing token'}))
                ws.close()
                return

            ws.send(json.dumps({'status': 'connected', 'message': 'Lecturer WS ready'}))
            while True:
                ws.send(json.dumps({'timestamp': time.strftime('%H:%M:%S'), 'type': 'heartbeat'}))
                time.sleep(10)
        except Exception as e:
            print(f'❌ Lecturer (generic) WS error: {e}')
            try:
                ws.close()
            except:
                pass


    # ------------------------------------------------------------------
    # Additional Lecturer endpoints: imports, exports, bulk ops, session ops
    # ------------------------------------------------------------------

# NOTE: These endpoints are designed to be helpful additions for lecturers.
# They perform basic validations and store minimal job metadata for imports.


@lecturer_bp.route('/courses/<course_id>/students/import/preview', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def preview_import_students(course_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400

    try:
        stream = io.TextIOWrapper(file.stream, encoding='utf-8')
        reader = csv.DictReader(stream)
        valid = []
        invalid = []
        max_preview = 200
        for i, row in enumerate(reader):
            if i >= max_preview:
                break
            errors = []
            index = (row.get('index') or row.get('indexNumber') or row.get('regNo') or '').strip()
            name = (row.get('name') or row.get('full_name') or '').strip()
            email = (row.get('email') or '').strip()
            if not index:
                errors.append('missing index')
            if not name:
                errors.append('missing name')
            if errors:
                invalid.append({'row': i + 1, 'raw': row, 'errors': errors})
            else:
                valid.append({'index': index, 'name': name, 'email': email})

        return jsonify({'summary': {'totalPreviewed': len(valid) + len(invalid), 'valid': len(valid), 'invalid': len(invalid)}, 'validRows': valid, 'invalidRows': invalid}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Failed to parse CSV', 'details': str(e)}), 500


@lecturer_bp.route('/courses/<course_id>/students/import', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def import_students(course_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400

    job = {
        'course_id': course_id,
        'lecturer_id': lecturer_id,
        'status': 'processing',
        'created_at': datetime.utcnow()
    }
    job_id = mongo.db.import_jobs.insert_one(job).inserted_id

    created = 0
    skipped = 0
    errors = []
    try:
        stream = io.TextIOWrapper(file.stream, encoding='utf-8')
        reader = csv.DictReader(stream)
        for i, row in enumerate(reader):
            try:
                index = (row.get('index') or row.get('indexNumber') or row.get('regNo') or '').strip()
                name = (row.get('name') or row.get('full_name') or '').strip()
                email = (row.get('email') or '').strip() or None
                if not index or not name:
                    errors.append({'row': i + 1, 'error': 'missing required fields'})
                    continue

                query = []
                if index:
                    query.append({'indexNumber': index})
                if email:
                    query.append({'email': email})

                existing = None
                if query:
                    existing = mongo.db.students.find_one({'$or': query})

                if existing:
                    mongo.db.courses.update_one({'_id': ObjectId(course_id)}, {'$addToSet': {'student_ids': existing['_id']}})
                    skipped += 1
                else:
                    student_doc = {'indexNumber': index, 'name': name, 'email': email, 'created_at': datetime.utcnow()}
                    sid = mongo.db.students.insert_one(student_doc).inserted_id
                    mongo.db.courses.update_one({'_id': ObjectId(course_id)}, {'$addToSet': {'student_ids': sid}})
                    created += 1
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        result = {'status': 'completed', 'created': created, 'skipped': skipped, 'errors': errors}
        mongo.db.import_jobs.update_one({'_id': job_id}, {'$set': {'status': 'completed', 'result': result, 'completed_at': datetime.utcnow()}})
        return jsonify({'job_id': str(job_id), 'result': result}), 200
    except Exception as e:
        traceback.print_exc()
        mongo.db.import_jobs.update_one({'_id': job_id}, {'$set': {'status': 'failed', 'error': str(e), 'completed_at': datetime.utcnow()}})
        return jsonify({'error': 'Import failed', 'details': str(e)}), 500


@lecturer_bp.route('/imports/<job_id>', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def get_import_job(job_id):
    try:
        job = mongo.db.import_jobs.find_one({'_id': ObjectId(job_id)})
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        job['_id'] = str(job['_id'])
        return jsonify(job), 200
    except Exception:
        return jsonify({'error': 'Invalid job id'}), 400


@lecturer_bp.route('/courses/<course_id>/students/export', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def export_students(course_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    students = list(mongo.db.students.find({'_id': {'$in': course.get('student_ids', [])}}))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'indexNumber', 'name', 'email'])
    for s in students:
        writer.writerow([str(s.get('_id')), s.get('indexNumber', ''), s.get('name', ''), s.get('email', '')])

    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv'
    resp.headers['Content-Disposition'] = f'attachment; filename=course_{course_id}_students.csv'
    return resp


@lecturer_bp.route('/courses/<course_id>/students/bulk', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def bulk_students(course_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    data = request.get_json() or {}
    add = data.get('add', [])
    remove = data.get('remove', [])
    added = []
    removed = []
    errors = []

    for item in add:
        try:
            index = item.get('index') or item.get('indexNumber')
            name = item.get('name')
            email = item.get('email')
            if not index or not name:
                errors.append({'item': item, 'error': 'missing index or name'})
                continue
            existing = mongo.db.students.find_one({'indexNumber': index})
            if existing:
                sid = existing['_id']
            else:
                sid = mongo.db.students.insert_one({'indexNumber': index, 'name': name, 'email': email, 'created_at': datetime.utcnow()}).inserted_id
            mongo.db.courses.update_one({'_id': ObjectId(course_id)}, {'$addToSet': {'student_ids': sid}})
            added.append(str(sid))
        except Exception as e:
            errors.append({'item': item, 'error': str(e)})

    for sid in remove:
        try:
            mongo.db.courses.update_one({'_id': ObjectId(course_id)}, {'$pull': {'student_ids': ObjectId(sid)}})
            removed.append(sid)
        except Exception as e:
            errors.append({'item': sid, 'error': str(e)})

    return jsonify({'added': added, 'removed': removed, 'errors': errors}), 200


@lecturer_bp.route('/courses/<course_id>/sessions/<session_id>/regenerate_qr', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def regenerate_qr(course_id, session_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    session = mongo.db.sessions.find_one({'_id': ObjectId(session_id), 'course_id': ObjectId(course_id)})
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    qr_uuid = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    mongo.db.sessions.update_one({'_id': session['_id']}, {'$set': {'qr_code_uuid': qr_uuid, 'expires_at': expires_at}})
    return jsonify({'qr_code_uuid': qr_uuid, 'expires_at': expires_at.isoformat()}), 200


@lecturer_bp.route('/courses/<course_id>/sessions/<session_id>/extend', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def extend_session(course_id, session_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    data = request.get_json() or {}
    minutes = int(data.get('minutes', 10))
    try:
        session = mongo.db.sessions.find_one({'_id': ObjectId(session_id), 'course_id': ObjectId(course_id)})
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        new_expiry = (session.get('expires_at') or datetime.utcnow()) + timedelta(minutes=minutes)
        mongo.db.sessions.update_one({'_id': session['_id']}, {'$set': {'expires_at': new_expiry}})
        return jsonify({'expires_at': new_expiry.isoformat()}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@lecturer_bp.route('/courses/<course_id>/sessions/<session_id>/force_close', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def force_close_session(course_id, session_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    result = mongo.db.sessions.update_one({'_id': ObjectId(session_id), 'course_id': ObjectId(course_id)}, {'$set': {'is_active': False, 'expires_at': datetime.utcnow()}})
    if result.matched_count == 0:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify({'message': 'Session closed', 'closed_at': datetime.utcnow().isoformat()}), 200


@lecturer_bp.route('/courses/<course_id>/sessions/clone', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def clone_session(course_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    data = request.get_json() or {}
    source_session_id = data.get('source_session_id')
    new_date = data.get('new_date')
    if not source_session_id or not new_date:
        return jsonify({'error': 'source_session_id and new_date required'}), 400

    src = mongo.db.sessions.find_one({'_id': ObjectId(source_session_id), 'course_id': ObjectId(course_id)})
    if not src:
        return jsonify({'error': 'Source session not found'}), 404

    new_doc = {k: v for k, v in src.items() if k != '_id'}
    new_doc['session_date'] = new_date
    new_doc['is_active'] = False
    new_doc['qr_code_uuid'] = str(uuid.uuid4())
    new_doc['created_at'] = datetime.utcnow()
    new_id = mongo.db.sessions.insert_one(new_doc).inserted_id
    return jsonify({'new_session_id': str(new_id)}), 201


@lecturer_bp.route('/courses/<course_id>/sessions/<session_id>/attendance/export', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def export_session_attendance(course_id, session_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    records = list(mongo.db.attendance.find({'session_id': session_id}))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'student_id', 'studentName', 'status', 'timestamp'])
    for r in records:
        writer.writerow([str(r.get('_id')), str(r.get('student_id')), r.get('studentName') or r.get('student_name') or '', r.get('status'), r.get('timestamp')])
    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv'
    resp.headers['Content-Disposition'] = f'attachment; filename=attendance_{session_id}.csv'
    return resp


@lecturer_bp.route('/courses/<course_id>/sessions/<session_id>/attendance/bulk_mark', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def bulk_mark_attendance(course_id, session_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    data = request.get_json() or {}
    marks = data.get('marks', [])
    updated = 0
    errors = []
    for m in marks:
        try:
            student_id = m.get('student_id')
            status = m.get('status')
            note = m.get('note')
            if not student_id or not status:
                errors.append({'mark': m, 'error': 'student_id and status required'})
                continue
            mongo.db.attendance.update_one({'session_id': session_id, 'student_id': ObjectId(student_id)}, {'$set': {'status': status, 'note': note, 'timestamp': datetime.utcnow()}}, upsert=True)
            updated += 1
        except Exception as e:
            errors.append({'mark': m, 'error': str(e)})

    return jsonify({'updated': updated, 'errors': errors}), 200


@lecturer_bp.route('/attendance/corrections', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def request_correction():
    data = request.get_json() or {}
    session_id = data.get('session_id')
    student_id = data.get('student_id')
    requested_status = data.get('requested_status')
    justification = data.get('justification')
    if not session_id or not student_id or not requested_status:
        return jsonify({'error': 'session_id, student_id and requested_status required'}), 400
    req = {'session_id': session_id, 'student_id': student_id, 'requested_status': requested_status, 'justification': justification, 'status': 'pending', 'requested_at': datetime.utcnow()}
    rid = mongo.db.attendance_corrections.insert_one(req).inserted_id
    return jsonify({'request_id': str(rid), 'status': 'pending'}), 201


@lecturer_bp.route('/attendance/corrections', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def list_corrections():
    items = list(mongo.db.attendance_corrections.find().sort('requested_at', -1).limit(200))
    for it in items:
        it['_id'] = str(it['_id'])
    return jsonify(items), 200


@lecturer_bp.route('/attendance/corrections/<req_id>/approve', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def approve_correction(req_id):
    req = mongo.db.attendance_corrections.find_one({'_id': ObjectId(req_id)})
    if not req:
        return jsonify({'error': 'Request not found'}), 404
    mongo.db.attendance.update_one({'session_id': req['session_id'], 'student_id': ObjectId(req['student_id'])}, {'$set': {'status': req['requested_status'], 'timestamp': datetime.utcnow()}}, upsert=True)
    mongo.db.attendance_corrections.update_one({'_id': req['_id']}, {'$set': {'status': 'approved', 'handled_at': datetime.utcnow()}})
    return jsonify({'status': 'approved'}), 200


@lecturer_bp.route('/attendance/corrections/<req_id>/reject', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def reject_correction(req_id):
    req = mongo.db.attendance_corrections.find_one({'_id': ObjectId(req_id)})
    if not req:
        return jsonify({'error': 'Request not found'}), 404
    mongo.db.attendance_corrections.update_one({'_id': req['_id']}, {'$set': {'status': 'rejected', 'handled_at': datetime.utcnow()}})
    return jsonify({'status': 'rejected'}), 200


@lecturer_bp.route('/courses/<course_id>/students/<student_id>/mark_excused', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def mark_excused(course_id, student_id):
    data = request.get_json() or {}
    session_id = data.get('session_id')
    reason = data.get('reason')
    if not session_id:
        return jsonify({'error': 'session_id required'}), 400
    mongo.db.attendance.update_one({'session_id': session_id, 'student_id': ObjectId(student_id)}, {'$set': {'status': 'excused', 'note': reason, 'timestamp': datetime.utcnow()}}, upsert=True)
    return jsonify({'status': 'excused'}), 200


@lecturer_bp.route('/students/<student_id>/history', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def student_history(student_id):
    try:
        student = mongo.db.students.find_one({'_id': ObjectId(student_id)})
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        records = list(mongo.db.attendance.find({'student_id': ObjectId(student_id)}).sort('timestamp', -1).limit(500))
        return jsonify({'student': serialize_student(student), 'attendance': [serialize_attendance(r) for r in records]}), 200
    except Exception:
        return jsonify({'error': 'Invalid student id'}), 400


@lecturer_bp.route('/courses/<course_id>/attendance/summary', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def course_attendance_summary(course_id):
    lecturer_id = get_jwt_identity()
    course = get_my_course(course_id, lecturer_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    total_students = len(course.get('student_ids', []))
    total_sessions = mongo.db.sessions.count_documents({'course_id': ObjectId(course_id)})
    attended = mongo.db.attendance.count_documents({'course_id': ObjectId(course_id), 'status': 'present'})
    absent = mongo.db.attendance.count_documents({'course_id': ObjectId(course_id), 'status': 'absent'})
    excused = mongo.db.attendance.count_documents({'course_id': ObjectId(course_id), 'status': 'excused'})

    return jsonify({'total_students': total_students, 'total_sessions': total_sessions, 'attended': attended, 'absent': absent, 'excused': excused}), 200


@lecturer_bp.route('/courses/<course_id>/message', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def message_students(course_id):
    data = request.get_json() or {}
    target = data.get('target', 'all')
    subject = data.get('subject')
    body = data.get('body')
    channels = data.get('channels', ['in-app'])
    msg = {'course_id': course_id, 'target': target, 'subject': subject, 'body': body, 'channels': channels, 'status': 'queued', 'created_at': datetime.utcnow()}
    mid = mongo.db.messages.insert_one(msg).inserted_id
    return jsonify({'message_id': str(mid), 'queued': True}), 202


@lecturer_bp.route('/courses/<course_id>/resources', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def upload_resource(course_id):
    file = request.files.get('file')
    title = request.form.get('title') or file.filename if file else None
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    content = file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    res = {'course_id': course_id, 'title': title, 'filename': file.filename, 'content_b64': encoded, 'created_at': datetime.utcnow()}
    rid = mongo.db.resources.insert_one(res).inserted_id
    return jsonify({'resource_id': str(rid)}), 201


@lecturer_bp.route('/courses/<course_id>/attendance/anomalies', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def attendance_anomalies(course_id):
    pipeline = [
        {'$match': {'course_id': ObjectId(course_id)}},
        {'$group': {'_id': '$device_id', 'count': {'$sum': 1}}},
        {'$match': {'count': {'$gt': 12}}},
        {'$limit': 50}
    ]
    results = list(mongo.db.attendance.aggregate(pipeline))
    return jsonify({'anomalies': results}), 200


@lecturer_bp.route('/courses/<course_id>/sessions/<session_id>/snapshot', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def session_snapshot(course_id, session_id):
    records = list(mongo.db.attendance.find({'session_id': session_id}))
    snap = {'course_id': course_id, 'session_id': session_id, 'snapshot': records, 'created_at': datetime.utcnow()}
    sid = mongo.db.snapshots.insert_one(snap).inserted_id
    return jsonify({'snapshot_id': str(sid)}), 201


@lecturer_bp.route('/courses/<course_id>/students/search', methods=['GET'])
@jwt_required()
@role_required(['lecturer'])
def search_students(course_id):
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([]), 200
    regex = {'$regex': q, '$options': 'i'}
    students = list(mongo.db.students.find({'$or': [{'name': regex}, {'indexNumber': regex}, {'email': regex}] }).limit(50))
    return jsonify([serialize_student(s) for s in students]), 200


@lecturer_bp.route('/courses/<course_id>/students/sync', methods=['POST'])
@jwt_required()
@role_required(['lecturer'])
def sync_roster(course_id):
    file = request.files.get('file')
    created = 0
    updated = 0
    if file:
        stream = io.TextIOWrapper(file.stream, encoding='utf-8')
        reader = csv.DictReader(stream)
        for row in reader:
            index = (row.get('index') or row.get('indexNumber') or '').strip()
            name = (row.get('name') or '').strip()
            email = (row.get('email') or '').strip() or None
            if not index or not name:
                continue
            existing = mongo.db.students.find_one({'indexNumber': index})
            if existing:
                mongo.db.students.update_one({'_id': existing['_id']}, {'$set': {'name': name, 'email': email}})
                updated += 1
            else:
                sid = mongo.db.students.insert_one({'indexNumber': index, 'name': name, 'email': email, 'created_at': datetime.utcnow()}).inserted_id
                mongo.db.courses.update_one({'_id': ObjectId(course_id)}, {'$addToSet': {'student_ids': sid}})
                created += 1
        return jsonify({'created': created, 'updated': updated}), 200

    data = request.get_json() or {}
    studs = data.get('students', [])
    for s in studs:
        index = s.get('index')
        name = s.get('name')
        email = s.get('email')
        if not index or not name:
            continue
        existing = mongo.db.students.find_one({'indexNumber': index})
        if existing:
            mongo.db.students.update_one({'_id': existing['_id']}, {'$set': {'name': name, 'email': email}})
            updated += 1
        else:
            sid = mongo.db.students.insert_one({'indexNumber': index, 'name': name, 'email': email, 'created_at': datetime.utcnow()}).inserted_id
            mongo.db.courses.update_one({'_id': ObjectId(course_id)}, {'$addToSet': {'student_ids': sid}})
            created += 1
    return jsonify({'created': created, 'updated': updated}), 200
