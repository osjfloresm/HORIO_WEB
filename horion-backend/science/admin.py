from django.contrib import admin
from .models import Repository, AnonymizedRecord, Contribution


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display = ["titulo_dataset", "codigo_mision", "total_registros", "publicado"]
    list_filter = ["publicado", "codigo_mision"]
    search_fields = ["titulo_dataset"]


admin.site.register([AnonymizedRecord, Contribution])
