# Design Document: Three-Tier Role-Based Access Control (RBAC)

## 1. Intent and Purpose
Refactor the role architecture of the Team Task Tracker application to support three distinct, strictly enforced user roles:
1. **SUPERADMIN**: Platform-level owner with global administrative authority (can manage all users, promote members to Admin, view all teams, and perform all admin actions).
2. **ADMIN**: Application-level team administrator (can create teams, invite members to their teams, create/update tasks, view timelines).
3. **MEMBER**: Standard team collaborator (can view joined teams, create/update tasks within joined teams, update statuses, comment, and view timelines).

This architecture keeps roles within the MongoDB `User` collection while maintaining clean isolation between platform management, team management, and member collaboration.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Store all three roles (`SUPERADMIN`, `ADMIN`, `MEMBER`) in the MongoEngine `User` document.
- Default all registered users to `MEMBER`.
- Reject any attempt to pass `SUPERADMIN` or `ADMIN` in public registration payloads.
- Restrict user management (`/api/users/`) and role promotions exclusively to `SUPERADMIN`.
- Allow both `SUPERADMIN` and `ADMIN` to create teams and invite users to their teams.
- Grant `SUPERADMIN` global access across teams while strictly enforcing team membership restrictions on `ADMIN` and `MEMBER`.
- Provide management commands `python manage.py create_superadmin` and `python manage.py create_app_admin` with password hashing and duplicate validation.
- Conditionally render frontend actions based on role:
  - User Management tab & controls: `SUPERADMIN` only.
  - Create Team & Invite Member controls: `SUPERADMIN` and `ADMIN`.
  - Task collaboration: All roles (within authorized teams).

### Non-Goals
- Django relational database migration for application models. Django framework models remain separate from MongoEngine.
- Custom dynamic permission editing or per-team custom roles (roles remain platform/application-wide).

### Anti-Goals
- Never rely on frontend UI hiding alone for security. The backend must independently reject unauthorized actions with HTTP 403 Forbidden.
- Never allow users to escalate their own role or promote others unless authenticated as `SUPERADMIN`.
- Never expose password hashes or sensitive internal fields in API responses.

---

## 3. Approaches Considered

1. **Approach 1: Three-Tier Role Hierarchy with Global Superadmin Access (Selected)**
   - Single MongoDB `users` collection with uppercase choices `("SUPERADMIN", "ADMIN", "MEMBER")`.
   - Backward-compatibility getter/normalizer to smoothly map legacy `"admin"` $\to$ `"ADMIN"` and `"member"` $\to$ `"MEMBER"`.
   - Backend permissions `IsSuperAdmin`, `IsAdminOrSuperAdmin`, and global team access check in `get_team_or_error()`.
   - Dedicated management commands for initial bootstrapping.
   - *Rationale:* Perfectly aligns with user specifications and requires zero database migrations or external dependencies.

2. **Approach 2: Strict Superadmin Scoping (Rejected)**
   - Requires Superadmin to be an explicit member of every team to view its tasks.
   - *Drawback:* Hinders platform administration and violates the requirement that Superadmin has global access.

---

## 4. Technical Architecture & Component Changes

### 4.1 Backend Models (`apps/users/models.py`)
- Define `ROLE_CHOICES = ("SUPERADMIN", "ADMIN", "MEMBER")`.
- Update `User.role` field: `choices=ROLE_CHOICES`, `default="MEMBER"`.
- Support seamless normalization of role in `to_dict()` and property helpers:
  - `is_superadmin`: `self.role.upper() == "SUPERADMIN"`
  - `is_admin_or_superadmin`: `self.role.upper() in ["ADMIN", "SUPERADMIN"]`
  - `is_member`: `self.role.upper() == "MEMBER"`

### 4.2 Permissions & Utilities (`apps/common/permissions.py` & `apps/common/utils.py`)
- `IsSuperAdmin`: validates `request.user.role.upper() == "SUPERADMIN"`.
- `IsAdminOrSuperAdmin`: validates `request.user.role.upper() in ["ADMIN", "SUPERADMIN"]`.
- `get_team_or_error(team_id, user)`:
  - If `user.role.upper() == "SUPERADMIN"`, return team directly (global access).
  - Otherwise, verify `user` is in `team.members`, or raise 404 / 403.
