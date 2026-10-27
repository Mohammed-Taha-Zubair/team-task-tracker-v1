import getpass
import re
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.hashers import make_password
from apps.users.models import User


class Command(BaseCommand):
    help = "Creates or promotes a platform Superadmin user in MongoDB"

    def add_arguments(self, parser):
        parser.add_argument("--name", type=str, help="Superadmin full name")
        parser.add_argument("--email", type=str, help="Superadmin email address")
        parser.add_argument("--password", type=str, help="Superadmin password")

    def handle(self, *args, **options):
        name = options.get("name")
        email = options.get("email")
        password = options.get("password")

        # Interactive prompts if arguments not supplied
        if not name:
            name = input("Superadmin Name: ").strip()
        if not email:
            email = input("Superadmin Email: ").strip().lower()
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
            user.name = name
            user.password = make_password(password)
            user.role = "SUPERADMIN"
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f"Superadmin '{email}' successfully updated.")
            )
        else:
            user = User(
                name=name,
                email=email,
                password=make_password(password),
                role="SUPERADMIN",
            )
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f"Superadmin '{email}' successfully created.")
            )
