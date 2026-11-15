# Verificación de la entrega

- `manage.py check`: sin problemas.
- `makemigrations --check --dry-run`: no hay cambios de modelos pendientes.
- 24 pruebas de backend: aprobadas en SQLite y PostgreSQL 17 temporal.
- 6 pruebas E2E de navegador: aprobadas, 33,4 segundos en la última ejecución.
- `npm run build`: compilación de producción correcta.
- `npm run format:check`: código con formato consistente.
- `npm audit --omit=dev`: 0 vulnerabilidades reportadas en dependencias de producción en esta ejecución.

Las pruebas de navegador cubren registro real, cuatro roles, navegación por los cinco módulos administrativos, creación de protocolo, inspección y publicación de dataset, creación/edición/cierre de convocatoria, evaluación, descarga CSV, subida y aprobación de PDF, postulación profesional/empresa y suscripción al portal cerrado. La base de pruebas es temporal y está separada de la base de desarrollo.

Se comprobó ausencia de desbordamiento horizontal de la portada en 375, 768, 1024 y 1440 px, además de la consola en móvil. Axe no reportó infracciones de las etiquetas WCAG 2 A/AA y 2.1 AA en portada y telemetría. Esto es una comprobación automatizada de esas páginas, no una certificación integral de accesibilidad. Se revisaron visualmente las capturas de escritorio y móvil.

## Capturas

- [Portada de escritorio](previews/portada-escritorio.png)
- [Portada móvil](previews/portada-movil.png)
- [Consola de escritorio](previews/consola-escritorio.png)
- [Consola móvil](previews/consola-movil.png)

## Límites comprobados

La validación JWT de Supabase se probó con claves RSA y tokens firmados en tests, incluyendo issuer incorrecto, firma inválida y metadatos de rol no confiables. No se conectó un proyecto Supabase externo ni se probó su bucket real. Horion Edge se probó mediante el contrato de API y datos simulados; no se modificó la aplicación de escritorio. Los avisos de correo requieren configuración SMTP y ejecución explícita del comando de envío.
