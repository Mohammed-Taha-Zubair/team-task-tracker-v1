from datetime import datetime, timedelta, timezone
import jwt
from django.conf import settings
from django.test import SimpleTestCase
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.test import APIClient
from apps.users.models import User
from apps.teams.models import Team
from apps.tasks.models import Task, Comment
from apps.activity.models import Activity
from apps.users.authentication import generate_access_token


class ComprehensiveAuditTestSuite(SimpleTestCase):
    databases = {"default"}

    def setUp(self):
        self.client = APIClient()

        # Clean existing test users if any
        User.objects(email__in=[
            "auditsuperadmin@example.com",
            "auditadmin@example.com",
            "auditmember1@example.com",
            "auditmember2@example.com",
            "newuser@example.com",
            "hacker@example.com",
        ]).delete()
        Team.objects(name__startswith="Audit Team").delete()

        # Superadmin user
        self.superadmin = User(
            name="Audit Superadmin",
            email="auditsuperadmin@example.com",
            password=make_password("SuperAdminPass123!"),
            role="SUPERADMIN",
        )
        self.superadmin.save()
        self.superadmin_token = generate_access_token(self.superadmin)

        # Admin user
        self.admin = User(
            name="Audit Admin",
            email="auditadmin@example.com",
            password=make_password("AdminPass123!"),
            role="ADMIN",
        )
        self.admin.save()
        self.admin_token = generate_access_token(self.admin)

        # Member 1
        self.member1 = User(
            name="Audit Member One",
            email="auditmember1@example.com",
            password=make_password("MemberPass123!"),
            role="MEMBER",
        )
        self.member1.save()
        self.member1_token = generate_access_token(self.member1)

        # Member 2
        self.member2 = User(
            name="Audit Member Two",
            email="auditmember2@example.com",
            password=make_password("MemberPass123!"),
            role="MEMBER",
        )
        self.member2.save()
        self.member2_token = generate_access_token(self.member2)

    def tearDown(self):
        User.objects(email__in=[
            "auditsuperadmin@example.com",
            "auditadmin@example.com",
            "auditmember1@example.com",
            "auditmember2@example.com",
            "newuser@example.com",
            "hacker@example.com",
        ]).delete()
        Team.objects(name__startswith="Audit Team").delete()

    # ---------------------------------------------------------
    # 1. AUTHENTICATION TESTS
    # ---------------------------------------------------------

    def test_user_roles_and_properties(self):
        """Verify role properties and uppercase normalization for User model."""
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

    def test_successful_registration(self):
        """Verify successful registration returns 201 and creates a member."""
        resp = self.client.post(
            "/api/auth/register/",
            {
                "name": "New User",
                "email": "newuser@example.com",
                "password": "Password123!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["user"]["email"], "newuser@example.com")
        self.assertEqual(data["user"]["role"], "MEMBER")

    def test_duplicate_email_registration(self):
        """Verify duplicate email registration is rejected with 400."""
        resp = self.client.post(
            "/api/auth/register/",
            {
                "name": "Duplicate Admin",
                "email": "auditadmin@example.com",
                "password": "Password123!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("already registered", resp.json()["message"].lower())

    def test_invalid_login(self):
        """Verify login with incorrect password returns 401."""
        resp = self.client.post(
            "/api/auth/login/",
            {
                "email": "auditadmin@example.com",
                "password": "WrongPassword!",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_unauthenticated_api_access(self):
        """Verify protected endpoints reject unauthenticated requests with 401."""
        self.client.credentials()  # No token
        resp = self.client.get("/api/teams/")
        self.assertEqual(resp.status_code, 401)

    def test_invalid_or_expired_jwt(self):
        """Verify invalid or expired JWT token is rejected with 401."""
        # 1. Invalid signature token
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.payload")
        resp1 = self.client.get("/api/teams/")
        self.assertEqual(resp1.status_code, 401)

        # 2. Expired token
        expired_payload = {
            "user_id": str(self.admin.id),
            "email": self.admin.email,
            "role": self.admin.role,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
            "iat": datetime.now(timezone.utc) - timedelta(minutes=20),
        }
        expired_token = jwt.encode(expired_payload, settings.JWT_ACCESS_SECRET, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {expired_token}")
        resp2 = self.client.get("/api/teams/")
        self.assertEqual(resp2.status_code, 401)

    def test_password_hashing(self):
        """Verify stored password is properly hashed and never plain text."""
        u = User.objects(email="auditadmin@example.com").first()
        self.assertNotEqual(u.password, "AdminPass123!")
        self.assertTrue(check_password("AdminPass123!", u.password))
        self.assertTrue(u.password.startswith("pbkdf2_") or u.password.startswith("argon2"))

    def test_attempt_to_register_as_admin_forces_member(self):
        """Verify security: public registration ignoring attempted admin role elevation."""
        resp = self.client.post(
            "/api/auth/register/",
            {
                "name": "Hacker",
                "email": "hacker@example.com",
                "password": "Password123!",
                "role": "admin",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        hacker = User.objects(email="hacker@example.com").first()
        self.assertEqual(hacker.role, "MEMBER")
        self.assertEqual(resp.json()["user"]["role"], "MEMBER")

    def test_attempt_to_register_as_superadmin_forces_member(self):
        """Verify malicious registration sending SUPERADMIN strictly forces MEMBER."""
        User.objects(email="superhacker@example.com").delete()
        resp = self.client.post(
            "/api/auth/register/",
            {
                "name": "Super Hacker",
                "email": "superhacker@example.com",
                "password": "Password123!",
                "role": "SUPERADMIN",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        hacker = User.objects(email="superhacker@example.com").first()
        self.assertEqual(hacker.role, "MEMBER")
        self.assertEqual(resp.json()["user"]["role"], "MEMBER")
        hacker.delete()

    # ---------------------------------------------------------
    # 2. PERMISSIONS & ROLES TESTS
    # ---------------------------------------------------------

    def test_admin_creates_team_and_joins_automatically(self):
        """Verify Admin can create team and is automatically added to members."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        resp = self.client.post(
            "/api/teams/",
            {"name": "Audit Team Alpha", "description": "Admin Team"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["member_count"], 1)
        self.assertEqual(data["members"][0]["id"], str(self.admin.id))

    def test_superadmin_creates_team_and_joins_automatically(self):
        """Verify Superadmin can also create teams."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.superadmin_token}")
        resp = self.client.post(
            "/api/teams/",
            {"name": "Audit Team Superadmin", "description": "Superadmin Team"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["member_count"], 1)
        self.assertEqual(data["members"][0]["id"], str(self.superadmin.id))

    def test_superadmin_has_global_team_access(self):
        """Verify Superadmin has global visibility to view teams without being a member."""
        team = Team(
            name="Audit Team Unjoined",
            created_by=self.admin,
            members=[self.admin, self.member1],
        )
        team.save()

        # Non-member (Member 2) gets 404
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member2_token}")
        resp = self.client.get(f"/api/teams/{team.id}/")
        self.assertEqual(resp.status_code, 404)

        # Superadmin can view it globally even though not listed in members
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.superadmin_token}")
        resp = self.client.get(f"/api/teams/{team.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["id"], str(team.id))

        # Superadmin GET /api/teams/ returns all teams
        resp_list = self.client.get("/api/teams/")
        self.assertEqual(resp_list.status_code, 200)
        team_ids = [t["id"] for t in resp_list.json()]
        self.assertIn(str(team.id), team_ids)

    def test_member_cannot_create_team(self):
        """Verify Members are forbidden from creating teams (403)."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")
        resp = self.client.post(
            "/api/teams/",
            {"name": "Audit Team Member Attempt", "description": "Should fail"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_member_cannot_invite_users(self):
        """Verify Members cannot invite users into a team (403)."""
        team = Team(
            name="Audit Team Shared",
            created_by=self.admin,
            members=[self.admin, self.member1],
        )
        team.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")
        resp = self.client.post(
            f"/api/teams/{team.id}/invite/",
            {"email": "auditmember2@example.com"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_member_cannot_access_unrelated_teams(self):
        """Verify Member 2 cannot access Team of Admin and Member 1 (404/403)."""
        team = Team(
            name="Audit Team Private",
            created_by=self.admin,
            members=[self.admin, self.member1],
        )
        team.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member2_token}")
        resp = self.client.get(f"/api/teams/{team.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_only_superadmin_can_access_user_list_and_create(self):
        """Verify only Superadmin can access /api/users/ and create users with roles."""
        # Member is forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")
        resp = self.client.get("/api/users/")
        self.assertEqual(resp.status_code, 403)

        # Admin is forbidden (Admin is not Superadmin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        resp = self.client.get("/api/users/")
        self.assertEqual(resp.status_code, 403)

        resp = self.client.post(
            "/api/users/",
            {"name": "New Admin User", "email": "createdadmin@example.com", "password": "Password123!", "role": "ADMIN"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

        # Superadmin has full access
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.superadmin_token}")
        resp = self.client.get("/api/users/")
        self.assertEqual(resp.status_code, 200)

        # Superadmin creates an Application Admin
        resp = self.client.post(
            "/api/users/",
            {"name": "New Admin User", "email": "createdadmin@example.com", "password": "Password123!", "role": "ADMIN"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        created_user = User.objects(email="createdadmin@example.com").first()
        self.assertEqual(created_user.role, "ADMIN")
        created_user.delete()

    def test_superadmin_can_promote_member_to_admin(self):
        """Verify only Superadmin can promote a Member to Admin."""
        # Member cannot promote Member
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")
        resp = self.client.patch(
            f"/api/users/{self.member2.id}/",
            {"role": "ADMIN"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

        # Admin cannot promote Member
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        resp = self.client.patch(
            f"/api/users/{self.member2.id}/",
            {"role": "ADMIN"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

        # Superadmin CAN promote Member to Admin
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.superadmin_token}")
        resp = self.client.patch(
            f"/api/users/{self.member2.id}/",
            {"role": "ADMIN"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.member2.reload()
        self.assertEqual(self.member2.role, "ADMIN")

        # Superadmin CANNOT promote to SUPERADMIN via API (only via CLI)
        resp = self.client.patch(
            f"/api/users/{self.member2.id}/",
            {"role": "SUPERADMIN"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    # ---------------------------------------------------------
    # 3. TASK MANAGEMENT TESTS
    # ---------------------------------------------------------

    def test_create_task_with_created_by(self):
        """Verify creating task sets created_by and status."""
        team = Team(
            name="Audit Team Tasks",
            created_by=self.admin,
            members=[self.admin, self.member1],
        )
        team.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")
        resp = self.client.post(
            f"/api/teams/{team.id}/tasks/",
            {
                "title": "Build Authentication",
                "description": "JWT implementation",
                "status": "pending",
                "assigned_to": str(self.member1.id),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["title"], "Build Authentication")
        self.assertEqual(data["created_by"]["id"], str(self.member1.id))
        self.assertEqual(data["assigned_to"]["id"], str(self.member1.id))

    def test_update_task_details_and_status(self):
        """Verify task status and title update."""
        team = Team(
            name="Audit Team Update",
            created_by=self.admin,
            members=[self.admin, self.member1],
        )
        team.save()
        task = Task(
            title="Initial Title",
            team=team,
            created_by=self.admin,
            status="pending",
        )
        task.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")
        resp = self.client.patch(
            f"/api/tasks/{task.id}/",
            {
                "title": "Updated Title",
                "status": "in_progress",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["title"], "Updated Title")
        self.assertEqual(data["status"], "in_progress")

    def test_reject_assignment_to_non_team_member(self):
        """Verify assigning task to a user who is not in the team is rejected."""
        team = Team(
            name="Audit Team Assignment",
            created_by=self.admin,
            members=[self.admin, self.member1],  # member2 is NOT in this team
        )
        team.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        resp = self.client.post(
            f"/api/teams/{team.id}/tasks/",
            {
                "title": "Invalid Assignee Task",
                "assigned_to": str(self.member2.id),
                "status": "pending",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("must be a team member", resp.json()["message"].lower())

    def test_reject_invalid_task_status(self):
        """Verify submitting an invalid task status returns 400."""
        team = Team(
            name="Audit Team Status Validation",
            created_by=self.admin,
            members=[self.admin],
        )
        team.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        resp = self.client.post(
            f"/api/teams/{team.id}/tasks/",
            {
                "title": "Invalid Status Task",
                "status": "non_existent_status",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_prevent_cross_team_task_access(self):
        """Verify user cannot view or modify a task from another team."""
        team_a = Team(name="Audit Team A", created_by=self.admin, members=[self.admin, self.member1])
        team_a.save()
        team_b = Team(name="Audit Team B", created_by=self.admin, members=[self.admin, self.member2])
        team_b.save()

        task_a = Task(title="Team A Secret Task", team=team_a, created_by=self.admin)
        task_a.save()

        # Member 2 is only in Team B, tries to access Team A's task
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member2_token}")
        get_resp = self.client.get(f"/api/tasks/{task_a.id}/")
        self.assertEqual(get_resp.status_code, 404)

        patch_resp = self.client.patch(f"/api/tasks/{task_a.id}/", {"title": "Hacked"}, format="json")
        self.assertEqual(patch_resp.status_code, 404)

    # ---------------------------------------------------------
    # 4. ACTIVITY TIMELINE TESTS
    # ---------------------------------------------------------

    def test_activity_generation_and_order(self):
        """Verify activity records on task create, update, and comment, ordered newest first."""
        team = Team(name="Audit Team Timeline", created_by=self.admin, members=[self.admin, self.member1])
        team.save()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member1_token}")

        # 1. Create task -> action_type = task_created
        create_resp = self.client.post(
            f"/api/teams/{team.id}/tasks/",
            {"title": "Task 1", "status": "pending"},
            format="json",
        )
        task_id = create_resp.json()["id"]

        # 2. Update status -> action_type = status_changed
        self.client.patch(
            f"/api/tasks/{task_id}/",
            {"status": "in_progress"},
            format="json",
        )

        # 3. Add comment -> action_type = comment_added
        self.client.post(
            f"/api/tasks/{task_id}/comments/",
            {"text": "Work has begun"},
            format="json",
        )

        # Query activities endpoint: GET /api/teams/{id}/activities/
        act_resp = self.client.get(f"/api/teams/{team.id}/activities/")
        self.assertEqual(act_resp.status_code, 200)
        activities = act_resp.json()

        # Should have at least 3 activities (comment, status_changed, task_created)
        self.assertGreaterEqual(len(activities), 3)

        # Newest first: comment_added is newest
        self.assertEqual(activities[0]["action_type"], "comment_added")
        self.assertEqual(activities[1]["action_type"], "status_changed")
        self.assertEqual(activities[2]["action_type"], "task_created")

    def test_unauthorized_user_cannot_access_timeline(self):
        """Verify user outside team cannot read team activity timeline."""
        team = Team(name="Audit Team Timeline Secret", created_by=self.admin, members=[self.admin, self.member1])
        team.save()

        # Member 2 is not a member of this team
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.member2_token}")
        resp = self.client.get(f"/api/teams/{team.id}/activities/")
        self.assertEqual(resp.status_code, 404)

    def test_create_superadmin_command(self):
        """Verify python manage.py create_superadmin creates or updates a SUPERADMIN."""
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        email = "cmd_superadmin@example.com"
        User.objects(email=email).delete()

        call_command("create_superadmin", name="Cmd Superadmin", email=email, password="Password123!", stdout=out)
        user = User.objects(email=email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, "SUPERADMIN")
        self.assertTrue(check_password("Password123!", user.password))
        user.delete()

    def test_create_app_admin_command(self):
        """Verify python manage.py create_app_admin creates or updates an ADMIN."""
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        email = "cmd_admin@example.com"
        User.objects(email=email).delete()

        call_command("create_app_admin", name="Cmd Admin", email=email, password="Password123!", stdout=out)
        user = User.objects(email=email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, "ADMIN")
        self.assertTrue(check_password("Password123!", user.password))
        user.delete()

    def test_django_superadmin_vs_application_admin_separation(self):
        """Verify Django superuser can access Django Admin and Application Admin is not a Django superuser."""
        from django.contrib.auth.models import User as DjangoAuthUser
        from django.test import Client

        # Create platform superuser in Django's relational auth database
        DjangoAuthUser.objects.filter(username="djangosuperuser").delete()
        dj_super = DjangoAuthUser.objects.create_superuser(
            username="djangosuperuser",
            email="platform_admin@example.com",
            password="SuperPlatformPass123!",
        )

        # Standard Django test client supports sessions for admin login
        session_client = Client()
        login_success = session_client.login(username="djangosuperuser", password="SuperPlatformPass123!")
        self.assertTrue(login_success)

        # Django superuser can access Django Admin portal
        admin_resp = session_client.get("/admin/")
        self.assertEqual(admin_resp.status_code, 200)

        # Verify Application Admin is purely in MongoDB and NOT in Django auth
        self.assertFalse(DjangoAuthUser.objects.filter(email=self.admin.email).exists())
        self.assertFalse(hasattr(self.admin, "is_superuser"))

        # Verify Application Admin cannot log into Django admin
        app_admin_login = session_client.login(username=self.admin.email, password="AdminPass123!")
        self.assertFalse(app_admin_login)

        dj_super.delete()
