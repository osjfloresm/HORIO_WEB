# Despliegue: Vercel + Render + Supabase, y conexión con Horion Edge

```
Horion Edge (PC Windows)                         Nube
FastAPI local + SQLite ──HTTPS POST cada 30 s──▶ Django en Render ──▶ Supabase Postgres
   cola synced = 0       X-Edge-Key                    ▲
                                                       │ /api/v1 (JWT)
                                          React en Vercel (navegador)
```

La app de escritorio **siempre inicia** la conexión. La web nunca necesita llegar a la PC, así que no importan el firewall ni la IP del equipo. Si no hay red, los datos esperan en SQLite y se envían al volver la conexión.

Vercel solo sirve el frontend estático. Django va en Render porque necesita un proceso persistente para las migraciones, el admin y los comandos de gestión.

## 1. Base de datos (Supabase)

1. Crea un proyecto en Supabase.
2. Ve a **Project Settings → Database → Connection string**, sección **Session pooler**. Copia la URI y añade `?sslmode=require`. Usa el *pooler*: la conexión directa es solo IPv6 y Render no la alcanza.
3. Crea el bucket **privado** `horion-documents` en Storage (ver [arquitectura.md](arquitectura.md#supabase-storage-opcional)). El disco de Render se borra en cada deploy, así que los PDF de las postulaciones deben guardarse allí.

## 2. API Django (Render)

1. Sube `HORIO_WEB` a GitHub.
2. En Render ve a **New → Blueprint** y elige el repositorio. Render leerá `render.yaml`.
3. Completa las variables que se piden:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URI del paso 1 |
| `DJANGO_ALLOWED_HOSTS` | Déjala vacía: el dominio `*.onrender.com` se añade solo. Solo si usas un dominio propio. |
| `CSRF_TRUSTED_ORIGINS` | Igual: vacía salvo con dominio propio (`https://api.tudominio.com`). |
| `CORS_ALLOWED_ORIGINS` | `https://TU-PROYECTO.vercel.app` (exacto, sin barra final) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | de Supabase → API |

`DJANGO_SECRET_KEY` y `EDGE_API_KEY` los genera Render. Copia `EDGE_API_KEY` desde **Environment**: la necesitarás en el paso 4.

4. Crea el superusuario. El plan gratuito no tiene consola, así que hazlo desde tu PC contra la misma base:

```bash
cd horion-backend
DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres?sslmode=require" venv/Scripts/python manage.py createsuperuser
```

5. Entra en `https://horion-api.onrender.com/admin/` y haz lo siguiente:
   - En **Profiles**, asigna a tu usuario el rol `NASA_ADMIN` para ver la consola de telemetría.
   - Crea la **misión** con el mismo código que la app (por defecto `ARTEMIS-IV`). Pon una **fecha de inicio anterior a la primera lectura de la app**. La app siembra 13 días de historial, así que usa al menos 14 días antes de hoy. Si no, la web rechaza el lote con «Las lecturas no pueden preceder al inicio de la misión».
   - Una vez disponible el frontend, entra en **Consola NASA → Astronautas** y crea el perfil con el mismo código que envía el escritorio (por defecto `AST-001`), asignándole esa misión. Si el código ya existe, edita ese perfil. También puede administrarse desde Django Admin.

## 3. Frontend React (Vercel)

1. En Vercel ve a **Add New → Project**, elige el repositorio y fija **Root Directory** en `horion-frontend`. `vercel.json` ya define el build y la reescritura de rutas del SPA.
2. Añade la variable `VITE_API_URL=https://horion-api.onrender.com/api/v1`. Vite la incrusta en el build: si la cambias, vuelve a desplegar.
3. Despliega. Si la consola muestra errores CORS, revisa que `CORS_ALLOWED_ORIGINS` en Render tenga exactamente el dominio de Vercel.

## 4. Conectar Horion Edge

En la PC, dentro de `HORION-DESTOCK-BETA/backend_fastapi/.env`:

```dotenv
HORION_CLOUD_URL=https://horion-api.onrender.com
EDGE_API_KEY=la-misma-clave-que-en-Render
# HORION_SYNC_INTERVAL=30
```

Reinicia el backend FastAPI y desactiva **Demo** en la app. En **Historial y sync** verás «Horion Web: conectado» y el botón **Sincronizar ahora**. Los datos aparecen en la web en **Control de misión** (`/nasa-admin/telemetry`), con un usuario `NASA_ADMIN`.

## Qué esperar

- **Retraso:** la web muestra los datos con un retraso igual al intervalo de envío, más lo que tarde en refrescarse la página. No es tiempo real.
- **Render gratuito:** el servicio se apaga tras unos 15 minutos sin tráfico. El primer envío después de eso puede tardar unos 50 s o fallar. La app reintenta sola con backoff y conserva el lote.
- **Qué se sube:** telemetría, alertas y conversaciones con Orbi. Bienestar (agua, energía, ánimo) y mediciones (presión, glucosa) todavía no forman parte del contrato y se quedan en el equipo.
- **Lote rechazado:** si la web responde 4xx, la app muestra el motivo en «Historial y sync» y reintenta el **mismo** lote. Corrige la causa en el admin (astronauta, misión, fecha de inicio o clave) y se enviará solo.
- **Una sola clave:** `EDGE_API_KEY` sirve para todas las misiones. Con varios equipos en producción conviene una clave por dispositivo.
