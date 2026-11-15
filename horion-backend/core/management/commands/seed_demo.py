"""Idempotent synthetic fixtures. Explicitly disabled outside development/demo mode."""

import math
from datetime import timedelta, date
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from accounts.models import Profile
from nasa_private.models import Mission, Astronaut, Research
from nasa_private.services import ingest, payload_digest, release
from science.models import Contribution, Repository
from opportunities.models import PortalConfig, Call, ApplicantProfile, Application


class Command(BaseCommand):
    help = "Crea datos sintéticos y cuatro usuarios de prueba; no reemplaza datos existentes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            required=True,
            help="Contraseña de las cuentas nuevas de demostración.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG or not settings.DEMO_MODE:
            raise CommandError("seed_demo requiere DEBUG=true y DEMO_MODE=true.")
        users = {}
        for username, name, role in [
            ("admin", "Elena Morales", "NASA_ADMIN"),
            ("researcher", "Sofía Andrade", "RESEARCHER"),
            ("professional", "Daniel Vega", "PROFESSIONAL"),
            ("enterprise", "Orbital Systems", "ENTERPRISE"),
        ]:
            email = f"{username}@horion.demo"
            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    "email": email,
                    "first_name": name,
                    "is_staff": role == "NASA_ADMIN",
                    "is_superuser": role == "NASA_ADMIN",
                },
            )
            if created:
                user.set_password(options["password"])
                user.save()
            Profile.objects.get_or_create(
                user=user,
                defaults={
                    "role": role,
                    "institution": "Instituto de Medicina Espacial",
                    "identifier": f"DEMO-{username.upper()}",
                    "specialty": "Medicina aeroespacial",
                    "sector": "Hardware",
                    "country": "Ecuador",
                },
            )
            users[role] = user
        now = timezone.now().replace(microsecond=0)
        admin = users["NASA_ADMIN"]
        missions = []
        for index, code in enumerate(["EXP-72", "ARTEMIS-IV", "AXIOM-04"]):
            mission, _ = Mission.objects.get_or_create(
                codigo_mision=code,
                defaults={
                    "nombre": [
                        "Expedición orbital 72",
                        "Exploración lunar Artemis",
                        "Investigación en microgravedad",
                    ][index],
                    "fecha_inicio": now - timedelta(days=90 + index * 30),
                },
            )
            missions.append(mission)
        for index, name in enumerate(
            ["Alex Morgan", "Sam Rivera", "Jordan Lee", "Taylor Chen"]
        ):
            mission = missions[index % 3]
            astronaut, _ = Astronaut.objects.get_or_create(
                codigo_astronauta=f"HRN-00{index + 1}",
                defaults={
                    "mision": mission,
                    "nombre_completo": f"{name} (simulado)",
                    "fecha_nacimiento": date(1987 + index, 3, 12),
                    "grupo_sanguineo": "O+",
                    "alergias": "Sin alergias registradas (dato sintético)",
                },
            )
            if astronaut.syncbatch_set.exists():
                continue
            for batch_number in range(2):
                rows = []
                for day in range(30):
                    rows.append(
                        {
                            "timestamp_utc": (
                                mission.fecha_inicio
                                + timedelta(days=batch_number * 30 + day, hours=10)
                            ).isoformat(),
                            "frecuencia_cardiaca": round(
                                67 + index * 3 + math.sin(day / 3) * 7
                            ),
                            "spo2": round(97.5 + math.sin(day / 5), 2),
                            "hrv": round(48 + math.cos(day / 4) * 12 + index * 2, 2),
                            "temperatura_corporal": 36.6,
                            "horas_sueno": round(6.8 + math.cos(day / 4) * 1.1, 2),
                        }
                    )
                payload = {
                    "codigo_astronauta": astronaut.codigo_astronauta,
                    "registros": rows,
                    "alertas": [
                        {
                            "timestamp_utc": rows[-1]["timestamp_utc"],
                            "nivel_severidad": "WARNING" if index == 1 else "INFO",
                            "metrica_afectada": "horas_sueno",
                            "valor_detectado": rows[-1]["horas_sueno"],
                            "recomendacion_entregada": "Registro sintético: revisar la evolución del descanso con el equipo médico.",
                            "modo_generacion": "OFFLINE_ALGO",
                        }
                    ],
                    "orbi": [
                        {
                            "timestamp_utc": rows[-1]["timestamp_utc"],
                            "rol": "orbi",
                            "mensaje": "Transcripción de demostración: la sesión de monitoreo ha finalizado. Los datos están listos para revisión del equipo médico.",
                            "contexto_biometrico_json": {},
                        }
                    ],
                }
                batch, _ = ingest(payload, payload_digest(payload))
                if batch_number == 0:
                    release(
                        batch.pk,
                        [
                            "Adaptación cardiovascular en microgravedad",
                            "Variabilidad cardíaca y descanso lunar",
                            "Biomarcadores de larga duración",
                            "Patrones de sueño en órbita",
                        ][index],
                        "Dataset sintético para explorar tendencias de frecuencia cardíaca, saturación de oxígeno, HRV y descanso. No corresponde a pacientes ni misiones reales.",
                        admin,
                    )
        repos = list(Repository.objects.all())
        for i, title in enumerate(
            [
                "Variabilidad cardíaca y adaptación al entorno orbital",
                "Modelo predictivo de calidad del descanso",
                "Análisis longitudinal de saturación de oxígeno",
            ]
        ):
            Contribution.objects.get_or_create(
                titulo=title,
                defaults={
                    "repositorio": repos[i % len(repos)],
                    "investigador": users["RESEARCHER"],
                    "resumen_metodologia": "Estudio de demostración con datos sintéticos. Se comparan las series temporales de HRV y descanso para explorar asociaciones, sin establecer causalidad ni recomendaciones clínicas.",
                    "doi_o_enlace": "https://example.org/horion-demo",
                    "estado_moderacion": "PENDIENTE" if i == 2 else "APROBADO",
                },
            )
        Research.objects.get_or_create(
            titulo_terapia="Adaptación circadiana en misiones prolongadas",
            defaults={
                "objetivo_clinico": "Estudiar la asociación entre descanso y variabilidad cardíaca en datos sintéticos.",
                "mision_objetivo": missions[0],
                "hallazgos_biometricos": "Análisis exploratorio pendiente de validación clínica.",
                "creado_por": admin,
            },
        )
        for i, (title, category, kind) in enumerate(
            [
                ("Biosensor de SpO₂ de bajo consumo", "EMPRESAS", "HARDWARE_SENSORES"),
                (
                    "Especialista en medicina aeroespacial",
                    "PROFESIONALES",
                    "MISION_TRIPULADA",
                ),
                ("Plataforma de análisis biométrico", "EMPRESAS", "SOFTWARE_ESPACIAL"),
                (
                    "Protocolo de recuperación circadiana",
                    "PROFESIONALES",
                    "TERAPIA_MEDICA",
                ),
            ]
        ):
            call, _ = Call.objects.get_or_create(
                codigo_convocatoria=f"HRN-CALL-2026-0{i + 1}",
                defaults={
                    "titulo": title,
                    "categoria_destinatario": category,
                    "tipo_necesidad": kind,
                    "descripcion_detallada": "Convocatoria de demostración. Buscamos propuestas basadas en evidencia para mejorar el monitoreo y bienestar de las tripulaciones en misiones prolongadas.",
                    "requisitos_tecnicos": "Presentar metodología, plan de validación, cronograma y presupuesto. Consultar el dataset de referencia. Todos los datos de esta convocatoria son sintéticos.",
                    "repositorio_datos_vinculado": repos[i % len(repos)],
                    "presupuesto_estimado": [150000, 85000, 120000, 60000][i],
                    "fecha_apertura": now - timedelta(days=7),
                    "fecha_cierre": now + timedelta(days=30 + i * 10),
                    "estado": "ABIERTA",
                },
            )
            if i < 2:
                user = users["ENTERPRISE" if category == "EMPRESAS" else "PROFESSIONAL"]
                applicant, _ = ApplicantProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "tipo_perfil": "EMPRESA" if i == 0 else "PROFESIONAL",
                        "nombre_o_razon_social": user.first_name,
                        "identificador_legal_o_orcid": "DEMO-123",
                        "areas_especialidad": ["Medicina aeroespacial"],
                    },
                )
                application, created = Application.objects.get_or_create(
                    convocatoria=call,
                    postulante=applicant,
                    defaults={
                        "titulo_propuesta": "Propuesta de demostración",
                        "propuesta_tecnica_o_clinica": "Plan sintético de validación y seguimiento para esta convocatoria.",
                        "especialidad": "Medicina aeroespacial",
                        "experiencia": "Cinco años de experiencia simulada.",
                        "categoria_solucion": "HARDWARE" if i == 0 else "",
                        "nivel_trl": 6 if i == 0 else None,
                        "presupuesto_o_honorarios": 65000,
                        "estado": "EN_REVISION",
                        "evaluacion_nasa": "Documentación recibida. En revisión técnica.",
                    },
                )
                if created:
                    application.documento_adjunto.save(
                        "demo.pdf",
                        ContentFile(b"%PDF-1.4\n% Synthetic demo document\n%%EOF"),
                    )
        # A new demo installation starts open; reruns preserve the operator's switch.
        PortalConfig.objects.get_or_create(
            pk=1, defaults={"portal_habilitado": True, "actualizado_por": admin}
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Datos sintéticos listos. Cuentas: admin, researcher, professional y enterprise @horion.demo."
            )
        )
