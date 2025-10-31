# backend/schemas/system_log_schema.py
from marshmallow import Schema, fields

class SystemLogSchema(Schema):
    id = fields.Str(dump_only=True)
    user_id = fields.Str(required=True)
    action = fields.Str(required=True)
    description = fields.Str(required=True)
    timestamp = fields.DateTime(dump_only=True)
