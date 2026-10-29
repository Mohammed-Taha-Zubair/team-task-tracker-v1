from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    EmailField,
    DateTimeField,
)

# User Model: stores user account details, credentials, and role
class User(Document):
    meta = {"collection": "users"}

    ROLE_CHOICES = ("SUPERADMIN", "ADMIN", "MEMBER")

    name = StringField(required=True, max_length=100)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    role = StringField(choices=ROLE_CHOICES, default="MEMBER")
    created_at = DateTimeField(default=datetime.utcnow)

    # Required by DRF's authentication mechanism
    @property
    def is_authenticated(self):
        return True

    @property
    def is_superadmin(self):
        return self.role == "SUPERADMIN"

    @property
    def is_admin_or_superadmin(self):
        return self.role in ["ADMIN", "SUPERADMIN"]

    @property
    def is_member(self):
        return self.role == "MEMBER"

    # Convert document to plain Python dictionary (never exposes password)
    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
