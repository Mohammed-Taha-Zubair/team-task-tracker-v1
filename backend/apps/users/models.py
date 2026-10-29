from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    EmailField,
    DateTimeField,
)

# User Model: stores user account details, credentials, and role (exactly 2 roles: admin and member)
class User(Document):
    meta = {"collection": "users"}

    ROLE_CHOICES = ("admin", "member", "ADMIN", "MEMBER")

    name = StringField(required=True, max_length=100)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    role = StringField(choices=ROLE_CHOICES, default="member")
    created_at = DateTimeField(default=datetime.utcnow)

    # Required by DRF's authentication mechanism
    @property
    def is_authenticated(self):
        return True

    @property
    def is_admin(self):
        return (self.role or "").lower() == "admin"

    @property
    def is_member(self):
        return (self.role or "").lower() == "member"

    # Convert document to plain Python dictionary (never exposes password)
    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": (self.role or "member").lower(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
