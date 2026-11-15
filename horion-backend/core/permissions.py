import secrets
from django.conf import settings
from rest_framework.permissions import BasePermission, SAFE_METHODS


def role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return "NASA_ADMIN"
    return getattr(getattr(user, "profile", None), "role", None)


class IsNasaAdmin(BasePermission):
    def has_permission(self, request, view):
        return role(request.user) == "NASA_ADMIN"


class IsResearcherOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or role(request.user) in [
            "RESEARCHER",
            "NASA_ADMIN",
        ]


class IsApplicant(BasePermission):
    def has_permission(self, request, view):
        return role(request.user) in ["PROFESSIONAL", "ENTERPRISE"]


class IsEdgeOrAdmin(BasePermission):
    def has_permission(self, request, view):
        key = request.headers.get("X-Edge-Key", "")
        return role(request.user) == "NASA_ADMIN" or bool(
            settings.EDGE_API_KEY and secrets.compare_digest(key, settings.EDGE_API_KEY)
        )
