import { useState } from 'react'
import { Plus, FlaskConical, Pencil, Info } from 'lucide-react'
import { useResource } from '../../lib/hooks'
import { api } from '../../lib/api'
import { options, label } from '../../lib/format'
import { useToast } from '../../context/AppContext'
import {
  PageHeader,
  Resource,
  Panel,
  Button,
  Badge,
  Modal,
  Field,
  Empty,
} from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'
import { CorrelationChart, metrics } from '../../components/Charts'
export default function ResearchLab() {
  const [editing, setEditing] = useState(null),
    [xMetric, setX] = useState('horas_sueno'),
    [yMetric, setY] = useState('hrv'),
    [mission, setMission] = useState('')
  const resource = useResource('/nasa/investigaciones/'),
    telemetry = useResource(`/nasa/telemetry/${mission ? `?mission=${mission}` : ''}`)
  const notify = useToast()
  const fields = [
    {
      name: 'titulo_terapia',
      label: 'Título del protocolo o terapia',
      required: true,
      maxLength: 200,
    },
    {
      name: 'mision_objetivo',
      label: 'Misión objetivo',
      required: true,
      options: (telemetry.data?.missions || []).map((item) => ({
        value: item.id,
        label: item.codigo_mision,
      })),
    },
    { name: 'objetivo_clinico', label: 'Objetivo clínico', type: 'textarea', required: true },
    {
      name: 'hallazgos_biometricos',
      label: 'Hallazgos y metodología',
      type: 'textarea',
      required: true,
    },
    {
      name: 'estado',
      label: 'Estado del protocolo',
      required: true,
      options: options(['EN_ANALISIS', 'PROTOCOLO_DISENADO', 'APROBADO_MISION']),
      defaultValue: 'EN_ANALISIS',
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="CONSOLA NASA / INVESTIGACIÓN"
        title="Laboratorio clínico"
        description="Conecta variables, documenta hallazgos y diseña protocolos para futuras misiones."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus size={16} aria-hidden="true" />
            Nuevo protocolo
          </Button>
        }
      />
      <Panel
        title="Explorador de correlaciones"
        subtitle="Análisis exploratorio de las últimas lecturas disponibles"
      >
        <div className="filters">
          <Field
            label="Misión"
            as="select"
            value={mission}
            onChange={(event) => setMission(event.target.value)}
          >
            <option value="">Todas las misiones</option>
            {telemetry.data?.missions.map((item) => (
              <option key={item.id}>{item.codigo_mision}</option>
            ))}
          </Field>
          <Field
            label="Variable X"
            as="select"
            value={xMetric}
            onChange={(event) => setX(event.target.value)}
          >
            {Object.entries(metrics).map(([key, value]) => (
              <option value={key} key={key}>
                {value.label} ({value.unit})
              </option>
            ))}
          </Field>
          <Field
            label="Variable Y"
            as="select"
            value={yMetric}
            onChange={(event) => setY(event.target.value)}
          >
            {Object.entries(metrics).map(([key, value]) => (
              <option value={key} key={key}>
                {value.label} ({value.unit})
              </option>
            ))}
          </Field>
        </div>
        <Resource resource={telemetry}>
          {(data) => (
            <CorrelationChart records={data.records} xMetric={xMetric} yMetric={yMetric} />
          )}
        </Resource>
      </Panel>
      <div className="notice">
        <Info size={18} aria-hidden="true" />
        <span>
          Una asociación entre variables no establece causalidad. Documenta la metodología y la
          revisión clínica antes de aprobar un protocolo.
        </span>
      </div>
      <div className="result-summary">
        <h2>Protocolos de investigación</h2>
        <span className="count-label">{resource.data?.length || 0} REGISTRADOS</span>
      </div>
      <Resource resource={resource}>
        {(data) =>
          data.length ? (
            <div className="card-grid">
              {data.map((item) => (
                <article className="content-card" key={item.id}>
                  <div className="content-card-top">
                    <span className="mono cyan">{item.codigo_mision}</span>
                    <Badge value={item.estado} />
                  </div>
                  <h2>{item.titulo_terapia}</h2>
                  <p>{item.objetivo_clinico}</p>
                  <div className="feedback my-5">
                    <strong>HALLAZGOS BIOMÉTRICOS</strong>
                    {item.hallazgos_biometricos || 'Pendientes de documentación.'}
                  </div>
                  <div className="card-footer">
                    <span className="count-label">
                      <FlaskConical size={15} className="inline mr-2" aria-hidden="true" />
                      INVESTIGACIÓN INTERNA
                    </span>
                    <Button variant="secondary" onClick={() => setEditing(item)}>
                      <Pencil size={14} aria-hidden="true" />
                      Editar protocolo
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Tu próximo hallazgo comienza aquí"
              description="Crea el primer protocolo para documentar esta investigación."
            />
          )
        }
      </Resource>
      {editing && (
        <Modal
          title={editing.id ? 'Editar protocolo' : 'Nuevo protocolo clínico'}
          onClose={() => setEditing(null)}
        >
          <SchemaForm
            fields={fields}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (body) => {
              await api(`/nasa/investigaciones/${editing.id ? `${editing.id}/` : ''}`, {
                method: editing.id ? 'PATCH' : 'POST',
                body,
              })
              setEditing(null)
              resource.refresh()
              notify('Protocolo guardado. Los aprobados estarán disponibles para Horion Edge.')
            }}
          />
        </Modal>
      )}
    </>
  )
}
