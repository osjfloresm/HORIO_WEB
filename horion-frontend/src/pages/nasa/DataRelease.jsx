import { useState } from 'react'
import { ShieldCheck, Database, ArrowRight, Eye, LockKeyhole } from 'lucide-react'
import { useResource } from '../../lib/hooks'
import { api } from '../../lib/api'
import { number, datetime } from '../../lib/format'
import { useToast } from '../../context/AppContext'
import {
  PageHeader,
  Resource,
  Stat,
  Panel,
  Badge,
  DataTable,
  Button,
  Modal,
} from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'
function Inspector({ batch, onClose, onPublished }) {
  const resource = useResource(`/nasa/lotes/${batch.id}/preview/`)
  return (
    <Modal title="Inspector de privacidad" onClose={onClose}>
      <Resource resource={resource}>
        {(data) => (
          <>
            <div className="notice">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                Revisa una muestra de las {number(data.cantidad_registros)} lecturas. La liberación
                publica solo los campos de la columna pública.
              </span>
            </div>
            <div className="privacy-grid">
              <div className="privacy-box">
                <h3>
                  <LockKeyhole size={14} className="inline mr-2" aria-hidden="true" />
                  Antes · Privado
                </h3>
                <dl>
                  {Object.entries(data.before).map(([key, value]) => (
                    <div className="privacy-row" key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="privacy-box public">
                <h3>
                  <ShieldCheck size={14} className="inline mr-2 green" aria-hidden="true" />
                  Después · Público
                </h3>
                <dl>
                  {Object.entries(data.after).map(([key, value]) => (
                    <div className="privacy-row" key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <p className="muted text-xs my-5">
              Se eliminan nombre, nacimiento, alergias, fecha exacta y temperatura. El UUID
              seudónimo y las series biométricas requieren revisión de riesgo de reidentificación
              antes de publicar datos reales.
            </p>
            {batch.estado_liberacion === 'PUBLICADO' ? (
              <Badge value="PUBLICADO" />
            ) : (
              <SchemaForm
                fields={[
                  {
                    name: 'titulo_dataset',
                    label: 'Título del dataset público',
                    required: true,
                    maxLength: 200,
                  },
                  {
                    name: 'descripcion',
                    label: 'Descripción y contexto científico',
                    type: 'textarea',
                    required: true,
                  },
                  {
                    name: 'privacidad_revisada',
                    label: 'He revisado la muestra y autorizo la publicación de estos datos.',
                    type: 'checkbox',
                    required: true,
                  },
                ]}
                initial={{ titulo_dataset: `Biometría de misión · ${batch.codigo_mision}` }}
                submitLabel="Liberar al repositorio público"
                onCancel={onClose}
                onSubmit={async (body) => {
                  await api(`/nasa/lotes/${batch.id}/liberar/`, { method: 'POST', body })
                  onPublished()
                }}
              />
            )}
          </>
        )}
      </Resource>
    </Modal>
  )
}
export default function DataRelease() {
  const resource = useResource('/nasa/lotes/'),
    [selected, setSelected] = useState(null),
    [filter, setFilter] = useState('RECIBIDO'),
    notify = useToast()
  return (
    <>
      <PageHeader
        eyebrow="CONSOLA NASA / GOBIERNO DE DATOS"
        title="Del dato privado a la ciencia abierta"
        description="Inspecciona, protege y libera la información que impulsará nuevas investigaciones."
      />
      <Resource resource={resource}>
        {(data) => (
          <>
            <div className="stat-grid">
              <Stat
                icon={Database}
                label="Lotes recibidos"
                value={number(data.length)}
                note="Historial de sincronización"
              />
              <Stat
                icon={LockKeyhole}
                label="Pendientes de revisión"
                value={number(data.filter((row) => row.estado_liberacion !== 'PUBLICADO').length)}
                note="Disponibles para inspección"
              />
              <Stat
                icon={ShieldCheck}
                label="Datasets publicados"
                value={number(data.filter((row) => row.estado_liberacion === 'PUBLICADO').length)}
                note="Accesibles desde ciencia abierta"
              />
              <Stat
                icon={ArrowRight}
                label="Registros por revisar"
                value={number(
                  data
                    .filter((row) => row.estado_liberacion !== 'PUBLICADO')
                    .reduce((total, row) => total + row.cantidad_registros, 0),
                )}
                note="Requieren autorización médica"
              />
            </div>
            <Panel
              title="Centro de liberación"
              subtitle="La publicación requiere inspección y confirmación explícita"
            >
              <div className="tabs">
                <button aria-pressed={filter === 'RECIBIDO'} onClick={() => setFilter('RECIBIDO')}>
                  Pendientes
                </button>
                <button
                  aria-pressed={filter === 'PUBLICADO'}
                  onClick={() => setFilter('PUBLICADO')}
                >
                  Publicados
                </button>
                <button aria-pressed={filter === ''} onClick={() => setFilter('')}>
                  Todos los lotes
                </button>
              </div>
              <DataTable
                rows={data.filter(
                  (item) =>
                    !filter ||
                    (filter === 'RECIBIDO'
                      ? item.estado_liberacion !== 'PUBLICADO'
                      : item.estado_liberacion === filter),
                )}
                empty="No hay lotes en esta categoría"
                columns={[
                  {
                    key: 'id',
                    label: 'LOTE',
                    render: (row) => (
                      <>
                        <strong className="mono">{row.id.slice(0, 8).toUpperCase()}</strong>
                        <small>{row.codigo_mision}</small>
                      </>
                    ),
                  },
                  { key: 'astronauta_nombre', label: 'ASTRONAUTA' },
                  { key: 'cantidad_registros', label: 'REGISTROS' },
                  {
                    key: 'fecha_recepcion',
                    label: 'RECIBIDO',
                    render: (row) => datetime(row.fecha_recepcion),
                  },
                  {
                    key: 'estado_liberacion',
                    label: 'ESTADO',
                    render: (row) => <Badge value={row.estado_liberacion} />,
                  },
                  {
                    key: 'actions',
                    label: 'ACCIÓN',
                    render: (row) => (
                      <Button variant="secondary" onClick={() => setSelected(row)}>
                        <Eye size={14} aria-hidden="true" />
                        Inspeccionar
                      </Button>
                    ),
                  },
                ]}
              />
            </Panel>
          </>
        )}
      </Resource>
      {selected && (
        <Inspector
          batch={selected}
          onClose={() => setSelected(null)}
          onPublished={() => {
            setSelected(null)
            resource.refresh()
            notify('Dataset publicado en el portal de ciencia abierta.')
          }}
        />
      )}
    </>
  )
}
