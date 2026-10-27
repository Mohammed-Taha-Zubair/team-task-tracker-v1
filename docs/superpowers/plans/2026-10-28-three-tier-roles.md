# Three-Tier Role-Based Access Control (RBAC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three distinct roles (`SUPERADMIN`, `ADMIN`, `MEMBER`) across backend models, permissions, management commands, and frontend UI without breaking existing MongoDB data or API contracts.

**Architecture:** MongoEngine `User` document stores `role` with choices `("SUPERADMIN", "ADMIN", "MEMBER")` defaulting to `"MEMBER"`. Custom DRF permissions enforce access control: `SUPERADMIN` manages users and has global visibility; `ADMIN` manages team creation and invitations within their teams; `MEMBER` is restricted to collaboration within joined teams. Bootstrap commands `create_superadmin` and `create_app_admin` provide secure provisioning.

**Tech Stack:** Python 3.12, Django 5.x, Django REST Framework, MongoEngine, Next.js 14, React, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-28-three-tier-roles-design.md`

## Global Constraints
- Single source of truth for application users is MongoDB `users` collection.
- Default role for all public registrations is strictly `"MEMBER"`.
- Roles must normalize case (`"admin"` -> `"ADMIN"`, `"member"` -> `"MEMBER"`) to maintain backward compatibility with existing databases and tests.
- Non-superadmins must receive `403 Forbidden` on user management and unauthorized team creation/invites.
- Passwords must always be hashed with Django's `make_password` and never exposed in API responses.

## Review Focus
1. User supplies lowercase `"admin"` or `"member"` in payloads: normalized cleanly to `"ADMIN"` / `"MEMBER"`.
2. Malicious public registration sends `{"role": "SUPERADMIN"}`: registration silently enforces `role="MEMBER"`.
3. Admin attempts to call `/api/users/`: returns `403 Forbidden`.
4. Member attempts to create a team (`POST /api/teams/`): returns `403 Forbidden`.
5. Member attempts to invite another user (`POST /api/teams/<id>/invite/`): returns `403 Forbidden`.

---

### Task 1: Update User Model & Registration Role Normalization

**Files:**
- Modify: `backend/apps/users/models.py`
- Modify: `backend/apps/users/views.py:11-65`
- Test: `backend/apps/teams/tests.py`

**Interfaces:**
- Consumes: MongoEngine `User` model
- Produces: `User.ROLE_CHOICES`, `User.role` default `"MEMBER"`, `User.is_superadmin`, `User.is_admin_or_superadmin`, `User.is_member`, `user.to_dict()` with normalized uppercase role.

- [ ] **Step 1: Write the failing unit tests for User model role properties and registration**

```python
def test_user_roles_and_properties(self):
    superadmin = User(name="Super", email="super@example.com", password="hash", role="SUPERADMIN")
    admin = User(name="Admin", email="admin@example.com", password="hash", role="ADMIN")
    member = User(name="Member", email="member@example.com", password="hash", role="MEMBER")
    legacy = User(name="Legacy", email="legacy@example.com", password="hash", role="admin")

    self.assertTrue(superadmin.is_superadmin)
    self.assertTrue(superadmin.is_admin_or_superadmin)
    self.assertTrue(admin.is_admin_or_superadmin)
    self.assertFalse(admin.is_superadmin)
    self.assertTrue(member.is_member)
    self.assertFalse(member.is_admin_or_superadmin)
    self.assertEqual(legacy.to_dict()["role"], "ADMIN")
```

- [ ] **Step 2: Run test to verify failure**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests.test_user_roles_and_properties`
Expected: FAIL with `AttributeError` on role properties or mismatch.

- [ ] **Step 3: Implement role choices, properties, and to_dict normalization in `apps/users/models.py` and `apps/users/views.py`**
In `apps/users/models.py`:
- Define `ROLE_CHOICES = ("SUPERADMIN", "ADMIN", "MEMBER")`.
- Set `role = StringField(choices=ROLE_CHOICES, default="MEMBER")`.
- Add `@property def is_superadmin(self): return (self.role or "").upper() == "SUPERADMIN"`.
- Add `@property def is_admin_or_superadmin(self): return (self.role or "").upper() in ["ADMIN", "SUPERADMIN"]`.
- Add `@property def is_member(self): return (self.role or "").upper() == "MEMBER"`.
- In `to_dict()`, return `"role": (self.role or "MEMBER").upper()`.
- In `RegisterView.post`, enforce `role="MEMBER"`.

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests.test_user_roles_and_properties`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/apps/users/models.py backend/apps/users/views.py backend/apps/teams/tests.py
git commit -m "feat(users): add three-tier role definitions and normalization"
```

---

### Task 2: Implement Permissions and Global/Scoped Team Authorization

**Files:**
- Modify: `backend/apps/common/permissions.py`
- Modify: `backend/apps/common/utils.py`
- Modify: `backend/apps/teams/views.py`
- Modify: `backend/apps/tasks/views.py`
- Test: `backend/apps/teams/tests.py`

