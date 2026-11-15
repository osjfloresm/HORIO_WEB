import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Orbit,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Globe2,
  ShieldCheck,
  Radio,
} from 'lucide-react'
import { useAuth, usePortal, useToast } from '../context/AppContext'
import { nasaNavigation, scienceNavigation, opportunityNavigation } from '../config/navigation'
import { label, homeFor } from '../lib/format'
import { Button, LinkButton } from './ui'
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Horion, inicio">
      <span className="brand-symbol">
        <Orbit size={30} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span>
        HORION<span className="brand-caption">SPACE HEALTH ECOSYSTEM</span>
      </span>
    </Link>
  )
}
export function PublicHeader() {
  const { user } = useAuth(),
    portal = usePortal()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  return (
    <header className="public-header">
      <div className="public-nav">
        <Brand />
        <button
          className="icon-button mobile-only"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          aria-label="Navegación principal"
          className={open ? 'public-links open' : 'public-links'}
        >
          <NavLink to="/open-science/repositories">Ciencia abierta</NavLink>
          {portal.data?.portal_habilitado && (
            <NavLink to="/opportunities/board">
              Convocatorias
              <ArrowUpRight size={14} aria-hidden="true" />
            </NavLink>
          )}
          <a href="/#ecosistema">El ecosistema</a>
          <LinkButton variant="secondary" to={user ? homeFor(user.role) : '/login'}>
            {user ? 'Mi espacio de trabajo' : 'Acceder a Horion'}
            <ArrowUpRight size={16} aria-hidden="true" />
          </LinkButton>
        </nav>
      </div>
    </header>
  )
}
export function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <PublicHeader />
      <main id="main">
        <Outlet />
      </main>
      <footer className="public-footer">
        <Brand />
        <p>Desde la órbita. Para la vida en la Tierra.</p>
        <span>Prototipo de investigación · Sin afiliación oficial con NASA</span>
      </footer>
    </>
  )
}
export function WorkspaceLayout() {
  const { user, signOut } = useAuth(),
    portal = usePortal(),
    notify = useToast()
  const [open, setOpen] = useState(false),
    [leaving, setLeaving] = useState(false)
  const location = useLocation(),
    navigate = useNavigate()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])
  const isAdmin = user?.role === 'NASA_ADMIN'
  const navGroups = [
    ...(isAdmin ? [{ title: 'CONSOLA NASA', items: nasaNavigation }] : []),
    { title: 'CIENCIA ABIERTA', items: scienceNavigation },
    ...(portal.data?.portal_habilitado || location.pathname.startsWith('/opportunities') || isAdmin
      ? [{ title: 'OPORTUNIDADES', items: opportunityNavigation }]
      : []),
  ]
  const active = [...nasaNavigation, ...scienceNavigation, ...opportunityNavigation].find(
    (item) => item.to === location.pathname,
  )
  const logout = async () => {
    setLeaving(true)
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      notify(error.message)
    } finally {
      setLeaving(false)
    }
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar navegación"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Cerrar navegación"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Globe2 size={17} aria-hidden="true" />
          </span>
          <div>
            Centro de operaciones<small>Horion Web Platform</small>
          </div>
          <ChevronRight size={14} aria-hidden="true" />
        </div>
        <nav aria-label="Módulos de Horion">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items
                .filter((item) => !item.roles || item.roles.includes(user?.role))
                .map(({ to, label: text, icon: Icon }) => (
                  <NavLink key={to} to={to}>
                    <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                    <span>{text}</span>
                    <span className="nav-active-dot" />
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <Radio size={16} aria-hidden="true" />
            <div>
              Horion Ground<small>Plataforma de investigación</small>
            </div>
          </div>
          {user ? (
            <div className="user-block">
              <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{label(user.role)}</small>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar sesión"
                onClick={logout}
                disabled={leaving}
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <LinkButton to="/login" variant="secondary">
              Iniciar sesión
              <ArrowUpRight size={16} aria-hidden="true" />
            </LinkButton>
          )}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Abrir navegación"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Horion</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{active?.label || 'Postulación'}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-label">
              <ShieldCheck size={15} aria-hidden="true" />
              {isAdmin ? 'Entorno privado' : 'Ciencia conectada'}
            </span>
            <Link to="/" className="icon-button" aria-label="Ir al sitio público">
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </header>
        <main id="main" className="workspace-main">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>
            HORION <span className="muted">/ Ground research platform</span>
          </span>
          <span>Todos los tiempos en UTC</span>
        </footer>
      </div>
    </div>
  )
}
