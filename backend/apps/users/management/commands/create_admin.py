import getpass
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.users.models import User

class Command(BaseCommand):
    help = "Creates the initial administrator account in MongoDB."

    def add_arguments(self, parser):
        parser.add_argument("--name", type=str, help="Admin full name")
        parser.add_argument("--email", type=str, help="Admin email address")
        parser.add_argument("--password", type=str, help="Admin password")

    def handle(self, *args, **options):
        # Check if an admin already exists in the system
        existing_admin = User.objects(role="admin").first()
        if existing_admin:
            self.stdout.write(
                self.style.WARNING(
                    f"An Admin is already configured in the system ({existing_admin.email}). "
                    "Multiple Admins can be promoted through the Admin Dashboard by an existing Admin."
                )
            )
            return

        name = options.get("name")
        email = options.get("email")
        password = options.get("password")

        # Interactive prompts if not supplied via arguments
        if not name:
            name = input("Enter Admin Full Name: ").strip()
            while not name:
                self.stderr.write("Name cannot be empty.")
                name = input("Enter Admin Full Name: ").strip()

        if not email:
            email = input("Enter Admin Email: ").strip().lower()
            while not email:
                self.stderr.write("Email cannot be empty.")
                email = input("Enter Admin Email: ").strip().lower()
        else:
            email = email.strip().lower()

        # Check for duplicate email in MongoDB
        if User.objects(email=email).first():
            self.stderr.write(self.style.ERROR(f"A user with email '{email}' already exists."))
            return

        if not password:
            password = getpass.getpass("Enter Admin Password: ")
            while not password or len(password) < 8:
                self.stderr.write("Password must be at least 8 characters long.")
                password = getpass.getpass("Enter Admin Password: ")
            
            confirm = getpass.getpass("Confirm Admin Password: ")
            while password != confirm:
                self.stderr.write("Passwords do not match. Please try again.")
                password = getpass.getpass("Enter Admin Password: ")
                confirm = getpass.getpass("Confirm Admin Password: ")

        # Create the initial Admin directly in MongoDB
        admin_user = User(
            name=name,
            email=email,
            password=make_password(password),
            role="admin",
        )
        admin_user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Admin account created successfully for {admin_user.name} ({admin_user.email})!"
            )
        )
