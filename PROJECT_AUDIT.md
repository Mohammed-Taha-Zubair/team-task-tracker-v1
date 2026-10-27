# Project Security & Architecture Audit: Team Task Tracker

**Date:** 2026-10-28  
**Auditor:** Senior Full-Stack & Security Engineer  
**Branch:** `refactor/secure-team-task-tracker`  
**Status:** Audit Completed — Implementation Plan Prepared

---

## 1. Executive Summary

A comprehensive architectural and security audit was conducted on the **Team Task Tracker** codebase (Django REST Framework + MongoDB + Next.js). The application is designed for collaborative project and task tracking with role-based access control.

While the core functionality is established, the audit identified critical security gaps, authorization inconsistencies, missing entity fields, and architectural antipatterns—notably around public user registration, role enforcement, task ownership, and activity logging.

This document details the existing architecture, vulnerabilities discovered, missing features, and an actionable refactoring plan.

---

## 2. Existing Architecture Overview

### 2.1 Backend (Django + Django REST Framework + MongoEngine)
- **Framework:** Django 5 with DRF. No relational database is configured (`DATABASES = {}`).
- **Database Engine:** MongoDB accessed via `mongoengine.connect()` in [backend/config/settings.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/config/settings.py).
- **Authentication:** Custom JWT-based stateless authentication (`JWTAuth`) using PyJWT (HS256) in [backend/apps/users/authentication.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/users/authentication.py).
  - Access Token expiry: 15 minutes.
  - Refresh Token expiry: 7 days.
- **Authorization:** Hybrid of ad-hoc view checks and a custom `IsAdmin` permission in [backend/apps/common/permissions.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/common/permissions.py).
- **Core Entities (MongoDB Collections):**
  - `users`: Stores name, email, hashed password, role (`admin` or `member`), timestamps.
  - `teams`: Stores name, description, `created_by` (User ref), `members` (List of User refs), timestamps.
  - `tasks`: Stores title, description, `assigned_to` (User ref), `team` (Team ref), status (`pending`, `in_progress`, `done`), timestamps.
  - `comments`: Stores `task` (Task ref), `user` (User ref), text, timestamp.
  - `activities`: Stores `team` (Team ref), `user` (User ref), `task` (Task ref), message, timestamp.

### 2.2 Frontend (Next.js 16 App Router)
- **Framework:** Next.js (Turbopack) with React 19.
- **State & Auth:** `AuthContext.js` manages session lifecycle with in-memory access tokens and `localStorage` refresh tokens. Automatic silent token refresh is handled inside `lib/api.js`.
- **UI Components:**
  - `/login`: User login form.
  - `/register`: Previously used as a bootstrap admin setup page.
  - `/dashboard`: Lists teams, user management (admin only), and team creation (admin only).
  - `/teams/[id]`: Team workspace containing task list, task creation, member display, invite modal, and real-time live activity timeline.
  - `/teams/[id]/tasks/[taskId]`: Task editing and comments.

---

## 3. Identified Problems & Anti-Patterns

### 3.1 Mixing Django Superuser and Application Admin
- **Problem:** There was ambiguity between Django's native superuser (`is_superuser`/`is_staff`) and application-level roles (`admin`/`member`).
- **Correction:** Keep them strictly separate. Django superuser is purely an internal framework tool. Normal application authorization relies exclusively on the application role (`role: admin` vs `role: member`) stored on the MongoEngine `User` document.

### 3.2 Registration Locked Down (Bypassing Public Registration)
- **Problem:** `POST /api/auth/register/` was hard-coded to return `403 Forbidden` if any user already existed in the database, requiring the super admin to manually create every user.
- **Correction:** Public registration must be open to everyone to register as an **Application Member**.
- **Rule:** Public registration must **always** enforce `role = "member"`, strictly rejecting or ignoring any `"role": "admin"` sent in the request payload.

### 3.3 Missing Entity Fields
- **`Task` Entity:** Currently lacks `created_by` (User Reference). Tracking who created the task is an explicit architectural requirement.
- **`Activity` Entity:** Currently lacks `action_type` (e.g., `task_created`, `task_updated`, `status_changed`, `comment_added`, `member_added`).

### 3.4 Inconsistent Activity Timeline Generation
- **Problem:** Updating a task title or description does not record an action type, and status change activity messages were formatted inconsistently.
- **Correction:** Automatically record distinct `action_type` values and formatted audit messages on every task creation, task update, status change, and comment addition.

### 3.5 API Route Standardization
- **Problem:** The activity endpoint in `backend/apps/activity/urls.py` is configured as `/api/teams/<id>/activity/`, whereas the specification requires `GET /api/teams/{id}/activities/`.
- **Correction:** Support both `activities/` (canonical) and `activity/` (backward compatibility) so the frontend integration remains unbroken.

---

## 4. Security Vulnerabilities (Identified & Cataloged)

