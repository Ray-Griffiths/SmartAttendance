# backend/schemas/session_schema.py
from marshmallow import Schema, fields, validate

class SessionSchema(Schema):
    id = fields.Str(dump_only=True)
    session_name = fields.Str(required=True)  # e.g. "2024/2025 Academic Year"
    semester = fields.Str(required=True, validate=validate.OneOf(["1", "2"]))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    is_active = fields.Boolean(required=True)
