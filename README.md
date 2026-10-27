# Team Task Tracker

A full-stack Team Task Tracker built with a Django + MongoDB backend and Next.js frontend.

---

## Tech Stack

- **Backend**: Django, Django REST Framework (DRF), MongoDB via `mongoengine`, custom JWT auth (`PyJWT`).
- **Frontend**: Next.js (App Router), TailwindCSS, JavaScript (Client-side).
- **Database**: MongoDB (no Django ORM used for application data).

---

## Project Structure

```text
TEAM-TASK-Manager/
├── backend/
│   ├── .env.example            # Environment variables template
│   ├── .env                    # Local environment variables (not committed)
│   ├── requirements.txt        # Backend Python dependencies
│   ├── manage.py               # Django management script
│   ├── api.http                # Sample REST API requests for manual testing
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py         # Stripped Django settings (MongoDB, JWT, CORS)
│   │   ├── urls.py             # Top-level API routing
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── api/
│       ├── __init__.py
│       ├── models.py           # MongoEngine documents (User, Team, Task, Comment, Activity)
│       ├── auth.py             # JWTAuth authentication & IsAdmin permissions
│       ├── exceptions.py       # Custom error formatter ({"message": "..."})
│       ├── views_auth.py       # Auth endpoints (Register, Login, Refresh, Me)
│       └── urls.py             # Auth URL routes
├── frontend/                   # Next.js frontend (Coming in upcoming phases)
├── .gitignore
└── README.md
```

---

## Phase 1: Backend Setup, Models, and Authentication

### What Was Built
1. **Django Project Initialization**: Configured Django to work without relational databases, using MongoDB via `mongoengine`. Removed default session/auth/admin middlewares and apps to keep the backend lightweight and stateless.
2. **Database Models (`api/models.py`)**:
   - `User`: Handles accounts, password hashes, and roles (`admin` or `member`). Includes safe `to_dict()` (passwords never exposed).
   - `Team`: Manages team details, creator, and member lists.
   - `Task`: Tasks assigned to members with statuses (`pending`, `in_progress`, `done`).
   - `Comment`: Feedback/notes linked to tasks and authors.
   - `Activity`: Activity timeline and audit logs.
3. **Custom JWT Authentication (`api/auth.py`)**:
   - **Access Token**: Short-lived (15 minutes), signed with `JWT_ACCESS_SECRET`.
   - **Refresh Token**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET`.
   - **JWTAuth**: Reads `Bearer <token>` from HTTP headers, validates signatures, and returns 401 when expired or invalid.
   - **IsAdmin**: Restricts admin-only views to users with role `admin`.
4. **Authentication Endpoints (`api/views_auth.py`)**:
   - `POST /api/auth/register/`: Registers a user, checks for unique email, hashes password.
   - `POST /api/auth/login/`: Validates credentials and returns tokens and user info.
   - `POST /api/auth/refresh/`: Takes a valid refresh token and issues a new access token.
   - `GET /api/auth/me/`: Returns current logged-in user profile.
5. **Standardized Error Responses (`api/exceptions.py`)**:
   - Ensures all errors follow the uniform `{"message": "..."}` format.
6. **Manual Testing Requests (`backend/api.http`)**:
   - Ready-to-use HTTP requests to test register, login, refresh, and profile endpoints.

---

## Getting Started (Backend)

### 1. Prerequisites
- Python 3.10+
- MongoDB running locally (default: `mongodb://localhost:27017`)

### 2. Setup Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
DEBUG=True
SECRET_KEY=your-django-secret-key-here
MONGO_URI=mongodb://localhost:27017/team_task_tracker
JWT_ACCESS_SECRET=your-jwt-access-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here
```

### 4. Run the Backend Server
```bash
python manage.py runserver 8000
```
Server runs at `http://localhost:8000/`.

---

## How to Test Phase 1 by Hand

You can test using **VS Code / Cursor REST Client** by opening `backend/api.http`, or using `curl`:

### 1. Register an Admin
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin User", "email": "admin@example.com", "password": "Password123!", "role": "admin"}'
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Password123!"}'
```
Response:
```json
{
  "accessToken": "<ACCESS_TOKEN>",
  "refreshToken": "<REFRESH_TOKEN>",
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "..."
  }
}
```

### 3. Access Protected Route (`/api/auth/me/`)
```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 4. Refresh Token
```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<REFRESH_TOKEN>"}'
```
Response:
```json
{
  "accessToken": "<NEW_ACCESS_TOKEN>"
}
```
