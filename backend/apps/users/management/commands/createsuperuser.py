from apps.users.management.commands.create_superadmin import Command as SuperadminCommand


class Command(SuperadminCommand):
    help = "Creates or promotes a platform Superadmin user in MongoDB"
