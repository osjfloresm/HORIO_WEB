# Arquitectura y edición manual

## Principio de organización

Se conserva un monolito modular Django y un frontend separado. No hay microservicios, generadores de pantallas ni una capa de abstracciones que obligue a modificar muchos archivos para cambiar un formulario.

Flujo de una operación: **página React → cliente `api()` → view DRF → serializer / servicio → modelo Django**. Las vistas no son la fuente de permisos: `core/permissions.py` controla cada endpoint. Django Admin ofrece edición de registros sin tocar React.

## Cómo modificar una funcionalidad

Ejemplo: añadir un campo a una convocatoria.

1. Añadirlo a `opportunities/models.py` con un default o `blank=True` si corresponde.
2. Ejecutar `python manage.py makemigrations opportunities` y revisar la migración.
3. Ejecutar `python manage.py migrate`.
4. Revisar `opportunities/serializers.py`: las validaciones cruzadas viven aquí.
5. Añadir el campo al arreglo `fields` en `pages/nasa/CallsManager.jsx`.
6. Mostrarlo donde corresponda en `pages/opportunities/Board.jsx` o `Apply.jsx`.
7. Ejecutar los tests relevantes y `npm run build`.

Los botones, estados, tablas y campos comunes están en `components/ui.jsx`. `SchemaForm.jsx` se limita a renderizar formularios y manejar validación/carga. Las reglas de negocio permanecen en cada módulo.

## Diseño

`design-system/horion/MASTER.md` documenta la selección realizada con UI UX Pro Max. Se respetó la paleta del documento frente a recomendaciones genéricas que no encajaban con un entorno aeroespacial. Space Grotesk, Inter y JetBrains Mono se sirven desde paquetes locales; no se depende de Google Fonts en tiempo de ejecución. La ilustración orbital es CSS/vectorial editable.

React carga páginas de forma diferida. Recharts se separa del bundle inicial. Los estados incluyen carga, error con reintento, vacío y confirmación. Los formularios conservan entradas tras errores. Las modales usan `<dialog>` con gestión de foco del navegador y Escape.

## Datos y seguridad de acceso

- Django `auth.User` conserva compatibilidad con la base inicial. `accounts.Profile` contiene rol y campos del registro.
- `NASA_ADMIN` solo puede asignarse desde administración confiable; el registro público rechaza este valor.
- Para dar acceso a la consola a un usuario: editar `accounts.Profile.role` desde una cuenta superusuario. Para el panel Django, asignar además `is_staff` y permisos de modelos adecuados; un superusuario ya tiene ambos accesos.
- El modo local utiliza Simple JWT con acceso de 30 minutos, refresh de un día, rotación y blacklist. Cerrar sesión revoca el refresh; un access token ya emitido puede seguir siendo válido hasta su vencimiento.
- El frontend guarda la sesión en `sessionStorage` (por pestaña), nunca permisos confiables. El backend vuelve a comprobar el rol almacenado.
- Las publicaciones, cambios del portal y evaluaciones producen eventos de auditoría. El registro de auditoría es de solo lectura en Django Admin; no constituye un registro externo inmutable.
- El API público serializa campos explícitos: no incluye el ID del lote privado ni relaciones hacia astronautas.
- Los PDFs requieren cabecera `%PDF-`, extensión PDF y máximo 10 MB. Esta validación no reemplaza análisis antimalware de archivos en una instalación productiva.
- Los archivos de postulaciones solo son descargables por su dueño o por un administrador. Los artículos aprobados son públicos; los pendientes son visibles para su autor y administradores.

La liberación convierte fecha exacta en día de misión, nacimiento en rango de edad y sujeto en UUID. Es seudonimización: el contexto de una misión y los biomarcadores pueden permitir reidentificación. El inspector requiere confirmación del responsable antes de publicar. No se implementa ni se afirma certificación regulatoria o anonimato estadístico.

## PostgreSQL / Supabase Database

