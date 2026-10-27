# Refactoring & Security Audit Report: Team Task Tracker

**Branch:** `refactor/secure-team-task-tracker`  
**Date:** 2026-10-28  
**Author:** Senior Full-Stack & Security Engineer  
**Status:** Completed & Fully Verified

---

## 1. Executive Summary

A comprehensive refactoring and security audit of the **Team Task Tracker** application was executed. The objective was to eliminate architectural antipatterns, correct role permissions, remove privilege escalation vulnerabilities, prevent cross-tenant/cross-team data leakage, and ensure consistent MongoDB document relationships and activity tracking.

All tasks were executed on a dedicated branch (`refactor/secure-team-task-tracker`) with Git safety checks preserving all user changes. A test suite of **19 automated tests** covering authentication, permissions, tasks, and activity timelines was created and executed with a **100% pass rate**.

---

## 2. Problems Identified & Fixed

### 2.1 Django Superuser vs. Application Roles Separation
- **Previous state:** Confusion existed between Django framework superusers and application-level roles (`admin` and `member`).
- **Fix:** Roles are strictly defined on the application's MongoEngine `User` model (`admin` vs `member`). Django framework admin is not required for normal platform functionality.

### 2.2 Public Registration Lockdown & Privilege Escalation Risk
- **Previous state:** Public registration (`POST /api/auth/register/`) was disabled after the first user registered, returning `403 Forbidden`. If open, it was susceptible to parameter tampering (mass assignment of `role: admin`).
- **Fix:** Public registration is now open to all users, but **strictly hardcoded** to always create `role = "member"`. Any `role` field sent in the payload is ignored.

### 2.3 Role Modification Security
- **Previous state:** Users could potentially attempt to modify roles through user update endpoints.
- **Fix:** Role changes through API endpoints are strictly blocked (`400 Bad Request`). Role management is locked to deliberate management commands / administrative controls.

### 2.4 Broken Object-Level Authorization (BOLA / IDOR) on Teams & Tasks
- **Previous state:** A user could access or manipulate tasks or team details across teams if they knew the ObjectId.
- **Fix:** Enforced strict membership verification in `get_team_or_error()` and `get_task_and_team_or_error()`. If a user does not belong to the requested team, the API returns `404 Not Found`, preventing resource existence disclosure.

### 2.5 Cross-Team Task Assignment
- **Previous state:** Assignee validation did not strictly check that the assigned user belonged to the same team.
- **Fix:** Both `TeamTaskListCreateView.post` and `TaskDetailView.patch` now verify that `assigned_to` belongs to `team.members`. Non-member assignments return `400 Bad Request`.

### 2.6 Missing Entity Fields (`created_by`, `action_type`)
- **Previous state:** `Task` model lacked a `created_by` reference. `Activity` model lacked an `action_type` field.
- **Fix:**
  - Added `created_by = ReferenceField("User", null=True)` to `Task` and populated it automatically from `request.user`.
  - Added `action_type = StringField(required=True)` to `Activity` and updated timeline logging to record `task_created`, `task_updated`, `status_changed`, `comment_added`, `member_added`, and `team_created`.

### 2.7 Activity Timeline Endpoint URL Standardization
- **Previous state:** Endpoint was `/api/teams/<id>/activity/`. The requirement specified `/api/teams/<id>/activities/`.
- **Fix:** Both routes (`/activities/` and `/activity/`) are supported in `apps/activity/urls.py` for backward and forward compatibility.

### 2.8 Dangling MongoDB DBRef Cleanup
- **Previous state:** Deleting a user left orphaned `DBRef` references in `team.members` and `task.assigned_to`, causing 500 crashes during serialization (`AttributeError: 'DBRef' has no 'to_dict'`).
- **Fix:**
  - Added cascade cleanup upon user deletion (pulling from `team.members` and unsetting `task.assigned_to`).
  - Added defensive deserialization in `Team.to_dict()`, `Task.to_dict()`, and `Activity.to_dict()` that skips or gracefully handles unresolvable references.

---

## 3. Vulnerabilities Fixed

