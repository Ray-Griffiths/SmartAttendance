# backend/schemas/setting_schema.py
from marshmallow import Schema, fields

class SettingSchema(Schema):
    id = fields.Str(dump_only=True)
    setting_name = fields.Str(required=True)
    value = fields.Str(required=True)
    updated_at = fields.DateTime(dump_only=True)
