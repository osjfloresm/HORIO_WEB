import csv
import io
from django.db.models import Q
from django.http import HttpResponse, FileResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.permissions import IsResearcherOrReadOnly, role
from .models import Repository, Contribution
from .serializers import RepositorySerializer, RecordSerializer, ContributionSerializer


class RepositoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RepositorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Repository.objects.filter(publicado=True)
        params = self.request.query_params
        if params.get("mission"):
            qs = qs.filter(codigo_mision=params["mission"])
        if params.get("age"):
            qs = qs.filter(registros__rango_edad=params["age"])
        if params.get("q"):
            qs = qs.filter(
                Q(titulo_dataset__icontains=params["q"])
                | Q(descripcion__icontains=params["q"])
            )
        if params.get("duration"):
            try:
                qs = qs.filter(registros__dia_mision__gte=int(params["duration"]))
            except ValueError:
                raise ValidationError({"duration": "Usa un número entero de días."})
        return qs.distinct()

    @action(detail=True, methods=["get"])
    def records(self, request, pk=None):
        return Response(
            RecordSerializer(self.get_object().registros.all()[:1000], many=True).data
        )

    @action(detail=True, methods=["get"], url_path="export")
    def export(self, request, pk=None):
        repository = self.get_object()
        rows = RecordSerializer(repository.registros.all(), many=True).data
        format_name = request.query_params.get("format", "csv")
        if format_name == "json":
            from rest_framework.renderers import JSONRenderer

            content = JSONRenderer().render(rows)
            content_type = "application/json"
        elif format_name == "csv":
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=RecordSerializer.Meta.fields)
            writer.writeheader()
            writer.writerows(rows)
            content = output.getvalue()
            content_type = "text/csv; charset=utf-8"
        else:
            raise ValidationError({"format": "Elige csv o json."})
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = (
            f'attachment; filename="horion-{repository.id}.{format_name}"'
        )
        return response


class ContributionViewSet(viewsets.ModelViewSet):
    serializer_class = ContributionSerializer
    permission_classes = [IsResearcherOrReadOnly]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = Contribution.objects.select_related("investigador", "repositorio").filter(
            repositorio__publicado=True
        )
        if role(self.request.user) == "NASA_ADMIN":
            return qs
        if self.request.user.is_authenticated:
            return qs.filter(
                Q(estado_moderacion="APROBADO") | Q(investigador=self.request.user)
            )
        return qs.filter(estado_moderacion="APROBADO")

    def perform_create(self, serializer):
        serializer.save(investigador=self.request.user)

    @action(detail=True, methods=["get"])
    def document(self, request, pk=None):
        contribution = self.get_object()
        if not contribution.archivo:
            raise NotFound("No hay archivo adjunto.")
        return FileResponse(
            contribution.archivo.open("rb"),
            as_attachment=True,
            filename="aportacion.pdf",
            content_type="application/pdf",
        )