**Interfaces:**
- Consumes: `user.is_superadmin`, `user.is_admin_or_superadmin`
- Produces: `IsSuperAdmin`, `IsAdminOrSuperAdmin` permission classes; `get_team_or_error(id, user)` allowing global superadmin access.

- [ ] **Step 1: Write failing tests for permissions and team access**
Add tests:
- `test_superadmin_and_admin_can_create_team_but_member_cannot`:
  - `SUPERADMIN` POST `/api/teams/` -> 201 Created
  - `ADMIN` POST `/api/teams/` -> 201 Created
  - `MEMBER` POST `/api/teams/` -> 403 Forbidden
- `test_superadmin_and_admin_can_invite_member_but_member_cannot`:
  - `ADMIN` POST `/api/teams/<id>/invite/` -> 200 OK
  - `MEMBER` POST `/api/teams/<id>/invite/` -> 403 Forbidden
- `test_superadmin_has_global_team_access`:
  - `SUPERADMIN` GET `/api/teams/` -> returns all teams
  - `SUPERADMIN` GET `/api/teams/<id>/` -> 200 OK even if not listed in `team.members`
  - `ADMIN` GET `/api/teams/<unjoined_id>/` -> 404 Not Found

- [ ] **Step 2: Run tests to verify they fail**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests.test_superadmin_and_admin_can_create_team_but_member_cannot`
Expected: FAIL.

- [ ] **Step 3: Implement permissions and team scoping**
In `apps/common/permissions.py`:
- `IsSuperAdmin`: returns `bool(request.user and getattr(request.user, "is_superadmin", False))`.
- `IsAdminOrSuperAdmin`: returns `bool(request.user and getattr(request.user, "is_admin_or_superadmin", False))`.
In `apps/common/utils.py`:
- Update `get_team_or_error(team_id, user)`:
  - If `user.is_superadmin`, return `team` directly without requiring `user` in `team.members`.
  - For non-superadmin, verify `user` is in `team.members` or raise `NotFound("Team not found")`.
In `apps/teams/views.py`:
- `TeamListCreateView.post`: verify `request.user.is_admin_or_superadmin`, otherwise 403.
- `TeamListCreateView.get`: if `request.user.is_superadmin`, query `Team.objects.all().order_by("-created_at")`. Else query `Team.objects(members=request.user).order_by("-created_at")`.
- `TeamInviteView.post`: verify `request.user.is_admin_or_superadmin`, otherwise 403.
In `apps/tasks/views.py`:
- Verify `get_task_and_team_or_error` passes `request.user` to `get_team_or_error`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/apps/common/permissions.py backend/apps/common/utils.py backend/apps/teams/views.py backend/apps/tasks/views.py backend/apps/teams/tests.py
git commit -m "feat(teams): enforce three-tier team permissions and global superadmin access"
```

---

### Task 3: Restrict User Management & Role Promotion to Superadmin

**Files:**
- Modify: `backend/apps/users/views.py:161-294`
- Test: `backend/apps/teams/tests.py`

**Interfaces:**
- Consumes: `IsSuperAdmin`
- Produces: `UserListCreateView` allowing Superadmin to create `ADMIN` and `MEMBER`; `UserDetailView.patch` allowing Superadmin to promote/demote roles between `ADMIN` and `MEMBER`.

- [ ] **Step 1: Write failing tests for user management restrictions**
Add tests:
- `test_only_superadmin_can_access_user_list_and_create`:
  - `SUPERADMIN` GET `/api/users/` -> 200 OK
  - `ADMIN` GET `/api/users/` -> 403 Forbidden
  - `MEMBER` GET `/api/users/` -> 403 Forbidden
  - `SUPERADMIN` POST `/api/users/` with `role="ADMIN"` -> 201 Created
- `test_superadmin_can_promote_member_to_admin`:
  - `SUPERADMIN` PATCH `/api/users/<member_id>/` with `{"role": "ADMIN"}` -> 200 OK with `role="ADMIN"`.
  - `ADMIN` PATCH `/api/users/<member_id>/` -> 403 Forbidden.
  - `MEMBER` PATCH `/api/users/<member_id>/` -> 403 Forbidden.

- [ ] **Step 2: Run tests to verify they fail**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests.test_only_superadmin_can_access_user_list_and_create`
Expected: FAIL.

- [ ] **Step 3: Update `UserListCreateView` and `UserDetailView` in `apps/users/views.py`**
- Set `permission_classes = [IsSuperAdmin]` on both views.
- In `UserListCreateView.post`:
  - Allow `role` to be `"ADMIN"` or `"MEMBER"` (normalize to uppercase). Reject `"SUPERADMIN"` via API with 400.
- In `UserDetailView.patch`:
  - Allow updating `role` if the new role is `"ADMIN"` or `"MEMBER"`. Prevent assigning `"SUPERADMIN"` via API.
  - Prevent superadmin from demoting themselves.
- In `UserDetailView.delete`:
  - Prevent user from deleting themselves. Cascade cleanup references.

- [ ] **Step 4: Run tests to verify they pass**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/apps/users/views.py backend/apps/teams/tests.py
git commit -m "feat(users): restrict user management and role promotions to superadmin"
```

