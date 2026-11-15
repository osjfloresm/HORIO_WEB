import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Database,
  Search,
  ArrowUpRight,
  Download,
  CalendarDays,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useResource, useMutation } from '../../lib/hooks'
import { download } from '../../lib/api'
import { date, number } from '../../lib/format'
import {
  PageHeader,
  Resource,
  Panel,
  Badge,
  Button,
  Field,
  Empty,
  FormError,
} from '../../components/ui'
import { MetricChart, metrics } from '../../components/Charts'
function RepositoryDetail({ repository, metric, onClose }) {
  const resource = useResource(`/science/repositorios/${repository.id}/records/`),
    mutation = useMutation()
  return (
    <Panel
      className="repository-detail"
      title={repository.titulo_dataset}
      subtitle="Vista previa de hasta 1.000 registros anonimizados"
      action={
        <button className="icon-button" aria-label="Cerrar vista del dataset" onClick={onClose}>
          <X size={18} />
        </button>
      }
    >
      <Resource resource={resource}>
        {(rows) => <MetricChart records={rows} metric={metric} publicData />}
      </Resource>
      <FormError error={mutation.error} />
      <div className="card-footer">
        <span className="text-xs muted">
          <ShieldCheck size={14} className="inline mr-2" aria-hidden="true" />
          Sin identificadores personales directos
        </span>
        <div className="actions">
          {['csv', 'json'].map((format) => (
            <Button
              key={format}
              variant="secondary"
              busy={mutation.busy}
              onClick={() =>
                mutation.run(() =>
                  download(
                    `/science/repositorios/${repository.id}/export/?format=${format}`,
                    `horion-${repository.codigo_mision}.${format}`,
                  ),
                )
              }
            >
              <Download size={14} aria-hidden="true" />
              Descargar {format.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
    </Panel>
  )
}
export default function Repositories() {
  const [params, setParams] = useSearchParams(),
    resource = useResource('/science/repositorios/')
  const [query, setQuery] = useState(''),
    [mission, setMission] = useState(''),
    [age, setAge] = useState(''),
    [duration, setDuration] = useState(''),
    [metric, setMetric] = useState('frecuencia_cardiaca')
  const selectedId = params.get('dataset')
  return (
    <>
      <PageHeader
        eyebrow="OPEN SCIENCE / REPOSITORIOS"
        title="Los datos abren nuevos horizontes."
        description="Explora, visualiza y descarga la evidencia que conecta la investigación espacial con la salud."
      />
      <div className="notice">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          Repositorios revisados y liberados por el equipo administrador. Acceso abierto para
          explorar y descargar datos en CSV o JSON.
        </span>
      </div>
      <Resource resource={resource}>
        {(data) => {
          const missions = [...new Set(data.map((item) => item.codigo_mision))],
            ages = [...new Set(data.flatMap((item) => item.rangos_edad))]
          const filtered = data.filter(
            (item) =>
              (!query ||
                `${item.titulo_dataset} ${item.descripcion}`
                  .toLowerCase()
                  .includes(query.toLowerCase())) &&
              (!mission || item.codigo_mision === mission) &&
              (!age || item.rangos_edad.includes(age)) &&
              (!duration || item.duracion_dias >= Number(duration)),
          )
          const selected = data.find((item) => item.id === selectedId)
          return (
            <>
              <div className="filters">
                <div className="search-field">
                  <Search size={17} aria-hidden="true" />
                  <input
                    aria-label="Buscar repositorios"
                    placeholder="Buscar una investigación, un biomarcador…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <Field
                  label="Misión"
                  as="select"
                  value={mission}
                  onChange={(event) => setMission(event.target.value)}
                >
                  <option value="">Todas las misiones</option>
                  {missions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Field>
                <Field
                  label="Rango de edad"
                  as="select"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                >
                  <option value="">Todas las edades</option>
                  {ages.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Field>
                <Field
                  label="Días mínimos en misión"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
                <Field
                  label="Biomarcador a visualizar"
                  as="select"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                >
                  {Object.entries(metrics).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </Field>
              </div>
              {selected ? (
                <RepositoryDetail
                  key={selected.id}
                  repository={selected}
                  metric={metric}
                  onClose={() => setParams({})}
                />
              ) : (
                selectedId && (
                  <Empty
                    title="Dataset no disponible"
                    description="El repositorio no existe o ya no está publicado."
                    action={
                      <Button variant="secondary" onClick={() => setParams({})}>
                        Ver catálogo
                      </Button>
                    }
                  />
                )
              )}
              <div className="result-summary">
                <p>
                  <strong>{filtered.length}</strong> repositorios disponibles
                </p>
                <span className="count-label">DATOS PARA NUEVAS PREGUNTAS</span>
              </div>
              {filtered.length ? (
                <div className="card-grid">
                  {filtered.map((item) => (
                    <article className="content-card" key={item.id}>
                      <div className="content-card-top">
                        <span className="mono cyan">{item.codigo_mision}</span>
                        <Badge tone="green">Acceso abierto</Badge>
                      </div>
                      <h2>{item.titulo_dataset}</h2>
                      <p>{item.descripcion}</p>
                      <div className="card-meta">
                        <span>
                          <Database size={13} aria-hidden="true" />
                          {number(item.total_registros)} registros
                        </span>
                        <span>
                          <CalendarDays size={13} aria-hidden="true" />
                          {item.duracion_dias} días de misión
                        </span>
                        <span>Edad: {item.rangos_edad.join(', ')}</span>
                      </div>
                      <div className="card-footer">
                        <span className="text-xs muted">
                          Liberado {date(item.fecha_liberacion)}
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setParams({ dataset: item.id })
                            window.scrollTo({ top: 0, behavior: 'instant' })
                          }}
                        >
                          Explorar dataset
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No encontramos datasets con estos filtros"
                  description="Prueba otra misión, rango de edad o duración."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQuery('')
                        setMission('')
                        setAge('')
                        setDuration('')
                      }}
                    >
                      Limpiar filtros
                    </Button>
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
