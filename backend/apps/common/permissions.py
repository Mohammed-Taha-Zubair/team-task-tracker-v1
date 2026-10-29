from rest_framework.permissions import BasePermission

# Custom Permission: allows only users with role "admin"
class IsAdmin(BasePermission):
    message = "Admin access required"

    def has_permission(self, request, view):
        role = str(getattr(request.user, "role", "") or "").lower()
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and role == "admin"
        )
