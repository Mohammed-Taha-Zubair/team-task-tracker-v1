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

    name = StringField(required=True, max_length=100)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    role = StringField(choices=["admin", "member"], default="member")
    created_at = DateTimeField(default=datetime.utcnow)

    # Required by DRF's authentication mechanism
    @property
    def is_authenticated(self):
        return True

    # Convert document to plain Python dictionary (never exposes password)
    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
