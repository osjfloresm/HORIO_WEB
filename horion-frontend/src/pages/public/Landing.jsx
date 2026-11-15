import {
  ArrowUpRight,
  ArrowRight,
  Activity,
  Database,
  Telescope,
  ShieldCheck,
  Orbit,
  Radio,
  MoveUpRight,
} from 'lucide-react'
import { useResource } from '../../lib/hooks'
import { usePortal } from '../../context/AppContext'
import { number } from '../../lib/format'
import { LinkButton, SectionLink } from '../../components/ui'
function OrbitalVisual() {
  return (
    <div className="orbital-scene" aria-hidden="true">
      <div className="starfield" />
      <div className="orbit-ring ring-one" />
      <div className="orbit-ring ring-two" />
      <div className="planet">
        <div className="planet-grid" />
        <div className="planet-light" />
      </div>
      <div className="satellite">
        <span />
        <Radio size={28} strokeWidth={1.2} />
        <i />
      </div>
      <div className="orbit-label">
        <span className="status-dot" />
        LOW EARTH ORBIT
        <br />
        <small>HUMAN HEALTH · NEW FRONTIERS</small>
      </div>
      <div className="orbit-coordinates">
        0° 0′ 0″ N<br />
        THE NEXT HORIZON
      </div>
      <div className="signal-card">
        <Activity size={18} />
        <div>
          Una conexión vital<small>ÓRBITA → TIERRA</small>
        </div>
        <svg viewBox="0 0 100 32">
          <path
            d="M0 17h20l6-8 7 17 10-25 8 29 7-13h42"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  )
}
export default function Landing() {
  const overview = useResource('/overview/', { interval: 30000 }),
    portal = usePortal()
  const stats = overview.data
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">
            <span className="line-mark" />
            EL SIGUIENTE HORIZONTE DE LA SALUD
          </p>
          <h1>
            La ciencia del espacio.
            <br />
            El futuro de la <span>vida.</span>
          </h1>
          <p className="hero-description">
            Conectamos los datos de quienes exploran el universo con las ideas que transforman la
            salud en la Tierra.
          </p>
          <div className="hero-actions">
            <LinkButton to="/open-science/repositories">
              Explorar ciencia abierta
              <ArrowUpRight size={18} aria-hidden="true" />
            </LinkButton>
            <a className="button ghost" href="#ecosistema">
              Conocer el ecosistema
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="hero-proof">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Datos protegidos. Conocimiento compartido.</span>
          </div>
        </div>
        <OrbitalVisual />
        <div className="hero-index">
          <span>01 / EXPLORAR</span>
          <span>SCROLL TO DISCOVER ↓</span>
        </div>
      </section>
      <div className="landing-container">
        <section className="landing-metrics" aria-label="Actividad de la plataforma">
          {[
            { value: stats?.records, label: 'Registros biométricos', code: 'OPEN DATA' },
            { value: stats?.repositories, label: 'Datasets disponibles', code: 'REPOSITORIES' },
            { value: stats?.contributions, label: 'Investigaciones publicadas', code: 'RESEARCH' },
            { value: stats?.calls, label: 'Convocatorias activas', code: 'OPPORTUNITIES' },
          ].map((item) => (
            <div key={item.code}>
              <span className="metric-code">{item.code}</span>
              <strong>
                {stats ? number(item.value) : '—'}
                <span className="cyan">.</span>
              </strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>
        {overview.error && (
          <p className="muted text-sm">
            Las métricas no están disponibles en este momento.{' '}
            <button className="text-link" onClick={overview.refresh}>
              Reintentar
            </button>
          </p>
        )}
        {stats?.demo_mode && (
          <div className="demo-notice">
            <span className="status-dot" />
            Entorno de demostración · Métricas y registros sintéticos, sin datos clínicos reales.
          </div>
        )}
        <section id="ecosistema" className="ecosystem">
          <div className="section-heading">
            <div>
              <p className="eyebrow">UN ECOSISTEMA. MÚLTIPLES POSIBILIDADES.</p>
              <h2>
                De un dato en órbita
                <br />a un avance en la Tierra.
              </h2>
            </div>
            <p>
              Cada medición es un punto de partida.
              <br />
              Cada perspectiva, una nueva posibilidad.
            </p>
          </div>
          <div className="ecosystem-grid">
            <article className="ecosystem-card">
              <div className="card-number">
                01 <Activity size={24} aria-hidden="true" />
              </div>
              <div className="mini-wave">
                <svg viewBox="0 0 300 70">
                  <path
                    d="M0 36h48l12-18 12 34 16-50 17 65 14-31h38l10-10 11 21 13-39 15 49 10-21h84"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <h3>Una misión, conectada.</h3>
              <p>
                Monitoreo biométrico y sincronización segura con Horion Edge para acompañar cada
                misión.
              </p>
              <SectionLink to="/login">Centro de operaciones</SectionLink>
            </article>
            <article className="ecosystem-card featured">
              <div className="card-number">
                02 <Database size={24} aria-hidden="true" />
              </div>
              <div className="data-visual" aria-hidden="true">
                {Array.from({ length: 30 }, (_, index) => (
                  <span key={index} style={{ opacity: 0.2 + ((index * 7) % 10) / 12 }} />
                ))}
              </div>
              <h3>Conocimiento sin fronteras.</h3>
              <p>
                Explora repositorios anonimizados y comparte investigaciones que abren nuevas
                preguntas.
              </p>
              <SectionLink to="/open-science/repositories">Portal de ciencia abierta</SectionLink>
            </article>
            <article className="ecosystem-card">
              <div className="card-number">
                03 <Telescope size={24} aria-hidden="true" />
              </div>
              <div className="opportunity-visual" aria-hidden="true">
                <Orbit size={66} strokeWidth={0.8} />
                <MoveUpRight size={30} />
              </div>
              <h3>Tu experiencia, más lejos.</h3>
              <p>
                Profesionales y empresas colaboran en los desafíos de la próxima generación de
                exploración.
              </p>
              <SectionLink to="/opportunities/board">
                {portal.data?.portal_habilitado
                  ? 'Ver convocatorias'
                  : 'Novedades de convocatorias'}
              </SectionLink>
            </article>
          </div>
        </section>
        <section className="join-banner">
          <div>
            <p className="eyebrow">EL CONOCIMIENTO CRECE CUANDO SE COMPARTE</p>
            <h2>Hay un lugar para tu próxima idea.</h2>
            <p>Forma parte de la comunidad de investigación e innovación espacial.</p>
          </div>
          <LinkButton to="/register">
            Unirme a Horion
            <ArrowUpRight size={18} aria-hidden="true" />
          </LinkButton>
        </section>
      </div>
    </>
  )
}
