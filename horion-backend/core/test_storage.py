from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from core.storage import SupabasePrivateStorage, auth_headers


class SupabaseKeyTests(SimpleTestCase):
    def test_new_secret_key_goes_only_in_apikey(self):
        self.assertEqual(
            auth_headers("sb_secret_abc123"), {"apikey": "sb_secret_abc123"}
        )

    def test_legacy_service_role_jwt_keeps_bearer(self):
        self.assertEqual(
            auth_headers("eyJhbGciOiJIUzI1NiJ9.x.y"),
            {
                "apikey": "eyJhbGciOiJIUzI1NiJ9.x.y",
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.x.y",
            },
        )

    @override_settings(
        SUPABASE_URL="https://demo.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="sb_secret_abc123",
        SUPABASE_STORAGE_BUCKET="horion-documents",
    )
    def test_storage_request_uses_those_headers(self):
        with patch("core.storage.requests.request") as request:
            SupabasePrivateStorage()._request("GET", "documents/a.pdf")
        url = request.call_args.args[1]
        headers = request.call_args.kwargs["headers"]
        self.assertEqual(
            url,
            "https://demo.supabase.co/storage/v1/object/horion-documents/documents/a.pdf",
        )
        self.assertEqual(headers["apikey"], "sb_secret_abc123")
        self.assertNotIn("Authorization", headers)