| ID | Vulnerability | Severity | Impact | Remediation |
|---|---|---|---|---|
| **SEC-01** | **Mass Assignment / Privilege Escalation in Registration** | **Critical** | Attackers could send `{"role": "admin"}` during registration to gain administrative access. | Hardcode `role = "member"` in `RegisterView`. |
| **SEC-02** | **Broken Object Level Authorization (BOLA / IDOR) on Teams** | **High** | A member might access a team they do not belong to by guessing or passing another team's ID. | Enforce that `request.user` is in `team.members` on all team-scoped endpoints. Return 404 for non-members to prevent existence enumeration. |
| **SEC-03** | **Cross-Team Task Assignment Vulnerability** | **High** | A user could assign a task to a user who is not a member of that team by providing their `user_id`. | Strictly validate that `assigned_to` belongs to `team.members` before saving. |
| **SEC-04** | **Unrestricted Role Modification** | **High** | Users could attempt to promote themselves or others to `admin`. | Prevent role modification by non-admins, prevent users from modifying their own role, and enforce single super admin policy. |
| **SEC-05** | **Unhandled Malformed BSON ObjectIds** | **Medium** | Passing malformed IDs (`null`, `undefined`, invalid strings) causes unhandled exceptions or 500 errors. | Validate all incoming IDs with `ObjectId.is_valid()` and return 400/404. |
| **SEC-06** | **Missing Task Status Validation** | **Medium** | Submitting arbitrary strings as status could corrupt board state. | Strictly validate against `["pending", "in_progress", "done"]` (case-insensitive). |
| **SEC-07** | **Sensitive Data Leakage** | **Low** | Risk of exposing password hashes or internal secrets in user representations. | Verify `User.to_dict()` and serializers never serialize `password` or internal tokens. |

---

## 5. Required Role & Permission Matrix

| Action | Super Admin (`admin`) | Member (`member`) | Unauthenticated |
|---|:---:|:---:|:---:|
| Register account | N/A (creates Member) | Yes (creates Member) | Yes |
| Log in / Refresh JWT | Yes | Yes | Yes |
| View own profile (`/api/auth/me/`) | Yes | Yes | No (401) |
| Create Team (`POST /api/teams/`) | **Yes** | **No (403)** | No (401) |
| View joined Teams (`GET /api/teams/`) | Yes (joined teams) | Yes (joined teams) | No (401) |
| Invite member to Team | **Yes** | **No (403)** | No (401) |
| View Team details / tasks / timeline | Yes (if member) | Yes (if member) | No (401) |
| Create task in Team | Yes (if member) | Yes (if member) | No (401) |
| Update task status / details | Yes (if member) | Yes (if member) | No (401) |
| Assign task to member | Yes (team member only) | Yes (team member only)| No (401) |
| Add comment to task | Yes (if member) | Yes (if member) | No (401) |

---

## 6. Files Requiring Modification

### Backend
1. **[backend/apps/users/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/users/views.py):**
   - Enable open public registration in `RegisterView`.
   - Strictly force `role = "member"` during public registration.
   - Validate email format and minimum password length (min 8 chars).
2. **[backend/apps/tasks/models.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/tasks/models.py):**
   - Add `created_by = ReferenceField("User", null=True, default=None)` to `Task`.
   - Update `to_dict()` to include `created_by`.
3. **[backend/apps/tasks/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/tasks/views.py):**
   - Populate `task.created_by = request.user` upon task creation.
   - Enforce team membership check for both creator and assignee.
   - Ensure cross-team access returns 404.
4. **[backend/apps/activity/models.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/models.py):**
   - Add `action_type = StringField(required=True)` to `Activity`.
   - Update `to_dict()` to include `action_type`.
5. **[backend/apps/activity/services.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/services.py):**
   - Accept and record `action_type` in `log_activity()`.
6. **[backend/apps/activity/urls.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/activity/urls.py):**
   - Add route for `<str:id>/activities/` alongside `<str:id>/activity/`.
7. **[backend/apps/teams/views.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/teams/views.py):**
   - Enforce `IsAdmin` permission on team creation and member invitations.
   - Automatically add creator to team members upon creation.
   - Ensure `GET /api/teams/` returns teams where user is a member.
8. **[backend/apps/teams/tests.py](file:///home/zubb/Projects/TEAM-TASK-Manager/backend/apps/teams/tests.py):**
   - Expand comprehensive test suite covering all security and permission test cases.

### Frontend
1. **[frontend/app/register/page.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/app/register/page.js):**
   - Convert from one-time "Admin Setup" to a clean, user-facing public registration page for team members.
   - Call `/api/auth/register/` and redirect on success.
2. **[frontend/app/login/page.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/app/login/page.js):**
   - Add "Don't have an account? Register" link to `/register`.
3. **[frontend/components/Navbar.js](file:///home/zubb/Projects/TEAM-TASK-Manager/frontend/components/Navbar.js):**
   - Maintain clear role indicator (`admin` vs `member`).

---

## 7. Next Steps (Implementation Phases)
1. **Phase 2 (Backend Refactoring & Security Hardening):** Implement entity updates (`created_by`, `action_type`), open member registration, DRF permission enforcement, and timeline service updates.
2. **Phase 3 (Frontend Refactoring):** Update `/register` page and link on `/login`.
3. **Phase 4 (Testing & Verification):** Implement automated test suite covering all 18+ scenarios specified in the requirements.
4. **Phase 5 (Final Report):** Generate `REFACTOR_REPORT.md` documenting all changes, verification results, and run instructions.
