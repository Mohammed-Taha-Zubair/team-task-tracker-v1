import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.users.models import User
from apps.users.authentication import generate_access_token, generate_refresh_token


# POST /api/auth/register/
# Public registration: open to any user, always creates a MEMBER account.
# Users can never self-assign the admin role.
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

        import re
        if not re.match(r"^[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z]{2,}$", email):
            return Response(
                {"message": "Invalid email format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"message": "Password must be at least 8 characters long"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects(email=email).first():
            return Response(
                {"message": "Email is already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Public registration ALWAYS creates a member account.
        # Any requested "role" in request.data is strictly ignored.
        user = User(
            name=name,
            email=email,
            password=make_password(password),
            role="MEMBER",
        )
        user.save()

        return Response(
            {
                "message": "User registered successfully",
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


from apps.common.permissions import IsSuperAdmin


# GET  /api/users/       — list all users (superadmin only)
# POST /api/users/       — create a new user (superadmin only: ADMIN or MEMBER)
class UserListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        users = [u.to_dict() for u in User.objects.all()]
        return Response({"users": users}, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        role = request.data.get("role", "MEMBER").strip().upper()

        if not name or not email or not password:
            return Response(
                {"message": "Name, email, and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role == "SUPERADMIN":
            return Response(
                {"message": "Superadmin accounts can only be created via management commands"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in ["ADMIN", "MEMBER"]:
            return Response(
                {"message": "Role must be 'ADMIN' or 'MEMBER'"},
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


# DELETE /api/users/<user_id>/  — delete a user (superadmin only, cannot delete self)
# PATCH  /api/users/<user_id>/  — update details or promote/demote (superadmin only)
class UserDetailView(APIView):
    permission_classes = [IsSuperAdmin]

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

        # Cascade clean up references to prevent dangling DBRefs
        try:
            from apps.teams.models import Team
            from apps.tasks.models import Task
            from mongoengine.connection import get_db

            # 1. Pull user from all team member lists
            Team.objects.update(pull__members=user)
            db = get_db()
            db.teams.update_many({}, {"$pull": {"members": user.id}})

            # 2. Unassign tasks assigned to this user
            Task.objects(assigned_to=user).update(set__assigned_to=None)
            db.tasks.update_many({"assigned_to": user.id}, {"$set": {"assigned_to": None}})

            # 3. If user created teams, transfer ownership to admin
            Team.objects(created_by=user).update(set__created_by=request.user)
            db.teams.update_many({"created_by": user.id}, {"$set": {"created_by": request.user.id}})
        except Exception as e:
            print(f"Cleanup warning on user deletion: {e}")

        user.delete()
        return Response({"message": "User deleted successfully"}, status=status.HTTP_200_OK)

    def patch(self, request, user_id):
        """Allow superadmin to update a user's name, email, password, or role."""
        from bson import ObjectId
        if not ObjectId.is_valid(user_id):
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = User.objects(id=user_id).first()
        if not user:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "role" in request.data:
            new_role = str(request.data.get("role", "")).strip().upper()
            if new_role == "SUPERADMIN":
                return Response(
                    {"message": "Superadmin role cannot be assigned via API"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_role not in ["ADMIN", "MEMBER"]:
                return Response(
                    {"message": "Role must be 'ADMIN' or 'MEMBER'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if str(request.user.id) == str(user_id) and user.is_superadmin and new_role != "SUPERADMIN":
                return Response(
                    {"message": "You cannot demote your own Superadmin account"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.role = new_role

        if "name" in request.data:
            name = request.data.get("name", "").strip()
            if name:
                user.name = name

        if "email" in request.data:
            email = request.data.get("email", "").strip().lower()
            if email:
                existing = User.objects(email=email).first()
                if existing and str(existing.id) != str(user_id):
                    return Response(
                        {"message": "Email already in use by another account"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                user.email = email

        if "password" in request.data:
            password = request.data.get("password", "")
            if len(password) < 8:
                return Response(
                    {"message": "Password must be at least 8 characters long"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.password = make_password(password)

        user.save()
        return Response({"message": "User updated successfully", "user": user.to_dict()}, status=status.HTTP_200_OK)

