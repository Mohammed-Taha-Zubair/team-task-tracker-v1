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
    status = StringField(choices=["pending", "in_progress", "done"], default="pending")
    team = ReferenceField("Team", required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "assigned_to": self.assigned_to.to_dict() if self.assigned_to else None,
            "status": self.status,
            "team_id": str(self.team.id) if self.team else None,
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
        return {
            "id": str(self.id),
            "task_id": str(self.task.id) if self.task else None,
            "user": self.user.to_dict() if self.user else None,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
