import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import User
from .auth import generate_access_token, generate_refresh_token


# POST /api/auth/register/
# Registers a new user with hashed password and role ('admin' or 'member')
class RegisterView(APIView):
    # Public endpoint: no auth or permissions required
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        role = request.data.get("role", "member").strip().lower()

        # Check required fields
        if not name or not email or not password:
            return Response(
                {"message": "Name, email, and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate role choice
        if role not in ["admin", "member"]:
            return Response(
                {"message": "Role must be 'admin' or 'member'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure email is unique
        if User.objects(email=email).first():
            return Response(
                {"message": "Email is already registered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Hash password and create user
        user = User(
            name=name,
            email=email,
            password=make_password(password),
            role=role,
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
# Authenticates credentials and returns access and refresh tokens
class LoginView(APIView):
    # Public endpoint
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

        # Generate tokens
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
# Takes refreshToken and returns a newly generated accessToken
class RefreshView(APIView):
    # Public endpoint
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
            # Verify refresh token using the dedicated refresh secret
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

        # Issue new access token
        new_access_token = generate_access_token(user)

        return Response(
            {"accessToken": new_access_token},
            status=status.HTTP_200_OK,
        )


# GET /api/auth/me/
# Returns details of the currently authenticated user
class MeView(APIView):
    # Relies on DEFAULT_AUTHENTICATION_CLASSES and DEFAULT_PERMISSION_CLASSES (IsAuthenticated)
    def get(self, request):
        return Response(
            {"user": request.user.to_dict()},
            status=status.HTTP_200_OK,
        )
