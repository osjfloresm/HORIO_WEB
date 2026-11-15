import requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
    authentication_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .models import Profile
from .serializers import RegisterSerializer, user_data


class AuthThrottle(ScopedRateThrottle):
    def allow_request(self, request, view):
        view.throttle_scope = "auth"
        return super().allow_request(request, view)


def tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user_data(user),
    }


def supabase_request(path, payload):
    try:
        response = requests.post(
            f"{settings.SUPABASE_URL}/auth/v1/{path}",
            json=payload,
            headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY},
            timeout=15,
        )
        data = response.json()
    except (requests.RequestException, ValueError):
        raise serializers.ValidationError(
            {"detail": "No fue posible conectar con el servicio de identidad."}
        )
    if not response.ok:
        raise serializers.ValidationError(
            {
                "detail": data.get("msg")
                or data.get("error_description")
                or "No se pudo autenticar la cuenta."
            }
        )
    return data


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([AuthThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data.copy()
    password = data.pop("password")
    email = data.pop("email")
    name = data.pop("name")
    external = None
    if settings.AUTH_PROVIDER == "supabase":
        external = supabase_request("signup", {"email": email, "password": password})
        if not external.get("user", {}).get("id"):
            raise serializers.ValidationError("No se pudo crear la identidad.")
    with transaction.atomic():
        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=name,
            password=None if external else password,
        )
        Profile.objects.create(
            user=user, supabase_id=external["user"]["id"] if external else None, **data
        )
    if external:
        return Response(
            {"detail": "Cuenta creada. Confirma tu correo e inicia sesión."}, status=201
        )
    return Response(tokens(user), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([AuthThrottle])
def login(request):
    email = str(request.data.get("email", "")).strip().lower()
    password = request.data.get("password", "")
    if settings.AUTH_PROVIDER == "supabase":
        data = supabase_request(
            "token?grant_type=password", {"email": email, "password": password}
        )
        profile = (
            Profile.objects.select_related("user")
            .filter(supabase_id=data["user"]["id"])
            .first()
        )
        if not profile or not profile.user.is_active:
            return Response(
                {"detail": "No existe un perfil activo en Horion."}, status=403
            )
        return Response(
            {
                "access": data["access_token"],
                "refresh": data["refresh_token"],
                "user": user_data(profile.user),
            }
        )
    user = authenticate(username=email, password=password)
    if not user:
        return Response({"detail": "Correo o contraseña incorrectos."}, status=401)
    return Response(tokens(user))


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([AuthThrottle])
def refresh(request):
    if settings.AUTH_PROVIDER == "supabase":
        data = supabase_request(
            "token?grant_type=refresh_token",
            {"refresh_token": request.data.get("refresh", "")},
        )
        return Response(
            {"access": data["access_token"], "refresh": data["refresh_token"]}
        )
    from rest_framework_simplejwt.serializers import TokenRefreshSerializer

    serializer = TokenRefreshSerializer(data=request.data)
    try:
        serializer.is_valid(raise_exception=True)
    except TokenError as exc:
        return Response(
            {"detail": "El token de renovación no es válido o ha sido revocado."},
            status=401,
        )
    return Response(serializer.validated_data)


@api_view(["GET"])
def me(request):
    return Response(user_data(request.user))


@api_view(["POST"])
def logout(request):
    if settings.AUTH_PROVIDER == "django":
        try:
            RefreshToken(request.data.get("refresh", "")).blacklist()
        except Exception:
            pass
    else:
        try:
            requests.post(
                f"{settings.SUPABASE_URL}/auth/v1/logout",
                headers={
                    "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
                    "Authorization": request.headers.get("Authorization", ""),
                },
                timeout=10,
            )
        except requests.RequestException:
            return Response(
                {"detail": "No se pudo cerrar la sesión remota. Inténtalo nuevamente."},
                status=502,
            )
    return Response(status=204)
