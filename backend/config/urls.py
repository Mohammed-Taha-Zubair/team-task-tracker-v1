from django.urls import path, include

# Top-level URL routing for the project
urlpatterns = [
    path("api/", include("api.urls")),
]
