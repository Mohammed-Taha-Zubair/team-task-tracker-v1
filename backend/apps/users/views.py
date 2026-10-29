import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
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


# GET  /api/users/       — list all users (admin only)
# POST /api/users/       — create a new user (admin only, members only)
class UserListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = [u.to_dict() for u in User.objects.all()]
        return Response({"users": users}, status=status.HTTP_200_OK)

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

        # Enforce single super admin policy: all created users must be members
        if role == "admin":
            return Response(
                {"message": "Only one super admin is allowed. New users must be created as members."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role != "member":
            return Response(
                {"message": "Role must be 'member'"},
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
            role="member",
        )
        user.save()

        return Response(
            {"message": "User created successfully", "user": user.to_dict()},
            status=status.HTTP_201_CREATED,
        )


# DELETE /api/users/<user_id>/  — delete a user (admin only, cannot delete self)
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

        if role == "admin" and str(user.id) != str(request.user.id):
            return Response(
                {"message": "Only one super admin is allowed in the system."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

