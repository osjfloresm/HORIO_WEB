# Especificación Técnica y Funcional: Plataforma Web Horion

**Stack Tecnológico:** Frontend en **React (Vite + TailwindCSS)** | Backend en **Python (Django + Django REST Framework)** | Base de Datos en **PostgreSQL (Supabase)**  
**Integración Directa:** Sincronización bidireccional con la aplicación de escritorio **Horion Edge** (Flutter + FastAPI + SQLite + Gemini API).

---

## 1. Visión General y Diseño Visual de la Plataforma Web

**Horion Web** es el ecosistema central en Tierra que transforma los datos biométricos recopilados en órbita por los astronautas en investigación médica, ciencia abierta y convocatorias tecnológicas/profesionales lideradas por la NASA.

### 1.1. Identidad Visual y Experiencia de Usuario (Space-Grade UI)
* **Estética Aeroespacial (Dark Mode por defecto):** Inspirada en consolas de control de misión modernas (*NASA Artemis / JPL*).
* **Paleta de Colores:**
  * **Fondo Principal (`Deep Space`):** `#060913`
  * **Superficies / Tarjetas (`Orbital Glass`):** `#0F1626` con bordes sutiles `#1E293B` y desenfoque (`backdrop-blur-md`).
  * **Color Primario (`NASA Aerospace Blue`):** `#0B3D91` con acentos interactivos en `#38BDF8` (Cyan telemetría).
  * **Acento Crítico / Alertas (`Horizon Crimson`):** `#FC3D21`
  * **Estados:** Nominal `#10B981` | Precaución `#F59E0B` | Crítico `#EF4444`
* **Tipografía:**
  * *Títulos y Marca (`HORION`):* `Space Grotesk` / `Orbitron`
  * *Lectura e Investigación:* `Inter`
  * *Datos Biométricos, IDs, Hashes SHA-256 y Códigos TRL:* `JetBrains Mono`

---

## 2. Arquitectura de Roles y Control de Acceso (RBAC)

El sistema gestiona **4 perfiles de usuario** claramente diferenciados mediante autenticación JWT (Django + Supabase Auth):

| Rol | Identificador | Descripción y Permisos Principales |
| :--- | :--- | :--- |
| **Administrador / Oficial Médico NASA** | `NASA_ADMIN` | Control total. Recibe y audita los datos sincronizados desde **Horion Edge**, investiga internamente para futuras terapias, ejecuta y aprueba la anonimización hacia repositorios públicos, modera aportes científicos y **habilita/cierra convocatorias** para profesionales y empresas. |
| **Médico / Investigador Científico** | `RESEARCHER` | Acceso al **Portal de Ciencia Abierta**. Explora, filtra y descarga datasets anonimizados (CSV/JSON), visualiza métricas agregadas y sube sus propios artículos, análisis o modelos predictivos. |
| **Profesional Especialista** | `PROFESSIONAL` | Acceso al **Portal de Convocatorias NASA** (cuando esté habilitado). Consulta vacantes/necesidades de misiones, diseño de terapias o campañas médicas y postula con su perfil profesional (ORCID/CV) y propuesta clínica. |
| **Empresa / Proveedor Tecnológico** | `ENTERPRISE` | Acceso al **Portal de Convocatorias NASA**. Consulta requerimientos técnicos de la NASA basados en hallazgos de salud (nuevos biosensores, hardware espacial, software médico, fármacos) y envía propuestas técnicas/económicas indicando su nivel **TRL**. |

---

## 3. Modelo de Base de Datos Relacional (PostgreSQL en Supabase)

Para garantizar seguridad clínica estricta y compatibilidad total con la base de datos local `SQLite` de **Horion Edge**, PostgreSQL se organiza en **tres esquemas lógicos**:

