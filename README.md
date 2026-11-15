# Horion · Plataforma de investigación espacial

Aplicación completa en **React + Vite + Tailwind CSS** y **Django + Django REST Framework**. Incluye las 12 pantallas de la especificación, inicio de sesión, estado de convocatorias cerrado y página 404. Diseño oscuro basado en UI UX Pro Max y en la identidad indicada en `web_horion.md`.

Los datos incluidos son **sintéticos**. Este proyecto no está afiliado oficialmente con NASA. Se implementa en este repositorio local; el backend Django requiere un servidor Python y no se despliega como un sitio estático.

## Arranque rápido

Requisitos: Python 3.12 y Node.js 22.12 o superior.

Terminal 1 — backend:

```bash
cd horion-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo --password 'HorionDemo2026!'
python manage.py runserver
```

Terminal 2 — frontend:

```bash
cd horion-frontend
npm ci
npm run dev
```

Después de instalar y migrar, también puedes iniciar ambos servidores desde la raíz con `./dev.sh` (Linux/macOS). Detén ambos con Ctrl+C.

Abre **http://localhost:3000**. Django Admin: **http://127.0.0.1:8000/admin/**. No se necesita Supabase para trabajar localmente: SQLite es el valor predeterminado. Los datos existentes no se borran; el comando de demostración es idempotente y no cambia contraseñas de cuentas ya creadas.

En Windows, activa el entorno con `venv\Scripts\activate` (CMD) o `.\venv\Scripts\Activate.ps1` (PowerShell). Los demás comandos son los mismos.

## Cuentas de demostración

Contraseña si utilizaste el comando anterior: `HorionDemo2026!`.

| Correo | Rol | Acceso |
| --- | --- | --- |
| `admin@horion.demo` | `NASA_ADMIN` | Cinco pantallas de consola y Django Admin |
| `researcher@horion.demo` | `RESEARCHER` | Repositorios y envío de aportaciones |
| `professional@horion.demo` | `PROFESSIONAL` | Postulaciones con especialidad, experiencia y CV |
| `enterprise@horion.demo` | `ENTERPRISE` | Postulaciones con categoría, TRL, cotización y ficha técnica |

La página de acceso permite rellenar estas credenciales solo al ejecutar Vite en desarrollo. No uses cuentas demo con datos reales. `seed_demo` está bloqueado cuando `DEBUG=false` o `DEMO_MODE=false`.

## Arquitectura fácil de editar

```text
horion-frontend/src/
  config/navigation.js       # Menús, nombres e iconos
  index.css                  # Tokens, estilos y responsive
  components/                # Layout, botones, formularios, tablas, gráficas
  context/AppContext.jsx     # Sesión, estado del portal y avisos
  lib/                       # Cliente API, hooks, formatos y traducciones
  pages/public/              # Portada, acceso, registro y 404
  pages/nasa/                # Las cinco pantallas administrativas
  pages/science/             # Repositorios y aportaciones
  pages/opportunities/       # Tablero, formulario, seguimiento y portal cerrado
  App.jsx                    # Rutas y restricciones por rol

horion-backend/
  horion/                    # Configuración del proyecto y URLs
  accounts/                  # Perfiles, JWT y adaptador de Supabase Auth
  nasa_private/              # Misiones, astronautas, ingesta, protocolos y publicación
  science/                   # Datasets anonimizados, exportación y aportaciones
  opportunities/             # Configuración, convocatorias, perfiles y postulaciones
  core/                      # Permisos, auditoría, validadores, storage y comandos
```

Cada app Django mantiene **modelos**, **serializers**, **views**, **admin** y **migraciones** separados. Las operaciones transaccionales de ingesta y liberación están en `nasa_private/services.py`. Los formularios específicos se declaran junto a su página; las piezas compartidas evitan duplicar la lógica de interacción.

