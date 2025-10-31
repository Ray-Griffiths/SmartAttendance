# backend/schemas/course_schema.py
from marshmallow import Schema, fields, validate

class CourseSchema(Schema):
    id = fields.Str(dump_only=True)
    course_code = fields.Str(required=True)
    course_name = fields.Str(required=True)
    lecturer_id = fields.Str(required=True)
    credit_hours = fields.Int(required=True, validate=validate.Range(min=1, max=6))
    semester = fields.Str(required=True, validate=validate.OneOf(["1", "2"]))
    date_created = fields.DateTime(dump_only=True)
