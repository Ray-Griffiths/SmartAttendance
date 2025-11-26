# backend/app/schemas/system_log_schema.py
from marshmallow import Schema, fields

class SystemLogSchema(Schema):
    id = fields.Str(dump_only=True)
    user_id = fields.Str(required=True)
    role = fields.Str(required=True)  # admin, lecturer, student, etc.
    action = fields.Str(required=True)  # e.g., login_attempt, create_course
    level = fields.Str(required=True)  # info, warning, error
    target = fields.Str(allow_none=True)  # optional, e.g., course name or session ID
    description = fields.Str(required=True)  # human-readable description
    endpoint = fields.Str(allow_none=True)  # e.g., /api/admin/courses
    method = fields.Str(allow_none=True)  # HTTP method (GET, POST, etc.)
    status = fields.Str(required=True)  # success, failure, warning
    ip_address = fields.Str(allow_none=True)  # client IP
    timestamp = fields.DateTime(dump_only=True)  # automatic timestamp
    notes = fields.Str(allow_none=True)  # optional extra info
