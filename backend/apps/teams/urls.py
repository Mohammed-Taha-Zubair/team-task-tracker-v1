from django.urls import path
from apps.teams.views import TeamListCreateView, TeamDetailView, TeamInviteView
from apps.activity.views import TeamActivityView

urlpatterns = [
    path("", TeamListCreateView.as_view(), name="teams-list-create"),
    path("<str:id>/", TeamDetailView.as_view(), name="teams-detail"),
    path("<str:id>/invite/", TeamInviteView.as_view(), name="teams-invite"),
    path("<str:id>/activity/", TeamActivityView.as_view(), name="teams-activity"),
    path("<str:id>/activities/", TeamActivityView.as_view(), name="teams-activities"),
]
