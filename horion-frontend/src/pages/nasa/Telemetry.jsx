import { useState } from 'react'
import { Activity, Database, Users, TriangleAlert, RefreshCw, Bot, ShieldCheck } from 'lucide-react'
import { useResource } from '../../lib/hooks'
import { number, datetime } from '../../lib/format'
import {
  PageHeader,
  Resource,
  Stat,
  Panel,
  Badge,
  DataTable,
  Button,
  Empty,
  Field,
  SectionLink,
} from '../../components/ui'
import { MetricChart, metrics } from '../../components/Charts'
export default function Telemetry() {
  const [mission, setMission] = useState(''),
    [metric, setMetric] = useState('frecuencia_cardiaca'),
    [tab, setTab] = useState('alerts')
  const resource = useResource(
    `/nasa/telemetry/${mission ? `?mission=${encodeURIComponent(mission)}` : ''}`,
    { interval: 30000 },
  )
  return (
    <>
      <PageHeader
        eyebrow="CONSOLA NASA / MONITOREO"
        title="Control de misión"
        description="Cada señal cuenta. Supervisa la información recibida desde Horion Edge."
        actions={
          <Button variant="secondary" onClick={resource.refresh} busy={resource.loading}>
            <RefreshCw size={15} aria-hidden="true" />
            Actualizar
          </Button>
        }
      />
      <Resource resource={resource}>
        {(data) => (
          <>
            <div className="result-summary">
              <span className="count-label">TELEMETRÍA TERRESTRE / SINCRONIZACIÓN EDGE</span>
              <div className="inline-control">
                <label htmlFor="mission">Misión</label>
                <select
                  id="mission"
                  value={mission}
                  onChange={(event) => setMission(event.target.value)}
                >
                  <option value="">Todas las misiones</option>
                  {data.missions.map((item) => (
                    <option key={item.id}>{item.codigo_mision}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="stat-grid">
              <Stat
                icon={Activity}
                label="Registros recibidos"
                value={number(data.counts.records)}
                note="Lecturas biométricas sincronizadas"
              />
              <Stat
                icon={Users}
                label="Tripulación monitoreada"
                value={number(data.counts.astronauts)}
                note="Perfiles de misión registrados"
              />
              <Stat
                icon={Database}
                label="Lotes verificados"
                value={number(data.counts.batches)}
                note="Integridad validada con SHA-256"
              />
              <Stat
                icon={TriangleAlert}
                label="Alertas recibidas"
                value={number(data.counts.alerts)}
                note="Precaución y críticas · historial"
                color="amber"
              />
            </div>
            <div className="two-columns">
              <Panel
                title="Evolución biométrica"
                subtitle="Promedios diarios · últimas 240 lecturas de la selección"
                action={
                  <div className="inline-control">
                    <label className="sr-only" htmlFor="metric">
                      Biomarcador
                    </label>
                    <select
                      id="metric"
                      value={metric}
                      onChange={(event) => setMetric(event.target.value)}
                    >
                      {Object.entries(metrics).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value.label}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                <MetricChart records={data.records} metric={metric} aggregate />
              </Panel>
              <Panel
                title="Tripulación de la misión"
                subtitle="Última lectura disponible por astronauta"
                action={
                  <SectionLink to="/nasa-admin/astronauts">Gestionar astronautas</SectionLink>
                }
              >
                <div className="crew-list">
                  {data.astronauts.map((person) => (
                    <div className="crew-row" key={person.id}>
                      <span className="avatar">
                        {person.nombre_completo
                          .split(' ')
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <h3>{person.nombre_completo.replace(' (simulado)', '')}</h3>
                        <p>
                          {person.codigo_astronauta} · {person.codigo_mision}
                        </p>
                      </div>
                      <div>
                        <strong>
                          {person.ultima_lectura?.frecuencia_cardiaca ?? '—'}
                          <small>bpm</small>
                        </strong>
                        <p>Última lectura</p>
                      </div>
                    </div>
                  ))}
                  {!data.astronauts.length && <Empty title="Sin tripulación registrada" />}
                </div>
              </Panel>
            </div>
            <Panel
              title="Lotes de sincronización"
              subtitle="Trazabilidad del enlace Horion Edge → Horion Web"
              action={<SectionLink to="/nasa-admin/data-release">Gestionar liberación</SectionLink>}
            >
              <DataTable
                rows={data.batches}
                columns={[
                  {
                    key: 'id',
                    label: 'LOTE / SHA-256',
                    render: (row) => (
                      <>
                        <strong className="mono">{row.id.slice(0, 8).toUpperCase()}</strong>
                        <small className="mono" title={row.hash_sha256}>
                          {row.hash_sha256.slice(0, 20)}…
                        </small>
                      </>
                    ),
                  },
                  {
                    key: 'astronauta_nombre',
                    label: 'ORIGEN',
                    render: (row) => (
                      <>
                        <strong>{row.codigo_astronauta}</strong>
                        <small>{row.codigo_mision}</small>
                      </>
                    ),
                  },
                  {
                    key: 'cantidad_registros',
                    label: 'REGISTROS',
                    render: (row) => <span className="mono">{number(row.cantidad_registros)}</span>,
                  },
                  {
                    key: 'fecha_recepcion',
                    label: 'RECEPCIÓN',
                    render: (row) => (
                      <span className="text-xs">{datetime(row.fecha_recepcion)}</span>
                    ),
                  },
                  {
                    key: 'estado_liberacion',
                    label: 'ESTADO',
                    render: (row) => <Badge value={row.estado_liberacion} />,
                  },
                  {
                    key: 'integrity',
                    label: 'INTEGRIDAD',
                    render: () => (
                      <span className="green inline-flex items-center gap-1">
                        <ShieldCheck size={13} aria-hidden="true" />
                        Verificada
                      </span>
                    ),
                  },
                ]}
              />
            </Panel>
            <Panel
              title="Asistencia desde órbita"
              subtitle="Historial de alertas y transcripciones del asistente de escritorio"
            >
              <div className="tabs">
                <button aria-pressed={tab === 'alerts'} onClick={() => setTab('alerts')}>
                  Alertas de Edge · {data.alerts.length}
                </button>
                <button aria-pressed={tab === 'orbi'} onClick={() => setTab('orbi')}>
                  Transcripciones de Orbi
                </button>
              </div>
              {tab === 'alerts' ? (
                <div className="card-grid">
                  {data.alerts.map((item) => (
                    <div className="alert-item" key={item.id}>
                      <div className="alert-item-top">
                        <Badge value={item.nivel_severidad} />
                        <small>{datetime(item.timestamp_utc)}</small>
                      </div>
                      <h3 className="text-sm mb-2">
                        {item.astronauta_nombre} · {item.metrica_afectada}
                      </h3>
                      <p>{item.recomendacion_entregada}</p>
                      <span className="alert-source">
                        {item.modo_generacion === 'OFFLINE_ALGO'
                          ? 'OFFLINE / ALGORITMO LOCAL'
                          : 'ONLINE / GEMINI'}{' '}
                        · VALOR {item.valor_detectado}
                      </span>
                    </div>
                  ))}
                  {!data.alerts.length && <Empty title="Sin alertas recibidas" />}
                </div>
              ) : (
                <div className="conversation">
                  {data.orbi.map((message) => (
                    <article key={message.id} className="message">
                      <header>
                        <Bot size={16} aria-hidden="true" />
                        {message.rol === 'orbi' ? 'Orbi · Gemini' : message.astronauta_nombre}
                      </header>
                      <p>{message.mensaje}</p>
                      <small>
                        {message.astronauta_nombre} · {datetime(message.timestamp_utc)}
                      </small>
                    </article>
                  ))}
                  {!data.orbi.length && <Empty title="Sin transcripciones" />}
                </div>
              )}
            </Panel>
          </>
        )}
      </Resource>
    </>
  )
}
