Lecturer API Contract

Base path: /api/lecturer
Auth: JWT required on all endpoints (use `Authorization: Bearer <token>`)
Role: Only users with role `lecturer` should access these routes (server enforces via `role_required`).

Endpoints

1) Courses
- GET /api/lecturer/courses
  - Description: Get all courses owned by the logged-in lecturer
  - Request: JWT in Authorization header
  - Response: 200 [ { id, name, description, student_count } ]

- POST /api/lecturer/courses
  - Description: Create new course for the lecturer
  - Request body: { name: string (required), description?: string }
  - Response: 201 { message, course_id }
  - Errors: 400 if name missing

- PUT /api/lecturer/courses/:course_id
  - Description: Update course
  - Request body: { name?: string, description?: string }
  - Response: 200 { message }
  - Errors: 404 if course not found / not owned by lecturer

- DELETE /api/lecturer/courses/:course_id
  - Description: Delete course
  - Response: 200 { message }
  - Errors: 404 if course not found

2) Students in course
- GET /api/lecturer/courses/:course_id/students
  - Response: 200 [ student ] where `student` contains serialized student fields
- POST /api/lecturer/courses/:course_id/students
  - Request body: { student_id: string }
  - Response: 200 { message }
  - Errors: 400 if missing student_id, 404 if course not found
- DELETE /api/lecturer/courses/:course_id/students/:student_id
  - Response: 200 { message }

3) Sessions (Course-scoped)
- GET /api/lecturer/courses/:course_id/sessions
  - Description: List sessions for the course
  - Response: 200 [ { id, session_date, start_time, end_time, is_active, qr_code_uuid, expires_at, location_required } ]

- POST /api/lecturer/courses/:course_id/sessions
  - Description: Create a new session (QR + optional geo)
  - Request body:
    {
      "session_date": "YYYY-MM-DD",
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "qr_expires_in_minutes": 15, // optional
      "location": { "lat": 1.23, "lng": 4.56 } // optional
    }
  - Response: 201 {
      message,
      session_id,
      qr_code_uuid,
      qr_code_base64, // PNG image base64
      expires_at, // ISO datetime
      location_required: boolean
    }
  - Errors: 404 if course not found

- (Optional) DELETE/PUT endpoints to manage sessions (deactivate) may exist under /api/sessions/:id or via lecturer routes.

4) Attendance scanning (app-wide endpoint)
- POST /api/attendance/scan/:qr_uuid
  - Description: Record attendance by scanning QR
  - Request body: { student_id: string, lat?: number, lng?: number }
  - Response: 200 { message } or 201 created
  - Backend responsibilities: validate QR exists, is not expired, check location if required, prevent duplicate attendance for same session+student

Response shapes
- Standard error: { error: "message" } or { error: "message", details: "..." }
- Success message: { message: "..." }

Notes & Implementation details
- Role checks are enforced server-side via `role_required` decorator. The decorator supports two modes: reading role from JWT or querying DB.
- For frontend, ensure AuthContext exposes `user.role` and the route guard (RequireLecturer) checks that value before rendering.
- When using IDs in the frontend API client, send the string form of ObjectId (e.g., "650...abc"). Server will convert to ObjectId where appropriate.
- QR code is returned as base64 PNG (field `qr_code_base64`) and a server-side UUID `qr_code_uuid` used for scan endpoints.

Edge cases to handle
- Expired QR scanning → 400/403 with clear message
- Duplicate attendance → 409 or 400 with message
- Missing or malformed IDs → 400

Next steps
- Add small OpenAPI/markdown example snippets for the main flows (I can add these next).
- Add integration tests that exercise session creation + QR scan flow using MSW or backend test client.

