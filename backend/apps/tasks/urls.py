from django.urls import path
from apps.tasks.views import (
    TeamTaskListCreateView,
    TaskDetailView,
    TaskCommentsView,
)

urlpatterns = [
    path("teams/<str:id>/tasks/", TeamTaskListCreateView.as_view(), name="teams-tasks-list-create"),
    path("tasks/<str:id>/", TaskDetailView.as_view(), name="tasks-detail"),
    path("tasks/<str:id>/comments/", TaskCommentsView.as_view(), name="tasks-comments"),
]
