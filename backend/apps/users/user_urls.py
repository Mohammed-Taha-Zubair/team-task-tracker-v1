from django.urls import path
from apps.users.views import (
    UserListCreateView,
    UserDetailView,
    UserRoleUpdateView,
)

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list-create"),
    path("<str:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path("<str:user_id>/role/", UserRoleUpdateView.as_view(), name="user-role-update"),
]
