from rest_framework import serializers


def validate_pdf(value):
    if value.size > 10 * 1024 * 1024:
        raise serializers.ValidationError("El PDF debe pesar menos de 10 MB.")
    header = value.read(5)
    value.seek(0)
    if not value.name.lower().endswith(".pdf") or header != b"%PDF-":
        raise serializers.ValidationError("Adjunta un documento PDF válido.")
    return value
