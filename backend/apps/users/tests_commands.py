import io
from unittest import TestCase
from django.core.management import call_command
from django.contrib.auth.hashers import check_password
from apps.users.models import User

class CreateAdminCommandTest(TestCase):
    def setUp(self):
        User.objects.delete()

    def tearDown(self):
        User.objects.delete()

    def test_create_initial_admin(self):
        out = io.StringIO()
        call_command(
            "create_admin",
            name="Super Admin",
            email="admin@example.com",
            password="AdminPassword123!",
            stdout=out
        )
        user = User.objects(email="admin@example.com").first()
        self.assertIsNotNone(user)
        self.assertEqual(user.name, "Super Admin")
        self.assertEqual(user.role, "admin")
        self.assertTrue(check_password("AdminPassword123!", user.password))
        self.assertIn("Admin account created successfully", out.getvalue())

    def test_create_admin_when_admin_already_exists(self):
        # Create an existing admin
        out1 = io.StringIO()
        call_command(
            "create_admin",
            name="First Admin",
            email="first@example.com",
            password="Password123!",
            stdout=out1
        )
        # Attempt to create another initial admin
        out2 = io.StringIO()
        call_command(
            "create_admin",
            name="Second Admin",
            email="second@example.com",
            password="Password123!",
            stdout=out2
        )
        self.assertIn("already configured", out2.getvalue())
        self.assertIsNone(User.objects(email="second@example.com").first())
        self.assertEqual(User.objects(role="admin").count(), 1)
