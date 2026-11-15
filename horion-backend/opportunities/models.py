import uuid
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from core.db import table


class PortalConfig(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    portal_habilitado = models.BooleanField(default=False)
    mensaje_estado = models.TextField(
        default="Actualmente no hay ventanas de convocatoria abiertas. Suscríbete para recibir novedades."
    )
    actualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = table("nasa_opportunities", "configuracion_portal_convocatorias")

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def current(cls):
        return cls.objects.get_or_create(pk=1)[0]


class Call(models.Model):
    CATEGORIES = [(x, x) for x in ["PROFESIONALES", "EMPRESAS", "AMBOS"]]
    TYPES = [
        (x, x)
        for x in [
            "MISION_TRIPULADA",
            "TERAPIA_MEDICA",
            "CAMPANA_SALUD",
            "HARDWARE_SENSORES",
            "SOFTWARE_ESPACIAL",
            "FARMACEUTICA",
        ]
    ]
    STATES = [
        (x, x)
        for x in ["BORRADOR", "ABIERTA", "EN_EVALUACION", "CERRADA", "ADJUDICADA"]
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_convocatoria = models.CharField(max_length=60, unique=True)
    titulo = models.CharField(max_length=200)
    categoria_destinatario = models.CharField(max_length=20, choices=CATEGORIES)
    tipo_necesidad = models.CharField(max_length=30, choices=TYPES)
    descripcion_detallada = models.TextField()
    requisitos_tecnicos = models.TextField()
    repositorio_datos_vinculado = models.ForeignKey(
        "science.Repository", on_delete=models.PROTECT, null=True, blank=True
    )
    presupuesto_estimado = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(0)]
    )
    fecha_apertura = models.DateTimeField()
    fecha_cierre = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=STATES, default="BORRADOR")

    class Meta:
        db_table = table("nasa_opportunities", "convocatorias")
        ordering = ["fecha_cierre"]

    def __str__(self):
        return self.titulo


class ApplicantProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tipo_perfil = models.CharField(
        max_length=20, choices=[("PROFESIONAL", "Profesional"), ("EMPRESA", "Empresa")]
    )
    nombre_o_razon_social = models.CharField(max_length=200)
    identificador_legal_o_orcid = models.CharField(max_length=100)
    pais = models.CharField(max_length=100, blank=True)
    areas_especialidad = models.JSONField(default=list)
    sitio_web_o_portafolio = models.URLField(blank=True)
    verificado = models.BooleanField(default=False)

    class Meta:
        db_table = table("nasa_opportunities", "perfiles_postulantes")


class Application(models.Model):
    STATES = [
        (x, x)
        for x in [
            "RECIBIDA",
            "EN_REVISION",
            "FINALISTA",
            "SELECCIONADA",
            "NO_SELECCIONADA",
        ]
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    convocatoria = models.ForeignKey(Call, on_delete=models.PROTECT)
    postulante = models.ForeignKey(ApplicantProfile, on_delete=models.PROTECT)
    titulo_propuesta = models.CharField(max_length=200)
    propuesta_tecnica_o_clinica = models.TextField()
    especialidad = models.CharField(max_length=200, blank=True)
    experiencia = models.TextField(blank=True)
    categoria_solucion = models.CharField(
        max_length=30,
        blank=True,
        choices=[(x, x) for x in ["HARDWARE", "SOFTWARE", "FARMACEUTICA"]],
    )
    nivel_trl = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(9)]
    )
    presupuesto_o_honorarios = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(0)]
    )
    documento_adjunto = models.FileField(upload_to="applications/%Y/%m/")
    estado = models.CharField(max_length=20, choices=STATES, default="RECIBIDA")
    evaluacion_nasa = models.TextField(blank=True)
    fecha_postulacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = table("nasa_opportunities", "postulaciones")
        ordering = ["-fecha_postulacion"]
        constraints = [
            models.UniqueConstraint(
                fields=["convocatoria", "postulante"], name="one_application_per_call"
            )
        ]


class Subscription(models.Model):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = table("nasa_opportunities", "suscripciones")
