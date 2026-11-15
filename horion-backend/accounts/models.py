from django.conf import settings
from django.db import models


class Profile(models.Model):
    ROLES = [(r, r) for r in ["NASA_ADMIN", "RESEARCHER", "PROFESSIONAL", "ENTERPRISE"]]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    role = models.CharField(max_length=20, choices=ROLES, default="RESEARCHER")
    supabase_id = models.UUIDField(null=True, blank=True, unique=True)
    institution = models.CharField(max_length=200, blank=True)
    identifier = models.CharField(max_length=100, blank=True)
    specialty = models.CharField(max_length=200, blank=True)
    sector = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user.username} · {self.role}"