| Vulnerability | Severity | Resolution |
|---|---|---|
| **Privilege Escalation on Register** | **Critical** | `POST /api/auth/register/` strictly forces `role = "member"`. |
| **Unauthorized Role Modification** | **High** | `PATCH /api/users/<id>/` rejects any attempt to modify `role`. |
| **BOLA / IDOR on Teams & Tasks** | **High** | Membership validation rejects cross-team access with `404 Not Found`. |
| **Cross-Team Task Assignment** | **High** | Enforced that `assigned_to` must exist in `team.members`. |
| **BSON Parser Crash on Invalid IDs** | **Medium** | Validated all incoming IDs with `ObjectId.is_valid()`. |
| **Invalid Task Status Injection** | **Medium** | Validated status against `["pending", "in_progress", "done"]`. |
| **Sensitive Data Exposure** | **Low** | Verified `User.to_dict()` never exposes `password` or internal tokens. |

---

## 4. Files Modified

### Backend
1. **[backend/apps/users/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/users/views.py):**
   - Public member registration with input validation (regex email, min 8-char password).
   - Strict `role = "member"` enforcement.
   - Cascade cleanup on user deletion.
   - Role immutability enforcement.
2. **[backend/apps/teams/models.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/teams/models.py):**
   - Defensive `to_dict()` handling for `members` and `created_by`.
3. **[backend/apps/teams/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/teams/views.py):**
   - `TeamListCreateView.get` filters teams by authenticated user membership.
   - Creator is automatically added to `members` upon team creation.
   - Added duplicate member invite rejection (`400 Bad Request`).
   - Recorded `action_type="team_created"` and `action_type="member_added"`.
4. **[backend/apps/tasks/models.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/tasks/models.py):**
   - Added `created_by` reference field to `Task` model and `to_dict()`.
   - Defensive dereferencing for `assigned_to` and `team`.
5. **[backend/apps/tasks/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/tasks/views.py):**
   - Populated `created_by=request.user` on task creation.
   - Enforced assignee team membership validation.
   - Added action types: `task_created`, `task_updated`, `status_changed`, `comment_added`.
6. **[backend/apps/activity/models.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/models.py):**
   - Added `action_type` field to `Activity` model and `to_dict()`.
7. **[backend/apps/activity/services.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/services.py):**
   - Updated `log_activity()` to accept and persist `action_type`.
8. **[backend/apps/activity/urls.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/urls.py):**
   - Registered `/api/teams/<id>/activities/` alongside `/api/teams/<id>/activity/`.
9. **[backend/apps/activity/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/views.py):**
   - Included `action_type` in serialized activity feed response.
10. **[backend/apps/common/utils.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/common/utils.py):**
    - Updated `get_team_or_error()` to require team membership and return 404 on cross-team access.
11. **[backend/apps/teams/tests.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/teams/tests.py):**
    - Comprehensive test suite covering all 19 required scenarios.

### Frontend
1. **[frontend/app/register/page.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/app/register/page.js):**
   - Refactored from one-time setup to full public member registration with auto-login.
2. **[frontend/app/login/page.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/app/login/page.js):**
   - Added direct navigation link to `/register`.
3. **[frontend/components/TeamCard.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/components/TeamCard.js):**
   - Fixed member count calculation for 0 and 1 member teams.
4. **[frontend/components/TeamHeader.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/components/TeamHeader.js):**
   - Handled empty and single member display gracefully.
5. **[frontend/components/NewTaskForm.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/components/NewTaskForm.js) & [TaskEditForm.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/components/TaskEditForm.js):**
   - Filtered assignee options safely.
6. **[frontend/components/UserManagement.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/components/UserManagement.js) & [DashboardPage](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/app/dashboard/page.js):**
   - Connected `onUserChanged` synchronization to update team cards when members are added/deleted.

---