### 3.1. Esquema `nasa_private` (Datos Confidenciales y Sincronización Desktop)
1. **`misiones`**:
   * `id` (UUID, PK), `codigo_mision` (VARCHAR, Unique, ej. `ARTEMIS-IV`), `nombre` (VARCHAR), `fecha_inicio` (TIMESTAMP), `estado` (`ACTIVA`, `PLANIFICADA`, `FINALIZADA`).
2. **`astronautas`**:
   * `id` (UUID, PK), `codigo_astronauta` (VARCHAR, Unique — *Llave de sincronización con Horion Edge*), `uuid_anonimo` (UUID, Unique — *Identificador público generado*), `mision_id` (FK), `nombre_completo` (VARCHAR), `fecha_nacimiento` (DATE), `grupo_sanguineo` (VARCHAR), `alergias` (TEXT), `ultima_sincronizacion` (TIMESTAMP).
3. **`lotes_sincronizacion`**:
   * `id` (UUID, PK), `astronauta_id` (FK), `hash_sha256` (VARCHAR(64), Unique — *Garantiza integridad y cero duplicados*), `cantidad_registros` (INT), `fecha_recepcion` (TIMESTAMP), `estado_liberacion` (`RECIBIDO`, `ANONIMIZADO`, `PUBLICADO`).
4. **`telemetria_cruda`**:
   * `id` (BIGSERIAL, PK), `lote_id` (FK), `astronauta_id` (FK), `timestamp_utc` (TIMESTAMP), `frecuencia_cardiaca` (INT), `spo2` (DECIMAL), `hrv` (DECIMAL), `temperatura_corporal` (DECIMAL), `horas_sueno` (DECIMAL).
5. **`alertas_y_asistencia_desktop`**:
   * `id` (BIGSERIAL, PK), `astronauta_id` (FK), `timestamp_utc` (TIMESTAMP), `nivel_severidad` (`INFO`, `WARNING`, `CRITICAL`), `metrica_afectada` (VARCHAR), `valor_detectado` (DECIMAL), `recomendacion_entregada` (TEXT), `modo_generacion` (`OFFLINE_ALGO`, `ONLINE_GEMINI`).
6. **`historial_orbi_gemini`**:
   * `id` (BIGSERIAL, PK), `astronauta_id` (FK), `timestamp_utc` (TIMESTAMP), `rol` (`user`, `orbi`), `mensaje` (TEXT), `contexto_biometrico_json` (JSONB).
7. **`investigaciones_internas_nasa`**:
   * `id` (UUID, PK), `titulo_terapia` (VARCHAR), `objetivo_clinico` (TEXT), `mision_objetivo_id` (FK), `hallazgos_biometricos` (TEXT), `estado` (`EN_ANALISIS`, `PROTOCOLO_DISENADO`, `APROBADO_MISION`), `creado_por` (FK -> `auth_users`).

### 3.2. Esquema `open_science` (Repositorios Públicos para Médicos e Investigadores)
8. **`repositorios_datasets`**:
   * `id` (UUID, PK), `lote_origen_id` (FK -> `lotes_sincronizacion.id`), `titulo_dataset` (VARCHAR), `descripcion` (TEXT), `codigo_mision` (VARCHAR), `total_registros` (INT), `fecha_liberacion` (TIMESTAMP), `publicado` (BOOLEAN, Default: `False`).
9. **`registros_anonimizados`**:
   * `id` (BIGSERIAL, PK), `repositorio_id` (FK -> `repositorios_datasets.id`), `uuid_sujeto` (UUID — *Sin FK a astronautas para evitar reidentificación*), `dia_mision` (INT — *Fecha exacta ofuscada*), `rango_edad` (VARCHAR, ej. `30-35`), `frecuencia_cardiaca` (INT), `spo2` (DECIMAL), `hrv` (DECIMAL), `horas_sueno` (DECIMAL).
