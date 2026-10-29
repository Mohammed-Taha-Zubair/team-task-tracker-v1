from rest_framework.permissions import BasePermission

# Custom Permission: allows only platform Superadmin users
class IsSuperAdmin(BasePermission):
    message = "Superadmin access required"

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "is_superadmin", False)
        )


# Custom Permission: allows Application Admin or Superadmin users
class IsAdminOrSuperAdmin(BasePermission):
    message = "Admin access required"

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "is_admin_or_superadmin", False)
        )


# Permission: only admins and superadmins can create tasks
class CanCreateTask(BasePermission):
    message = "Only admins and superadmins can create tasks"

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "is_admin_or_superadmin", False)
        )


# Alias IsAdmin to IsAdminOrSuperAdmin for backward compatibility
IsAdmin = IsAdminOrSuperAdmin
