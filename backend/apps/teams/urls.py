from django.urls import path
from apps.teams.views import TeamListCreateView, TeamDetailView, TeamInviteView

urlpatterns = [
    path("", TeamListCreateView.as_view(), name="teams-list-create"),
    path("<str:id>/", TeamDetailView.as_view(), name="teams-detail"),
    path("<str:id>/invite/", TeamInviteView.as_view(), name="teams-invite"),
]
