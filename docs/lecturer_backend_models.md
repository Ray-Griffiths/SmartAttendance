Backend Lecturer Models & Service Needs

Summary
- Current controllers and routes implement course/session/student management but there are gaps and opportunities to split logic into services and models for clarity, testability, and reuse.

Recommended models to ensure clarity (MongoDB documents):

1) Course
- Collection: `courses`
- Fields:
  - _id: ObjectId
  - name: string (required)
  - description: string
  - lecturer_id: ObjectId (ref users)
  - student_ids: [ObjectId]
  - created_at: datetime

- Example document:
  {
    "_id": ObjectId("..."),
    "name": "Intro to Databases",
    "description": "DB basics",
    "lecturer_id": ObjectId("..."),
    "student_ids": [ObjectId("...")],
    "created_at": ISODate("2025-10-25T10:00:00Z")
  }

2) Session
- Collection: `sessions`
- Fields:
  - _id: ObjectId
  - course_id: ObjectId
  - session_date: date/string
  - start_time: string (or ISO time)
  - end_time: string
  - is_active: bool
  - qr_code_uuid: string (UUID)
  - expires_at: datetime
  - location: { lat: number, lng: number } (optional)
  - created_at: datetime

- Example document:
  {
    "_id": ObjectId("..."),
    "course_id": ObjectId("..."),
    "session_date": "2025-10-25",
    "start_time": "09:00",
    "end_time": "10:00",
    "is_active": true,
    "qr_code_uuid": "uuid-xxx",
    "expires_at": ISODate("2025-10-25T09:15:00Z"),
    "location": {"lat": 1.23, "lng": 4.56},
    "created_at": ISODate("2025-10-25T08:55:00Z")
  }

3) Attendance
- Collection: `attendance`
- Fields:
  - _id: ObjectId
  - session_id: ObjectId
  - student_id: ObjectId
  - recorded_at: datetime
  - method: string ("qr" | "manual" | "geo")
  - metadata: dict (e.g., { "lat": .., "lng": .., "qr_uuid": "..." })

- Example:
  {
    "_id": ObjectId("..."),
    "session_id": ObjectId("..."),
    "student_id": ObjectId("..."),
    "recorded_at": ISODate("2025-10-25T09:03:42Z"),
    "method": "qr",
    "metadata": { "qr_uuid": "uuid-xxx" }
  }

4) User (existing)
- The app already has a `users` collection with a `role` field (e.g., "lecturer", "student", "admin"). Ensure indexing on email and perhaps role for faster lookups.

Service layer suggestions (files under `backend/app/services/`):
- `lecturer_service.py` — high-level operations used by controllers (create_course, get_my_courses, add/remove students). Keep controller thin: parse input, call service, format response.
- `session_service.py` — session creation, QR generation, validation (is_active, expired), deactivate session.
- `attendance_service.py` — recording attendance (QR/geo/manual), querying attendance per session, preventing duplicates.
- `student_service.py` (optional) — helper methods for student-related lookups/validation.

Why split into services?
- Easier unit testing: services can be tested in isolation from Flask request objects.
- Reuse: API, CLI or background jobs can reuse the same logic.
- Cleaner controllers: controllers remain thin and focused on HTTP concerns.

Indexes & performance
- Index `sessions` on `course_id` and `qr_code_uuid`.
- Index `attendance` on `session_id` and `student_id` (compound index for fast lookups).
- Index `courses` on `lecturer_id`.

Sample payloads (frontend → backend)
- Create session (POST /api/lecturer/courses/:id/sessions):
  {
    "session_date": "2025-10-25",
    "start_time": "09:00",
    "end_time": "10:00",
    "qr_expires_in_minutes": 15,
    "location": {"lat": 1.23, "lng": 4.56} // optional
  }

- Take attendance (POST /api/attendance/scan/:qr_uuid) — backend already has attendance scan endpoint
  {
    "student_id": "<studentId>",
    "lat": 1.23, // optional
    "lng": 4.56  // optional
  }

Next steps
- Create lightweight service files with function stubs and unit tests for each service.
- Add example unit tests under `backend/tests` following existing patterns (conftest.py).
- Add documentation `docs/lecturer_api.md` describing the HTTP surface (I'll create this next if you want).

