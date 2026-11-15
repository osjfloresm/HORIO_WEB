"""Transactional boundaries for Edge ingestion and public data release."""

import hashlib
import json
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound
from core.models import AuditEvent
from .models import Astronaut, SyncBatch, Telemetry, DesktopAlert, OrbiMessage
from .serializers import IngestSerializer


def payload_digest(payload):
    return hashlib.sha256(
        json.dumps(
            payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
    ).hexdigest()


@transaction.atomic
def ingest(payload, digest):
    if not isinstance(payload, dict) or payload_digest(payload) != digest:
        raise ValidationError(
            {"hash_sha256": "La suma SHA-256 no coincide con el contenido."}
        )
    serializer = IngestSerializer(data=payload)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    astronaut = (
        Astronaut.objects.select_for_update()
        .filter(codigo_astronauta=data["codigo_astronauta"])
        .first()
    )
    if not astronaut:
        raise ValidationError(
            {
                "codigo_astronauta": "Registra primero al astronauta y su misión en Django Admin."
            }
        )
    existing = SyncBatch.objects.filter(hash_sha256=digest).first()
    if existing:
        return existing, False
    if any(
        row["timestamp_utc"] < astronaut.mision.fecha_inicio
        for row in data["registros"]
    ):
        raise ValidationError(
            {"registros": "Las lecturas no pueden preceder al inicio de la misión."}
        )
    batch = SyncBatch.objects.create(
        astronauta=astronaut,
        hash_sha256=digest,
        cantidad_registros=len(data["registros"]),
    )
    Telemetry.objects.bulk_create(
        [
            Telemetry(lote=batch, astronauta=astronaut, **row)
            for row in data["registros"]
        ]
    )
    DesktopAlert.objects.bulk_create(
        [DesktopAlert(astronauta=astronaut, **row) for row in data.get("alertas", [])]
    )
    OrbiMessage.objects.bulk_create(
        [OrbiMessage(astronauta=astronaut, **row) for row in data.get("orbi", [])]
    )
    astronaut.ultima_sincronizacion = timezone.now()
    astronaut.save(update_fields=["ultima_sincronizacion"])
    AuditEvent.objects.create(action="EDGE_INGEST", object_id=str(batch.id))
    return batch, True


def public_rows(batch):
    astronaut = batch.astronauta
    start = astronaut.mision.fecha_inicio
    born = astronaut.fecha_nacimiento
    age = start.year - born.year - ((start.month, start.day) < (born.month, born.day))
    age_floor = max(age // 5 * 5, 0)
    return [
        {
            "uuid_sujeto": astronaut.uuid_anonimo,
            "dia_mision": (row.timestamp_utc.date() - start.date()).days + 1,
            "rango_edad": f"{age_floor}-{age_floor + 4}",
            "frecuencia_cardiaca": row.frecuencia_cardiaca,
            "spo2": row.spo2,
            "hrv": row.hrv,
            "horas_sueno": row.horas_sueno,
        }
        for row in batch.registros.all()
    ]


@transaction.atomic
def release(batch_id, title, description, actor):
    from science.models import Repository, AnonymizedRecord

    batch = (
        SyncBatch.objects.select_for_update()
        .select_related("astronauta__mision")
        .filter(pk=batch_id)
        .first()
    )
    if not batch:
        raise NotFound()
    existing = Repository.objects.filter(lote_origen=batch).first()
    if existing:
        return existing, False
    rows = public_rows(batch)
    repository = Repository.objects.create(
        lote_origen=batch,
        titulo_dataset=title,
        descripcion=description,
        codigo_mision=batch.astronauta.mision.codigo_mision,
        total_registros=len(rows),
        publicado=True,
    )
    AnonymizedRecord.objects.bulk_create(
        [AnonymizedRecord(repositorio=repository, **row) for row in rows]
    )
    batch.estado_liberacion = "PUBLICADO"
    batch.save(update_fields=["estado_liberacion"])
    AuditEvent.objects.create(
        actor=actor, action="RELEASE_DATASET", object_id=str(repository.id)
    )
    return repository, True
