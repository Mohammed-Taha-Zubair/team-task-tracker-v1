import getpass
import re
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.hashers import make_password
from apps.users.models import User


class Command(BaseCommand):
    help = "Creates or promotes an Application Admin user in MongoDB"

    def add_arguments(self, parser):
        parser.add_argument("--name", type=str, help="Application Admin full name")
        parser.add_argument("--email", type=str, help="Application Admin email address")
        parser.add_argument("--password", type=str, help="Application Admin password")

    def handle(self, *args, **options):
        name = options.get("name")
        email = options.get("email")
        password = options.get("password")

        # Interactive prompts if arguments not supplied
        if not name:
            name = input("Admin Name: ").strip()
        if not email:
            email = input("Admin Email: ").strip().lower()
        if not password:
            password = getpass.getpass("Password: ")
            confirm = getpass.getpass("Password (again): ")
            if password != confirm:
                raise CommandError("Error: Passwords do not match.")

        if not name or not email or not password:
            raise CommandError("Name, email, and password are all required.")

        email = email.strip().lower()
        if not re.match(r"^[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z]{2,}$", email):
            raise CommandError("Error: Invalid email format.")

        if len(password) < 8:
            raise CommandError("Error: Password must be at least 8 characters long.")

        user = User.objects(email=email).first()
        if user:
            # If user was already a superadmin, warn and do not demote automatically unless intended
            user.name = name
            user.password = make_password(password)
            user.role = "ADMIN"
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f"Application Admin '{email}' successfully updated.")
            )
        else:
            user = User(
                name=name,
                email=email,
                password=make_password(password),
                role="ADMIN",
            )
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f"Application Admin '{email}' successfully created.")
            )
