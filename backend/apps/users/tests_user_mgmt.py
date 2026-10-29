from unittest import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.users.views import UserListCreateView, UserDetailView, UserRoleUpdateView
from apps.users.models import User

class UserManagementTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = UserListCreateView.as_view()
        self.detail_view = UserDetailView.as_view()
        self.role_view = UserRoleUpdateView.as_view()
        User.objects.delete()

        # Seed the sole terminal admin and two members
        self.admin = User(name="Admin User", email="admin@example.com", password="hash", role="admin")
        self.admin.save()
        self.member1 = User(name="Alice Member", email="alice@example.com", password="hash", role="member")
        self.member1.save()
        self.member2 = User(name="Bob Member", email="bob@example.com", password="hash", role="member")
        self.member2.save()

    def tearDown(self):
        User.objects.delete()

    def test_admin_can_list_and_search_users(self):
        req = self.factory.get("/api/users/?search=alice")
        force_authenticate(req, user=self.admin)
        res = self.list_view(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["users"]), 1)
        self.assertEqual(res.data["users"][0]["email"], "alice@example.com")

        # Search by email domain
        req2 = self.factory.get("/api/users/?search=example.com")
        force_authenticate(req2, user=self.admin)
        res2 = self.list_view(req2)
        self.assertEqual(len(res2.data["users"]), 3)

    def test_member_cannot_access_user_list(self):
        req = self.factory.get("/api/users/")
        force_authenticate(req, user=self.member1)
        res = self.list_view(req)
        self.assertEqual(res.status_code, 403)

    def test_roles_cannot_be_modified(self):
        req = self.factory.patch(f"/api/users/{self.member1.id}/role/", {"role": "admin"}, format="json")
        force_authenticate(req, user=self.admin)
        res = self.role_view(req, user_id=str(self.member1.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn("not permitted", res.data["message"].lower())

    def test_admin_cannot_delete_self(self):
        req = self.factory.delete(f"/api/users/{self.admin.id}/")
        force_authenticate(req, user=self.admin)
        res = self.detail_view(req, user_id=str(self.admin.id))
        self.assertEqual(res.status_code, 400)

    def test_admin_account_cannot_be_deleted(self):
        # Attempt to delete the administrator account
        req = self.factory.delete(f"/api/users/{self.admin.id}/")
        force_authenticate(req, user=self.admin)
        res = self.detail_view(req, user_id=str(self.admin.id))
        self.assertEqual(res.status_code, 400)
        self.assertTrue(
            "cannot be deleted" in res.data["message"].lower()
            or "own account" in res.data["message"].lower()
        )

    def test_admin_can_delete_member(self):
        req = self.factory.delete(f"/api/users/{self.member2.id}/")
        force_authenticate(req, user=self.admin)
        res = self.detail_view(req, user_id=str(self.member2.id))
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(User.objects(id=self.member2.id).first())

    def test_member_cannot_delete_users(self):
        req = self.factory.delete(f"/api/users/{self.member2.id}/")
        force_authenticate(req, user=self.member1)
        res = self.detail_view(req, user_id=str(self.member2.id))
        self.assertEqual(res.status_code, 403)
