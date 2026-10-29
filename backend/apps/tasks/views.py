from datetime import datetime
from bson import ObjectId
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from apps.tasks.models import Task, Comment
from apps.users.models import User
from apps.common.utils import get_team_or_error
from apps.activity.services import log_activity


# Helper to format a Task object with assigned_to as {id, name}
def format_task(task):
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "assigned_to": {
            "id": str(task.assigned_to.id),
            "name": task.assigned_to.name,
        } if task.assigned_to else None,
        "status": task.status,
        "team_id": str(task.team.id) if task.team else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }


# Helper to fetch a task and verify user belongs to the task's team
def get_task_and_team_or_error(task_id, user):
    if not ObjectId.is_valid(task_id):
        raise NotFound("Task not found")

    task = Task.objects(id=task_id).first()
    if not task:
        raise NotFound("Task not found")

    team = get_team_or_error(str(task.team.id), user)
    return task, team


# POST /api/teams/<id>/tasks/: Create a task in a team (team members only)
# GET /api/teams/<id>/tasks/?status=pending : List tasks of the team (newest updated first)
class TeamTaskListCreateView(APIView):
    def post(self, request, id):
        team = get_team_or_error(id, request.user)

        is_admin = str(getattr(request.user, "role", "") or "").lower() == "admin"
        if not is_admin:
            return Response(
                {"message": "Only administrators can create tasks"},
                status=status.HTTP_403_FORBIDDEN,
            )

        title = request.data.get("title", "").strip()
        description = request.data.get("description", "").strip()
        assigned_to_id = request.data.get("assigned_to")
        task_status = request.data.get("status", "pending").strip().lower()

        if not title:
            return Response(
                {"message": "Title is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if task_status not in ["pending", "in_progress", "done"]:
            return Response(
                {"message": "Status must be 'pending', 'in_progress', or 'done'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assigned_user = None
        if assigned_to_id:
            if not ObjectId.is_valid(assigned_to_id):
                return Response(
                    {"message": "Assigned user must be a team member"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            assigned_user = User.objects(id=assigned_to_id).first()
            is_team_member = any(
                str(m.id) == str(assigned_to_id)
                for m in team.members
                if m
            )
            if not assigned_user or not is_team_member:
                return Response(
                    {"message": "Assigned user must be a team member"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        now = datetime.utcnow()
        task = Task(
            title=title,
            description=description,
            assigned_to=assigned_user,
            status=task_status,
            team=team,
            created_at=now,
            updated_at=now,
        )
        task.save()

        log_activity(
            team=team,
            user=request.user,
            message=f'{request.user.name} created task "{task.title}"',
            task=task,
        )

        return Response(format_task(task), status=status.HTTP_201_CREATED)

    def get(self, request, id):
        team = get_team_or_error(id, request.user)

        query = {"team": team}
        status_filter = request.query_params.get("status")
        if status_filter:
            status_filter = status_filter.strip().lower()
            if status_filter in ["pending", "in_progress", "done"]:
                query["status"] = status_filter

        tasks = Task.objects(**query).order_by("-updated_at")

        return Response(
            [format_task(t) for t in tasks],
            status=status.HTTP_200_OK,
        )


# GET /api/tasks/<id>/ and PATCH /api/tasks/<id>/ (team members only)
class TaskDetailView(APIView):
    def get(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)
        return Response(format_task(task), status=status.HTTP_200_OK)

    def patch(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)

        is_admin = str(getattr(request.user, "role", "") or "").lower() == "admin"
        if not is_admin:
            is_assigned = (
                task.assigned_to is not None
                and str(task.assigned_to.id) == str(request.user.id)
            )
            if not is_assigned:
                return Response(
                    {"message": "You can only update tasks assigned to you"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if "title" in request.data or "description" in request.data or "assigned_to" in request.data:
                return Response(
                    {"message": "Members can only update the status of tasks assigned to them"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        old_status = task.status
        status_changed = False

        if "title" in request.data:
            title = request.data.get("title", "").strip()
            if not title:
                return Response(
                    {"message": "Title cannot be empty"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            task.title = title

        if "description" in request.data:
            task.description = request.data.get("description", "").strip()

        if "assigned_to" in request.data:
            assigned_to_id = request.data.get("assigned_to")
            if assigned_to_id in [None, ""]:
                task.assigned_to = None
            else:
                if not ObjectId.is_valid(assigned_to_id):
                    return Response(
                        {"message": "Assigned user must be a team member"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                assigned_user = User.objects(id=assigned_to_id).first()
                is_member = any(
                    str(m.id) == str(assigned_to_id)
                    for m in team.members
                    if m
                )
                if not assigned_user or not is_member:
                    return Response(
                        {"message": "Assigned user must be a team member"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                task.assigned_to = assigned_user

        if "status" in request.data:
            new_status = request.data.get("status", "").strip().lower()
            if new_status not in ["pending", "in_progress", "done"]:
                return Response(
                    {"message": "Status must be 'pending', 'in_progress', or 'done'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_status != old_status:
                status_changed = True
                task.status = new_status

        task.updated_at = datetime.utcnow()
        task.save()

        status_labels = {
            "pending": "Pending",
            "in_progress": "In Progress",
            "done": "Done",
        }
        if status_changed:
            status_text = status_labels.get(task.status, task.status)
            message = f'{request.user.name} changed status of "{task.title}" to {status_text}.'
        else:
            message = f'{request.user.name} updated task "{task.title}"'

        log_activity(
            team=team,
            user=request.user,
            message=message,
            task=task,
        )

        return Response(format_task(task), status=status.HTTP_200_OK)


# GET /api/tasks/<id>/comments/ : List comments (oldest first, includes user name)
# POST /api/tasks/<id>/comments/ : Add comment to task
class TaskCommentsView(APIView):
    def get(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)

        comments = Comment.objects(task=task).order_by("created_at")

        data = []
        for c in comments:
            data.append({
                "id": str(c.id),
                "task_id": str(task.id),
                "text": c.text,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "user": {
                    "id": str(c.user.id),
                    "name": c.user.name,
                } if c.user else None,
            })

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)

        is_admin = str(getattr(request.user, "role", "") or "").lower() == "admin"
        if not is_admin:
            is_assigned = (
                task.assigned_to is not None
                and str(task.assigned_to.id) == str(request.user.id)
            )
            if not is_assigned:
                return Response(
                    {"message": "You can only comment on tasks assigned to you"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"message": "Comment text is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = Comment(
            task=task,
            user=request.user,
            text=text,
            created_at=datetime.utcnow(),
        )
        comment.save()

        log_activity(
            team=team,
            user=request.user,
            message=f'{request.user.name} commented on "{task.title}"',
            task=task,
        )

        return Response(
            {
                "id": str(comment.id),
                "task_id": str(task.id),
                "text": comment.text,
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
                "user": {
                    "id": str(request.user.id),
                    "name": request.user.name,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# GET /api/tasks/my/: List all tasks assigned to the authenticated user
class UserAssignedTasksView(APIView):
    def get(self, request):
        tasks = Task.objects(assigned_to=request.user).order_by("-updated_at")
        return Response([format_task(t) for t in tasks], status=status.HTTP_200_OK)