- `get_task_and_team_or_error(task_id, user)`:
  - Uses `get_team_or_error(task.team.id, user)` to ensure consistent global superadmin and scoped member authorization.

### 4.3 Endpoints & Authorization Matrix

| Endpoint | Method | Required Role | Behavior |
| :--- | :--- | :--- | :--- |
| `/api/auth/register/` | POST | Public | Always forces `role = "MEMBER"`. Ignores payload role. |
| `/api/auth/login/` | POST | Public | Authenticates credentials; returns user object with `role`. |
| `/api/auth/me/` | GET | Authenticated | Returns current authenticated user details including role. |
| `/api/users/` | GET, POST | `SUPERADMIN` | Superadmin manages platform users; can create `ADMIN` or `MEMBER`. |
| `/api/users/<id>/` | DELETE, PATCH | `SUPERADMIN` | Superadmin can delete users or update details/roles. |
| `/api/teams/` | POST | `SUPERADMIN`, `ADMIN` | Creates team with creator as first member. |
| `/api/teams/` | GET | Authenticated | `SUPERADMIN` gets all teams; `ADMIN`/`MEMBER` get joined teams. |
| `/api/teams/<id>/` | GET | Auth (Member/Superadmin) | Retrieves team details. |
| `/api/teams/<id>/invite/` | POST | `SUPERADMIN`, `ADMIN` (team member) | Invites a registered member to the team. |
| `/api/teams/<id>/tasks/` | GET, POST | Auth (Member/Superadmin) | Team task listing and creation. |
| `/api/tasks/<id>/` | GET, PATCH | Auth (Member/Superadmin) | Task detail and status/assignment update. |
| `/api/tasks/<id>/comments/`| GET, POST | Auth (Member/Superadmin) | Task comments. |
| `/api/teams/<id>/activity/`| GET | Auth (Member/Superadmin) | Team activity timeline. |

### 4.4 Management Commands
1. `apps/users/management/commands/create_superadmin.py`:
   - Interactive or argument-driven (`--name`, `--email`, `--password`).
   - Validates email and minimum password requirements.
   - Promotes existing user to `SUPERADMIN` or creates a new one with hashed password.
2. `apps/users/management/commands/create_app_admin.py`:
   - Interactive or argument-driven (`--name`, `--email`, `--password`).
   - Promotes existing member to `ADMIN` or creates a new `ADMIN`.
   - Never assigns `SUPERADMIN` or Django framework superuser.

### 4.5 Frontend Adjustments
- `Navbar.js`: Display styled role badge for `SUPERADMIN` (purple/indigo), `ADMIN` (blue), and `MEMBER` (emerald/slate).
- `dashboard/page.js`:
  - Show "User Management" navigation tab only if `user.role === "SUPERADMIN"`.
  - Show "Create Team" button only if `user.role === "SUPERADMIN" || user.role === "ADMIN"`.
- `TeamHeader.js`:
  - Show "Invite Member" button only if `user.role === "SUPERADMIN" || user.role === "ADMIN"`.
- `UserManagement.js`:
  - Enable role selection (`ADMIN` vs `MEMBER`) for Superadmin user creation and role updates.

---

## 5. Verification & Testing Plan
- **Unit & Integration Tests (`backend/apps/teams/tests.py`)**:
  - Test 1: `SUPERADMIN` can access `/api/users/`, create users, and promote members.
  - Test 2: `ADMIN` cannot access `/api/users/` (receives 403 Forbidden).
  - Test 3: `ADMIN` can create teams and invite members to their teams.
  - Test 4: `MEMBER` cannot create teams (receives 403 Forbidden).
  - Test 5: `MEMBER` cannot invite users to teams (receives 403 Forbidden).
  - Test 6: `MEMBER` cannot promote themselves via API (receives 403/400).
  - Test 7: Public registration payload with `role: "SUPERADMIN"` or `"ADMIN"` strictly results in `role: "MEMBER"`.
  - Test 8: `SUPERADMIN` can access all teams (global access).
  - Test 9: `ADMIN` cannot access teams they do not belong to.
  - Test 10: `create_superadmin` and `create_app_admin` commands execute correctly.
