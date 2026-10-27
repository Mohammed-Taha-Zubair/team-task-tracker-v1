from datetime import datetime
from mongoengine import (
    Document,
    StringField,
    EmailField,
    DateTimeField,
    ReferenceField,
    ListField,
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


# Team Model: represents a team created by a user with multiple member users
class Team(Document):
    meta = {"collection": "teams"}

    name = StringField(required=True, max_length=120)
    description = StringField(default="")
    created_by = ReferenceField(User, required=True)
    members = ListField(ReferenceField(User), default=list)
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


# Task Model: represents an assignment within a team
class Task(Document):
    meta = {"collection": "tasks"}

    title = StringField(required=True, max_length=200)
    description = StringField(default="")
    assigned_to = ReferenceField(User, null=True, default=None)
    status = StringField(choices=["pending", "in_progress", "done"], default="pending")
    team = ReferenceField(Team, required=True)
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

    task = ReferenceField(Task, required=True)
    user = ReferenceField(User, required=True)
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


# Activity Model: audit log of actions happening inside a team
class Activity(Document):
    meta = {"collection": "activities"}

    team = ReferenceField(Team, required=True)
    user = ReferenceField(User, required=True)
    task = ReferenceField(Task, null=True, default=None)
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
