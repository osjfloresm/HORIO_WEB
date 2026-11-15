from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from .models import Profile


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=["RESEARCHER", "PROFESSIONAL", "ENTERPRISE"])
    institution = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    identifier = serializers.CharField(max_length=100)
    specialty = serializers.CharField(max_length=200, required=False, allow_blank=True)
    sector = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        email = data["email"].lower()
        if User.objects.filter(username=email).exists():
            raise serializers.ValidationError(
                {"email": "Ya existe una cuenta con este correo."}
            )
        try:
            validate_password(
                data["password"],
                User(username=email, email=email, first_name=data["name"]),
            )
        except ValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        required = {
            "RESEARCHER": "institution",
            "PROFESSIONAL": "specialty",
            "ENTERPRISE": "sector",
        }[data["role"]]
        if not data.get(required):
            raise serializers.ValidationError(
                {required: "Completa este campo para tu perfil."}
            )
        data["email"] = email
        return data


def user_data(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    return {
        "id": user.id,
        "name": user.first_name or user.username,
        "email": user.email,
        "role": "NASA_ADMIN" if user.is_superuser else profile.role,
        "institution": profile.institution,
        "identifier": profile.identifier,
        "specialty": profile.specialty,
        "sector": profile.sector,
        "country": profile.country,
    }
