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
        if not getattr(request.user, "is_admin_or_superadmin", False):
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
            action_type="team_created",
        )

        team_dict = team.to_dict()
        return Response(team_dict, status=status.HTTP_201_CREATED)

    def get(self, request):
        # Superadmin can view all teams; Admins and Members view joined teams
        if getattr(request.user, "is_superadmin", False):
            teams = Team.objects.all().order_by("-created_at")
        else:
            teams = Team.objects(members=request.user).order_by("-created_at")

        data = []
        for team in teams:
            data.append(team.to_dict())

        return Response(data, status=status.HTTP_200_OK)


# GET /api/teams/<id>/: Returns team with full member details (members only)
class TeamDetailView(APIView):
    def get(self, request, id):
        team = get_team_or_error(id, request.user)
        return Response(team.to_dict(), status=status.HTTP_200_OK)


# POST /api/teams/<id>/invite/: Invite a user by email to join the team
class TeamInviteView(APIView):
    def post(self, request, id):
        team = get_team_or_error(id, request.user)

        if not getattr(request.user, "is_admin_or_superadmin", False):
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

        invited_user = User.objects(email=email).first()
        if not invited_user:
            return Response(
                {"message": "User not found. Please register this member first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        already_member = False
        for m in (team.members or []):
            try:
                if m and str(getattr(m, "id", None)) == str(invited_user.id):
                    already_member = True
                    break
            except Exception:
                continue

        if already_member:
            return Response(
                {"message": "User is already a member of this team"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team.members.append(invited_user)
        team.save()

        log_activity(
            team=team,
            user=request.user,
            message=f'{request.user.name} added {invited_user.name} to team "{team.name}"',
            action_type="member_added",
        )

        return Response(
            {
                "message": f"{invited_user.name} added to team",
                "team": team.to_dict(),
            },
            status=status.HTTP_200_OK,
        )