10. **`aportaciones_cientificas`**:
    * `id` (UUID, PK), `repositorio_id` (FK -> `repositorios_datasets.id`), `investigador_id` (FK -> `auth_users.id`), `titulo` (VARCHAR), `resumen_metodologia` (TEXT), `doi_o_enlace` (URL), `archivo_url` (URL — *Supabase Storage*), `estado_moderacion` (`PENDIENTE`, `APROBADO`, `RECHAZADO`), `comentarios_nasa` (TEXT), `fecha_envio` (TIMESTAMP).

### 3.3. Esquema `nasa_opportunities` (Portal Dinámico de Convocatorias)
11. **`configuracion_portal_convocatorias`**:
    * `id` (INT, PK = 1), `portal_habilitado` (BOOLEAN, Default: `False` — *Interruptor maestro controlado por la NASA*), `mensaje_estado` (TEXT), `actualizado_por` (FK -> `auth_users.id`), `fecha_actualizacion` (TIMESTAMP).
12. **`convocatorias`**:
    * `id` (UUID, PK), `codigo_convocatoria` (VARCHAR, Unique, ej. `NASA-CALL-2026-01`), `titulo` (VARCHAR), `categoria_destinatario` (`PROFESIONALES`, `EMPRESAS`, `AMBOS`), `tipo_necesidad` (`MISION_TRIPULADA`, `TERAPIA_MEDICA`, `CAMPANA_SALUD`, `HARDWARE_SENSORES`, `SOFTWARE_ESPACIAL`, `FARMACEUTICA`), `descripcion_detallada` (TEXT), `requisitos_tecnicos` (TEXT), `repositorio_datos_vinculado_id` (FK -> `repositorios_datasets.id`, Nullable — *Conecta la necesidad con los datos que la originaron*), `presupuesto_estimado` (DECIMAL), `fecha_apertura` (TIMESTAMP), `fecha_cierre` (TIMESTAMP), `estado` (`BORRADOR`, `ABIERTA`, `EN_EVALUACION`, `CERRADA`, `ADJUDICADA`).
13. **`perfiles_postulantes`**:
    * `id` (UUID, PK), `user_id` (FK -> `auth_users.id`), `tipo_perfil` (`PROFESIONAL`, `EMPRESA`), `nombre_o_razon_social` (VARCHAR), `identificador_legal_o_orcid` (VARCHAR), `pais` (VARCHAR), `areas_especialidad` (JSONB), `sitio_web_o_portafolio` (URL), `verificado` (BOOLEAN).
14. **`postulaciones`**:
    * `id` (UUID, PK), `convocatoria_id` (FK -> `convocatorias.id`), `postulante_id` (FK -> `perfiles_postulantes.id`), `titulo_propuesta` (VARCHAR), `propuesta_tecnica_o_clinica` (TEXT), `nivel_trl` (INT, Nullable — *Escala 1 a 9 para hardware/software/fármacos de empresas*), `presupuesto_o_honorarios` (DECIMAL), `documento_adjunto_url` (URL — *Supabase Storage*), `estado` (`RECIBIDA`, `EN_REVISION`, `FINALISTA`, `SELECCIONADA`, `NO_SELECCIONADA`), `evaluacion_nasa` (TEXT), `fecha_postulacion` (TIMESTAMP).

---

## 4. Especificación de Pantallas y Funcionalidades por Rol

### 4.1. Vistas Públicas y Navegación Principal (`Navbar`)
* **Landing Page (`/`):** Presentación del ecosistema **Horion**, métricas en tiempo real (registros biométricos liberados, investigaciones publicadas, convocatorias activas), acceso al Portal de Ciencia Abierta y enlace dinámico al **Portal de Convocatorias** (visible/activo solo cuando `portal_habilitado = True`).
* **Registro Inteligente (`/register`):** El usuario elige su rol al crear cuenta:
  * *Médico / Investigador* (solicita institución y código ORCID).
  * *Profesional Especialista* (solicita especialidad médica/técnica y CV/ORCID).
  * *Empresa / Proveedor Tecnológico* (solicita razón social, ID fiscal/DUNS y sector: Hardware, Software, Biotecnología).

---

