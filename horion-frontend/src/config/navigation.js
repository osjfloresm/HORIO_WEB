import {
  Activity,
  FlaskConical,
  ShieldCheck,
  ClipboardCheck,
  Telescope,
  Database,
  BookOpen,
  BriefcaseBusiness,
  Send,
} from 'lucide-react'
export const nasaNavigation = [
  { to: '/nasa-admin/telemetry', label: 'Control de misión', icon: Activity },
  { to: '/nasa-admin/research-lab', label: 'Laboratorio clínico', icon: FlaskConical },
  { to: '/nasa-admin/data-release', label: 'Liberación de datos', icon: ShieldCheck },
  { to: '/nasa-admin/moderation', label: 'Moderación científica', icon: ClipboardCheck },
  { to: '/nasa-admin/calls-manager', label: 'Gestor de convocatorias', icon: Telescope },
]
export const scienceNavigation = [
  { to: '/open-science/repositories', label: 'Explorar repositorios', icon: Database },
  { to: '/open-science/contributions', label: 'Aportaciones científicas', icon: BookOpen },
]
export const opportunityNavigation = [
  { to: '/opportunities/board', label: 'Convocatorias abiertas', icon: BriefcaseBusiness },
  {
    to: '/opportunities/my-applications',
    label: 'Mis postulaciones',
    icon: Send,
    roles: ['PROFESSIONAL', 'ENTERPRISE'],
  },
]
