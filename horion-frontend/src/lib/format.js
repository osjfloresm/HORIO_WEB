export const number = (value) => new Intl.NumberFormat('es-EC').format(value ?? 0)
export const money = (value) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value),
      )
    : 'Sin registro'
export const datetime = (value) =>
  value
    ? new Intl.DateTimeFormat('es-EC', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(value)) + ' UTC'
    : 'Sin registro'
export const labels = {
  NASA_ADMIN: 'Oficial médico',
  RESEARCHER: 'Investigador',
  PROFESSIONAL: 'Profesional',
  ENTERPRISE: 'Empresa',
  RECIBIDO: 'Recibido',
  ANONIMIZADO: 'Anonimizado',
  PUBLICADO: 'Publicado',
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  EN_ANALISIS: 'En análisis',
  PROTOCOLO_DISENADO: 'Protocolo diseñado',
  APROBADO_MISION: 'Aprobado para misión',
  BORRADOR: 'Borrador',
  ABIERTA: 'Abierta',
  EN_EVALUACION: 'En evaluación',
  CERRADA: 'Cerrada',
  ADJUDICADA: 'Adjudicada',
  RECIBIDA: 'Recibida',
  EN_REVISION: 'En revisión técnica',
  FINALISTA: 'Finalista',
  SELECCIONADA: 'Seleccionada',
  NO_SELECCIONADA: 'No seleccionada',
  PROFESIONALES: 'Profesionales',
  EMPRESAS: 'Empresas',
  AMBOS: 'Todos los perfiles',
  HARDWARE_SENSORES: 'Hardware y sensores',
  SOFTWARE_ESPACIAL: 'Software espacial',
  FARMACEUTICA: 'Biotecnología y fármacos',
  MISION_TRIPULADA: 'Misiones tripuladas',
  TERAPIA_MEDICA: 'Terapias médicas',
  CAMPANA_SALUD: 'Campañas de salud',
  INFO: 'Informativa',
  WARNING: 'Precaución',
  CRITICAL: 'Crítica',
  OFFLINE_ALGO: 'Algoritmo local',
  ONLINE_GEMINI: 'Orbi · Gemini',
}
export const label = (value) => labels[value] || value
export const options = (values) => values.map((value) => ({ value, label: label(value) }))
export const homeFor = (role) =>
  role === 'NASA_ADMIN'
    ? '/nasa-admin/telemetry'
    : role === 'RESEARCHER'
      ? '/open-science/repositories'
      : '/opportunities/board'
