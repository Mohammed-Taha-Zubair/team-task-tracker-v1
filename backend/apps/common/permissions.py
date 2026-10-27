from rest_framework.permissions import BasePermission

# Custom Permission: allows only users with role "admin"
class IsAdmin(BasePermission):
    message = "Admin access required"

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", None) == "admin"
        )