### 4.2. Módulo 1: Consola de Administración NASA (`/nasa-admin/*`)
*Acceso exclusivo para `NASA_ADMIN`.*

1. **Dashboard de Recepción y Monitoreo Desktop (`/nasa-admin/telemetry`):**
   * Visualiza los lotes sincronizados desde **Horion Edge** (validados con SHA-256), estado de salud de los astronautas en misión, alertas resueltas en modo *Offline* por algoritmos locales y transcripciones médicas del asistente **Orbi (Gemini)**.
2. **Laboratorio de Investigación Clínica (`/nasa-admin/research-lab`):**
   * Herramienta analítica donde los médicos de la NASA cruzan variables biométricas (ej. pérdida ósea vs. horas de ejercicio o HRV vs. ciclos de sueño) para documentar protocolos de **nuevas terapias y tratamientos para futuras misiones**.
3. **Centro de Anonimización y Liberación de Datos (`/nasa-admin/data-release`):**
   * Muestra los lotes recién recibidos de la app desktop.
   * **Inspector de Privacidad (Antes vs. Después):** Verifica que el nombre del astronauta haya sido reemplazado por `uuid_sujeto`, los datos sensibles eliminados y las fechas convertidas a `dia_mision`.
   * Botón **`Liberar al Repositorio Público`**, que publica el dataset en **Horion Open Science**.
4. **Moderación de Aportaciones Científicas (`/nasa-admin/moderation`):**
   * Bandeja de revisión de los estudios y modelos enviados por médicos e investigadores externos, con botones para **`Aprobar y Publicar`** o **`Rechazar con Feedback`**.
5. **Gestor del Portal de Convocatorias (`/nasa-admin/calls-manager`):**
   * **Interruptor Maestro (`Switch`):** Botón destacado **`Habilitar / Deshabilitar Portal de Convocatorias Públicas`**. Permite a la NASA encender o apagar el módulo de convocatorias según sus necesidades operativas.
   * **Creador de Convocatorias Basadas en Datos:** Formulario para abrir nuevas ofertas/necesidades (para *Profesionales* o *Empresas*), permitiendo vincular directamente el **Repositorio de Datos** que evidencia la necesidad (ej. *"Se requiere nuevo biosensor de SpO2 de bajo consumo tras anomalías detectadas en EXP-72"*).
   * **Evaluador de Postulaciones:** Tabla con todas las postulaciones recibidas, filtros por **Nivel TRL (1-9)**, presupuesto y especialidad, y botones para seleccionar ganadores/proveedores.

---

### 4.3. Módulo 2: Portal de Ciencia Abierta (`/open-science/*`)
*Acceso para `RESEARCHER` (y lectura previa pública).*

1. **Explorador de Repositorios Biométricos (`/open-science/repositories`):**
   * Catálogo de datasets liberados por la NASA.
   * Filtros interactivos por misión, rango de edad, duración en microgravedad y biomarcadores.
   * Gráficos interactivos integrados en React (`Recharts`) y botones de descarga directa en **CSV** y **JSON**.
2. **Muro de Aportaciones Científicas (`/open-science/contributions`):**
   * Listado de investigaciones, algoritmos predictivos y análisis médicos aprobados por la NASA.
   * **Modal *"Subir Aportación Científica"*:** Permite a médicos e investigadores adjuntar su paper (PDF), enlace a código/DOI, seleccionar el repositorio de datos utilizado y enviarlo a revisión.

---

### 4.4. Módulo 3: Portal de Convocatorias NASA (`/opportunities/*`)
*Acceso dinámico controlado por `configuracion_portal_convocatorias.portal_habilitado`.*

