from unittest import TestCase
from rest_framework.test import APIRequestFactory
from django.contrib.auth.hashers import check_password
from apps.users.views import RegisterView
from apps.users.models import User

class PublicRegistrationTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = RegisterView.as_view()
        User.objects.delete()

    def tearDown(self):
        User.objects.delete()

    def test_public_registration_creates_member(self):
        req = self.factory.post("/api/auth/register/", {
            "name": "Jane Member",
            "email": "jane@example.com",
            "password": "Password123!"
        }, format="json")
        res = self.view(req)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["user"]["role"], "member")
        self.assertNotIn("password", res.data["user"])

        user = User.objects(email="jane@example.com").first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, "member")

    def test_public_registration_cannot_create_admin(self):
        req = self.factory.post("/api/auth/register/", {
            "name": "Hacker Trying Admin",
            "email": "hacker@example.com",
            "password": "Password123!",
            "role": "admin"
        }, format="json")
        res = self.view(req)
        self.assertEqual(res.status_code, 201)
        # Role must be member, not admin!
        self.assertEqual(res.data["user"]["role"], "member")

        user = User.objects(email="hacker@example.com").first()
        self.assertEqual(user.role, "member")

    def test_registration_allows_multiple_users_without_lockout(self):
        # Create first user
        req1 = self.factory.post("/api/auth/register/", {
            "name": "User One",
            "email": "user1@example.com",
            "password": "Password123!"
        }, format="json")
        res1 = self.view(req1)
        self.assertEqual(res1.status_code, 201)

        # Create second user - previously this would return 403 Forbidden
        req2 = self.factory.post("/api/auth/register/", {
            "name": "User Two",
            "email": "user2@example.com",
            "password": "Password123!"
        }, format="json")
        res2 = self.view(req2)
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(res2.data["user"]["role"], "member")

    def test_registration_rejects_duplicate_email(self):
        req1 = self.factory.post("/api/auth/register/", {
            "name": "First User",
            "email": "duplicate@example.com",
            "password": "Password123!"
        }, format="json")
        res1 = self.view(req1)
        self.assertEqual(res1.status_code, 201)

        req2 = self.factory.post("/api/auth/register/", {
            "name": "Second User",
            "email": "duplicate@example.com",
            "password": "Password123!"
        }, format="json")
        res2 = self.view(req2)
        self.assertEqual(res2.status_code, 400)
        self.assertIn("already registered", res2.data["message"].lower())

    def test_registration_hashes_password(self):
        req = self.factory.post("/api/auth/register/", {
            "name": "Security Test",
            "email": "sectest@example.com",
            "password": "SecretPassword123!"
        }, format="json")
        res = self.view(req)
        self.assertEqual(res.status_code, 201)

        user = User.objects(email="sectest@example.com").first()
        self.assertNotEqual(user.password, "SecretPassword123!")
        self.assertTrue(check_password("SecretPassword123!", user.password))
