import uuid
from django.conf import settings
from django.db import models
from core.db import table


class Repository(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lote_origen = models.OneToOneField(
        "nasa_private.SyncBatch", on_delete=models.PROTECT
    )
    titulo_dataset = models.CharField(max_length=200)
    descripcion = models.TextField()
    codigo_mision = models.CharField(max_length=50)
    total_registros = models.PositiveIntegerField()
    fecha_liberacion = models.DateTimeField(auto_now_add=True)
    publicado = models.BooleanField(default=False)

    class Meta:
        db_table = table("open_science", "repositorios_datasets")
        ordering = ["-fecha_liberacion"]

    def __str__(self):
        return self.titulo_dataset


class AnonymizedRecord(models.Model):
    repositorio = models.ForeignKey(
        Repository, on_delete=models.CASCADE, related_name="registros"
    )
    uuid_sujeto = models.UUIDField()  # Deliberately no FK to private subjects.
    dia_mision = models.PositiveIntegerField()
    rango_edad = models.CharField(max_length=20)
    frecuencia_cardiaca = models.PositiveIntegerField()
    spo2 = models.DecimalField(max_digits=5, decimal_places=2)
    hrv = models.DecimalField(max_digits=7, decimal_places=2)
    horas_sueno = models.DecimalField(max_digits=4, decimal_places=2)

    class Meta:
        db_table = table("open_science", "registros_anonimizados")
        ordering = ["dia_mision", "id"]


class Contribution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repositorio = models.ForeignKey(Repository, on_delete=models.PROTECT)
    investigador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    titulo = models.CharField(max_length=200)
    resumen_metodologia = models.TextField()
    doi_o_enlace = models.URLField(blank=True)
    archivo = models.FileField(upload_to="papers/%Y/%m/", blank=True)
    estado_moderacion = models.CharField(
        max_length=20,
        choices=[(x, x) for x in ["PENDIENTE", "APROBADO", "RECHAZADO"]],
        default="PENDIENTE",
    )
    comentarios_nasa = models.TextField(blank=True)
    fecha_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = table("open_science", "aportaciones_cientificas")
        ordering = ["-fecha_envio"]