---

### Task 4: Create Management Commands `create_superadmin` and `create_app_admin`

**Files:**
- Create: `backend/apps/users/management/commands/create_superadmin.py`
- Create: `backend/apps/users/management/commands/create_app_admin.py`
- Modify: `backend/apps/users/management/commands/createsuperadmin.py` (redirect or support legacy call)
- Test: `backend/apps/teams/tests.py`

**Interfaces:**
- Produces: Management commands callable via `call_command("create_superadmin", ...)` and `call_command("create_app_admin", ...)`.

- [ ] **Step 1: Write failing tests for both management commands**
Add tests:
- `test_create_superadmin_command`: calls command with `--name`, `--email`, `--password`, verifies user created with `role="SUPERADMIN"`.
- `test_create_app_admin_command`: calls command with `--name`, `--email`, `--password`, verifies user created with `role="ADMIN"`.

- [ ] **Step 2: Run test to verify failure**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests.test_create_superadmin_command`
Expected: FAIL (CommandError: Unknown command).

- [ ] **Step 3: Implement management commands**
- In `create_superadmin.py`:
  - Accept `--name`, `--email`, `--password`.
  - Validate email and password.
  - Create or update existing user with `role="SUPERADMIN"`, password hashed via `make_password`.
- In `create_app_admin.py`:
  - Accept `--name`, `--email`, `--password`.
  - Validate email and password.
  - Create or update existing user with `role="ADMIN"`, password hashed via `make_password`.
- Update `createsuperadmin.py` to invoke or inherit `create_superadmin.py` logic.

- [ ] **Step 4: Run tests to verify they pass**
Run: `python manage.py test apps.teams.tests.TeamTaskTrackerSecurityTests.test_create_superadmin_command`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/apps/users/management/commands/ backend/apps/teams/tests.py
git commit -m "feat(cli): add create_superadmin and create_app_admin management commands"
```

---

### Task 5: Frontend Role Presentation & Conditional Controls

**Files:**
- Modify: `frontend/components/Navbar.js`
- Modify: `frontend/app/dashboard/page.js`
- Modify: `frontend/components/TeamHeader.js`
- Modify: `frontend/components/UserManagement.js`

**Interfaces:**
- Consumes: `user.role` (`"SUPERADMIN"`, `"ADMIN"`, `"MEMBER"`)
- Produces: Accurate conditional rendering of "User Management", "Create Team", "Invite Member", and role badges.

- [ ] **Step 1: Update Navbar role badge styling**
In `frontend/components/Navbar.js`:
- Check normalized uppercase `user.role`.
- Style badges:
  - `SUPERADMIN`: Purple/Indigo badge (`bg-purple-100 text-purple-800 border-purple-200`)
  - `ADMIN`: Blue badge (`bg-blue-100 text-blue-800 border-blue-200`)
  - `MEMBER`: Slate badge (`bg-slate-100 text-slate-800 border-slate-200`)

- [ ] **Step 2: Update Dashboard view tabs and Create Team control**
In `frontend/app/dashboard/page.js`:
- Display "User Management" tab button ONLY if `user?.role === "SUPERADMIN"`.
- Display "Create Team" button ONLY if `user?.role === "SUPERADMIN" || user?.role === "ADMIN"`.
- Display user role cleanly in subtitle.

- [ ] **Step 3: Update TeamHeader Invite Member control**
In `frontend/components/TeamHeader.js`:
- Render "Invite Member" button ONLY if `user?.role === "SUPERADMIN" || user?.role === "ADMIN"`.

- [ ] **Step 4: Update UserManagement component**
In `frontend/components/UserManagement.js`:
- Support selecting role between `ADMIN` and `MEMBER` when Superadmin creates a user.
- Render role badge with support for `SUPERADMIN`, `ADMIN`, `MEMBER`.

- [ ] **Step 5: Verify frontend compiles cleanly without errors**
Run: `npm run lint` or `npm run build` in `/home/zubb/Projects/TEAM-TASK-Manager/frontend`.
Expected: Successful build / no lint errors.

- [ ] **Step 6: Commit**
```bash
git add frontend/components/Navbar.js frontend/app/dashboard/page.js frontend/components/TeamHeader.js frontend/components/UserManagement.js
git commit -m "feat(frontend): display three-tier role controls and badges"
```

---

### Task 6: Comprehensive Verification & Regression Testing

**Files:**
- Test: `backend/apps/teams/tests.py`

- [ ] **Step 1: Run full backend test suite**
Run: `python manage.py test apps.teams apps.users`
Expected: All tests pass.

- [ ] **Step 2: Verify all 7 prompt test criteria**
Confirm:
1. Superadmin has access to user management and global teams.
2. Application Admin can create teams and invite members.
3. Member cannot create teams (returns 403).
4. Member cannot invite users (returns 403).
5. Member cannot promote themselves.
6. Public registration cannot create Admin or Superadmin.
7. Application Admin is not a Django Superuser.

- [ ] **Step 3: Final Commit**
```bash
git commit --allow-empty -m "chore: verify three-tier role enforcement across full suite"
```
