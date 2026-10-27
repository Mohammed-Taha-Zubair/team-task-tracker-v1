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
│   │   ├── urls.py             # Top-level API routing (/api/)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── api/
│       ├── __init__.py
│       ├── models.py           # MongoEngine documents (User, Team, Task, Comment, Activity)
│       ├── auth.py             # JWTAuth authentication & IsAdmin permissions
│       ├── utils.py            # log_activity and get_team_or_error helpers
│       ├── exceptions.py       # Custom error formatter ({"message": "..."})
│       ├── views_auth.py       # Auth endpoints (Register, Login, Refresh, Me)
│       ├── views_teams.py      # Teams endpoints (Create, List, Detail, Invite)
│       ├── views_tasks.py      # Tasks, Comments, and Activity endpoints
│       └── urls.py             # API URL routes
├── frontend/                   # Next.js frontend (Coming in upcoming phases)
├── .gitignore
└── README.md
```

---

## Phase 1: Backend Setup, Models, and Authentication

- **Database Models (`api/models.py`)**: `User`, `Team`, `Task`, `Comment`, `Activity` with `to_dict()`.
- **Custom JWT (`api/auth.py`)**: 15m access tokens, 7d refresh tokens, `JWTAuth`, `IsAdmin`.
- **Auth Endpoints (`api/views_auth.py`)**: `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/auth/me/`.

---

## Phase 2: Teams, Tasks, Comments, and Activity APIs

### What Was Built
1. **Helper Functions ([backend/api/utils.py](backend/api/utils.py))**:
   - `log_activity(team, user, message, task=None)`: Creates and persists an `Activity` record.
   - `get_team_or_error(team_id, user)`: Validates ObjectId format and team existence (returns 404 if invalid/missing) and checks if the user is in `team.members` (returns 403 if not).

2. **Teams Endpoints ([backend/api/views_teams.py](backend/api/views_teams.py))**:
   - `POST /api/teams/` (admin only): Creates a new team, automatically adds creator to `members`, logs activity `<name> created team "<team name>"`, returns team with `member_count`.
   - `GET /api/teams/`: Lists only teams where the logged-in user is a member, including `member_count`.
   - `GET /api/teams/<id>/`: Members only. Returns team with full member profiles (id, name, email, role).
   - `POST /api/teams/<id>/invite/`: Admin only AND must be a member of that team. Validates `{email}`:
     - Prints `"Invitation sent to <email>"` in server console.
     - If user exists: adds to `team.members` (no duplicates) and logs activity.
     - If user does not exist: returns 400 with `{"message": "User must register first"}`.

3. **Tasks Endpoints ([backend/api/views_tasks.py](backend/api/views_tasks.py))**:
   - `POST /api/teams/<id>/tasks/`: Members only. Creates task with `title`, `description`, optional `assigned_to` (must be a team member), and `status`. Logs `<name> created task "<title>"`.
   - `GET /api/teams/<id>/tasks/?status=pending`: Lists team tasks (optional status filter: pending, in_progress, done), newest updated first. Formats `assigned_to` as `{id, name}`.
   - `GET /api/tasks/<id>/`: Members only. Returns task details.
   - `PATCH /api/tasks/<id>/`: Members only. Updates title, description, assigned_to, and status. Updates `updated_at`.
     - If status changed, logs exactly `<name> changed status of "<title>" to <Pending / In Progress / Done>.`
     - Otherwise logs `<name> updated task "<title>"`.

4. **Comments Endpoints ([backend/api/views_tasks.py](backend/api/views_tasks.py))**:
   - `GET /api/tasks/<id>/comments/`: Oldest first, includes author `{id, name, email}`.
   - `POST /api/tasks/<id>/comments/`: Adds comment `{text}`, logs `<name> commented on "<title>"`.

5. **Activity Log Endpoint ([backend/api/views_tasks.py](backend/api/views_tasks.py))**:
   - `GET /api/teams/<id>/activity/`: Team members only, newest first, includes author details.

---

## How to Test Phase 2 by Hand

### Option A: Using `backend/api.http` (REST Client)
Open [backend/api.http](backend/api.http) and execute requests step-by-step:
1. Run **1.3 Login Admin** to acquire `@accessToken`.
2. Run **2.1 Create a Team** to create a team and store `@teamId`.
3. Run **2.4 Invite Member to Team** with `{"email": "bob@example.com"}`.
4. Run **3.1 Create Task in Team** to create a task and store `@taskId`.
5. Run **3.5 Update Task Status** to change status to `in_progress`.
6. Run **4.1 Add Comment to Task** to post a comment.
7. Run **5.1 View Team Activity Timeline** to observe all logged actions.

### Option B: Using `curl`

**1. Create a Team (Admin Only)**:
```bash
curl -X POST http://localhost:8000/api/teams/ \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering Alpha", "description": "Core dev team"}'
```

**2. Invite Member to Team**:
```bash
curl -X POST http://localhost:8000/api/teams/<TEAM_ID>/invite/ \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@example.com"}'
```

**3. Create Task**:
```bash
curl -X POST http://localhost:8000/api/teams/<TEAM_ID>/tasks/ \
  -H "Authorization: Bearer <MEMBER_OR_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Implement Navigation", "description": "Add navbar with tabs", "status": "pending"}'
```

**4. Update Task Status**:
```bash
curl -X PATCH http://localhost:8000/api/tasks/<TASK_ID>/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

**5. Add Comment**:
```bash
curl -X POST http://localhost:8000/api/tasks/<TASK_ID>/comments/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Design approved, working on it."}'
```

**6. View Team Activity**:
```bash
curl -X GET http://localhost:8000/api/teams/<TEAM_ID>/activity/ \
  -H "Authorization: Bearer <TOKEN>"
```
