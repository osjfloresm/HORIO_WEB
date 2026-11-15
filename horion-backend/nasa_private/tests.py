from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Profile
from core.models import AuditEvent
from .models import Astronaut, DesktopAlert, Mission, OrbiMessage, Telemetry
from .services import payload_digest


class AstronautManagementTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(username="crew-admin")
        Profile.objects.create(user=cls.admin, role="NASA_ADMIN")
        cls.other_users = []
        for role in ("RESEARCHER", "PROFESSIONAL", "ENTERPRISE"):
            user = User.objects.create_user(username=role.lower())
            Profile.objects.create(user=user, role=role)
            cls.other_users.append(user)
        cls.mission = Mission.objects.create(
            codigo_mision="CREW-1",
            nombre="Misión de prueba",
            fecha_inicio=timezone.now() - timedelta(days=30),
        )
        cls.other_mission = Mission.objects.create(
            codigo_mision="CREW-2",
            nombre="Segunda misión",
            fecha_inicio=timezone.now() - timedelta(days=30),
        )
        cls.astronaut = Astronaut.objects.create(
            codigo_astronauta="AST-001",
            nombre_completo="Tripulante existente",
            fecha_nacimiento=date(1990, 1, 2),
            mision=cls.mission,
        )

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def profile(self, **changes):
        return {
            "codigo_astronauta": "AST-002",
            "nombre_completo": "Nueva tripulante",
            "mision": str(self.mission.pk),
            "fecha_nacimiento": "1992-04-12",
            "grupo_sanguineo": "O+",
            "alergias": "Ninguna registrada",
            **changes,
        }

    def payload(self, code):
        now = timezone.now().isoformat()
        return {
            "codigo_astronauta": code,
            "registros": [
                {
                    "timestamp_utc": now,
                    "frecuencia_cardiaca": 70,
                    "spo2": "98.00",
                    "hrv": "45.00",
                    "temperatura_corporal": "36.70",
                    "horas_sueno": None,
                }
            ],
            "alertas": [
                {
                    "timestamp_utc": now,
                    "nivel_severidad": "WARNING",
                    "metrica_afectada": "hrv",
                    "valor_detectado": "35.00",
                    "recomendacion_entregada": "Alerta de prueba",
                    "modo_generacion": "OFFLINE_ALGO",
                }
            ],
            "orbi": [
                {
                    "timestamp_utc": now,
                    "rol": "user",
                    "mensaje": "Mensaje de prueba",
                    "contexto_biometrico_json": {},
                }
            ],
        }

    def send(self, payload):
        return self.client.post(
            "/api/v1/sync/ingest/",
            {"payload": payload, "hash_sha256": payload_digest(payload)},
            format="json",
            HTTP_X_EDGE_KEY="test-crew-edge-key",
        )

    @override_settings(EDGE_API_KEY="test-crew-edge-key")
    def test_only_admin_can_manage_or_read_profiles_and_missions(self):
        url = f"/api/v1/nasa/astronautas/{self.astronaut.pk}/"
        for user in (None, *self.other_users):
            with self.subTest(user=user):
                self.client.force_authenticate(user)
                for path in (
                    "/api/v1/nasa/astronautas/",
                    "/api/v1/nasa/misiones/",
                    url,
                ):
                    self.assertIn(self.client.get(path).status_code, (401, 403))
                self.assertIn(
                    self.client.post(
                        "/api/v1/nasa/astronautas/", self.profile(), format="json"
                    ).status_code,
                    (401, 403),
                )
                self.assertIn(
                    self.client.patch(url, {"nombre_completo": "Otro"}).status_code,
                    (401, 403),
                )
        self.client.force_authenticate(None)
        self.assertIn(
            self.client.get(
                "/api/v1/nasa/astronautas/", HTTP_X_EDGE_KEY="test-crew-edge-key"
            ).status_code,
            (401, 403),
        )
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/v1/nasa/misiones/").status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 405)
        self.astronaut.refresh_from_db()
        self.assertEqual(self.astronaut.nombre_completo, "Tripulante existente")

    @override_settings(EDGE_API_KEY="test-crew-edge-key")
    def test_creating_profile_links_subsequent_edge_data_without_creating_account(self):
        payload = self.payload("AST-002")
        self.client.force_authenticate(None)
        self.assertEqual(self.send(payload).status_code, 400)
        self.client.force_authenticate(self.admin)
        users_before = User.objects.count()
        response = self.client.post(
            "/api/v1/nasa/astronautas/", self.profile(), format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data["vinculo_confirmado"])
        self.assertIsNone(response.data["ultima_sincronizacion"])
        self.assertEqual(User.objects.count(), users_before)
        created_id = response.data["id"]
        self.client.force_authenticate(None)
        self.assertEqual(self.send(payload).status_code, 201)
        self.assertEqual(self.send(payload).status_code, 200)
        for model in (Telemetry, DesktopAlert, OrbiMessage):
            self.assertEqual(model.objects.filter(astronauta_id=created_id).count(), 1)
            self.assertFalse(model.objects.filter(astronauta=self.astronaut).exists())
        self.client.force_authenticate(self.admin)
        detail = self.client.get(f"/api/v1/nasa/astronautas/{created_id}/").data
        self.assertTrue(detail["vinculo_confirmado"])
        self.assertIsNotNone(detail["ultima_sincronizacion"])
        dashboard = self.client.get("/api/v1/nasa/telemetry/").data
        linked = next(
            a for a in dashboard["astronauts"] if str(a["id"]) == str(created_id)
        )
        self.assertEqual(linked["ultima_lectura"]["frecuencia_cardiaca"], 70)

    def test_unlinked_code_and_mission_can_be_corrected(self):
        response = self.client.patch(
            f"/api/v1/nasa/astronautas/{self.astronaut.pk}/",
            {"codigo_astronauta": "AST-REVISED", "mision": str(self.other_mission.pk)},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.astronaut.refresh_from_db()
        self.assertEqual(self.astronaut.codigo_astronauta, "AST-REVISED")
        self.assertEqual(self.astronaut.mision, self.other_mission)

    def test_linked_history_stays_with_same_code_and_mission_when_editing(self):
        self.assertEqual(self.send(self.payload("AST-001")).status_code, 201)
        url = f"/api/v1/nasa/astronautas/{self.astronaut.pk}/"
        response = self.client.patch(
            url,
            {"nombre_completo": "Nombre corregido", "alergias": "Dato actualizado"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        for field, value in (
            ("codigo_astronauta", "AST-NEW"),
            ("mision", str(self.other_mission.pk)),
        ):
            response = self.client.patch(url, {field: value}, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn(field, response.data)
        self.astronaut.refresh_from_db()
        self.assertEqual(self.astronaut.codigo_astronauta, "AST-001")
        self.assertEqual(self.astronaut.mision, self.mission)
        self.assertEqual(self.astronaut.nombre_completo, "Nombre corregido")
        self.assertEqual(self.astronaut.telemetry_set.count(), 1)

    def test_duplicate_code_and_invalid_demographics_do_not_create_profiles(self):
        for field, value in (
            ("codigo_astronauta", "AST-001"),
            ("codigo_astronauta", "  "),
            ("nombre_completo", "  "),
            (
                "fecha_nacimiento",
                (timezone.localdate() + timedelta(days=1)).isoformat(),
            ),
            ("mision", "00000000-0000-0000-0000-000000000000"),
        ):
            with self.subTest(field=field, value=value):
                response = self.client.post(
                    "/api/v1/nasa/astronautas/",
                    self.profile(**{field: value}),
                    format="json",
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)
        self.assertEqual(Astronaut.objects.count(), 1)

    def test_sync_status_is_server_owned_and_profile_changes_are_audited(self):
        response = self.client.post(
            "/api/v1/nasa/astronautas/",
            self.profile(
                ultima_sincronizacion=timezone.now().isoformat(),
                vinculo_confirmado=True,
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data["vinculo_confirmado"])
        self.assertIsNone(response.data["ultima_sincronizacion"])
        created_id = response.data["id"]
        self.assertEqual(
            self.client.patch(
                f"/api/v1/nasa/astronautas/{created_id}/", {"grupo_sanguineo": "A+"}
            ).status_code,
            200,
        )
        self.assertEqual(
            set(
                AuditEvent.objects.filter(
                    actor=self.admin, object_id=created_id
                ).values_list("action", flat=True)
            ),
            {"ASTRONAUT_CREATED", "ASTRONAUT_UPDATED"},
        )
