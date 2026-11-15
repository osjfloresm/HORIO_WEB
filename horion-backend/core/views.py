from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from science.models import Repository, Contribution
from opportunities.models import Call, PortalConfig


@api_view(["GET"])
@permission_classes([AllowAny])
def overview(request):
    repositories = Repository.objects.filter(publicado=True)
    portal = PortalConfig.current()
    now = timezone.now()
    calls = (
        Call.objects.filter(
            estado="ABIERTA", fecha_apertura__lte=now, fecha_cierre__gt=now
        ).count()
        if portal.portal_habilitado
        else 0
    )
    return Response(
        {
            "records": repositories.aggregate(total=Sum("total_registros"))["total"]
            or 0,
            "repositories": repositories.count(),
            "contributions": Contribution.objects.filter(
                estado_moderacion="APROBADO", repositorio__publicado=True
            ).count(),
            "calls": calls,
            "missions": list(
                repositories.order_by("codigo_mision")
                .values_list("codigo_mision", flat=True)
                .distinct()
            ),
            "demo_mode": settings.DEMO_MODE,
            "updated_at": now,
        }
    )
