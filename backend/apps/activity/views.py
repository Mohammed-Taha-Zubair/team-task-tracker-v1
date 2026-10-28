from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.activity.models import Activity
from apps.common.utils import get_team_or_error

# GET /api/teams/<id>/activity/ : List team activity log (newest first, includes user name)
class TeamActivityView(APIView):
    def get(self, request, id):
        team = get_team_or_error(id, request.user)

        activities = Activity.objects(team=team).order_by("-created_at")

        data = []
        for act in activities:
            user_data = None
            try:
                if act.user and hasattr(act.user, "id"):
                    user_data = {
                        "id": str(act.user.id),
                        "name": getattr(act.user, "name", "Former Member"),
                    }
            except Exception:
                user_data = {"id": None, "name": "Former Member"}

            task_id = None
            try:
                if act.task and hasattr(act.task, "id"):
                    task_id = str(act.task.id)
            except Exception:
                task_id = None

            data.append({
                "id": str(act.id),
                "team_id": str(team.id),
                "action_type": getattr(act, "action_type", "activity"),
                "message": act.message,
                "task_id": task_id,
                "user": user_data,
                "created_at": act.created_at.isoformat() if act.created_at else None,
            })

        return Response(data, status=status.HTTP_200_OK)


# GET /api/activities/ : List cross-team activities for current user
# Superadmin sees all; Admin & Member see activities from teams they belong to
class GlobalActivityView(APIView):
    def get(self, request):
        from apps.teams.models import Team

        is_super = getattr(request.user, "is_superadmin", False)
        if is_super:
            activities = Activity.objects().order_by("-created_at")[:30]
        else:
            user_teams = Team.objects(members=request.user)
            if not user_teams:
                return Response([], status=status.HTTP_200_OK)
            activities = Activity.objects(team__in=user_teams).order_by("-created_at")[:30]

        data = []
        for act in activities:
            user_data = None
            try:
                if act.user and hasattr(act.user, "id"):
                    user_data = {
                        "id": str(act.user.id),
                        "name": getattr(act.user, "name", "Former Member"),
                    }
            except Exception:
                user_data = {"id": None, "name": "Former Member"}

            team_data = None
            try:
                if act.team and hasattr(act.team, "id"):
                    team_data = {
                        "id": str(act.team.id),
                        "name": getattr(act.team, "name", "Team"),
                    }
            except Exception:
                team_data = None

            task_id = None
            try:
                if act.task and hasattr(act.task, "id"):
                    task_id = str(act.task.id)
            except Exception:
                task_id = None

            data.append({
                "id": str(act.id),
                "team": team_data,
                "team_id": team_data["id"] if team_data else None,
                "action_type": getattr(act, "action_type", "activity"),
                "message": act.message,
                "task_id": task_id,
                "user": user_data,
                "created_at": act.created_at.isoformat() if act.created_at else None,
            })

        return Response(data, status=status.HTTP_200_OK)

