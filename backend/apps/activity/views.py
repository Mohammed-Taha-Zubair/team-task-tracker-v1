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
            data.append({
                "id": str(act.id),
                "team_id": str(team.id),
                "message": act.message,
                "task_id": str(act.task.id) if act.task else None,
                "user": {
                    "id": str(act.user.id),
                    "name": act.user.name,
                } if act.user else None,
                "created_at": act.created_at.isoformat() if act.created_at else None,
            })

        return Response(data, status=status.HTTP_200_OK)