Consulta [la matriz de pantallas](docs/pantallas.md), [la guía de edición y despliegue](docs/arquitectura.md), [el contrato de Horion Edge](docs/edge-api.md) y [el sistema de diseño](design-system/horion/MASTER.md).

## Funcionalidad conectada

- JWT con validación en backend, roles no escalables desde el registro y renovación con rotación/revocación de refresh tokens.
- Sincronización autenticada, SHA-256 recalculado, validación de biomarcadores e idempotencia. Recepción de alertas y transcripciones de Edge.
- Consulta de protocolos aprobados y acuses de lotes para que Edge pueda sincronizar de vuelta.
- Telemetría, filtros de misión, gráficas, transcripciones y edición de protocolos clínicos.
- Inspector privado/público, publicación transaccional, exportación CSV/JSON y catálogo filtrable.
- Aportaciones con PDF/DOI, estados de moderación y feedback visible para el autor.
- Interruptor de portal, creador/editor de convocatorias, evaluación y filtros por TRL, presupuesto y especialidad.
- Postulación adaptativa con PDF privado, validación de perfil y vigencia, prevención de duplicados y seguimiento cada 30 segundos.
- Suscripciones persistentes. Envío de novedades disponible mediante comando explícito; requiere SMTP para correo real.

## PostgreSQL y Supabase

En `horion-backend/.env`, configura `DATABASE_URL` con la conexión PostgreSQL de tu proyecto y ejecuta `python manage.py migrate`. Las migraciones crean los esquemas **nasa_private**, **open_science** y **nasa_opportunities**. SQLite utiliza prefijos equivalentes. Cambiar la URL no copia datos entre bases; usa una migración de datos explícita si necesitas conservarlos.

Supabase Auth y Storage son opcionales y tienen adaptadores implementados. Configura las variables de `.env.example`; los detalles están en [arquitectura.md](docs/arquitectura.md). La conexión con un proyecto Supabase real necesita sus credenciales y no se ha ejecutado en esta entrega. Los PDFs se guardan localmente por defecto y se sirven mediante endpoints con permisos; nunca se expone `/media/` públicamente.

## Validación

```bash
# Backend: permisos, privacidad, JWT, sincronización y flujos
cd horion-backend
venv/bin/python manage.py check
venv/bin/python manage.py makemigrations --check --dry-run
venv/bin/python manage.py test

# Opcional, PostgreSQL 17 instalado: clúster temporal aislado
scripts/check_postgres.sh

# Frontend: build y flujos completos en navegador
cd ../horion-frontend
npm run build
npm test
```

Para mantener el formato: `npm run format` en frontend; en backend, instala `requirements-dev.txt` y ejecuta `venv/bin/black horion accounts core nasa_private science opportunities scripts manage.py`.

La primera vez que se ejecutan pruebas de navegador puede ser necesario `npx playwright install chromium`. Playwright usa puertos 3011 y 8011 y una base temporal; no modifica la base de desarrollo. Comprueba navegación, formularios, roles, descarga, liberación, moderación, postulaciones, portal cerrado, responsive y accesibilidad automática.

## Edición manual frecuente

| Cambio | Lugar |
| --- | --- |
| Texto de la portada | `src/pages/public/Landing.jsx` |
| Colores, tamaños y tipografías | `src/index.css` y `design-system/horion/MASTER.md` |
| Menús | `src/config/navigation.js` |
| Campos de un formulario | Página correspondiente + serializer Django |
| Registros de misiones, astronautas o convocatorias | Django Admin `/admin/` |
| Reglas de negocio | Servicios y serializers del módulo correspondiente |
| Conexiones, secretos, correo y almacenamiento | `horion-backend/.env` |
| Nuevas columnas en la base | `models.py`, `makemigrations`, `migrate` |

La transformación de nombres a UUID y de fechas a días de misión es **seudonimización**, no una garantía automática de anonimato clínico. Antes de usar datos reales se requiere revisar el riesgo de reidentificación de la combinación de biomarcadores, misión y edad.
