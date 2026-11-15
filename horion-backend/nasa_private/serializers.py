from rest_framework import serializers
from django.utils import timezone
from rest_framework.validators import UniqueValidator
from .models import (
    Mission,
    Astronaut,
    SyncBatch,
    Telemetry,
    DesktopAlert,
    OrbiMessage,
    Research,
)


class MissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = "__all__"


class TelemetrySerializer(serializers.ModelSerializer):
    frecuencia_cardiaca = serializers.IntegerField(min_value=0, max_value=300)
    spo2 = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100
    )
    hrv = serializers.DecimalField(max_digits=7, decimal_places=2, min_value=0)
    temperatura_corporal = serializers.DecimalField(
        max_digits=4, decimal_places=2, min_value=20, max_value=50
    )
    # Edge solo la conoce después del primer registro de bienestar.
    horas_sueno = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        min_value=0,
        max_value=24,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Telemetry
        fields = [
            "timestamp_utc",
            "frecuencia_cardiaca",
            "spo2",
            "hrv",
            "temperatura_corporal",
            "horas_sueno",
        ]


class AlertSerializer(serializers.ModelSerializer):
    astronauta_nombre = serializers.CharField(
        source="astronauta.nombre_completo", read_only=True
    )

    class Meta:
        model = DesktopAlert
        exclude = ["astronauta"]


class OrbiSerializer(serializers.ModelSerializer):
    astronauta_nombre = serializers.CharField(
        source="astronauta.nombre_completo", read_only=True
    )

    class Meta:
        model = OrbiMessage
        exclude = ["astronauta"]


class IngestSerializer(serializers.Serializer):
    codigo_astronauta = serializers.CharField()
    registros = TelemetrySerializer(many=True, allow_empty=False, max_length=10000)
    alertas = AlertSerializer(many=True, required=False, max_length=1000)
    orbi = OrbiSerializer(many=True, required=False, max_length=1000)


class BatchSerializer(serializers.ModelSerializer):
    astronauta_nombre = serializers.CharField(source="astronauta.nombre_completo")
    codigo_astronauta = serializers.CharField(source="astronauta.codigo_astronauta")
    codigo_mision = serializers.CharField(source="astronauta.mision.codigo_mision")

    class Meta:
        model = SyncBatch
        fields = "__all__"


class AstronautSerializer(serializers.ModelSerializer):
    codigo_mision = serializers.CharField(source="mision.codigo_mision")
    ultima_lectura = serializers.SerializerMethodField()

    def get_ultima_lectura(self, obj):
        record = obj.telemetry_set.order_by("-timestamp_utc").first()
        return TelemetrySerializer(record).data if record else None

    class Meta:
        model = Astronaut
        fields = [
            "id",
            "codigo_astronauta",
            "nombre_completo",
            "codigo_mision",
            "ultima_sincronizacion",
            "ultima_lectura",
        ]


class AstronautManagementSerializer(serializers.ModelSerializer):
    codigo_astronauta = serializers.CharField(
        max_length=50,
        validators=[
            UniqueValidator(
                queryset=Astronaut.objects.all(),
                message="Este código ya tiene un perfil. Busca ese astronauta y edítalo.",
            )
        ],
    )
    codigo_mision = serializers.CharField(source="mision.codigo_mision", read_only=True)
    vinculo_confirmado = serializers.SerializerMethodField()

    def get_vinculo_confirmado(self, obj):
        return obj.ultima_sincronizacion is not None

    def validate_fecha_nacimiento(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError(
                "La fecha de nacimiento no puede ser futura."
            )
        return value

    def validate(self, data):
        # Ingestion locks the same astronaut while attaching a batch. Once data
        # has arrived, changing this association would move existing history.
        if self.instance and self.instance.ultima_sincronizacion:
            errors = {}
            for field in ("codigo_astronauta", "mision"):
                if field in data and data[field] != getattr(self.instance, field):
                    errors[field] = (
                        "Este vínculo ya recibió datos. Conserva el código y la misión "
                        "para mantener su historial."
                    )
            if errors:
                raise serializers.ValidationError(errors)
        return data

    class Meta:
        model = Astronaut
        fields = [
            "id",
            "codigo_astronauta",
            "nombre_completo",
            "mision",
            "codigo_mision",
            "fecha_nacimiento",
            "grupo_sanguineo",
            "alergias",
            "ultima_sincronizacion",
            "vinculo_confirmado",
        ]
        read_only_fields = ["ultima_sincronizacion"]


class ResearchSerializer(serializers.ModelSerializer):
    codigo_mision = serializers.CharField(
        source="mision_objetivo.codigo_mision", read_only=True
    )

    class Meta:
        model = Research
        fields = "__all__"
        read_only_fields = ["creado_por", "actualizado"]
