"""Behavior and isolation tests for the clinical/public boundary and application lifecycle."""

import tempfile
from datetime import timedelta, date
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import Profile
from nasa_private.models import Mission, Astronaut, SyncBatch, Telemetry, Research
from nasa_private.services import payload_digest, ingest, release
from science.models import Repository, Contribution
from opportunities.models import PortalConfig, Call, Application, ApplicantProfile


class PlatformTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.users = {}
        for role in ["NASA_ADMIN", "RESEARCHER", "PROFESSIONAL", "ENTERPRISE"]:
            user = User.objects.create_user(
                username=f"{role.lower()}@example.org",
                email=f"{role.lower()}@example.org",
                password="TestPassword!123",
                first_name=role,
            )
            Profile.objects.create(
                user=user, role=role, identifier="DEMO-001", specialty="Space medicine"
            )
            cls.users[role] = user
        cls.now = timezone.now()
        cls.mission = Mission.objects.create(
            codigo_mision="TEST-1",
            nombre="Test",
            fecha_inicio=cls.now - timedelta(days=10),
        )
        cls.astronaut = Astronaut.objects.create(
            codigo_astronauta="AST-1",
            nombre_completo="CONFIDENTIAL NAME",
            fecha_nacimiento=date(1986, 2, 1),
            mision=cls.mission,
            alergias="SECRET ALLERGY",
        )
        cls.payload = {
            "codigo_astronauta": "AST-1",
            "registros": [
                {
                    "timestamp_utc": cls.now.isoformat(),
                    "frecuencia_cardiaca": 70,
                    "spo2": 98,
                    "hrv": 45,
                    "temperatura_corporal": 36.5,
                    "horas_sueno": 7,
                }
            ],
        }
        cls.batch, _ = ingest(cls.payload, payload_digest(cls.payload))
        cls.repo, _ = release(
            cls.batch.pk, "Public dataset", "Description", cls.users["NASA_ADMIN"]
        )
        PortalConfig.objects.create(pk=1, portal_habilitado=True)
        cls.call = Call.objects.create(
            codigo_convocatoria="TEST-CALL",
            titulo="Test call",
            categoria_destinatario="AMBOS",
            tipo_necesidad="SOFTWARE_ESPACIAL",
            descripcion_detallada="Description",
            requisitos_tecnicos="Requirements",
            repositorio_datos_vinculado=cls.repo,
            presupuesto_estimado=100,
            fecha_apertura=cls.now - timedelta(days=1),
            fecha_cierre=cls.now + timedelta(days=20),
            estado="ABIERTA",
        )

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.setting = override_settings(MEDIA_ROOT=self.temp.name)
        self.setting.enable()
        self.addCleanup(self.setting.disable)
        self.addCleanup(self.temp.cleanup)

    def login_as(self, role):
        self.client.force_authenticate(user=self.users[role])

    def application_data(self, **overrides):
        data = {
            "convocatoria": str(self.call.pk),
            "titulo_propuesta": "Test proposal",
            "propuesta_tecnica_o_clinica": "Detailed method",
            "presupuesto_o_honorarios": "90",
            "especialidad": "Space medicine",
            "experiencia": "Five years",
            "categoria_solucion": "HARDWARE",
            "nivel_trl": 6,
            "documento_adjunto": SimpleUploadedFile(
                "proposal.pdf", b"%PDF-1.4\n%%EOF", content_type="application/pdf"
            ),
        }
        return {**data, **overrides}

    def test_private_endpoints_reject_anonymous_and_other_roles(self):
        paths = [
            "/nasa/telemetry/",
            "/nasa/lotes/",
            "/nasa/investigaciones/",
            "/nasa/moderacion/",
            "/nasa/convocatorias/",
            "/nasa/postulaciones/",
        ]
        for path in paths:
            self.assertEqual(self.client.get("/api/v1" + path).status_code, 401)
        self.login_as("RESEARCHER")
        for path in paths:
            self.assertEqual(self.client.get("/api/v1" + path).status_code, 403)

    def test_registration_cannot_escalate_role(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "Attacker",
                "email": "new@example.org",
                "password": "SafePassword!123",
                "role": "NASA_ADMIN",
                "identifier": "ID",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="new@example.org").exists())

    def test_registration_requires_profile_fields(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "New",
                "email": "new@example.org",
                "password": "SafePassword!123",
                "role": "ENTERPRISE",
                "identifier": "ID",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("sector", response.data)

    def test_registration_and_login_issue_real_jwt(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "New Researcher",
                "email": "New@example.org",
                "password": "SafePassword!123",
                "role": "RESEARCHER",
                "identifier": "0000",
                "institution": "University",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + response.data["access"])
        profile = self.client.get("/api/v1/auth/me/")
        self.assertEqual(profile.data["role"], "RESEARCHER")
        self.assertEqual(profile.data["email"], "new@example.org")

    def test_refresh_rotation_and_logout_blacklist(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "researcher@example.org", "password": "TestPassword!123"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        tokens = response.data
        refresh = self.client.post(
            "/api/v1/auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
        )
        self.assertEqual(refresh.status_code, 200)
        self.assertNotEqual(refresh.data["refresh"], tokens["refresh"])
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
            ).status_code,
            401,
        )
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + refresh.data["access"])
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/logout/",
                {"refresh": refresh.data["refresh"]},
                format="json",
            ).status_code,
            204,
        )
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/refresh/",
                {"refresh": refresh.data["refresh"]},
                format="json",
            ).status_code,
            401,
        )

    def test_ingestion_is_authenticated_and_idempotent(self):
        body = {"payload": self.payload, "hash_sha256": payload_digest(self.payload)}
        self.assertEqual(
            self.client.post("/api/v1/sync/ingest/", body, format="json").status_code,
            401,
        )
        with override_settings(EDGE_API_KEY="test-edge-secret"):
            response = self.client.post(
                "/api/v1/sync/ingest/",
                body,
                format="json",
                HTTP_X_EDGE_KEY="test-edge-secret",
            )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["created"])
        self.assertEqual(SyncBatch.objects.count(), 1)
        self.assertEqual(Telemetry.objects.count(), 1)

    def test_ingestion_rejects_tampering_and_invalid_ranges(self):
        self.login_as("NASA_ADMIN")
        bad = {
            **self.payload,
            "registros": [{**self.payload["registros"][0], "spo2": 500}],
        }
        response = self.client.post(
            "/api/v1/sync/ingest/",
            {"payload": bad, "hash_sha256": payload_digest(self.payload)},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        response = self.client.post(
            "/api/v1/sync/ingest/",
            {"payload": bad, "hash_sha256": payload_digest(bad)},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(SyncBatch.objects.count(), 1)

    def test_public_serializers_and_exports_never_leak_private_fields(self):
        catalog = self.client.get("/api/v1/science/repositorios/")
        self.assertEqual(catalog.status_code, 200)
        self.assertNotIn("lote_origen", catalog.data[0])
        for format_name in ["csv", "json"]:
            response = self.client.get(
                f"/api/v1/science/repositorios/{self.repo.pk}/export/?format={format_name}"
            )
            self.assertEqual(response.status_code, 200)
            for secret in [
                "CONFIDENTIAL NAME",
                "SECRET ALLERGY",
                "timestamp_utc",
                "fecha_nacimiento",
                "astronauta",
                "temperatura_corporal",
            ]:
                self.assertNotIn(secret, response.content.decode())
            self.assertIn("dia_mision", response.content.decode())
            self.assertIn("uuid_sujeto", response.content.decode())

    def test_unpublished_repository_is_not_readable_or_exportable(self):
        self.repo.publicado = False
        self.repo.save()
        self.assertEqual(self.client.get("/api/v1/science/repositorios/").data, [])
        self.assertEqual(
            self.client.get(
                f"/api/v1/science/repositorios/{self.repo.pk}/export/"
            ).status_code,
            404,
        )

    def test_release_requires_review_and_is_idempotent(self):
        self.login_as("NASA_ADMIN")
        url = f"/api/v1/nasa/lotes/{self.batch.pk}/liberar/"
        body = {
            "titulo_dataset": "Test",
            "descripcion": "Details",
            "privacidad_revisada": False,
        }
        self.assertEqual(self.client.post(url, body, format="json").status_code, 400)
        body["privacidad_revisada"] = True
        self.assertEqual(self.client.post(url, body, format="json").status_code, 200)
        self.assertEqual(Repository.objects.count(), 1)

    def test_release_removes_identity_and_offsets_dates(self):
        self.login_as("NASA_ADMIN")
        response = self.client.get(f"/api/v1/nasa/lotes/{self.batch.pk}/preview/")
        self.assertEqual(
            response.data["before"]["nombre_completo"], "CONFIDENTIAL NAME"
        )
        self.assertNotIn("nombre_completo", response.data["after"])
        self.assertEqual(response.data["after"]["dia_mision"], 11)
        self.assertNotIn("astronauta_id", response.data["after"])

    def test_contribution_moderation_visibility_and_feedback(self):
        self.login_as("RESEARCHER")
        response = self.client.post(
            "/api/v1/science/aportaciones/",
            {
                "repositorio": str(self.repo.pk),
                "titulo": "New work",
                "resumen_metodologia": "Method",
                "doi_o_enlace": "https://example.org/paper",
                "estado_moderacion": "APROBADO",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        contribution_id = response.data["id"]
        self.assertEqual(response.data["estado_moderacion"], "PENDIENTE")
        self.assertEqual(len(self.client.get("/api/v1/science/aportaciones/").data), 1)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/v1/science/aportaciones/").data, [])
        self.login_as("NASA_ADMIN")
        url = f"/api/v1/nasa/moderacion/{contribution_id}/evaluar/"
        self.assertEqual(
            self.client.patch(
                url, {"estado_moderacion": "RECHAZADO"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                url,
                {"estado_moderacion": "APROBADO", "comentarios_nasa": "Reviewed"},
                format="json",
            ).status_code,
            200,
        )
        self.client.force_authenticate(user=None)
        self.assertEqual(len(self.client.get("/api/v1/science/aportaciones/").data), 1)

    def test_professional_cannot_submit_science(self):
        self.login_as("PROFESSIONAL")
        self.assertEqual(
            self.client.post(
                "/api/v1/science/aportaciones/", {}, format="json"
            ).status_code,
            403,
        )

    def test_portal_switch_hides_calls_and_blocks_application(self):
        self.login_as("NASA_ADMIN")
        response = self.client.patch(
            "/api/v1/nasa/portal-convocatorias/toggle/",
            {"portal_habilitado": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.login_as("PROFESSIONAL")
        self.assertEqual(
            self.client.get("/api/v1/opportunities/convocatorias/").data, []
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/",
                self.application_data(),
                format="multipart",
            ).status_code,
            400,
        )

    def test_expired_and_draft_calls_are_not_public(self):
        self.call.fecha_cierre = self.now - timedelta(hours=1)
        self.call.save()
        self.assertEqual(
            self.client.get("/api/v1/opportunities/convocatorias/").data, []
        )
        self.login_as("ENTERPRISE")
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/",
                self.application_data(),
                format="multipart",
            ).status_code,
            400,
        )

    def test_enterprise_requires_trl_and_solution_category(self):
        self.login_as("ENTERPRISE")
        data = self.application_data()
        del data["nivel_trl"]
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/", data, format="multipart"
            ).status_code,
            400,
        )
        data = self.application_data(nivel_trl=10)
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/", data, format="multipart"
            ).status_code,
            400,
        )

    def test_professional_requires_experience_and_matching_call(self):
        self.login_as("PROFESSIONAL")
        data = self.application_data(experiencia="")
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/", data, format="multipart"
            ).status_code,
            400,
        )
        self.call.categoria_destinatario = "EMPRESAS"
        self.call.save()
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/",
                self.application_data(),
                format="multipart",
            ).status_code,
            400,
        )

    def test_application_is_owner_scoped_and_duplicates_rejected(self):
        self.login_as("PROFESSIONAL")
        response = self.client.post(
            "/api/v1/opportunities/postular/",
            self.application_data(),
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        application_id = response.data["id"]
        self.assertIsNone(response.data["nivel_trl"])
        self.assertNotIn("documento_adjunto", response.data)
        self.assertEqual(
            self.client.post(
                "/api/v1/opportunities/postular/",
                self.application_data(),
                format="multipart",
            ).status_code,
            400,
        )
        self.login_as("ENTERPRISE")
        self.assertEqual(
            self.client.get("/api/v1/opportunities/postulaciones/").data, []
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/opportunities/postulaciones/{application_id}/document/"
            ).status_code,
            404,
        )
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(
                f"/api/v1/opportunities/postulaciones/{application_id}/document/"
            ).status_code,
            401,
        )

    def test_invalid_pdf_rejected(self):
        self.login_as("PROFESSIONAL")
        file = SimpleUploadedFile(
            "fake.pdf", b"<html>not a pdf</html>", content_type="application/pdf"
        )
        response = self.client.post(
            "/api/v1/opportunities/postular/",
            self.application_data(documento_adjunto=file),
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("documento_adjunto", response.data)

    def test_evaluation_updates_owner_and_survives_closed_portal(self):
        self.login_as("PROFESSIONAL")
        application = self.client.post(
            "/api/v1/opportunities/postular/",
            self.application_data(),
            format="multipart",
        ).data
        url = f'/api/v1/nasa/postulaciones/{application["id"]}/evaluar/'
        self.assertEqual(
            self.client.patch(
                url,
                {"estado": "SELECCIONADA", "evaluacion_nasa": "Excellent"},
                format="json",
            ).status_code,
            403,
        )
        self.login_as("NASA_ADMIN")
        self.assertEqual(
            self.client.patch(
                url,
                {"estado": "SELECCIONADA", "evaluacion_nasa": "Excellent"},
                format="json",
            ).status_code,
            200,
        )
        PortalConfig.objects.update(portal_habilitado=False)
        self.login_as("PROFESSIONAL")
        result = self.client.get("/api/v1/opportunities/postulaciones/").data
        self.assertEqual(result[0]["estado"], "SELECCIONADA")
        self.assertEqual(result[0]["evaluacion_nasa"], "Excellent")

    def test_bidirectional_edge_returns_only_approved_protocols(self):
        Research.objects.create(
            titulo_terapia="Private draft",
            objetivo_clinico="Draft",
            mision_objetivo=self.mission,
            creado_por=self.users["NASA_ADMIN"],
        )
        Research.objects.create(
            titulo_terapia="Approved",
            objetivo_clinico="Reviewed",
            mision_objetivo=self.mission,
            creado_por=self.users["NASA_ADMIN"],
            estado="APROBADO_MISION",
        )
        self.login_as("NASA_ADMIN")
        response = self.client.get("/api/v1/sync/updates/?codigo_astronauta=AST-1")
        self.assertEqual(len(response.data["protocolos"]), 1)
        self.assertEqual(response.data["protocolos"][0]["titulo_terapia"], "Approved")
        self.assertEqual(len(response.data["lotes_confirmados"]), 1)

    def test_subscription_is_idempotent(self):
        for _ in range(2):
            self.assertEqual(
                self.client.post(
                    "/api/v1/opportunities/subscribe/",
                    {"email": "visitor@example.org"},
                    format="json",
                ).status_code,
                201,
            )
        from opportunities.models import Subscription

        self.assertEqual(Subscription.objects.count(), 1)

    def test_expired_authorization_does_not_block_login(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer expired-or-invalid-token")
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "researcher@example.org", "password": "TestPassword!123"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    @override_settings(
        AUTH_PROVIDER="supabase", SUPABASE_URL="https://test.supabase.co"
    )
    def test_supabase_jwt_is_verified_and_cannot_override_local_role(self):
        import uuid
        import jwt
        from types import SimpleNamespace
        from cryptography.hazmat.primitives.asymmetric import rsa

        subject = uuid.uuid4()
        profile = self.users["RESEARCHER"].profile
        profile.supabase_id = subject
        profile.save()
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        claims = {
            "sub": str(subject),
            "aud": "authenticated",
            "iss": "https://test.supabase.co/auth/v1",
            "exp": timezone.now() + timedelta(minutes=10),
            "role": "NASA_ADMIN",
        }
        token = jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test-key"})
        client = SimpleNamespace(
            get_signing_key_from_jwt=lambda token: SimpleNamespace(key=key.public_key())
        )
        with patch("accounts.authentication.jwks_client", return_value=client):
            self.client.credentials(HTTP_AUTHORIZATION="Bearer " + token)
            self.assertEqual(
                self.client.get("/api/v1/auth/me/").data["role"], "RESEARCHER"
            )
            self.assertEqual(
                self.client.get("/api/v1/nasa/telemetry/").status_code, 403
            )
            bad_token = jwt.encode(
                {**claims, "iss": "https://wrong.example/auth/v1"},
                key,
                algorithm="RS256",
            )
            self.client.credentials(HTTP_AUTHORIZATION="Bearer " + bad_token)
            self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
            other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            forged = jwt.encode(claims, other_key, algorithm="RS256")
            self.client.credentials(HTTP_AUTHORIZATION="Bearer " + forged)
            self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
