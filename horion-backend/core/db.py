from django.conf import settings


def table(schema, name):
    """Real PostgreSQL schemas; portable prefixed tables for local SQLite."""
    if settings.DATABASES["default"]["ENGINE"].endswith("postgresql"):
        return f'{schema}"."{name}'
    return f"{schema}_{name}"