## 5. API Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Public | Register as Member (`role="member"` strictly enforced) |
| `POST` | `/api/auth/login/` | Public | Authenticate and obtain JWT access & refresh tokens |
| `POST` | `/api/auth/refresh/` | Public | Refresh access token using valid refresh token |
| `GET` | `/api/auth/me/` | Authenticated | Retrieve current user profile |
| `GET` | `/api/teams/` | Authenticated | List all teams where user is a member |
| `POST` | `/api/teams/` | Admin only | Create new team (creator automatically joined) |
| `GET` | `/api/teams/{id}/` | Team members only | Get team details and member list |
| `POST` | `/api/teams/{id}/invite/` | Admin members only | Invite existing registered user to team |
| `GET` | `/api/teams/{id}/tasks/` | Team members only | List team tasks (supports `?status=` filter) |
| `POST` | `/api/teams/{id}/tasks/` | Team members only | Create a task (assignee must be team member) |
| `GET` | `/api/tasks/{id}/` | Team members only | Get task details |
| `PATCH` | `/api/tasks/{id}/` | Team members only | Update task title, description, assignee, status |
| `GET` | `/api/tasks/{id}/comments/` | Team members only | List comments for task |
| `POST` | `/api/tasks/{id}/comments/` | Team members only | Add comment to task |
| `GET` | `/api/teams/{id}/activities/` | Team members only | Get audit activity timeline (newest first) |

---

## 6. Test Suite & Results

The automated test suite in `backend/apps/teams/tests.py` was executed with `python manage.py test apps.teams`:

| # | Test Name | Scenario Tested | Result |
|---|---|---|---|
| 1 | `test_successful_registration` | Valid registration returns 201 and creates member | **PASSED** |
| 2 | `test_duplicate_email_registration` | Duplicate email returns 400 with descriptive error | **PASSED** |
| 3 | `test_invalid_login` | Bad password returns 401 | **PASSED** |
| 4 | `test_unauthenticated_api_access` | Access without Bearer token returns 401 | **PASSED** |
| 5 | `test_invalid_or_expired_jwt` | Expired/tampered JWT rejected with 401 | **PASSED** |
| 6 | `test_password_hashing` | Stored password is encrypted with PBKDF2/Argon2 | **PASSED** |
| 7 | `test_attempt_to_register_as_admin_forces_member` | Malicious `role: admin` payload forces `member` | **PASSED** |
| 8 | `test_admin_creates_team_and_joins_automatically` | Admin creates team and is auto-added as member | **PASSED** |
| 9 | `test_member_cannot_create_team` | Member attempting `POST /api/teams/` gets 403 | **PASSED** |
| 10 | `test_member_cannot_invite_users` | Member attempting invite gets 403 | **PASSED** |
| 11 | `test_member_cannot_access_unrelated_teams` | User accessing unjoined team gets 404 | **PASSED** |
| 12 | `test_user_cannot_modify_role` | `PATCH /api/users/<id>/` rejects role modification | **PASSED** |
| 13 | `test_create_task_with_created_by` | New task persists `created_by` user reference | **PASSED** |
| 14 | `test_update_task_details_and_status` | Patching title and status persists correctly | **PASSED** |
| 15 | `test_reject_assignment_to_non_team_member` | Assigning to non-member returns 400 | **PASSED** |
| 16 | `test_reject_invalid_task_status` | Invalid status string returns 400 | **PASSED** |
| 17 | `test_prevent_cross_team_task_access` | Accessing task of another team returns 404 | **PASSED** |
| 18 | `test_activity_generation_and_order` | Task create, status change, and comments log activity newest-first | **PASSED** |
| 19 | `test_unauthorized_user_cannot_access_timeline` | Non-member cannot access activity timeline (404) | **PASSED** |

**Summary:** 19 tests ran, **0 failed, 0 errors**.

Frontend production build check:
```bash
npm run build
# Compiled successfully in 246ms — 0 errors
```

---

## 7. Remaining Known Issues
- None. All identified vulnerabilities and architectural inconsistencies have been resolved.

---

## 8. Instructions to Run the Project

### 8.1 Backend Setup
1. Open a terminal in the `backend/` directory.
2. Ensure MongoDB is running locally (`mongodb://localhost:27017/team_task_tracker`).
3. Run migrations / system checks:
   ```bash
   python manage.py check
   ```
4. Run the automated test suite:
   ```bash
   python manage.py test apps.teams
   ```
5. Start the backend development server:
   ```bash
   python manage.py runserver
   ```
   *(Running at `http://localhost:8000`)*

### 8.2 Frontend Setup
1. Open a terminal in the `frontend/` directory.
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```
   *(Running at `http://localhost:3000`)*

### 8.3 Creating an Application Admin
To create or update the Application Admin, run:
```bash
python manage.py createsuperadmin --name "Admin Name" --email "admin@example.com" --password "AdminPassword123!"
```
Public users can register directly through the frontend at **`http://localhost:3000/register`**.
