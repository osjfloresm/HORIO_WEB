import { useState } from 'react'
import { Plus, FileText, Settings2, Pencil } from 'lucide-react'
import { usePortal, useToast } from '../../context/AppContext'
import { useResource, useMutation } from '../../lib/hooks'
import { api, download } from '../../lib/api'
import { money, date, options } from '../../lib/format'
import {
  PageHeader,
  Panel,
  Badge,
  Button,
  Resource,
  Modal,
  DataTable,
  Field,
  FormError,
} from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'
const toLocalInput = (value) => (value ? value.slice(0, 16) : '')
export default function CallsManager() {
  const portal = usePortal(),
    notify = useToast(),
    mutation = useMutation()
  const calls = useResource('/nasa/convocatorias/'),
    repositories = useResource('/science/repositorios/')
  const [tab, setTab] = useState('calls'),
    [editing, setEditing] = useState(null),
    [evaluation, setEvaluation] = useState(null),
    [switchConfirm, setSwitchConfirm] = useState(false)
  const [filters, setFilters] = useState({ trl: '', budget: '', specialty: '' })
  const applications = useResource(`/nasa/postulaciones/?${new URLSearchParams(filters)}`)
  const fields = [
    { name: 'codigo_convocatoria', label: 'Código de convocatoria', required: true, maxLength: 60 },
    { name: 'titulo', label: 'Título', required: true, maxLength: 200 },
    {
      name: 'categoria_destinatario',
      label: 'Dirigida a',
      options: options(['PROFESIONALES', 'EMPRESAS', 'AMBOS']),
      required: true,
    },
    {
      name: 'tipo_necesidad',
      label: 'Área de necesidad',
      options: options([
        'MISION_TRIPULADA',
        'TERAPIA_MEDICA',
        'CAMPANA_SALUD',
        'HARDWARE_SENSORES',
        'SOFTWARE_ESPACIAL',
        'FARMACEUTICA',
      ]),
      required: true,
    },
    { name: 'descripcion_detallada', label: 'Descripción', type: 'textarea', required: true },
    { name: 'requisitos_tecnicos', label: 'Requisitos técnicos', type: 'textarea', required: true },
    {
      name: 'repositorio_datos_vinculado',
      label: 'Dataset de referencia',
      nullable: true,
      options: (repositories.data || []).map((item) => ({
        value: item.id,
        label: item.titulo_dataset,
      })),
    },
    {
      name: 'presupuesto_estimado',
      label: 'Presupuesto estimado (USD)',
      type: 'number',
      min: 0,
      step: '0.01',
      required: true,
    },
    { name: 'fecha_apertura', label: 'Apertura (UTC)', type: 'datetime-local', required: true },
    { name: 'fecha_cierre', label: 'Cierre (UTC)', type: 'datetime-local', required: true },
    {
      name: 'estado',
      label: 'Estado',
      options: options(['BORRADOR', 'ABIERTA', 'EN_EVALUACION', 'CERRADA', 'ADJUDICADA']),
      defaultValue: 'BORRADOR',
      required: true,
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="CONSOLA NASA / INNOVACIÓN"
        title="Gestor de convocatorias"
        description="Transforma los hallazgos de la misión en nuevas oportunidades de colaboración."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus size={16} aria-hidden="true" />
            Nueva convocatoria
          </Button>
        }
      />
      <Resource resource={portal}>
        {(config) => (
          <Panel className="switch-panel">
            <div>
              <Badge tone={config.portal_habilitado ? 'green' : 'amber'}>
                {config.portal_habilitado
                  ? 'Portal público habilitado'
                  : 'Portal público deshabilitado'}
              </Badge>
              <h2>Una ventana abierta a la innovación</h2>
              <p>
                {config.portal_habilitado
                  ? 'Las convocatorias abiertas son visibles y admiten postulaciones.'
                  : 'Los visitantes pueden suscribirse para recibir novedades.'}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={config.portal_habilitado}
              aria-label="Habilitar o deshabilitar portal de convocatorias"
              className="switch"
              onClick={() => setSwitchConfirm(true)}
            />
          </Panel>
        )}
      </Resource>
      <div className="tabs">
        <button aria-pressed={tab === 'calls'} onClick={() => setTab('calls')}>
          Convocatorias · {calls.data?.length || 0}
        </button>
        <button aria-pressed={tab === 'applications'} onClick={() => setTab('applications')}>
          Evaluar postulaciones
        </button>
      </div>
      <FormError error={mutation.error} />
      {tab === 'calls' ? (
        <Resource resource={calls}>
          {(data) => (
            <Panel title="Convocatorias de la plataforma">
              <DataTable
                rows={data}
                columns={[
                  {
                    key: 'titulo',
                    label: 'CONVOCATORIA',
                    render: (row) => (
                      <>
                        <strong>{row.titulo}</strong>
                        <small className="mono">{row.codigo_convocatoria}</small>
                      </>
                    ),
                  },
                  {
                    key: 'categoria_destinatario',
                    label: 'PERFIL',
                    render: (row) =>
                      row.categoria_destinatario === 'EMPRESAS'
                        ? 'Empresas'
                        : row.categoria_destinatario === 'PROFESIONALES'
                          ? 'Profesionales'
                          : 'Ambos',
                  },
                  {
                    key: 'presupuesto_estimado',
                    label: 'PRESUPUESTO',
                    render: (row) => money(row.presupuesto_estimado),
                  },
                  { key: 'fecha_cierre', label: 'CIERRE', render: (row) => date(row.fecha_cierre) },
                  { key: 'estado', label: 'ESTADO', render: (row) => <Badge value={row.estado} /> },
                  {
                    key: 'actions',
                    label: 'GESTIÓN',
                    render: (row) => (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setEditing({
                            ...row,
                            fecha_apertura: toLocalInput(row.fecha_apertura),
                            fecha_cierre: toLocalInput(row.fecha_cierre),
                          })
                        }
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Editar
                      </Button>
                    ),
                  },
                ]}
              />
            </Panel>
          )}
        </Resource>
      ) : (
        <>
          <div className="filters">
            <Field
              label="Nivel TRL"
              as="select"
              value={filters.trl}
              onChange={(event) => setFilters({ ...filters, trl: event.target.value })}
            >
              <option value="">Todos los niveles</option>
              {Array.from({ length: 9 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  TRL {i + 1}
                </option>
              ))}
            </Field>
            <Field
              label="Presupuesto máximo (USD)"
              type="number"
              min="0"
              value={filters.budget}
              onChange={(event) => setFilters({ ...filters, budget: event.target.value })}
            />
            <Field
              label="Especialidad"
              value={filters.specialty}
              onChange={(event) => setFilters({ ...filters, specialty: event.target.value })}
            />
          </div>
          <Resource resource={applications}>
            {(data) => (
              <Panel title="Evaluación técnica">
                <DataTable
                  rows={data}
                  columns={[
                    {
                      key: 'postulante_nombre',
                      label: 'POSTULANTE',
                      render: (row) => (
                        <>
                          <strong>{row.postulante_nombre}</strong>
                          <small>
                            {row.tipo_perfil} · {row.especialidad || row.categoria_solucion}
                          </small>
                        </>
                      ),
                    },
                    {
                      key: 'titulo_propuesta',
                      label: 'PROPUESTA',
                      render: (row) => (
                        <>
                          <strong>{row.titulo_propuesta}</strong>
                          <small>{row.codigo_convocatoria}</small>
                        </>
                      ),
                    },
                    { key: 'nivel_trl', label: 'TRL', render: (row) => row.nivel_trl || 'N/A' },
                    {
                      key: 'presupuesto_o_honorarios',
                      label: 'COTIZACIÓN',
                      render: (row) => money(row.presupuesto_o_honorarios),
                    },
                    {
                      key: 'estado',
                      label: 'ESTADO',
                      render: (row) => <Badge value={row.estado} />,
                    },
                    {
                      key: 'actions',
                      label: 'EVALUACIÓN',
                      render: (row) => (
                        <Button variant="secondary" onClick={() => setEvaluation(row)}>
                          <Settings2 size={14} aria-hidden="true" />
                          Evaluar
                        </Button>
                      ),
                    },
                  ]}
                />
              </Panel>
            )}
          </Resource>
        </>
      )}
      {editing && (
        <Modal
          title={editing.id ? 'Editar convocatoria' : 'Nueva convocatoria'}
          onClose={() => setEditing(null)}
        >
          <SchemaForm
            fields={fields}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (body) => {
              await api(`/nasa/convocatorias/${editing.id ? `${editing.id}/` : ''}`, {
                method: editing.id ? 'PATCH' : 'POST',
                body: {
                  ...body,
                  fecha_apertura: `${body.fecha_apertura}:00Z`,
                  fecha_cierre: `${body.fecha_cierre}:00Z`,
                },
              })
              setEditing(null)
              calls.refresh()
              notify('Convocatoria guardada.')
            }}
          />
        </Modal>
      )}
      {evaluation && (
        <Modal title="Evaluar postulación" onClose={() => setEvaluation(null)}>
          <h3 className="mb-3">{evaluation.titulo_propuesta}</h3>
          <p className="detail-copy mb-4">{evaluation.propuesta_tecnica_o_clinica}</p>
          {evaluation.experiencia && (
            <p className="detail-copy mb-4">Experiencia: {evaluation.experiencia}</p>
          )}
          <Button
            variant="secondary"
            className="mb-5"
            busy={mutation.busy}
            onClick={() =>
              mutation.run(() =>
                download(`/nasa/postulaciones/${evaluation.id}/document/`, 'propuesta.pdf'),
              )
            }
          >
            <FileText size={15} aria-hidden="true" />
            Descargar adjunto
          </Button>
          <SchemaForm
            fields={[
              {
                name: 'estado',
                label: 'Resultado de evaluación',
                options: options([
                  'RECIBIDA',
                  'EN_REVISION',
                  'FINALISTA',
                  'SELECCIONADA',
                  'NO_SELECCIONADA',
                ]),
                required: true,
              },
              {
                name: 'evaluacion_nasa',
                label: 'Observaciones para el postulante',
                type: 'textarea',
                required: true,
              },
            ]}
            initial={evaluation}
            submitLabel="Guardar evaluación"
            onCancel={() => setEvaluation(null)}
            onSubmit={async (body) => {
              await api(`/nasa/postulaciones/${evaluation.id}/evaluar/`, { method: 'PATCH', body })
              setEvaluation(null)
              applications.refresh()
              notify('Evaluación enviada al panel del postulante.')
            }}
          />
        </Modal>
      )}
      {switchConfirm && (
        <Modal
          title={
            portal.data.portal_habilitado
              ? 'Cerrar el portal de convocatorias'
              : 'Habilitar el portal de convocatorias'
          }
          onClose={() => setSwitchConfirm(false)}
        >
          <p className="detail-copy mb-5">
            {portal.data.portal_habilitado
              ? 'Las convocatorias dejarán de ser visibles y no se admitirán nuevas postulaciones. El seguimiento de propuestas ya enviadas seguirá disponible.'
              : 'Se mostrarán las convocatorias abiertas dentro de sus fechas de vigencia.'}
          </p>
          <SchemaForm
            fields={[
              {
                name: 'mensaje_estado',
                label: 'Mensaje para el portal cerrado',
                type: 'textarea',
                required: true,
              },
            ]}
            initial={{ mensaje_estado: portal.data.mensaje_estado }}
            submitLabel="Confirmar cambio"
            onCancel={() => setSwitchConfirm(false)}
            onSubmit={async (body) => {
              await api('/nasa/portal-convocatorias/toggle/', {
                method: 'PATCH',
                body: { ...body, portal_habilitado: !portal.data.portal_habilitado },
              })
              setSwitchConfirm(false)
              portal.refresh()
              notify('El estado del portal se actualizó.')
            }}
          />
        </Modal>
      )}
    </>
  )
}
