from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from core.models import AuditEvent
from core.permissions import IsNasaAdmin, IsEdgeOrAdmin
from science.models import Contribution
from science.serializers import ContributionSerializer, RepositorySerializer
from opportunities.models import PortalConfig, Call, Application
from opportunities.serializers import (
    PortalSerializer,
    CallSerializer,
    ApplicationSerializer,
    EvaluationSerializer,
)
from .models import (
    Mission,
    Astronaut,
    SyncBatch,
    Telemetry,
    DesktopAlert,
    OrbiMessage,
    Research,
)
from .serializers import (
    MissionSerializer,
    AstronautSerializer,
    AstronautManagementSerializer,
    BatchSerializer,
    TelemetrySerializer,
    AlertSerializer,
    OrbiSerializer,
    ResearchSerializer,
)
from .services import ingest, release, public_rows


class MissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MissionSerializer
    permission_classes = [IsNasaAdmin]
    queryset = Mission.objects.order_by("codigo_mision")


class AstronautViewSet(viewsets.ModelViewSet):
    serializer_class = AstronautManagementSerializer
    permission_classes = [IsNasaAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]
    queryset = Astronaut.objects.select_related("mision").order_by(
        "nombre_completo", "id"
    )

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("update", "partial_update"):
            qs = qs.select_for_update()
        return qs

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def perform_create(self, serializer):
        obj = serializer.save()
        AuditEvent.objects.create(
            actor=self.request.user, action="ASTRONAUT_CREATED", object_id=str(obj.pk)
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        AuditEvent.objects.create(
            actor=self.request.user, action="ASTRONAUT_UPDATED", object_id=str(obj.pk)
        )


@api_view(["POST"])
@permission_classes([IsEdgeOrAdmin])
def ingest_view(request):
    batch, created = ingest(
        request.data.get("payload"), request.data.get("hash_sha256")
    )
    return Response(
        {
            "id": str(batch.id),
            "created": created,
            "cantidad_registros": batch.cantidad_registros,
        },
        status=201 if created else 200,
    )


@api_view(["GET"])
@permission_classes([IsEdgeOrAdmin])
def edge_updates(request):
    code = request.query_params.get("codigo_astronauta", "")
    astronaut = get_object_or_404(Astronaut, codigo_astronauta=code)
    qs = Research.objects.filter(
        mision_objetivo=astronaut.mision, estado="APROBADO_MISION"
    )
    return Response(
        {
            "codigo_astronauta": code,
            "protocolos": ResearchSerializer(qs, many=True).data,
            "lotes_confirmados": list(
                SyncBatch.objects.filter(astronauta=astronaut).values(
                    "id", "hash_sha256", "estado_liberacion"
                )
            ),
        }
    )


@api_view(["GET"])
@permission_classes([IsNasaAdmin])
def telemetry(request):
    mission = request.query_params.get("mission")
    astronauts = Astronaut.objects.select_related("mision").all()
    batches = SyncBatch.objects.select_related("astronauta__mision").all()
    records = Telemetry.objects.all()
    alerts = DesktopAlert.objects.select_related("astronauta").all()
    messages = OrbiMessage.objects.select_related("astronauta").all()
    if mission:
        astronauts = astronauts.filter(mision__codigo_mision=mission)
        batches = batches.filter(astronauta__mision__codigo_mision=mission)
        records = records.filter(astronauta__mision__codigo_mision=mission)
        alerts = alerts.filter(astronauta__mision__codigo_mision=mission)
        messages = messages.filter(astronauta__mision__codigo_mision=mission)
    return Response(
        {
            "missions": MissionSerializer(Mission.objects.all(), many=True).data,
            "astronauts": AstronautSerializer(astronauts, many=True).data,
            "batches": BatchSerializer(batches[:50], many=True).data,
            "records": TelemetrySerializer(
                records.order_by("-timestamp_utc")[:240][::-1], many=True
            ).data,
            "alerts": AlertSerializer(alerts[:30], many=True).data,
            "orbi": OrbiSerializer(
                messages.order_by("-timestamp_utc")[:30][::-1], many=True
            ).data,
            "counts": {
                "records": records.count(),
                "batches": batches.count(),
                "astronauts": astronauts.count(),
                "alerts": alerts.exclude(nivel_severidad="INFO").count(),
            },
        }
    )


class BatchViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [IsNasaAdmin]
    queryset = SyncBatch.objects.select_related("astronauta__mision").all()

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        batch = self.get_object()
        private = batch.registros.first()
        return Response(
            {
                "before": {
                    **(TelemetrySerializer(private).data if private else {}),
                    "nombre_completo": batch.astronauta.nombre_completo,
                    "fecha_nacimiento": batch.astronauta.fecha_nacimiento,
                    "alergias": batch.astronauta.alergias,
                },
                "after": next(iter(public_rows(batch)), {}),
                "cantidad_registros": batch.cantidad_registros,
            }
        )

    @action(detail=True, methods=["post"], url_path="liberar")
    def release_data(self, request, pk=None):
        class ReleaseSerializer(serializers.Serializer):
            titulo_dataset = serializers.CharField(max_length=200)
            descripcion = serializers.CharField()
            privacidad_revisada = serializers.BooleanField()

        data = ReleaseSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if not data.validated_data["privacidad_revisada"]:
            raise serializers.ValidationError(
                "Debes revisar la privacidad antes de publicar."
            )
        repo, created = release(
            pk,
            data.validated_data["titulo_dataset"],
            data.validated_data["descripcion"],
            request.user,
        )
        return Response(RepositorySerializer(repo).data, status=201 if created else 200)


@api_view(["GET"])
@permission_classes([IsNasaAdmin])
def pending_batches(request):
    return Response(
        BatchSerializer(
            SyncBatch.objects.select_related("astronauta__mision").exclude(
                estado_liberacion="PUBLICADO"
            ),
            many=True,
        ).data
    )


class ResearchViewSet(viewsets.ModelViewSet):
    serializer_class = ResearchSerializer
    permission_classes = [IsNasaAdmin]
    queryset = Research.objects.select_related("mision_objetivo").all()

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)


class ModerationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContributionSerializer
    permission_classes = [IsNasaAdmin]
    queryset = Contribution.objects.select_related("investigador", "repositorio").all()

    @action(detail=True, methods=["patch"], url_path="evaluar")
    def evaluate(self, request, pk=None):
        state = request.data.get("estado_moderacion")
        feedback = str(request.data.get("comentarios_nasa", "")).strip()
        if state not in ["APROBADO", "RECHAZADO"] or (
            state == "RECHAZADO" and not feedback
        ):
            raise serializers.ValidationError(
                "Selecciona un estado válido. El rechazo requiere feedback."
            )
        with transaction.atomic():
            obj = Contribution.objects.select_for_update().get(pk=self.get_object().pk)
            obj.estado_moderacion = state
            obj.comentarios_nasa = feedback
            obj.save(update_fields=["estado_moderacion", "comentarios_nasa"])
            AuditEvent.objects.create(
                actor=request.user,
                action=f"CONTRIBUTION_{state}",
                object_id=str(obj.pk),
            )
        return Response(self.get_serializer(obj).data)


@api_view(["PATCH"])
@permission_classes([IsNasaAdmin])
def toggle_portal(request):
    PortalConfig.current()
    with transaction.atomic():
        config = PortalConfig.objects.select_for_update().get(pk=1)
        serializer = PortalSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(actualizado_por=request.user)
        AuditEvent.objects.create(
            actor=request.user, action="PORTAL_UPDATED", object_id="1"
        )
    return Response(serializer.data)


class AdminCallViewSet(viewsets.ModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [IsNasaAdmin]
    queryset = Call.objects.select_related("repositorio_datos_vinculado").all()
    http_method_names = ["get", "post", "patch", "head", "options"]


class AdminApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsNasaAdmin]

    def get_queryset(self):
        qs = Application.objects.select_related("convocatoria", "postulante").all()
        for param, lookup in [
            ("trl", "nivel_trl"),
            ("budget", "presupuesto_o_honorarios__lte"),
            ("specialty", "especialidad__icontains"),
        ]:
            value = self.request.query_params.get(param)
            if value:
                if param in ["trl", "budget"]:
                    try:
                        value = float(value)
                    except ValueError:
                        raise serializers.ValidationError(
                            {param: "Usa un valor numérico."}
                        )
                qs = qs.filter(**{lookup: value})
        return qs

    @action(detail=True, methods=["patch"], url_path="evaluar")
    def evaluate(self, request, pk=None):
        serializer = EvaluationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = self.get_object()
        with transaction.atomic():
            obj = Application.objects.select_for_update().get(pk=obj.pk)
            for key, value in serializer.validated_data.items():
                setattr(obj, key, value)
            obj.save(update_fields=["estado", "evaluacion_nasa"])
            AuditEvent.objects.create(
                actor=request.user,
                action=f"APPLICATION_{obj.estado}",
                object_id=str(obj.pk),
            )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["get"])
    def document(self, request, pk=None):
        return FileResponse(
            self.get_object().documento_adjunto.open("rb"),
            as_attachment=True,
            filename="propuesta.pdf",
            content_type="application/pdf",
        )
