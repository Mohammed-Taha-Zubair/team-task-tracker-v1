from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    DateTimeField,
    ReferenceField,
)

# Task Model: represents an assignment within a team
class Task(Document):
    meta = {"collection": "tasks"}

    title = StringField(required=True, max_length=200)
    description = StringField(default="")
    assigned_to = ReferenceField("User", null=True, default=None)
    created_by = ReferenceField("User", null=True, default=None)
    status = StringField(choices=["pending", "in_progress", "done"], default="pending")
    team = ReferenceField("Team", required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        assigned_to_dict = None
        try:
            if self.assigned_to and hasattr(self.assigned_to, "to_dict"):
                assigned_to_dict = self.assigned_to.to_dict()
        except Exception:
            assigned_to_dict = None

        created_by_dict = None
        try:
            if self.created_by and hasattr(self.created_by, "to_dict"):
                created_by_dict = self.created_by.to_dict()
        except Exception:
            created_by_dict = None

        team_id = None
        try:
            if self.team and hasattr(self.team, "id"):
                team_id = str(self.team.id)
        except Exception:
            team_id = None

        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "assigned_to": assigned_to_dict,
            "created_by": created_by_dict,
            "status": self.status,
            "team_id": team_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Comment Model: notes or feedback attached to a specific task
class Comment(Document):
    meta = {"collection": "comments"}

    task = ReferenceField("Task", required=True)
    user = ReferenceField("User", required=True)
    text = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        user_dict = None
        try:
            if self.user and hasattr(self.user, "to_dict"):
                user_dict = self.user.to_dict()
        except Exception:
            user_dict = None

        task_id = None
        try:
            if self.task and hasattr(self.task, "id"):
                task_id = str(self.task.id)
        except Exception:
            task_id = None

        return {
            "id": str(self.id),
            "task_id": task_id,
            "user": user_dict,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
