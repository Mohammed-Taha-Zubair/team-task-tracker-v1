from bson import ObjectId
from rest_framework.exceptions import NotFound, PermissionDenied
from apps.teams.models import Team

# Helper function to fetch a team by ID and verify user membership
# Raises 404 if invalid/missing, or 403 if user is not in team.members
def get_team_or_error(team_id, user):
    if not ObjectId.is_valid(team_id):
        raise NotFound("Team not found")

    team = Team.objects(id=team_id).first()
    if not team:
        raise NotFound("Team not found")

    is_member = any(
        str(member.id) == str(user.id)
        for member in team.members
        if member
    )
    if not is_member:
        raise PermissionDenied("You are not a member of this team")

    return team
