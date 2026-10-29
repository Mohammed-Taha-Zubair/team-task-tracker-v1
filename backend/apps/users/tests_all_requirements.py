from unittest import TestCase
from io import StringIO
from django.core.management import call_command
from django.contrib.auth.hashers import check_password
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.views import (
    RegisterView,
    UserListCreateView,
    UserDetailView,
    UserRoleUpdateView,
)
from apps.teams.views import TeamListCreateView, TeamInviteView
from apps.tasks.views import (
    TeamTaskListCreateView,
    TaskDetailView,
    TaskCommentsView,
)
from apps.users.models import User
from apps.teams.models import Team
from apps.tasks.models import Task


class AllTwelveRequirementsTestCase(TestCase):
    """
    Consolidated automated test suite validating security, role rules,
    and single terminal-created admin architecture.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.register_view = RegisterView.as_view()
        self.user_list_view = UserListCreateView.as_view()
        self.user_detail_view = UserDetailView.as_view()
        self.user_role_view = UserRoleUpdateView.as_view()
        self.team_list_view = TeamListCreateView.as_view()
        self.team_invite_view = TeamInviteView.as_view()
        self.task_list_view = TeamTaskListCreateView.as_view()
        self.task_detail_view = TaskDetailView.as_view()
        self.task_comments_view = TaskCommentsView.as_view()

        Task.objects.delete()
        Team.objects.delete()
        User.objects.delete()

    def tearDown(self):
        Task.objects.delete()
        Team.objects.delete()
        User.objects.delete()

    # -------------------------------------------------------------------------
    # Requirement 1: Public registration creates MEMBER
    # -------------------------------------------------------------------------
    def test_req_01_public_registration_creates_member(self):
        req = self.factory.post("/api/auth/register/", {
            "name": "Member One",
            "email": "member1@test.com",
            "password": "Password123!",
        })
        res = self.register_view(req)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data.get("user", {}).get("role"), "member")

        user = User.objects(email="member1@test.com").first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, "member")

    # -------------------------------------------------------------------------
    # Requirement 2: Public registration cannot create ADMIN
    # -------------------------------------------------------------------------
    def test_req_02_public_registration_cannot_create_admin(self):
        req = self.factory.post("/api/auth/register/", {
            "name": "Attacker",
            "email": "attacker@test.com",
            "password": "Password123!",
            "role": "admin",
        })
        res = self.register_view(req)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data.get("user", {}).get("role"), "member")

        user = User.objects(email="attacker@test.com").first()
        self.assertEqual(user.role, "member")

    # -------------------------------------------------------------------------
    # Requirement 3: Duplicate emails are rejected
    # -------------------------------------------------------------------------
    def test_req_03_duplicate_emails_are_rejected(self):
        User(name="First", email="dup@test.com", password="hash", role="member").save()

        req = self.factory.post("/api/auth/register/", {
            "name": "Second",
            "email": "dup@test.com",
            "password": "Password123!",
        })
        res = self.register_view(req)
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered", res.data.get("message", "").lower())

    # -------------------------------------------------------------------------
    # Requirement 4: Passwords are hashed
    # -------------------------------------------------------------------------
    def test_req_04_passwords_are_hashed(self):
        raw_pw = "SuperSecretPassword123!"
        req = self.factory.post("/api/auth/register/", {
            "name": "Hashed User",
            "email": "hash@test.com",
            "password": raw_pw,
        })
        res = self.register_view(req)
        self.assertEqual(res.status_code, 201)

        user = User.objects(email="hash@test.com").first()
        self.assertNotEqual(user.password, raw_pw)
        self.assertTrue(check_password(raw_pw, user.password))
        self.assertNotIn("password", res.data.get("user", {}))

    # -------------------------------------------------------------------------
    # Requirement 5: Initial Admin management command works
    # -------------------------------------------------------------------------
    def test_req_05_initial_admin_management_command_works(self):
        out = StringIO()
        call_command(
            "create_admin",
            name="Initial Admin",
            email="initialadmin@test.com",
            password="AdminPassword123!",
            stdout=out,
        )
        self.assertIn("successfully", out.getvalue().lower())

        admin = User.objects(email="initialadmin@test.com").first()
        self.assertIsNotNone(admin)
        self.assertEqual(admin.role, "admin")
        self.assertTrue(check_password("AdminPassword123!", admin.password))

        # Running again reports admin already configured
        out2 = StringIO()
        call_command(
            "create_admin",
            name="Another Admin",
            email="another@test.com",
            password="AdminPassword123!",
            stdout=out2,
        )
        self.assertIn("already configured", out2.getvalue().lower())

    # -------------------------------------------------------------------------
    # Requirement 6: Role promotion is disabled (Single terminal admin)
    # -------------------------------------------------------------------------
    def test_req_06_role_promotion_disabled(self):
        admin = User(name="Admin", email="admin@test.com", password="hash", role="admin").save()
        member = User(name="Member", email="member@test.com", password="hash", role="member").save()

        req = self.factory.patch(f"/api/users/{member.id}/role/", {"role": "admin"})
        force_authenticate(req, user=admin)
        res = self.user_role_view(req, user_id=str(member.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn("not permitted", res.data.get("message", "").lower())

        member.reload()
        self.assertEqual(member.role, "member")

    # -------------------------------------------------------------------------
    # Requirement 7: Role demotion is disabled (Single terminal admin)
    # -------------------------------------------------------------------------
    def test_req_07_role_demotion_disabled(self):
        admin = User(name="Admin", email="admin@test.com", password="hash", role="admin").save()

        req = self.factory.patch(f"/api/users/{admin.id}/role/", {"role": "member"})
        force_authenticate(req, user=admin)
        res = self.user_role_view(req, user_id=str(admin.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn("not permitted", res.data.get("message", "").lower())

        admin.reload()
        self.assertEqual(admin.role, "admin")

    # -------------------------------------------------------------------------
    # Requirement 8: Member cannot promote themselves or modify roles
    # -------------------------------------------------------------------------
    def test_req_08_member_cannot_modify_roles(self):
        member = User(name="Member", email="member@test.com", password="hash", role="member").save()

        req = self.factory.patch(f"/api/users/{member.id}/role/", {"role": "admin"})
        force_authenticate(req, user=member)
        res = self.user_role_view(req, user_id=str(member.id))
        self.assertEqual(res.status_code, 403)

        member.reload()
        self.assertEqual(member.role, "member")

    # -------------------------------------------------------------------------
    # Requirement 9: Member cannot access user-management endpoints
    # -------------------------------------------------------------------------
    def test_req_09_member_cannot_access_user_management(self):
        member = User(name="Member", email="member@test.com", password="hash", role="member").save()

        # GET /api/users/
        req_list = self.factory.get("/api/users/")
        force_authenticate(req_list, user=member)
        res_list = self.user_list_view(req_list)
        self.assertEqual(res_list.status_code, 403)

        # POST /api/users/
        req_create = self.factory.post("/api/users/", {
            "name": "New", "email": "new@test.com", "password": "123", "role": "member"
        })
        force_authenticate(req_create, user=member)
        res_create = self.user_list_view(req_create)
        self.assertEqual(res_create.status_code, 403)

        # DELETE /api/users/<id>/
        req_del = self.factory.delete(f"/api/users/{member.id}/")
        force_authenticate(req_del, user=member)
        res_del = self.user_detail_view(req_del, user_id=str(member.id))
        self.assertEqual(res_del.status_code, 403)

    # -------------------------------------------------------------------------
    # Requirement 10: Admin account cannot be deleted
    # -------------------------------------------------------------------------
    def test_req_10_admin_cannot_be_deleted(self):
        admin = User(name="Sole Admin", email="sole@test.com", password="hash", role="admin").save()

        req_del = self.factory.delete(f"/api/users/{admin.id}/")
        force_authenticate(req_del, user=admin)
        res_del = self.user_detail_view(req_del, user_id=str(admin.id))
        self.assertEqual(res_del.status_code, 400)
        self.assertIsNotNone(User.objects(id=admin.id).first())

    # -------------------------------------------------------------------------
    # Requirement 11: Exactly one Admin created via terminal
    # -------------------------------------------------------------------------
    def test_req_11_only_one_terminal_admin(self):
        User(name="Admin", email="admin@test.com", password="hash", role="admin").save()

        # Second admin creation via management command is rejected
        out = StringIO()
        call_command("create_admin", name="Admin2", email="admin2@test.com", password="Pass", stdout=out)
        self.assertIn("already configured", out.getvalue().lower())
        self.assertEqual(User.objects(role="admin").count(), 1)

    # -------------------------------------------------------------------------
    # Requirement 12: Team and task permissions enforced & Admin cannot be assigned tasks
    # -------------------------------------------------------------------------
    def test_req_12_team_and_task_permissions_enforced(self):
        admin = User(name="Admin", email="admin@test.com", password="hash", role="admin").save()
        member_assigned = User(name="Assigned", email="assigned@test.com", password="hash", role="member").save()
        member_other = User(name="Other", email="other@test.com", password="hash", role="member").save()

        # Admin creates a team
        req_t = self.factory.post("/api/teams/", {
            "name": "Engineering",
            "description": "Tech team",
        })
        force_authenticate(req_t, user=admin)
        team_res = self.team_list_view(req_t)
        self.assertEqual(team_res.status_code, 201)
        team_id = team_res.data.get("id")

        # Member cannot create a team
        req_mt = self.factory.post("/api/teams/", {
            "name": "Rogue Team",
            "description": "Not allowed",
        })
        force_authenticate(req_mt, user=member_other)
        m_team_res = self.team_list_view(req_mt)
        self.assertEqual(m_team_res.status_code, 403)

        # Admin invites members
        req_inv1 = self.factory.post(f"/api/teams/{team_id}/invite/", {"email": member_assigned.email})
        force_authenticate(req_inv1, user=admin)
        self.team_invite_view(req_inv1, id=team_id)

        req_inv2 = self.factory.post(f"/api/teams/{team_id}/invite/", {"email": member_other.email})
        force_authenticate(req_inv2, user=admin)
        self.team_invite_view(req_inv2, id=team_id)

        # Admin CANNOT be assigned a task
        req_admin_task = self.factory.post(f"/api/teams/{team_id}/tasks/", {
            "title": "Admin Task",
            "assigned_to": str(admin.id),
        })
        force_authenticate(req_admin_task, user=admin)
        res_admin_task = self.task_list_view(req_admin_task, id=team_id)
        self.assertEqual(res_admin_task.status_code, 400)
        self.assertIn("members, not the administrator", res_admin_task.data.get("message", "").lower())

        # Admin creates task assigned to member_assigned
        req_task = self.factory.post(f"/api/teams/{team_id}/tasks/", {
            "title": "Build Feature",
            "description": "Specs here",
            "assigned_to": str(member_assigned.id),
            "status": "pending",
        })
        force_authenticate(req_task, user=admin)
        task_res = self.task_list_view(req_task, id=team_id)
        self.assertEqual(task_res.status_code, 201)
        task_id = task_res.data.get("id")

        # Member cannot create a task
        req_mtask = self.factory.post(f"/api/teams/{team_id}/tasks/", {
            "title": "Rogue Task",
        })
        force_authenticate(req_mtask, user=member_assigned)
        m_task_res = self.task_list_view(req_mtask, id=team_id)
        self.assertEqual(m_task_res.status_code, 403)

        # Assigned member can update status
        req_stat = self.factory.patch(f"/api/tasks/{task_id}/", {"status": "in_progress"})
        force_authenticate(req_stat, user=member_assigned)
        status_res = self.task_detail_view(req_stat, id=task_id)
        self.assertEqual(status_res.status_code, 200)

        # Assigned member CANNOT edit title or description
        req_title = self.factory.patch(f"/api/tasks/{task_id}/", {"title": "Hacked Title"})
        force_authenticate(req_title, user=member_assigned)
        title_res = self.task_detail_view(req_title, id=task_id)
        self.assertEqual(title_res.status_code, 403)

        # Unassigned member CANNOT update status
        req_ostat = self.factory.patch(f"/api/tasks/{task_id}/", {"status": "done"})
        force_authenticate(req_ostat, user=member_other)
        other_status_res = self.task_detail_view(req_ostat, id=task_id)
        self.assertEqual(other_status_res.status_code, 403)

        # Assigned member CAN comment
        req_comm = self.factory.post(f"/api/tasks/{task_id}/comments/", {"text": "I am on it"})
        force_authenticate(req_comm, user=member_assigned)
        comment_res = self.task_comments_view(req_comm, id=task_id)
        self.assertEqual(comment_res.status_code, 201)

        # Unassigned member CANNOT comment
        req_ocomm = self.factory.post(f"/api/tasks/{task_id}/comments/", {"text": "Random comment"})
        force_authenticate(req_ocomm, user=member_other)
        other_comment_res = self.task_comments_view(req_ocomm, id=task_id)
        self.assertEqual(other_comment_res.status_code, 403)
