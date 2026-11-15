from functools import lru_cache
import jwt
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Profile


@lru_cache(maxsize=1)
def jwks_client():
    return jwt.PyJWKClient(
        f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json", cache_keys=True
    )


class HorionAuthentication(JWTAuthentication):
    def authenticate(self, request):
        if settings.AUTH_PROVIDER != "supabase":
            return super().authenticate(request)
        header = self.get_header(request)
        if not header:
            return None
        raw = self.get_raw_token(header)
        if not raw:
            return None
        try:
            token = raw.decode()
            key = jwks_client().get_signing_key_from_jwt(token).key
            claims = jwt.decode(
                token,
                key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
                issuer=f"{settings.SUPABASE_URL}/auth/v1",
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
            profile = Profile.objects.select_related("user").get(
                supabase_id=claims["sub"]
            )
        except Profile.DoesNotExist:
            raise AuthenticationFailed("Completa el registro de tu perfil en Horion.")
        except (jwt.PyJWTError, ValueError, KeyError):
            raise AuthenticationFailed("La sesión no es válida o ha expirado.")
        if not profile.user.is_active:
            raise AuthenticationFailed("La cuenta está desactivada.")
        return profile.user, claims
