import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { Providers, useAuth } from './context/AppContext'
import { PublicLayout, WorkspaceLayout } from './components/Layout'
import { Loading, Empty, LinkButton } from './components/ui'
import { homeFor } from './lib/format'
const Landing = lazy(() => import('./pages/public/Landing'))
const Auth = lazy(() => import('./pages/public/Auth'))
const NotFound = lazy(() => import('./pages/public/NotFound'))
const Telemetry = lazy(() => import('./pages/nasa/Telemetry'))
const ResearchLab = lazy(() => import('./pages/nasa/ResearchLab'))
const DataRelease = lazy(() => import('./pages/nasa/DataRelease'))
const Moderation = lazy(() => import('./pages/nasa/Moderation'))
const CallsManager = lazy(() => import('./pages/nasa/CallsManager'))
const Repositories = lazy(() => import('./pages/science/Repositories'))
const Contributions = lazy(() => import('./pages/science/Contributions'))
const Board = lazy(() => import('./pages/opportunities/Board'))
const Apply = lazy(() => import('./pages/opportunities/Apply'))
const MyApplications = lazy(() => import('./pages/opportunities/MyApplications'))
function Guard({ roles }) {
  const { user, checking } = useAuth(),
    location = useLocation()
  if (checking) return <Loading />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(user.role))
    return (
      <Empty
        title="Este espacio requiere otro perfil"
        description="Tu cuenta no tiene permisos para acceder a este módulo."
        action={<LinkButton to={homeFor(user.role)}>Ir a mi espacio</LinkButton>}
      />
    )
  return <Outlet />
}
function RouteEffects() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    const names = {
      '/': 'Ciencia más allá del horizonte',
      '/login': 'Iniciar sesión',
      '/register': 'Crear cuenta',
      '/nasa-admin/telemetry': 'Control de misión',
      '/nasa-admin/research-lab': 'Laboratorio clínico',
      '/nasa-admin/data-release': 'Liberación de datos',
      '/nasa-admin/moderation': 'Moderación científica',
      '/nasa-admin/calls-manager': 'Gestor de convocatorias',
      '/open-science/repositories': 'Repositorios',
      '/open-science/contributions': 'Aportaciones científicas',
      '/opportunities/board': 'Convocatorias',
      '/opportunities/my-applications': 'Mis postulaciones',
    }
    document.title = `Horion · ${names[location.pathname] || 'Plataforma de investigación'}`
  }, [location.pathname])
  return null
}
export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <RouteEffects />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Landing />} />
              <Route path="login" element={<Auth key="login" />} />
              <Route path="register" element={<Auth register key="register" />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route element={<WorkspaceLayout />}>
              <Route element={<Guard roles={['NASA_ADMIN']} />}>
                <Route
                  path="nasa-admin"
                  element={<Navigate to="/nasa-admin/telemetry" replace />}
                />
                <Route path="nasa-admin/telemetry" element={<Telemetry />} />
                <Route path="nasa-admin/research-lab" element={<ResearchLab />} />
                <Route path="nasa-admin/data-release" element={<DataRelease />} />
                <Route path="nasa-admin/moderation" element={<Moderation />} />
                <Route path="nasa-admin/calls-manager" element={<CallsManager />} />
              </Route>
              <Route
                path="open-science"
                element={<Navigate to="/open-science/repositories" replace />}
              />
              <Route path="open-science/repositories" element={<Repositories />} />
              <Route path="open-science/contributions" element={<Contributions />} />
              <Route
                path="opportunities"
                element={<Navigate to="/opportunities/board" replace />}
              />
              <Route path="opportunities/board" element={<Board />} />
              <Route path="opportunities/apply/:id" element={<Apply />} />
              <Route element={<Guard roles={['PROFESSIONAL', 'ENTERPRISE']} />}>
                <Route path="opportunities/my-applications" element={<MyApplications />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </Providers>
    </BrowserRouter>
  )
}
