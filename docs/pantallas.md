# Matriz de cobertura de pantallas

Las rutas se conservan según la especificación original. Se añaden login y 404 para completar la navegación.

| Ruta | Archivo en `horion-frontend/src/pages/` | Comportamiento |
| --- | --- | --- |
| `/` | `public/Landing.jsx` | Métricas de la API cada 30 s; enlaces a ciencia y convocatorias condicionados por estado |
| `/register` | `public/Auth.jsx` | Tres perfiles; institución/ORCID, especialidad/ORCID o razón social/ID fiscal/sector |
| `/login` | `public/Auth.jsx` | JWT; redirección por rol o regreso al formulario solicitado |
| `/nasa-admin/telemetry` | `nasa/Telemetry.jsx` | Lotes con hash, tripulación, últimas lecturas, alertas offline y transcripciones Orbi |
| `/nasa-admin/research-lab` | `nasa/ResearchLab.jsx` | Cruce interactivo de biomarcadores; crear y editar protocolos y estado |
| `/nasa-admin/data-release` | `nasa/DataRelease.jsx` | Pendientes/publicados, inspector antes/después y publicación confirmada |
| `/nasa-admin/moderation` | `nasa/Moderation.jsx` | Filtros por estado; leer PDF, DOI; aprobar o rechazar con feedback |
| `/nasa-admin/calls-manager` | `nasa/CallsManager.jsx` | Switch maestro, creación/edición/cierre de convocatoria y evaluación de postulaciones |
| `/open-science/repositories` | `science/Repositories.jsx` | Filtros de texto, misión, edad y días; selección de biomarcador; gráficas y CSV/JSON |
| `/open-science/contributions` | `science/Contributions.jsx` | Muro aprobado; envíos propios pendientes/rechazados; modal PDF/DOI y dataset |
| `/opportunities/board` | `opportunities/Board.jsx` | Pestañas profesionales/empresas; presupuesto, cierre y dataset de referencia |
| `/opportunities/apply/:id` | `opportunities/Apply.jsx` | Detalle público; formulario adaptado al rol; autenticación antes de enviar |
| `/opportunities/my-applications` | `opportunities/MyApplications.jsx` | Historial propio, etapas y observaciones; consulta automática cada 30 s |
| Portal deshabilitado | `opportunities/ClosedPortal.jsx` | Mensaje configurable y suscripción persistente; se usa en tablero y formulario |
| Ruta desconocida | `public/NotFound.jsx` | 404 con regreso al inicio |

El seguimiento de postulaciones existentes permanece disponible cuando el portal se cierra; los nuevos envíos se bloquean en Django. Un cambio de rol en el navegador no concede permisos: cada endpoint comprueba el usuario autenticado.

# Correspondencia de los 14 modelos

| Esquema | Modelo del documento | Clase Django |
| --- | --- | --- |
| nasa_private | misiones | Mission |
| nasa_private | astronautas | Astronaut |
| nasa_private | lotes_sincronizacion | SyncBatch |
| nasa_private | telemetria_cruda | Telemetry |
| nasa_private | alertas_y_asistencia_desktop | DesktopAlert |
| nasa_private | historial_orbi_gemini | OrbiMessage |
| nasa_private | investigaciones_internas_nasa | Research |
| open_science | repositorios_datasets | Repository |
| open_science | registros_anonimizados | AnonymizedRecord |
| open_science | aportaciones_cientificas | Contribution |
| nasa_opportunities | configuracion_portal_convocatorias | PortalConfig |
| nasa_opportunities | convocatorias | Call |
| nasa_opportunities | perfiles_postulantes | ApplicantProfile |
| nasa_opportunities | postulaciones | Application |

Se añaden `accounts.Profile` para RBAC e identidad, `core.AuditEvent` para trazabilidad y `opportunities.Subscription` para suscripciones.
