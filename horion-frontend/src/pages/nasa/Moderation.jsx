import { useState } from 'react'
import { Check, X, FileText, ExternalLink } from 'lucide-react'
import { useResource, useMutation } from '../../lib/hooks'
import { api, download } from '../../lib/api'
import { date } from '../../lib/format'
import { useToast } from '../../context/AppContext'
import { PageHeader, Resource, Badge, Button, Empty, Modal, FormError } from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'
export default function Moderation() {
  const resource = useResource('/nasa/moderacion/'),
    notify = useToast(),
    mutation = useMutation()
  const [filter, setFilter] = useState('PENDIENTE'),
    [review, setReview] = useState(null)
  return (
    <>
      <PageHeader
        eyebrow="CONSOLA NASA / REVISIÓN CIENTÍFICA"
        title="Moderación de aportaciones"
        description="Revisa la metodología y la evidencia antes de compartirla con la comunidad."
      />
      <div className="tabs">
        {[
          ['PENDIENTE', 'Por revisar'],
          ['APROBADO', 'Publicadas'],
          ['RECHAZADO', 'Rechazadas'],
          ['', 'Todas'],
        ].map(([value, text]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {text}
          </button>
        ))}
      </div>
      <FormError error={mutation.error} />
      <Resource resource={resource}>
        {(data) => {
          const rows = data.filter((row) => !filter || row.estado_moderacion === filter)
          return rows.length ? (
            <div className="card-grid">
              {rows.map((item) => (
                <article className="content-card" key={item.id}>
                  <div className="content-card-top">
                    <span className="mono cyan">APORTACIÓN CIENTÍFICA</span>
                    <Badge value={item.estado_moderacion} />
                  </div>
                  <h2>{item.titulo}</h2>
                  <p>{item.resumen_metodologia}</p>
                  <div className="card-meta">
                    <span>{item.autor}</span>
                    <span>{date(item.fecha_envio)}</span>
                  </div>
                  <p className="text-xs mb-4">Dataset: {item.repositorio_titulo}</p>
                  <div className="actions mb-5">
                    {item.tiene_archivo && (
                      <Button
                        variant="secondary"
                        busy={mutation.busy}
                        onClick={() =>
                          mutation.run(() =>
                            download(
                              `/science/aportaciones/${item.id}/document/`,
                              'aportacion.pdf',
                            ),
                          )
                        }
                      >
                        <FileText size={14} aria-hidden="true" />
                        Leer PDF
                      </Button>
                    )}
                    {item.doi_o_enlace && (
                      <a
                        className="text-link"
                        href={item.doi_o_enlace}
                        target="_blank"
                        rel="noreferrer"
                      >
                        DOI / Código
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  {item.comentarios_nasa && (
                    <p className="feedback mb-5">{item.comentarios_nasa}</p>
                  )}
                  <div className="card-footer">
                    <Button
                      variant="secondary"
                      onClick={() => setReview({ ...item, state: 'RECHAZADO' })}
                    >
                      <X size={15} aria-hidden="true" />
                      Rechazar con feedback
                    </Button>
                    <Button onClick={() => setReview({ ...item, state: 'APROBADO' })}>
                      <Check size={15} aria-hidden="true" />
                      Aprobar y publicar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="La bandeja está al día"
              description="No hay aportaciones en esta categoría."
            />
          )
        }}
      </Resource>
      {review && (
        <Modal
          title={
            review.state === 'APROBADO'
              ? 'Aprobar aportación científica'
              : 'Devolver con observaciones'
          }
          onClose={() => setReview(null)}
        >
          <p className="detail-copy mb-5">{review.titulo}</p>
          <SchemaForm
            fields={[
              {
                name: 'comentarios_nasa',
                label: 'Feedback para el investigador',
                type: 'textarea',
                required: review.state === 'RECHAZADO',
              },
            ]}
            initial={{ comentarios_nasa: review.comentarios_nasa }}
            submitLabel={
              review.state === 'APROBADO' ? 'Confirmar publicación' : 'Rechazar aportación'
            }
            onCancel={() => setReview(null)}
            onSubmit={async (body) => {
              await api(`/nasa/moderacion/${review.id}/evaluar/`, {
                method: 'PATCH',
                body: { ...body, estado_moderacion: review.state },
              })
              setReview(null)
              resource.refresh()
              notify('La evaluación se guardó correctamente.')
            }}
          />
        </Modal>
      )}
    </>
  )
}