* **Estado Deshabilitado (`portal_habilitado = False`):** Muestra una pantalla informativa oficial indicando que actualmente no hay ventanas de convocatoria abiertas, permitiendo suscribirse a notificaciones.
* **Estado Habilitado (`portal_habilitado = True`):**
  1. **Tablero de Necesidades y Ofertas NASA (`/opportunities/board`):**
     * Pestañas claras: **`Para Profesionales (Misiones, Terapias y Campañas)`** y **`Para Empresas (Hardware, Software y Fármacos)`**.
     * Cada tarjeta muestra: Código de convocatoria, Área requerida, Presupuesto referencial, Fecha de cierre y un enlace directo al **Dataset Anonimizado de Referencia** para que los postulantes estudien los datos reales antes de proponer una solución.
  2. **Formulario de Postulación Adaptativo (`/opportunities/apply/:id`):**
     * **Si postula un Profesional (`PROFESSIONAL`):** Solicita especialidad, experiencia clínica/aeroespacial, propuesta de intervención/terapia y adjunto de CV/credenciales.
     * **Si postula una Empresa (`ENTERPRISE`):** Solicita categoría de solución (*Nuevo Sensor / Hardware*, *Software Optimizado*, *Medicamento / Suplemento*), **Nivel de Madurez Tecnológica (TRL 1 al 9)**, propuesta técnica, cotización y ficha técnica en PDF.
  3. **Panel *"Mis Postulaciones"* (`/opportunities/my-applications`):** Seguimiento en tiempo real del estado de evaluación (`Recibida`, `En Revisión Técnica`, `Finalista`, `Seleccionada`) y lectura de observaciones de la NASA.

---

## 5. Endpoints Clave de la API REST (Django)

```text
# Sincronización desde App Desktop (Horion Edge)
POST   /api/v1/sync/ingest/                        # Recibe lotes SQLite con firma SHA-256

# Administración NASA (NASA_ADMIN)
GET    /api/v1/nasa/lotes-pendientes/              # Lista datos recibidos sin liberar
POST   /api/v1/nasa/lotes/{id}/liberar/            # Ejecuta anonimización y publica en Open Science
GET    /api/v1/nasa/investigaciones/               # CRUD de terapias internas para futuras misiones
PATCH  /api/v1/nasa/portal-convocatorias/toggle/   # Habilita o deshabilita el portal de convocatorias
POST   /api/v1/nasa/convocatorias/                 # Crea nueva convocatoria vinculada a datos
PATCH  /api/v1/nasa/postulaciones/{id}/evaluar/    # Evalúa postulación de profesional o empresa

# Ciencia Abierta (RESEARCHER)
GET    /api/v1/science/repositorios/               # Lista datasets públicos anonimizados
GET    /api/v1/science/repositorios/{id}/export/   # Descarga dataset en CSV o JSON
POST   /api/v1/science/aportaciones/               # Sube investigación o modelo predictivo

# Portal de Convocatorias (PROFESSIONAL & ENTERPRISE)
GET    /api/v1/opportunities/status/               # Verifica si el portal está habilitado por NASA
GET    /api/v1/opportunities/convocatorias/        # Lista convocatorias abiertas con filtros
POST   /api/v1/opportunities/postular/             # Envía propuesta de profesional o empresa
```

---

## 6. Plan de Implementación Sugerido (MVP Web)

1. **Fase 1 (Base de Datos y Backend Core):** Configurar PostgreSQL en Supabase con los 3 esquemas (`nasa_private`, `open_science`, `nasa_opportunities`), construir los modelos en Django y probar el endpoint `/api/v1/sync/ingest/` con datos simulados de la app desktop.
2. **Fase 2 (Consola NASA Admin):** Implementar en React el dashboard de telemetría privada, el botón de anonimización/liberación de repositorios y el interruptor + creador de convocatorias.
3. **Fase 3 (Portal Ciencia Abierta):** Desarrollar el explorador de datasets con gráficas, descarga CSV/JSON y el formulario de aportaciones para médicos e investigadores.
4. **Fase 4 (Portal de Convocatorias):** Construir el tablero público dinámico (condicionado al estado habilitado por la NASA) y los flujos de postulación diferenciados para profesionales y empresas.