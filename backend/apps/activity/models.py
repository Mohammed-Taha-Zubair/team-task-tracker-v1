from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    DateTimeField,
    ReferenceField,
)

# Activity Model: audit log of actions happening inside a team
class Activity(Document):
    meta = {"collection": "activities"}

    team = ReferenceField("Team", required=True)
    user = ReferenceField("User", required=True)
    task = ReferenceField("Task", null=True, default=None)
    message = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "team_id": str(self.team.id) if self.team else None,
            "user": self.user.to_dict() if self.user else None,
            "task_id": str(self.task.id) if self.task else None,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
