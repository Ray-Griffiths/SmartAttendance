# backend/schemas/student_schema.py
from marshmallow import Schema, fields, validate

class StudentSchema(Schema):
    id = fields.Str(dump_only=True)
    student_id = fields.Str(required=True)
    first_name = fields.Str(required=True)
    last_name = fields.Str(required=True)
    email = fields.Email(required=True)
    course_id = fields.Str(required=True)
    level = fields.Str(required=True, validate=validate.OneOf(["100", "200", "300", "400"]))
    date_registered = fields.DateTime(dump_only=True)
