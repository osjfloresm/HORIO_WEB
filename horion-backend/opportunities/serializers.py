from django.utils import timezone
from rest_framework import serializers
from core.permissions import role
from core.validators import validate_pdf
from science.models import Repository
from .models import Call, Application, PortalConfig, Subscription


class PortalSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalConfig
        fields = ["portal_habilitado", "mensaje_estado", "fecha_actualizacion"]
        read_only_fields = ["fecha_actualizacion"]


class CallSerializer(serializers.ModelSerializer):
    repositorio_titulo = serializers.CharField(
        source="repositorio_datos_vinculado.titulo_dataset",
        read_only=True,
        default=None,
    )
    repositorio_datos_vinculado = serializers.PrimaryKeyRelatedField(
        queryset=Repository.objects.filter(publicado=True),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Call
        fields = "__all__"

    def validate(self, data):
        start = data.get(
            "fecha_apertura", getattr(self.instance, "fecha_apertura", None)
        )
        end = data.get("fecha_cierre", getattr(self.instance, "fecha_cierre", None))
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"fecha_cierre": "El cierre debe ser posterior a la apertura."}
            )
        return data


class ApplicationSerializer(serializers.ModelSerializer):
    convocatoria_titulo = serializers.CharField(
        source="convocatoria.titulo", read_only=True
    )
    codigo_convocatoria = serializers.CharField(
        source="convocatoria.codigo_convocatoria", read_only=True
    )
    postulante_nombre = serializers.CharField(
        source="postulante.nombre_o_razon_social", read_only=True
    )
    tipo_perfil = serializers.CharField(source="postulante.tipo_perfil", read_only=True)
    documento_adjunto = serializers.FileField(
        write_only=True, validators=[validate_pdf]
    )

    class Meta:
        model = Application
        exclude = ["postulante"]
        read_only_fields = ["estado", "evaluacion_nasa", "fecha_postulacion"]

    def validate(self, data):
        user_role = role(self.context["request"].user)
        call = data["convocatoria"]
        now = timezone.now()
        if not PortalConfig.current().portal_habilitado:
            raise serializers.ValidationError(
                "El portal de convocatorias está cerrado."
            )
        if (
            call.estado != "ABIERTA"
            or not call.fecha_apertura <= now < call.fecha_cierre
        ):
            raise serializers.ValidationError(
                "La convocatoria no está abierta para postulaciones."
            )
        category = "EMPRESAS" if user_role == "ENTERPRISE" else "PROFESIONALES"
        if call.categoria_destinatario not in [category, "AMBOS"]:
            raise serializers.ValidationError(
                "Esta convocatoria corresponde a otro tipo de perfil."
            )
        required = (
            ["nivel_trl", "categoria_solucion"]
            if user_role == "ENTERPRISE"
            else ["especialidad", "experiencia"]
        )
        errors = {
            field: "Este campo es obligatorio para tu perfil."
            for field in required
            if not data.get(field)
        }
        if errors:
            raise serializers.ValidationError(errors)
        if user_role == "PROFESSIONAL":
            data["nivel_trl"] = None
            data["categoria_solucion"] = ""
        if Application.objects.filter(
            convocatoria=call, postulante__user=self.context["request"].user
        ).exists():
            raise serializers.ValidationError(
                "Ya enviaste una postulación a esta convocatoria."
            )
        return data


class EvaluationSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Application.STATES)
    evaluacion_nasa = serializers.CharField(allow_blank=False)


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["email"]
        extra_kwargs = {"email": {"validators": []}}
