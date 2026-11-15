from django.db import transaction, IntegrityError
from django.http import FileResponse
from django.utils import timezone
from rest_framework import viewsets, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.permissions import IsApplicant
from .models import PortalConfig, Call, Application, ApplicantProfile, Subscription
from .serializers import (
    PortalSerializer,
    CallSerializer,
    ApplicationSerializer,
    SubscriptionSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def status(request):
    return Response(PortalSerializer(PortalConfig.current()).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def subscribe(request):
    serializer = SubscriptionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    Subscription.objects.get_or_create(email=serializer.validated_data["email"].lower())
    return Response(
        {"detail": "Suscripción registrada. Te avisaremos cuando haya novedades."},
        status=201,
    )


class PublicCallViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        if not PortalConfig.current().portal_habilitado:
            return Call.objects.none()
        now = timezone.now()
        qs = Call.objects.select_related("repositorio_datos_vinculado").filter(
            estado="ABIERTA", fecha_apertura__lte=now, fecha_cierre__gt=now
        )
        if self.request.query_params.get("category"):
            qs = qs.filter(
                categoria_destinatario__in=[
                    self.request.query_params["category"],
                    "AMBOS",
                ]
            )
        return qs


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsApplicant]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Application.objects.select_related("convocatoria", "postulante").filter(
            postulante__user=self.request.user
        )

    def perform_create(self, serializer):
        profile = self.request.user.profile
        try:
            with transaction.atomic():
                # Serialize submissions against the portal switch and call closure.
                portal = PortalConfig.objects.select_for_update().get(pk=1)
                call = Call.objects.select_for_update().get(
                    pk=serializer.validated_data["convocatoria"].pk
                )
                if (
                    not portal.portal_habilitado
                    or call.estado != "ABIERTA"
                    or not call.fecha_apertura <= timezone.now() < call.fecha_cierre
                ):
                    raise serializers.ValidationError(
                        "La ventana de postulación ha cerrado."
                    )
                applicant, _ = ApplicantProfile.objects.get_or_create(
                    user=self.request.user,
                    defaults={
                        "tipo_perfil": (
                            "EMPRESA" if profile.role == "ENTERPRISE" else "PROFESIONAL"
                        ),
                        "nombre_o_razon_social": self.request.user.first_name,
                        "identificador_legal_o_orcid": profile.identifier,
                        "pais": profile.country,
                        "areas_especialidad": [profile.specialty or profile.sector],
                    },
                )
                serializer.save(postulante=applicant)
        except IntegrityError:
            raise serializers.ValidationError(
                "Ya enviaste una postulación a esta convocatoria."
            )

    @action(detail=True, methods=["get"])
    def document(self, request, pk=None):
        return FileResponse(
            self.get_object().documento_adjunto.open("rb"),
            as_attachment=True,
            filename="propuesta.pdf",
            content_type="application/pdf",
        )
