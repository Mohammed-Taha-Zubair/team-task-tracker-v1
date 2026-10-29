from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.teams.models import Team
from apps.users.models import User
from apps.common.utils import get_team_or_error
from apps.activity.services import log_activity

# POST /api/teams/ (admin only): Create a team with creator as first member
# GET /api/teams/: List all teams where the authenticated user is a member
class TeamListCreateView(APIView):
    def post(self, request):
        if str(getattr(request.user, "role", "") or "").lower() != "admin":
            return Response(
                {"message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = request.data.get("name", "").strip()
        description = request.data.get("description", "").strip()

        if not name:
            return Response(
                {"message": "Team name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team = Team(
            name=name,
            description=description,
            created_by=request.user,
            members=[request.user],
        )
        team.save()

        log_activity(
            team=team,
            user=request.user,
            message=f'{request.user.name} created team "{team.name}"',
        )

        team_dict = team.to_dict()
        team_dict["member_count"] = len(team.members)

        return Response(team_dict, status=status.HTTP_201_CREATED)

    def get(self, request):
        teams = Team.objects(members=request.user).order_by("-created_at")

        data = []
        for team in teams:
            team_dict = team.to_dict()
            team_dict["member_count"] = len(team.members)
            data.append(team_dict)

        return Response(data, status=status.HTTP_200_OK)


# GET /api/teams/<id>/: Returns team with full member details (members only)
class TeamDetailView(APIView):
    def get(self, request, id):
        team = get_team_or_error(id, request.user)

        team_dict = team.to_dict()
        team_dict["member_count"] = len(team.members)

        return Response(team_dict, status=status.HTTP_200_OK)


# POST /api/teams/<id>/invite/: Invite a user by email to join the team
class TeamInviteView(APIView):
    def post(self, request, id):
        team = get_team_or_error(id, request.user)

        if str(getattr(request.user, "role", "") or "").lower() != "admin":
            return Response(
                {"message": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"message": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print(f"Invitation sent to {email}")

        invited_user = User.objects(email=email).first()
        if not invited_user:
            return Response(
                {"message": "User not found. Please create this member in User Management first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        already_member = any(
            str(m.id) == str(invited_user.id)
            for m in team.members
            if m
        )

        if not already_member:
            team.members.append(invited_user)
            team.save()

            log_activity(
                team=team,
                user=request.user,
                message=f'{request.user.name} added {invited_user.name} to team "{team.name}"',
            )

        team_dict = team.to_dict()
        team_dict["member_count"] = len(team.members)

        return Response(
            {
                "message": f"{invited_user.name} added to team",
                "team": team_dict,
            },
            status=status.HTTP_200_OK,
        )
