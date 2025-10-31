# backend/schemas/attendance_schema.py
from marshmallow import Schema, fields, validate

class AttendanceSchema(Schema):
    id = fields.Str(dump_only=True)
    student_id = fields.Str(required=True)
    course_id = fields.Str(required=True)
    session_id = fields.Str(required=True)
    status = fields.Str(required=True, validate=validate.OneOf(["Present", "Absent", "Late"]))
    timestamp = fields.DateTime(dump_only=True)
