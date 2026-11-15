from rest_framework import serializers
from core.validators import validate_pdf
from .models import Repository, AnonymizedRecord, Contribution


class RecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnonymizedRecord
        fields = [
            "uuid_sujeto",
            "dia_mision",
            "rango_edad",
            "frecuencia_cardiaca",
            "spo2",
            "hrv",
            "horas_sueno",
        ]


class RepositorySerializer(serializers.ModelSerializer):
    rangos_edad = serializers.SerializerMethodField()
    duracion_dias = serializers.SerializerMethodField()

    def get_rangos_edad(self, obj):
        return list(
            obj.registros.order_by("rango_edad")
            .values_list("rango_edad", flat=True)
            .distinct()
        )

    def get_duracion_dias(self, obj):
        from django.db.models import Max

        return obj.registros.aggregate(days=Max("dia_mision"))["days"] or 0

    class Meta:
        model = Repository
        # Never expose the private source batch ID.
        fields = [
            "id",
            "titulo_dataset",
            "descripcion",
            "codigo_mision",
            "total_registros",
            "fecha_liberacion",
            "rangos_edad",
            "duracion_dias",
        ]


class ContributionSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source="investigador.first_name", read_only=True)
    repositorio_titulo = serializers.CharField(
        source="repositorio.titulo_dataset", read_only=True
    )
    tiene_archivo = serializers.SerializerMethodField()
    archivo = serializers.FileField(
        write_only=True, required=False, validators=[validate_pdf]
    )
    repositorio = serializers.PrimaryKeyRelatedField(
        queryset=Repository.objects.filter(publicado=True)
    )

    def get_tiene_archivo(self, obj):
        return bool(obj.archivo)

    class Meta:
        model = Contribution
        fields = [
            "id",
            "repositorio",
            "repositorio_titulo",
            "autor",
            "titulo",
            "resumen_metodologia",
            "doi_o_enlace",
            "archivo",
            "tiene_archivo",
            "estado_moderacion",
            "comentarios_nasa",
            "fecha_envio",
        ]
        read_only_fields = ["estado_moderacion", "comentarios_nasa", "fecha_envio"]

    def validate(self, data):
        if not data.get("archivo") and not data.get("doi_o_enlace"):
            raise serializers.ValidationError(
                {"archivo": "Adjunta un PDF o incluye un DOI/enlace."}
            )
        return data
