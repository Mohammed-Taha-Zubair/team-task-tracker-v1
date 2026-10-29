from django.urls import path
from apps.activity.views import TeamActivityView

urlpatterns = [
    path("<str:id>/activities/", TeamActivityView.as_view(), name="teams-activities"),
    path("<str:id>/activity/", TeamActivityView.as_view(), name="teams-activity"),
]