Configura `DATABASE_URL` con un usuario PostgreSQL dedicado y permiso para crear los tres esquemas. Ejemplo de formato (no contiene credenciales válidas):

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
```

`core/migrations/0002_schemas.py` crea `nasa_private`, `open_science`, `nasa_opportunities` y revoca acceso del rol PostgreSQL `PUBLIC` a esos esquemas. Las migraciones iniciales usan `core.db.table()` para generar nombres reales de esquema en PostgreSQL y tablas prefijadas en SQLite. No cambies de motor sobre la misma base ya migrada; cambia a una base nueva y migra explícitamente los datos.

Django accede a PostgreSQL directamente. No se habilita la API de datos de Supabase sobre estos esquemas; no los añadas a los esquemas expuestos de PostgREST sin diseñar políticas RLS específicas. Las autorizaciones de la aplicación viven en DRF. Auth y tablas de soporte Django permanecen en el esquema por defecto.

Se verificaron las migraciones y flujos con SQLite y PostgreSQL 17 local aislado. No se ha conectado este repositorio a un proyecto Supabase remoto.

## Supabase Auth opcional

```dotenv
AUTH_PROVIDER=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Configura claves de firma asimétrica (ES256 o RS256). El backend valida firma, issuer, audiencia, expiración y subject usando JWKS en `/auth/v1/.well-known/jwks.json`. No acepta tokens legacy HS256 en este modo. Los roles se leen de `accounts.Profile`, no de metadatos editables por el usuario.

El registro crea la identidad mediante Supabase Auth y vincula el UUID con el perfil local. Si el proyecto exige confirmación de correo, el usuario debe confirmarlo antes de acceder. Un usuario Supabase preexistente que no tenga perfil local debe vincularse desde Django Admin: crear usuario Django sin contraseña utilizable y registrar `Profile.supabase_id`. La asignación `NASA_ADMIN` es siempre manual.

La creación externa y la transacción local no son una sola transacción distribuida: si Supabase crea la cuenta y falla la base local, hay que vincular esa identidad manualmente. No se incluye recuperación de contraseña o inicio social porque no estaban definidos en las pantallas solicitadas.

Documentación consultada: [JWT Signing Keys de Supabase](https://supabase.com/docs/guides/auth/signing-keys), [permisos DRF](https://www.django-rest-framework.org/api-guide/permissions/) y [ViewSets DRF](https://www.django-rest-framework.org/api-guide/viewsets/).

## Supabase Storage opcional

Crea un bucket **privado** llamado `horion-documents`, o usa otro nombre mediante la variable correspondiente.

```dotenv
FILE_STORAGE=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_STORAGE_BUCKET=horion-documents
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_KEY
```

La clave es exclusiva del backend; nunca debe tener prefijo `VITE_` ni incluirse en Git. `core/storage.py` guarda los PDF con nombres UUID y recupera los contenidos mediante la API Storage. Django sirve el PDF tras comprobar permisos; no genera URLs públicas. El bucket y las credenciales reales son configuración externa pendiente. El modo predeterminado guarda los archivos en `horion-backend/media/`.

## Suscripciones y correo

El portal cerrado almacena el correo de cada suscriptor, evitando duplicados. Se incluye el comando:

```bash
python manage.py notify_subscribers --url https://TU-DOMINIO/opportunities/board
```

Sin `--send` solo informa el número de destinatarios. Para envío real configura SMTP (`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, host, puerto, usuario, contraseña) y añade `--send`. No se envió ningún correo durante la implementación. El backend predeterminado imprime en consola para desarrollo; no hay envío automático al mover el switch.

## Despliegue

1. Instalar Django en un servicio Python con WSGI/ASGI, PostgreSQL y almacenamiento persistente o Supabase Storage.
2. Configurar secreto aleatorio, `DJANGO_DEBUG=false`, `DEMO_MODE=false`, hosts, CORS, HTTPS y variables externas.
3. Ejecutar migraciones y `collectstatic`; crear un superusuario y asignar perfiles. No sembrar datos demo.
4. Compilar React con `npm ci && npm run build`.
5. Servir `horion-frontend/dist/` con fallback de rutas a `index.html`. En el mismo dominio, reenviar `/api/` y `/admin/` a Django y `/static/` al directorio de estáticos. No publicar `/media/`.
6. Si la API vive en otro dominio, configurar `VITE_API_URL=https://API-DOMAIN/api/v1` antes del build y permitir el origen exacto en CORS.

La plataforma está preparada y comprobada localmente; no se publicó un servicio externo ni se configuraron credenciales reales. Las listas API no tienen paginación global en este MVP: se deben paginar para conjuntos de datos de producción. Las gráficas limitan la vista previa y la exportación descarga el dataset completo.

## Pruebas

- `core/tests.py`: controles de acceso, JWT, ingesta, idempotencia, exportación sin identidad, moderación, validación adaptativa, documentos privados, portal cerrado y sincronización de protocolos.
- `tests/platform.spec.js`: flujos de navegador sobre base temporal, cuatro roles, todas las áreas, accesibilidad automática y responsive.
- `scripts/check_postgres.sh`: prueba opcional con clúster PostgreSQL local aislado; no usa ni modifica el servidor PostgreSQL existente.
