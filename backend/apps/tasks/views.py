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
from apps.common.permissions import CanCreateTask


# Helper to format a Task object with assigned_to as {id, name}
def format_task(task):
    assigned_to_data = None
    try:
        if task.assigned_to and hasattr(task.assigned_to, "id"):
            assigned_to_data = {
                "id": str(task.assigned_to.id),
                "name": getattr(task.assigned_to, "name", "Former Member"),
            }
    except Exception:
        assigned_to_data = None

    created_by_data = None
    try:
        if task.created_by and hasattr(task.created_by, "id"):
            created_by_data = {
                "id": str(task.created_by.id),
                "name": getattr(task.created_by, "name", "Former Member"),
            }
    except Exception:
        created_by_data = None

    team_id = None
    team_name = None
    try:
        if task.team and hasattr(task.team, "id"):
            team_id = str(task.team.id)
            team_name = getattr(task.team, "name", "Team")
    except Exception:
        team_id = None
        team_name = None

    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "assigned_to": assigned_to_data,
        "created_by": created_by_data,
        "status": task.status,
        "team_id": team_id,
        "team_name": team_name,
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


# GET /api/tasks/ : List tasks for current user (Superadmin sees all, Admin/Member see their teams)
# Query params: status (pending/in_progress/done), assigned=me, limit
class TaskListAllView(APIView):
    def get(self, request):
        from apps.teams.models import Team

        is_super = getattr(request.user, "is_superadmin", False)

        query = {}
        status_filter = request.query_params.get("status")
        if status_filter and status_filter.strip().lower() in ["pending", "in_progress", "done"]:
            query["status"] = status_filter.strip().lower()

        assigned_filter = request.query_params.get("assigned")
        if assigned_filter == "me":
            query["assigned_to"] = request.user

        if is_super:
            tasks = Task.objects(**query).order_by("-updated_at")
        else:
            user_teams = Team.objects(members=request.user)
            if not user_teams:
                return Response([], status=status.HTTP_200_OK)
            query["team__in"] = user_teams
            tasks = Task.objects(**query).order_by("-updated_at")

        limit = request.query_params.get("limit")
        if limit and limit.isdigit():
            tasks = tasks[:int(limit)]

        return Response([format_task(t) for t in tasks], status=status.HTTP_200_OK)


# POST /api/teams/<id>/tasks/: Create a task in a team (Admins and Superadmins only)
# GET /api/teams/<id>/tasks/?status=pending : List tasks of the team (team members, newest updated first)
class TeamTaskListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [CanCreateTask()]
        return super().get_permissions()

    def post(self, request, id):
        if not getattr(request.user, "is_admin_or_superadmin", False):
            return Response(
                {"message": "Only admins and superadmins can create tasks"},
                status=status.HTTP_403_FORBIDDEN,
            )

        team = get_team_or_error(id, request.user)

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
            is_team_member = False
            for m in (team.members or []):
                try:
                    if m and str(getattr(m, "id", None)) == str(assigned_to_id):
                        is_team_member = True
                        break
                except Exception:
                    continue

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
            created_by=request.user,
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
            action_type="task_created",
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
# Members can only update status. Title, description, and assignee can only be modified by admins.
class TaskDetailView(APIView):
    def get(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)
        return Response(format_task(task), status=status.HTTP_200_OK)

    def patch(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)

        is_admin = getattr(request.user, "is_admin_or_superadmin", False)

        # Members can only change task status
        if not is_admin:
            disallowed = [f for f in ["title", "description", "assigned_to"] if f in request.data]
            if disallowed:
                return Response(
                    {
                        "message": (
                            "Members can only change task status. "
                            f"Modifying {', '.join(disallowed)} requires admin access."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        old_title = task.title
        old_description = task.description or ""
        old_assigned_id = str(task.assigned_to.id) if task.assigned_to else None
        old_status = task.status

        title_changed = False
        desc_changed = False
        assigned_changed = False
        status_changed = False

        if "title" in request.data:
            title = request.data.get("title", "").strip()
            if not title:
                return Response(
                    {"message": "Title cannot be empty"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if title != old_title:
                task.title = title
                title_changed = True

        if "description" in request.data:
            description = request.data.get("description", "").strip()
            if description != old_description:
                task.description = description
                desc_changed = True

        if "assigned_to" in request.data:
            assigned_to_id = request.data.get("assigned_to")
            if assigned_to_id in [None, ""]:
                if old_assigned_id is not None:
                    task.assigned_to = None
                    assigned_changed = True
            else:
                if not ObjectId.is_valid(assigned_to_id):
                    return Response(
                        {"message": "Assigned user must be a team member"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                assigned_user = User.objects(id=assigned_to_id).first()
                is_member = False
                for m in (team.members or []):
                    try:
                        if m and str(getattr(m, "id", None)) == str(assigned_to_id):
                            is_member = True
                            break
                    except Exception:
                        continue

                if not assigned_user or not is_member:
                    return Response(
                        {"message": "Assigned user must be a team member"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if old_assigned_id != str(assigned_to_id):
                    task.assigned_to = assigned_user
                    assigned_changed = True

        if "status" in request.data:
            new_status = request.data.get("status", "").strip().lower()
            if new_status not in ["pending", "in_progress", "done"]:
                return Response(
                    {"message": "Status must be 'pending', 'in_progress', or 'done'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_status != old_status:
                task.status = new_status
                status_changed = True

        # Prevent duplicate activity logging if no fields actually changed
        any_changed = title_changed or desc_changed or assigned_changed or status_changed
        if not any_changed:
            return Response(format_task(task), status=status.HTTP_200_OK)

        task.updated_at = datetime.utcnow()
        task.save()

        status_labels = {
            "pending": "Pending",
            "in_progress": "In Progress",
            "done": "Done",
        }
        if status_changed and not (title_changed or desc_changed or assigned_changed):
            status_text = status_labels.get(task.status, task.status)
            message = f'{request.user.name} changed status of "{task.title}" to {status_text}.'
            action_type = "status_changed"
        else:
            message = f'{request.user.name} updated task "{task.title}"'
            action_type = "task_updated"

        log_activity(
            team=team,
            user=request.user,
            message=message,
            task=task,
            action_type=action_type,
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
            user_data = None
            try:
                if c.user and hasattr(c.user, "id"):
                    user_data = {
                        "id": str(c.user.id),
                        "name": getattr(c.user, "name", "Former Member"),
                    }
            except Exception:
                user_data = {"id": None, "name": "Former Member"}

            data.append({
                "id": str(c.id),
                "task_id": str(task.id),
                "text": c.text,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "user": user_data,
            })

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, id):
        task, team = get_task_and_team_or_error(id, request.user)

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
            action_type="comment_added",
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
