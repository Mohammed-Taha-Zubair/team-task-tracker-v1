import time
import logging
import jwt
from django.conf import settings
from django.http import JsonResponse
from apps.users.models import User

logger = logging.getLogger("django.request")


class JWTAuthenticationMiddleware:
    """
    Standard Django middleware to extract JWT Bearer token and attach
    the authenticated MongoEngine User document to request.user at the
    Django request lifecycle layer.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            try:
                payload = jwt.decode(
                    token,
                    settings.JWT_ACCESS_SECRET,
                    algorithms=["HS256"],
                )
                user_id = payload.get("user_id")
                if user_id:
                    user = User.objects(id=user_id).first()
                    if user:
                        request.user = user
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
                # Let downstream DRF authentication classes handle/reject invalid tokens
                pass

        response = self.get_response(request)
        return response


class RoleAccessControlMiddleware:
    """
    Standard Django middleware providing defense-in-depth role enforcement
    before requests reach view processing.
    """

    ADMIN_ONLY_PREFIXES = [
        "/api/users/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # Check if the requested path requires Admin authorization
        for prefix in self.ADMIN_ONLY_PREFIXES:
            if path.startswith(prefix):
                user = getattr(request, "user", None)
                if user and getattr(user, "is_authenticated", False):
                    if not getattr(user, "is_admin", False):
                        return JsonResponse(
                            {"message": "Admin access required"},
                            status=403,
                        )

        response = self.get_response(request)
        return response


class RequestLoggingMiddleware:
    """
    Standard Django middleware that measures request duration and logs
    method, path, HTTP status, and authenticated user role.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        user = getattr(request, "user", None)
        user_info = (
            f"{user.email} [{getattr(user, 'role', 'UNKNOWN')}]"
            if user and getattr(user, "is_authenticated", False) and hasattr(user, "email")
            else "Anonymous"
        )

        if request.path.startswith("/api/"):
            logger.info(
                f"[{request.method}] {request.path} -> {response.status_code} "
                f"({duration_ms}ms) | User: {user_info}"
            )

        return response
