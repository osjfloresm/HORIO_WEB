from django.db import migrations


def create_schemas(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        for schema in ["nasa_private", "open_science", "nasa_opportunities"]:
            schema_editor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
            schema_editor.execute(f'REVOKE ALL ON SCHEMA "{schema}" FROM PUBLIC')


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]
    operations = [migrations.RunPython(create_schemas, migrations.RunPython.noop)]
