import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarDays,
  Database,
  Search,
  BriefcaseBusiness,
  Building2,
} from 'lucide-react'
import { usePortal, useAuth } from '../../context/AppContext'
import { useResource } from '../../lib/hooks'
import { money, date, label } from '../../lib/format'
import { PageHeader, Resource, Badge, LinkButton, Empty, Button } from '../../components/ui'
import ClosedPortal from './ClosedPortal'
function OpenBoard() {
  const { user } = useAuth(),
    resource = useResource('/opportunities/convocatorias/'),
    [category, setCategory] = useState(user?.role === 'ENTERPRISE' ? 'EMPRESAS' : 'PROFESIONALES'),
    [query, setQuery] = useState('')
  return (
    <>
      <PageHeader
        eyebrow="OPORTUNIDADES / COLABORACIÓN"
        title="Tu experiencia puede cambiar la misión."
        description="Desafíos reales necesitan nuevas perspectivas. Encuentra el próximo paso para tu talento o tecnología."
        actions={
          ['PROFESSIONAL', 'ENTERPRISE'].includes(user?.role) && (
            <LinkButton variant="secondary" to="/opportunities/my-applications">
              Mis postulaciones
              <ArrowUpRight size={15} aria-hidden="true" />
            </LinkButton>
          )
        }
      />
      <div className="tabs">
        <button
          aria-pressed={category === 'PROFESIONALES'}
          onClick={() => setCategory('PROFESIONALES')}
        >
          <BriefcaseBusiness size={15} className="inline mr-2" aria-hidden="true" />
          Para profesionales
        </button>
        <button aria-pressed={category === 'EMPRESAS'} onClick={() => setCategory('EMPRESAS')}>
          <Building2 size={15} className="inline mr-2" aria-hidden="true" />
          Para empresas
        </button>
      </div>
      <div className="filters">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Buscar convocatorias"
            placeholder="Buscar por necesidad, área o código…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <Resource resource={resource}>
        {(data) => {
          const rows = data.filter(
            (item) =>
              [category, 'AMBOS'].includes(item.categoria_destinatario) &&
              `${item.titulo} ${item.codigo_convocatoria} ${label(item.tipo_necesidad)}`
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          return (
            <>
              <div className="result-summary">
                <p>
                  {rows.length} convocatorias para{' '}
                  {category === 'EMPRESAS' ? 'tecnología e innovación' : 'talento especializado'}
                </p>
                <span className="count-label">EXPLORA / PROPÓN / COLABORA</span>
              </div>
              {rows.length ? (
                <div className="card-grid">
                  {rows.map((item) => (
                    <article className="content-card" key={item.id}>
                      <div className="content-card-top">
                        <span className="mono cyan">{item.codigo_convocatoria}</span>
                        <Badge value="ABIERTA" />
                      </div>
                      <h2>{item.titulo}</h2>
                      <p>{item.descripcion_detallada}</p>
                      <div className="card-meta">
                        <span>{label(item.tipo_necesidad)}</span>
                        <span>
                          <CalendarDays size={14} aria-hidden="true" />
                          Cierra {date(item.fecha_cierre)}
                        </span>
                      </div>
                      {item.repositorio_datos_vinculado && (
                        <Link
                          className="text-link mb-5"
                          to={`/open-science/repositories?dataset=${item.repositorio_datos_vinculado}`}
                        >
                          <Database size={14} aria-hidden="true" />
                          Dataset de referencia
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </Link>
                      )}
                      <div className="card-footer">
                        <div>
                          <span className="small-heading block mb-1">PRESUPUESTO REFERENCIAL</span>
                          <strong className="text-lg font-display">
                            {money(item.presupuesto_estimado)}{' '}
                            <small className="text-xs muted">USD</small>
                          </strong>
                        </div>
                        <LinkButton to={`/opportunities/apply/${item.id}`} variant="secondary">
                          Ver convocatoria
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </LinkButton>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No hay convocatorias para esta selección"
                  description="Prueba con otra búsqueda o consulta las oportunidades del otro perfil."
                  action={
                    query && (
                      <Button variant="secondary" onClick={() => setQuery('')}>
                        Limpiar búsqueda
                      </Button>
                    )
                  }
                />
              )}
            </>
          )
        }}
      </Resource>
    </>
  )
}
export default function Board() {
  const portal = usePortal()
  return (
    <Resource resource={portal}>
      {(data) => (data.portal_habilitado ? <OpenBoard /> : <ClosedPortal />)}
    </Resource>
  )
}
