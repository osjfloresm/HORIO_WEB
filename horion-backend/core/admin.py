from django.contrib import admin
from .models import AuditEvent


@admin.register(AuditEvent)
class AuditAdmin(admin.ModelAdmin):
    list_display = ["action", "actor", "object_id", "created_at"]
    list_filter = ["action"]
    readonly_fields = ["action", "actor", "object_id", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
