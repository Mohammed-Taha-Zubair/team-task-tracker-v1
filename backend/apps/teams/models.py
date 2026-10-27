from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    DateTimeField,
    ReferenceField,
    ListField,
)

# Team Model: represents a team created by a user with multiple member users
class Team(Document):
    meta = {"collection": "teams"}

    name = StringField(required=True, max_length=120)
    description = StringField(default="")
    created_by = ReferenceField("User", required=True)
    members = ListField(ReferenceField("User"), default=list)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "created_by": self.created_by.to_dict() if self.created_by else None,
            "members": [m.to_dict() for m in self.members if m],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
