from django.urls import path, include

# Top-level URL routing for the project: delegates cleanly to each app's urls.py
urlpatterns = [
    path("api/auth/", include("apps.users.urls")),
    path("api/users/", include("apps.users.user_urls")),
    path("api/teams/", include("apps.teams.urls")),
    path("api/", include("apps.tasks.urls")),
]
