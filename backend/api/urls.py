from django.urls import path
from .views_auth import RegisterView, LoginView, RefreshView, MeView
from .views_teams import TeamListCreateView, TeamDetailView, TeamInviteView
from .views_tasks import (
    TeamTaskListCreateView,
    TaskDetailView,
    TaskCommentsView,
    TeamActivityView,
)

# All API URL routes for Authentication, Teams, Tasks, Comments, and Activity
urlpatterns = [
    # Auth endpoints
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),

    # Teams endpoints
    path("teams/", TeamListCreateView.as_view(), name="teams-list-create"),
    path("teams/<str:id>/", TeamDetailView.as_view(), name="teams-detail"),
    path("teams/<str:id>/invite/", TeamInviteView.as_view(), name="teams-invite"),

    # Team tasks & activity endpoints
    path("teams/<str:id>/tasks/", TeamTaskListCreateView.as_view(), name="teams-tasks-list-create"),
    path("teams/<str:id>/activity/", TeamActivityView.as_view(), name="teams-activity"),

    # Task detail & comments endpoints
    path("tasks/<str:id>/", TaskDetailView.as_view(), name="tasks-detail"),
    path("tasks/<str:id>/comments/", TaskCommentsView.as_view(), name="tasks-comments"),
]
