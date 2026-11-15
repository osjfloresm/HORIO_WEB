# HORION — Sistema de diseño

Fuente: especificación del usuario + UI UX Pro Max, consulta verificada `scientific analytics dashboard` (Data-Dense Dashboard). La primera consulta devolvió un estilo lúdico inadecuado y se descartó. Las recomendaciones React de formularios corresponden a React 19; este proyecto conserva React 18 y usa formularios controlados convencionales.

## Dirección
Consola aeroespacial oscura, precisa y legible. Landing editorial con un horizonte orbital vectorial; aplicación con navegación lateral, encabezados claros y un único CTA principal. Sin logotipos oficiales ni afirmaciones de afiliación.

## Tokens
- Fondo #060913, superficie #0F1626, bordes #1E293B.
- Primario #0B3D91; interacción #38BDF8 con texto oscuro.
- Texto #F1F5F9, secundario #A3B2C7.
- Crítico #FC3D21; nominal #10B981; precaución #F59E0B.
- Space Grotesk en títulos, Inter en lectura, JetBrains Mono en identificadores.
- Espaciado 4/8/12/16/24/32/48/64 px; radios 8/12/16 px.

## Interacción y accesibilidad
Foco visible, enlaces de salto, etiquetas permanentes, objetivos táctiles de 44px, errores por campo y resumen enfocado. Modal nativo con Escape y restauración de foco. Estados de carga/error/vacío y botones deshabilitados durante escrituras. Gráficas con tabla accesible alternativa. Movimiento reducido. Responsive en 375/768/1024/1440 px.

## Organización
Tokens en src/index.css; primitivas en components/ui.jsx; navegación en config/navigation.js; páginas por módulo. Cifras y gráficas provienen de la API; datos de demostración identificados expresamente.
