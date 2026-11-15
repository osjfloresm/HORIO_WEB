import { RefreshCw, ArrowUpRight, FileText } from 'lucide-react'
import { useResource, useMutation } from '../../lib/hooks'
import { download } from '../../lib/api'
import { date, money, label } from '../../lib/format'
import {
  PageHeader,
  Resource,
  Badge,
  Button,
  LinkButton,
  Empty,
  FormError,
} from '../../components/ui'
const stages = ['RECIBIDA', 'EN_REVISION', 'FINALISTA', 'SELECCIONADA']
export default function MyApplications() {
  const resource = useResource('/opportunities/postulaciones/', { interval: 30000 }),
    mutation = useMutation()
  return (
    <>
      <PageHeader
        eyebrow="MI ESPACIO / SEGUIMIENTO"
        title="Cada propuesta, un nuevo camino."
        description="Consulta el avance de tus postulaciones y las observaciones del equipo evaluador. Se actualiza cada 30 segundos."
        actions={
          <Button variant="secondary" busy={resource.loading} onClick={resource.refresh}>
            <RefreshCw size={15} aria-hidden="true" />
            Actualizar
          </Button>
        }
      />
      <FormError error={mutation.error} />
      <Resource resource={resource}>
        {(data) =>
          data.length ? (
            <div className="card-grid">
              {data.map((item) => (
                <article className="content-card" key={item.id}>
                  <div className="content-card-top">
                    <span className="mono cyan">{item.codigo_convocatoria}</span>
                    <Badge value={item.estado} />
                  </div>
                  <h2>{item.titulo_propuesta}</h2>
                  <p>{item.convocatoria_titulo}</p>
                  <div className="card-meta">
                    <span>Enviada {date(item.fecha_postulacion)}</span>
                    <span>{money(item.presupuesto_o_honorarios)} USD</span>
                    {item.nivel_trl && <span>TRL {item.nivel_trl}</span>}
                  </div>
                  {item.estado !== 'NO_SELECCIONADA' && (
                    <ol className="timeline" aria-label="Etapas de evaluación">
                      {stages.map((stage, index) => (
                        <li
                          key={stage}
                          className={`timeline-step ${index <= stages.indexOf(item.estado) ? 'complete' : ''}`}
                          aria-current={stage === item.estado ? 'step' : undefined}
                        >
                          {label(stage)}
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="feedback mb-6">
                    <strong>OBSERVACIONES DEL EQUIPO EVALUADOR</strong>
                    {item.evaluacion_nasa ||
                      'La propuesta fue recibida. Las observaciones aparecerán aquí cuando el equipo la revise.'}
                  </div>
                  <div className="card-footer">
                    <span className="count-label">ID {item.id.slice(0, 8).toUpperCase()}</span>
                    <Button
                      variant="secondary"
                      busy={mutation.busy}
                      onClick={() =>
                        mutation.run(() =>
                          download(
                            `/opportunities/postulaciones/${item.id}/document/`,
                            'mi-propuesta.pdf',
                          ),
                        )
                      }
                    >
                      <FileText size={14} aria-hidden="true" />
                      Mi documento
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Tu próxima misión comienza con una propuesta"
              description="Explora las convocatorias y presenta tu experiencia o solución tecnológica."
              action={
                <LinkButton to="/opportunities/board">
                  Explorar oportunidades
                  <ArrowUpRight size={16} aria-hidden="true" />
                </LinkButton>
              }
            />
          )
        }
      </Resource>
    </>
  )
}
