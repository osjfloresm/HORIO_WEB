from django.contrib import admin
from .models import (
    Mission,
    Astronaut,
    SyncBatch,
    Telemetry,
    DesktopAlert,
    OrbiMessage,
    Research,
)


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ["codigo_mision", "nombre", "estado", "fecha_inicio"]
    list_filter = ["estado"]
    search_fields = ["codigo_mision", "nombre"]


@admin.register(Astronaut)
class AstronautAdmin(admin.ModelAdmin):
    list_display = [
        "codigo_astronauta",
        "nombre_completo",
        "mision",
        "ultima_sincronizacion",
    ]
    list_filter = ["mision"]
    search_fields = ["codigo_astronauta", "nombre_completo"]


admin.site.register([SyncBatch, Telemetry, DesktopAlert, OrbiMessage, Research])
