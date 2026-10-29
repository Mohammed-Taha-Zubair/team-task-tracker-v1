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
        clean_members = []
        for m in (self.members or []):
            try:
                if m and hasattr(m, "to_dict"):
                    clean_members.append(m.to_dict())
            except Exception:
                continue

        created_by_dict = None
        try:
            if self.created_by and hasattr(self.created_by, "to_dict"):
                created_by_dict = self.created_by.to_dict()
        except Exception:
            created_by_dict = None

        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "created_by": created_by_dict,
            "members": clean_members,
            "member_count": len(clean_members),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
