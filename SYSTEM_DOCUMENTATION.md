# SmartAttendance — System Documentation

Last updated: 2025-10-25

## I. Executive Overview

SmartAttendance is a full-stack web application for automating student attendance. Lecturers generate time-limited, location-aware QR codes for class sessions. Students scan those QR codes, capture their location in the browser, and submit their student index number to mark attendance. The backend validates QR state, enrollment, and geolocation before recording attendance.

This repository contains a Flask backend and a React frontend. The application in this workspace uses a local MongoDB instance for persistence.

## II. User Roles & Permissions

- Administrator (`admin`): manage users, courses, system settings and view logs/analytics.
- Lecturer (`lecturer`): manage own courses and sessions, generate QR codes (with lecturer location), view attendance and reports.
- Student (`student`): scan QR, capture geolocation in browser, submit index number to mark attendance, view personal attendance history.

## III. Technology Stack

- Backend: Flask (Python) with MongoDB (local). The project has MongoDB client libraries (e.g., `pymongo`, `flask_pymongo`, `mongoengine`) available in the venv.
- Frontend: React (Vite), Tailwind CSS, Axios for API calls.
- Dev tools: pytest for tests, black for formatting.

## IV. Project structure (important folders)

backend/
  ├── app/
  │   ├── auth/
  │   ├── config/
  │   ├── controllers/
  │   ├── middlewares/
  │   ├── models/
  │   ├── routes/
  │   ├── schemas/
  │   ├── services/
  │   └── utils/
  ├── tests/
  └── run.py

frontend/
  ├── public/
  └── src/
      ├── components/
      ├── context/
      ├── pages/
      ├── services/
      └── utils/

venv/ (project virtual env; contains project Python deps)

## V. Local development — prerequisites

- Python 3.10+ (use the existing `venv` in the repo if already created).
- Node.js + npm (for frontend).
- MongoDB server installed locally (mongod). On Windows install via MongoDB Community Server or use a Docker container.

## VI. Environment variables

Create a `.env` file for the backend (example below). The backend code will likely read env vars from `os.environ` or a config module.

Example `.env` (place at `backend/.env` or repo root depending on how the app loads envs):

MONGO_URI=mongodb://localhost:27017/smartattendance
FLASK_ENV=development
SECRET_KEY=replace-with-secure-random
JWT_SECRET_KEY=replace-with-secure-random
PORT=5000

Adjust names/locations according to the backend config in `backend/app/config`.

## VII. Start the stack (Windows PowerShell)

1) Start MongoDB (if installed locally):

```powershell
# If you installed MongoDB as a service, it may already be running.
# Otherwise start mongod manually (adjust path to your MongoDB install):
mongod --dbpath "C:\\data\\db"
```

2) Activate Python venv and install backend deps (if needed):

```powershell
# from repo root
.\\venv\\Scripts\\Activate.ps1
pip install -r backend/requirements.txt
```

3) Set env vars (PowerShell example) and start backend:

```powershell
# from repo root (adjust paths if your run entry differs)
set-item -path env:MONGO_URI -value 'mongodb://localhost:27017/smartattendance'
set-item -path env:FLASK_ENV -value 'development'
set-item -path env:SECRET_KEY -value 'dev_secret'
python backend/run.py
```

If the project uses a different entry (like `app.py`), run that instead. Check `backend/run.py` for the correct runner.

4) Start frontend dev server:

```powershell
cd frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite (usually http://localhost:5173).

## VIII. Running tests

Backend tests (pytest):

```powershell
.\\venv\\Scripts\\Activate.ps1
cd backend
pytest -q
```

Frontend tests (if present) run with the frontend test command (e.g., `npm test`).

## IX. Key backend endpoints (high-level)

- `POST /api/login`, `POST /api/register` — auth endpoints.
- `GET /api/my-profile` — user profile.
- `GET /api/courses`, `POST /api/courses` — course endpoints (admin/lecturer).
- `POST /api/sessions/<id>/qr` — generate QR (lecturer provides location/time). Stores QR UUID on session.
- `POST /api/sessions/<id>/attendance` — public endpoint students POST to with qr_code_uuid, location, and student index to mark attendance.

Consult the code in `backend/app/routes` and `backend/app/controllers` for exact names and payloads.

## X. Notes, assumptions & next steps

- This documentation assumes the app will use a local MongoDB instance reachable via `MONGO_URI`.
- The backend already includes `pymongo`, `mongoengine`, or `flask_pymongo` in the venv; pick whichever the codebase expects (inspect `backend/app/database.py` or `backend/app/config`).
- Next steps I can take (pick one):
  - Add a short pointer in `README.md` to this system doc.
  - Create a `backend/.env.example` with MongoDB variables.
  - Inspect `backend/app/database.py` and update the config code to explicitly look for `MONGO_URI` and provide a helpful error if missing.

If you'd like, I can now:
- update the repo `README.md` to reference this doc,
- create `backend/.env.example`, or
- inspect `backend/app/database.py` and update configuration code (if you want me to modify code).
