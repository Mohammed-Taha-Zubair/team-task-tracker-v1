from datetime import datetime, timedelta, timezone
import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.users.models import User

# Generate access token valid for 15 minutes
def generate_access_token(user):
    payload = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_ACCESS_SECRET, algorithm="HS256")


# Generate refresh token valid for 7 days
def generate_refresh_token(user):
    payload = {
        "user_id": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm="HS256")


# Custom JWT Authentication class for Django REST Framework
class JWTAuth(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        parts = auth_header.split(" ")
        if len(parts) != 2:
            raise AuthenticationFailed("Invalid token")

        token = parts[1].strip()

        try:
            payload = jwt.decode(
                token,
                settings.JWT_ACCESS_SECRET,
                algorithms=["HS256"]
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token")

        user_id = payload.get("user_id")
        if not user_id:
            raise AuthenticationFailed("Invalid token")

        try:
            user = User.objects.get(id=user_id)
        except Exception:
            raise AuthenticationFailed("Invalid token")

        return (user, None)

    def authenticate_header(self, request):
        return "Bearer"
