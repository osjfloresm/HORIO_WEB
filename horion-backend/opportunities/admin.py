from django.contrib import admin
from .models import PortalConfig, Call, ApplicantProfile, Application, Subscription


@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = [
        "codigo_convocatoria",
        "titulo",
        "categoria_destinatario",
        "estado",
        "fecha_cierre",
    ]
    list_filter = ["estado", "categoria_destinatario", "tipo_necesidad"]
    search_fields = ["titulo", "codigo_convocatoria"]


admin.site.register([PortalConfig, ApplicantProfile, Application, Subscription])
