import { useNavigate, useParams } from 'react-router-dom'
import { FileCheck2, Database, ArrowUpRight, Info } from 'lucide-react'
import { useAuth, usePortal, useToast } from '../../context/AppContext'
import { useResource } from '../../lib/hooks'
import { api } from '../../lib/api'
import { money, date, label } from '../../lib/format'
import { PageHeader, Resource, Panel, Badge, LinkButton, BackLink } from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'
import ClosedPortal from './ClosedPortal'
function ApplicationContent() {
  const { id } = useParams(),
    { user } = useAuth(),
    notify = useToast(),
    navigate = useNavigate()
  const resource = useResource(`/opportunities/convocatorias/${id}/`)
  const enterprise = user?.role === 'ENTERPRISE'
  return (
    <>
      <BackLink to="/opportunities/board">Volver a convocatorias</BackLink>
      <Resource resource={resource}>
        {(call) => {
          const canApply =
            user &&
            ['PROFESSIONAL', 'ENTERPRISE'].includes(user.role) &&
            ['AMBOS', enterprise ? 'EMPRESAS' : 'PROFESIONALES'].includes(
              call.categoria_destinatario,
            )
          const fields = [
            {
              name: 'titulo_propuesta',
              label: 'Título de la propuesta',
              required: true,
              maxLength: 200,
            },
            ...(enterprise
              ? [
                  {
                    name: 'categoria_solucion',
                    label: 'Categoría de solución',
                    required: true,
                    options: [
                      { value: 'HARDWARE', label: 'Nuevo sensor / Hardware' },
                      { value: 'SOFTWARE', label: 'Software optimizado' },
                      { value: 'FARMACEUTICA', label: 'Medicamento / Suplemento' },
                    ],
                  },
                  {
                    name: 'nivel_trl',
                    label: 'Madurez tecnológica (TRL 1–9)',
                    type: 'number',
                    min: 1,
                    max: 9,
                    required: true,
                    hint: '1: principios básicos · 9: tecnología probada en operación.',
                  },
                ]
              : [
                  { name: 'especialidad', label: 'Especialidad médica o técnica', required: true },
                  {
                    name: 'experiencia',
                    label: 'Experiencia clínica / aeroespacial',
                    type: 'textarea',
                    required: true,
                  },
                ]),
            {
              name: 'propuesta_tecnica_o_clinica',
              label: enterprise
                ? 'Propuesta técnica y plan de validación'
                : 'Propuesta de intervención / terapia',
              type: 'textarea',
              required: true,
            },
            {
              name: 'presupuesto_o_honorarios',
              label: enterprise ? 'Cotización (USD)' : 'Honorarios estimados (USD)',
              type: 'number',
              min: 0,
              step: '0.01',
              required: true,
            },
            {
              name: 'documento_adjunto',
              label: enterprise ? 'Ficha técnica (PDF)' : 'CV y credenciales (PDF)',
              type: 'file',
              accept: '.pdf,application/pdf',
              required: true,
              hint: 'Un único documento PDF de hasta 10 MB.',
            },
          ]
          return (
            <>
              <PageHeader
                eyebrow={`${call.codigo_convocatoria} / POSTULACIÓN`}
                title={call.titulo}
                description={label(call.tipo_necesidad)}
              />
              <div className="application-layout">
                <div>
                  <Panel title="El desafío">
                    <p className="detail-copy">{call.descripcion_detallada}</p>
                    <h3 className="mt-6 mb-3">Requisitos de la convocatoria</h3>
                    <p className="detail-copy">{call.requisitos_tecnicos}</p>
                  </Panel>
                  {canApply ? (
                    <Panel
                      title={enterprise ? 'Tu propuesta tecnológica' : 'Tu propuesta profesional'}
                      subtitle="Todos los campos marcados son obligatorios"
                    >
                      <SchemaForm
                        multipart
                        fields={fields}
                        initial={{ especialidad: user.specialty }}
                        submitLabel="Enviar postulación"
                        onSubmit={async (body) => {
                          body.set('convocatoria', id)
                          await api('/opportunities/postular/', { method: 'POST', body })
                          notify(
                            'Tu propuesta fue recibida. Sigue su evaluación en Mis postulaciones.',
                          )
                          navigate('/opportunities/my-applications')
                        }}
                      >
                        <div className="notice">
                          <FileCheck2 size={18} aria-hidden="true" />
                          <span>
                            Revisa la información antes de enviarla. Podrás consultar el estado y
                            las observaciones desde tu panel.
                          </span>
                        </div>
                      </SchemaForm>
                    </Panel>
                  ) : (
                    <Panel title="Participa en esta convocatoria">
                      <p className="muted text-sm mb-5">
                        {!user
                          ? 'Inicia sesión con tu perfil para preparar una postulación.'
                          : `Esta convocatoria está dirigida a ${label(call.categoria_destinatario).toLowerCase()}. Tu perfil actual es ${label(user.role).toLowerCase()}.`}
                      </p>
                      {!user && (
                        <LinkButton to="/login" state={{ from: `/opportunities/apply/${id}` }}>
                          Iniciar sesión para postular
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </LinkButton>
                      )}
                    </Panel>
                  )}
                </div>
                <aside className="application-aside">
                  <Panel title="Información de la convocatoria">
                    <Badge value="ABIERTA" />
                    <dl>
                      <dt>Dirigida a</dt>
                      <dd>{label(call.categoria_destinatario)}</dd>
                      <dt>Presupuesto referencial</dt>
                      <dd>{money(call.presupuesto_estimado)} USD</dd>
                      <dt>Apertura</dt>
                      <dd>{date(call.fecha_apertura)}</dd>
                      <dt>Fecha límite</dt>
                      <dd>{date(call.fecha_cierre)}</dd>
                    </dl>
                    {call.repositorio_datos_vinculado && (
                      <LinkButton
                        variant="secondary"
                        to={`/open-science/repositories?dataset=${call.repositorio_datos_vinculado}`}
                      >
                        <Database size={15} aria-hidden="true" />
                        Consultar dataset
                      </LinkButton>
                    )}
                  </Panel>
                  <div className="notice">
                    <Info size={18} aria-hidden="true" />
                    <span>
                      La propuesta debe responder a los requisitos y apoyarse en la evidencia del
                      repositorio de referencia.
                    </span>
                  </div>
                </aside>
              </div>
            </>
          )
        }}
      </Resource>
    </>
  )
}
export default function Apply() {
  const portal = usePortal()
  return (
    <Resource resource={portal}>
      {(data) => (data.portal_habilitado ? <ApplicationContent /> : <ClosedPortal />)}
    </Resource>
  )
}
