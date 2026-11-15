"""Optional private Supabase bucket. Browser downloads always go through Django RBAC."""

from urllib.parse import quote
import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


def auth_headers(key):
    """Cabeceras de autenticación para Supabase.

    Claves nuevas (`sb_secret_...`): van solo en `apikey`; no son un JWT y no
    deben enviarse como `Authorization: Bearer`. Clave antigua `service_role`
    (un JWT, `eyJ...`): se envía en ambas cabeceras, como antes.
    """
    headers = {"apikey": key}
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


@deconstructible
class SupabasePrivateStorage(Storage):
    def _request(self, method, name, **kwargs):
        endpoint = f'{settings.SUPABASE_URL}/storage/v1/object/{quote(settings.SUPABASE_STORAGE_BUCKET)}/{quote(name, safe="/")}'
        response = requests.request(
            method,
            endpoint,
            headers={
                **auth_headers(settings.SUPABASE_SERVICE_ROLE_KEY),
                "Content-Type": "application/pdf",
                "x-upsert": "false",
            },
            timeout=30,
            **kwargs,
        )
        response.raise_for_status()
        return response

    def _save(self, name, content):
        self._request("POST", name, data=content.read())
        return name

    def _open(self, name, mode="rb"):
        return ContentFile(self._request("GET", name).content, name=name)

    def exists(self, name):
        try:
            self._request("HEAD", name)
            return True
        except requests.HTTPError as exc:
            if exc.response.status_code == 404:
                return False
            raise

    def get_available_name(self, name, max_length=None):
        # UUID filenames avoid a remote existence request and collisions.
        import uuid

        directory = name.rsplit("/", 1)[0] if "/" in name else "documents"
        return f"{directory}/{uuid.uuid4().hex}.pdf"

    def url(self, name):
        raise NotImplementedError(
            "Use the authorized document endpoint, never a public bucket URL."
        )
