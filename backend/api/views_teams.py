from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Team, User
from .utils import log_activity, get_team_or_error


# POST /api/teams/ (admin only): Create a team with creator as first member
# GET /api/teams/: List all teams where the authenticated user is a member
class TeamListCreateView(APIView):
    def post(self, request):
        # Admin only check
        if getattr(request.user, "role", None) != "admin":
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

        # Create team with the creator automatically in members list
        team = Team(
            name=name,
            description=description,
            created_by=request.user,
            members=[request.user],
        )
        team.save()

        # Log activity
        log_activity(
            team=team,
            user=request.user,
            message=f'{request.user.name} created team "{team.name}"',
        )

        team_dict = team.to_dict()
        team_dict["member_count"] = len(team.members)

        return Response(team_dict, status=status.HTTP_201_CREATED)

    def get(self, request):
        # Retrieve only teams where the authenticated user is a member
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
        # Validates existence and verifies membership (raises 404 or 403)
        team = get_team_or_error(id, request.user)

        team_dict = team.to_dict()
        team_dict["member_count"] = len(team.members)

        return Response(team_dict, status=status.HTTP_200_OK)


# POST /api/teams/<id>/invite/: Invite a user by email to join the team
# Admin only AND must be a member of this team
class TeamInviteView(APIView):
    def post(self, request, id):
        # Checks team existence and that request.user is a member of the team
        team = get_team_or_error(id, request.user)

        # Admin only check
        if getattr(request.user, "role", None) != "admin":
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

        # Print console message as required
        print(f"Invitation sent to {email}")

        # Check if user with this email exists
        invited_user = User.objects(email=email).first()
        if not invited_user:
            return Response(
                {"message": "User must register first"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Add user to members if not already present (no duplicates)
        already_member = any(
            str(m.id) == str(invited_user.id)
            for m in team.members
            if m
        )

        if not already_member:
            team.members.append(invited_user)
            team.save()

            # Log activity
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
