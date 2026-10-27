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
    action_type = StringField(required=True, default="activity")
    message = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        user_dict = None
        try:
            if self.user and hasattr(self.user, "to_dict"):
                user_dict = self.user.to_dict()
        except Exception:
            user_dict = None

        team_id = None
        try:
            if self.team and hasattr(self.team, "id"):
                team_id = str(self.team.id)
        except Exception:
            team_id = None

        task_id = None
        try:
            if self.task and hasattr(self.task, "id"):
                task_id = str(self.task.id)
        except Exception:
            task_id = None

        return {
            "id": str(self.id),
            "team_id": team_id,
            "user": user_dict,
            "task_id": task_id,
            "action_type": self.action_type,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
