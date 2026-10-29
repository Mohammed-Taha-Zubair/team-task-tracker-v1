from unittest import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.teams.views import TeamListCreateView, TeamInviteView
from apps.tasks.views import TeamTaskListCreateView, TaskDetailView, TaskCommentsView
from apps.users.models import User
from apps.teams.models import Team
from apps.tasks.models import Task

class RoleAndTaskPermissionsTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.team_list_view = TeamListCreateView.as_view()
        self.invite_view = TeamInviteView.as_view()
        self.task_create_view = TeamTaskListCreateView.as_view()
        self.task_detail_view = TaskDetailView.as_view()
        self.comments_view = TaskCommentsView.as_view()

        Task.objects.delete()
        Team.objects.delete()
        User.objects.delete()

        # Users
        self.admin = User(name="Admin One", email="admin@example.com", password="hash", role="admin")
        self.admin.save()
        self.member1 = User(name="Member One", email="m1@example.com", password="hash", role="member")
        self.member1.save()
        self.member2 = User(name="Member Two", email="m2@example.com", password="hash", role="member")
        self.member2.save()

        # Team with admin and both members
        self.team = Team(
            name="Engineering",
            description="Engineering Team",
            created_by=self.admin,
            members=[self.admin, self.member1, self.member2]
        )
        self.team.save()

        # Task assigned to member1
        self.task_m1 = Task(
            title="Task for M1",
            description="M1 task description",
            assigned_to=self.member1,
            status="pending",
            team=self.team
        )
        self.task_m1.save()

        # Task assigned to member2
        self.task_m2 = Task(
            title="Task for M2",
            description="M2 task description",
            assigned_to=self.member2,
            status="pending",
            team=self.team
        )
        self.task_m2.save()

    def tearDown(self):
        Task.objects.delete()
        Team.objects.delete()
        User.objects.delete()

    def test_member_cannot_create_team(self):
        req = self.factory.post("/api/teams/", {"name": "New Team"}, format="json")
        force_authenticate(req, user=self.member1)
        res = self.team_list_view(req)
        self.assertEqual(res.status_code, 403)

    def test_member_cannot_invite_to_team(self):
        req = self.factory.post(f"/api/teams/{self.team.id}/invite/", {"email": "other@example.com"}, format="json")
        force_authenticate(req, user=self.member1)
        res = self.invite_view(req, id=str(self.team.id))
        self.assertEqual(res.status_code, 403)

    def test_member_cannot_create_task(self):
        req = self.factory.post(f"/api/teams/{self.team.id}/tasks/", {
            "title": "Member trying to create task",
            "description": "desc"
        }, format="json")
        force_authenticate(req, user=self.member1)
        res = self.task_create_view(req, id=str(self.team.id))
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_task(self):
        req = self.factory.post(f"/api/teams/{self.team.id}/tasks/", {
            "title": "Admin task",
            "description": "desc",
            "assigned_to": str(self.member1.id),
            "status": "pending"
        }, format="json")
        force_authenticate(req, user=self.admin)
        res = self.task_create_view(req, id=str(self.team.id))
        self.assertEqual(res.status_code, 201)

    def test_member_can_update_status_of_assigned_task(self):
        req = self.factory.patch(f"/api/tasks/{self.task_m1.id}/", {"status": "in_progress"}, format="json")
        force_authenticate(req, user=self.member1)
        res = self.task_detail_view(req, id=str(self.task_m1.id))
        self.assertEqual(res.status_code, 200)
        self.task_m1.reload()
        self.assertEqual(self.task_m1.status, "in_progress")

    def test_member_cannot_update_title_or_description(self):
        req = self.factory.patch(f"/api/tasks/{self.task_m1.id}/", {
            "title": "Altered Title",
            "status": "done"
        }, format="json")
        force_authenticate(req, user=self.member1)
        res = self.task_detail_view(req, id=str(self.task_m1.id))
        self.assertEqual(res.status_code, 403)

    def test_member_cannot_reassign_task(self):
        req = self.factory.patch(f"/api/tasks/{self.task_m1.id}/", {
            "assigned_to": str(self.member2.id)
        }, format="json")
        force_authenticate(req, user=self.member1)
        res = self.task_detail_view(req, id=str(self.task_m1.id))
        self.assertEqual(res.status_code, 403)

    def test_member_cannot_modify_other_member_task(self):
        req = self.factory.patch(f"/api/tasks/{self.task_m2.id}/", {"status": "done"}, format="json")
        force_authenticate(req, user=self.member1)
        res = self.task_detail_view(req, id=str(self.task_m2.id))
        self.assertEqual(res.status_code, 403)

    def test_member_can_comment_on_assigned_task(self):
        req = self.factory.post(f"/api/tasks/{self.task_m1.id}/comments/", {"text": "Working on it!"}, format="json")
        force_authenticate(req, user=self.member1)
        res = self.comments_view(req, id=str(self.task_m1.id))
        self.assertEqual(res.status_code, 201)

    def test_member_cannot_comment_on_other_member_task(self):
        req = self.factory.post(f"/api/tasks/{self.task_m2.id}/comments/", {"text": "Intruding comment"}, format="json")
        force_authenticate(req, user=self.member1)
        res = self.comments_view(req, id=str(self.task_m2.id))
        self.assertEqual(res.status_code, 403)

    def test_admin_can_comment_on_any_team_task(self):
        req = self.factory.post(f"/api/tasks/{self.task_m1.id}/comments/", {"text": "Admin feedback"}, format="json")
        force_authenticate(req, user=self.admin)
        res = self.comments_view(req, id=str(self.task_m1.id))
        self.assertEqual(res.status_code, 201)
