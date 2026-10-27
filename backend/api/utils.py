from bson import ObjectId
from rest_framework.exceptions import NotFound, PermissionDenied
from .models import Team, Activity


# Helper function to create and record an activity log in MongoDB
def log_activity(team, user, message, task=None):
    activity = Activity(
        team=team,
        user=user,
        message=message,
        task=task,
    )
    activity.save()
    return activity


# Helper function to fetch a team by ID and verify user membership
# Raises 404 if invalid/missing, or 403 if user is not in team.members
def get_team_or_error(team_id, user):
    # Validate MongoDB ObjectId format
    if not ObjectId.is_valid(team_id):
        raise NotFound("Team not found")

    team = Team.objects(id=team_id).first()
    if not team:
        raise NotFound("Team not found")

    # Check if the user is in team.members
    is_member = any(
        str(member.id) == str(user.id)
        for member in team.members
        if member
    )
    if not is_member:
        raise PermissionDenied("You are not a member of this team")

    return team
