import os
from pathlib import Path
from dotenv import load_dotenv
import mongoengine

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "default-dev-secret-key")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = ["*"]

# Application definition: rest_framework, corsheaders, and feature apps
INSTALLED_APPS = [
    "corsheaders",
    "rest_framework",
    "apps.common",
    "apps.users",
    "apps.teams",
    "apps.tasks",
    "apps.activity",
]

# Minimal middleware without sessions, auth, or messages
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# No Django relational database - MongoDB is used exclusively
DATABASES = {}

# MongoDB connection using mongoengine
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/team_task_tracker")
mongoengine.connect(host=MONGO_URI)

# CORS configuration for frontend (Next.js)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# Django REST Framework configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.users.authentication.JWTAuth"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
}

# JWT secrets read from environment
JWT_ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET")
JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET")

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
