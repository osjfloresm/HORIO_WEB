import uuid
from django.conf import settings
from django.db import models
from core.db import table


class Mission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_mision = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=200)
    fecha_inicio = models.DateTimeField()
    estado = models.CharField(
        max_length=20,
        choices=[(x, x) for x in ["ACTIVA", "PLANIFICADA", "FINALIZADA"]],
        default="ACTIVA",
    )

    class Meta:
        db_table = table("nasa_private", "misiones")

    def __str__(self):
        return self.codigo_mision


class Astronaut(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_astronauta = models.CharField(max_length=50, unique=True)
    uuid_anonimo = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    mision = models.ForeignKey(Mission, on_delete=models.PROTECT)
    nombre_completo = models.CharField(max_length=200)
    fecha_nacimiento = models.DateField()
    grupo_sanguineo = models.CharField(max_length=10, blank=True)
    alergias = models.TextField(blank=True)
    ultima_sincronizacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = table("nasa_private", "astronautas")

    def __str__(self):
        return self.nombre_completo


class SyncBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronauta = models.ForeignKey(Astronaut, on_delete=models.PROTECT)
    hash_sha256 = models.CharField(max_length=64, unique=True)
    cantidad_registros = models.PositiveIntegerField()
    fecha_recepcion = models.DateTimeField(auto_now_add=True)
    estado_liberacion = models.CharField(
        max_length=20,
        choices=[(x, x) for x in ["RECIBIDO", "ANONIMIZADO", "PUBLICADO"]],
        default="RECIBIDO",
    )

    class Meta:
        db_table = table("nasa_private", "lotes_sincronizacion")
        ordering = ["-fecha_recepcion"]


class Telemetry(models.Model):
    lote = models.ForeignKey(
        SyncBatch, on_delete=models.CASCADE, related_name="registros"
    )
    astronauta = models.ForeignKey(Astronaut, on_delete=models.PROTECT)
    timestamp_utc = models.DateTimeField()
    frecuencia_cardiaca = models.PositiveIntegerField()
    spo2 = models.DecimalField(max_digits=5, decimal_places=2)
    hrv = models.DecimalField(max_digits=7, decimal_places=2)
    temperatura_corporal = models.DecimalField(max_digits=4, decimal_places=2)
    horas_sueno = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )

    class Meta:
        db_table = table("nasa_private", "telemetria_cruda")
        ordering = ["timestamp_utc"]
        indexes = [models.Index(fields=["astronauta", "timestamp_utc"])]


class DesktopAlert(models.Model):
    astronauta = models.ForeignKey(Astronaut, on_delete=models.PROTECT)
    timestamp_utc = models.DateTimeField()
    nivel_severidad = models.CharField(
        max_length=10, choices=[(x, x) for x in ["INFO", "WARNING", "CRITICAL"]]
    )
    metrica_afectada = models.CharField(max_length=100)
    valor_detectado = models.DecimalField(max_digits=10, decimal_places=2)
    recomendacion_entregada = models.TextField()
    modo_generacion = models.CharField(
        max_length=20, choices=[(x, x) for x in ["OFFLINE_ALGO", "ONLINE_GEMINI"]]
    )

    class Meta:
        db_table = table("nasa_private", "alertas_y_asistencia_desktop")
        ordering = ["-timestamp_utc"]


class OrbiMessage(models.Model):
    astronauta = models.ForeignKey(Astronaut, on_delete=models.PROTECT)
    timestamp_utc = models.DateTimeField()
    rol = models.CharField(max_length=10, choices=[("user", "user"), ("orbi", "orbi")])
    mensaje = models.TextField()
    contexto_biometrico_json = models.JSONField(default=dict)

    class Meta:
        db_table = table("nasa_private", "historial_orbi_gemini")
        ordering = ["timestamp_utc"]


class Research(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo_terapia = models.CharField(max_length=200)
    objetivo_clinico = models.TextField()
    mision_objetivo = models.ForeignKey(Mission, on_delete=models.PROTECT)
    hallazgos_biometricos = models.TextField(blank=True)
    estado = models.CharField(
        max_length=30,
        choices=[
            (x, x) for x in ["EN_ANALISIS", "PROTOCOLO_DISENADO", "APROBADO_MISION"]
        ],
        default="EN_ANALISIS",
    )
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = table("nasa_private", "investigaciones_internas_nasa")
        ordering = ["-actualizado"]
