import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from mongoengine.queryset.visitor import Q
from apps.users.models import User
from apps.users.authentication import generate_access_token, generate_refresh_token


# POST /api/auth/register/
# Public registration: anyone can register. Every newly registered account
# strictly receives the "member" role. Admin privileges cannot be obtained
# through public registration.
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not name or not email or not password:
            return Response(
                {"message": "Name, email, and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"message": "Password must be at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects(email=email).first():
            return Response(
                {"message": "Email is already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Public registration always assigns member role (ignores any client-supplied role)
        user = User(
            name=name,
            email=email,
            password=make_password(password),
            role="member",
        )
        user.save()

        return Response(
            {
                "message": "Account created successfully",
                "user": user.to_dict(),
            },
            status=status.HTTP_201_CREATED,
        )


# POST /api/auth/login/
class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"message": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects(email=email).first()
        if not user or not check_password(password, user.password):
            return Response(
                {"message": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        access_token = generate_access_token(user)
        refresh_token = generate_refresh_token(user)

        return Response(
            {
                "accessToken": access_token,
                "refreshToken": refresh_token,
                "user": user.to_dict(),
            },
            status=status.HTTP_200_OK,
        )


# POST /api/auth/refresh/
class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        refresh_token = request.data.get("refreshToken") or request.data.get("refresh_token")

        if not refresh_token:
            return Response(
                {"message": "Refresh token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = jwt.decode(
                refresh_token,
                settings.JWT_REFRESH_SECRET,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            return Response(
                {"message": "Refresh token expired"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except jwt.InvalidTokenError:
            return Response(
                {"message": "Invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user_id = payload.get("user_id")
        user = User.objects(id=user_id).first()
        if not user:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        new_access_token = generate_access_token(user)

        return Response(
            {"accessToken": new_access_token},
            status=status.HTTP_200_OK,
        )


# GET /api/auth/me/
class MeView(APIView):
    def get(self, request):
        return Response(
            {"user": request.user.to_dict()},
            status=status.HTTP_200_OK,
        )


from apps.common.permissions import IsAdmin


# GET  /api/users/?search=<query> — list all users with optional search (admin only)
# POST /api/users/               — create a new user (admin only)
class UserListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            users = User.objects(
                Q(name__icontains=search_query) | Q(email__icontains=search_query)
            ).order_by("-created_at")
        else:
            users = User.objects.all().order_by("-created_at")
        return Response({"users": [u.to_dict() for u in users]}, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        role = request.data.get("role", "member").strip().lower()

        if not name or not email or not password:
            return Response(
                {"message": "Name, email, and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in ["admin", "member"]:
            return Response(
                {"message": "Role must be 'admin' or 'member'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects(email=email).first():
            return Response(
                {"message": "A user with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User(
            name=name,
            email=email,
            password=make_password(password),
            role=role,
        )
        user.save()

        return Response(
            {"message": "User created successfully", "user": user.to_dict()},
            status=status.HTTP_201_CREATED,
        )


# PATCH /api/users/<user_id>/role/ — promote or demote user role (admin only)
class UserRoleUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        user = User.objects(id=user_id).first()
        if not user:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_role = request.data.get("role", "").strip().lower()
        if new_role not in ["admin", "member"]:
            return Response(
                {"message": "Role must be 'admin' or 'member'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_role = (user.role or "member").lower()

        # If demoting from admin to member, check that this is not the last remaining admin
        if current_role == "admin" and new_role == "member":
            admin_count = User.objects(role="admin").count()
            if admin_count <= 1:
                return Response(
                    {"message": "Cannot demote the last remaining administrator."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user.role = new_role
        user.save()

        action = "promoted to Admin" if new_role == "admin" else "demoted to Member"
        return Response(
            {
                "message": f"User {user.name} {action} successfully",
                "user": user.to_dict(),
            },
            status=status.HTTP_200_OK,
        )


# DELETE /api/users/<user_id>/  — delete a user (admin only, cannot delete self or last admin)
class UserDetailView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        if str(request.user.id) == str(user_id):
            return Response(
                {"message": "You cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects(id=user_id).first()
        if not user:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Protect the last remaining admin from deletion
        if (user.role or "").lower() == "admin":
            admin_count = User.objects(role="admin").count()
            if admin_count <= 1:
                return Response(
                    {"message": "Cannot delete the last remaining administrator."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user.delete()
        return Response({"message": "User deleted successfully"}, status=status.HTTP_200_OK)

    def patch(self, request, user_id):
        """Allow admin to update a user's name, email, or password."""
        user = User.objects(id=user_id).first()
        if not user:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        role = request.data.get("role", "").strip().lower()

        if role:
            if role not in ["admin", "member"]:
                return Response(
                    {"message": "Role must be 'admin' or 'member'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (user.role or "").lower() == "admin" and role == "member":
                admin_count = User.objects(role="admin").count()
                if admin_count <= 1:
                    return Response(
                        {"message": "Cannot demote the last remaining administrator."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            user.role = role

        if name:
            user.name = name
        if email:
            existing = User.objects(email=email).first()
            if existing and str(existing.id) != str(user_id):
                return Response(
                    {"message": "Email already in use by another account"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = email
        if password:
            user.password = make_password(password)

        user.save()
        return Response({"message": "User updated successfully", "user": user.to_dict()}, status=status.HTTP_200_OK)

