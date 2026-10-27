from django.contrib import admin
from django.urls import path, include
from apps.users.views import UserListCreateView, UserDetailView

# Top-level URL routing for the project: includes each app's urls.py
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/teams/", include("apps.teams.urls")),
    path("api/teams/", include("apps.activity.urls")),
    path("api/", include("apps.tasks.urls")),
    # Admin-only user management
    path("api/users/", UserListCreateView.as_view(), name="user-list-create"),
    path("api/users/<str:user_id>/", UserDetailView.as_view(), name="user-detail"),
]
