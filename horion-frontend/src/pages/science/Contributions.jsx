import { useState } from 'react'
import { Upload, FileText, ArrowUpRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth, useToast } from '../../context/AppContext'
import { useResource, useMutation } from '../../lib/hooks'
import { api, download } from '../../lib/api'
import { date } from '../../lib/format'
import {
  PageHeader,
  Resource,
  Badge,
  Button,
  LinkButton,
  Empty,
  Modal,
  FormError,
} from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'
export default function Contributions() {
  const { user } = useAuth(),
    notify = useToast(),
    resource = useResource('/science/aportaciones/'),
    repositories = useResource('/science/repositorios/')
  const [creating, setCreating] = useState(false),
    [query, setQuery] = useState(''),
    mutation = useMutation()
  const canSubmit = ['RESEARCHER', 'NASA_ADMIN'].includes(user?.role)
  return (
    <>
      <PageHeader
        eyebrow="OPEN SCIENCE / COMUNIDAD"
        title="El conocimiento se construye juntos."
        description="Investigaciones, análisis y modelos que amplían nuestra perspectiva sobre la salud espacial."
        actions={
          canSubmit ? (
            <Button onClick={() => setCreating(true)}>
              <Upload size={16} aria-hidden="true" />
              Subir aportación
            </Button>
          ) : !user ? (
            <LinkButton to="/login">
              Accede para contribuir
              <ArrowUpRight size={16} aria-hidden="true" />
            </LinkButton>
          ) : undefined
        }
      />
      <div className="filters">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Buscar aportaciones"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, autor o metodología…"
          />
        </div>
      </div>
      <FormError error={mutation.error} />
      <Resource resource={resource}>
        {(data) => {
          const rows = data.filter((item) =>
            `${item.titulo} ${item.autor} ${item.resumen_metodologia}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          return rows.length ? (
            <div className="card-grid">
              {rows.map((item) => (
                <article className="content-card" key={item.id}>
                  <div className="content-card-top">
                    <span className="mono cyan">
                      INVESTIGACIÓN / {new Date(item.fecha_envio).getUTCFullYear()}
                    </span>
                    <Badge value={item.estado_moderacion} />
                  </div>
                  <h2>{item.titulo}</h2>
                  <p>{item.resumen_metodologia}</p>
                  <div className="card-meta">
                    <span>{item.autor}</span>
                    <span>{date(item.fecha_envio)}</span>
                  </div>
                  <Link
                    className="text-link mb-5"
                    to={`/open-science/repositories?dataset=${item.repositorio}`}
                  >
                    {item.repositorio_titulo}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                  {item.comentarios_nasa && (
                    <div className="feedback mb-5">
                      <strong>OBSERVACIONES DEL EQUIPO REVISOR</strong>
                      {item.comentarios_nasa}
                    </div>
                  )}
                  <div className="card-footer">
                    <span className="count-label">CIENCIA COMPARTIDA</span>
                    <div className="actions">
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
                          PDF
                        </Button>
                      )}
                      {item.doi_o_enlace && (
                        <a
                          className="button secondary"
                          href={item.doi_o_enlace}
                          target="_blank"
                          rel="noreferrer"
                        >
                          DOI / Código
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Aquí comienza la próxima investigación"
              description="No hay aportaciones para esta búsqueda. Los trabajos enviados aparecerán tras su revisión; puedes consultar tus propios envíos al iniciar sesión."
            />
          )
        }}
      </Resource>
      {creating && (
        <Modal title="Compartir una aportación científica" onClose={() => setCreating(false)}>
          <p className="muted text-xs mb-5">
            El equipo revisor evaluará tu trabajo antes de publicarlo. Adjunta un PDF de hasta 10 MB
            o un enlace a código/DOI.
          </p>
          <SchemaForm
            multipart
            fields={[
              { name: 'titulo', label: 'Título del trabajo', required: true, maxLength: 200 },
              {
                name: 'repositorio',
                label: 'Repositorio de datos utilizado',
                required: true,
                options: (repositories.data || []).map((item) => ({
                  value: item.id,
                  label: item.titulo_dataset,
                })),
              },
              {
                name: 'resumen_metodologia',
                label: 'Resumen y metodología',
                type: 'textarea',
                required: true,
              },
              {
                name: 'doi_o_enlace',
                label: 'DOI o enlace al código',
                type: 'url',
                placeholder: 'https://',
              },
              {
                name: 'archivo',
                label: 'Paper (PDF)',
                type: 'file',
                accept: 'application/pdf,.pdf',
                hint: 'Máximo 10 MB. Opcional si incluyes un enlace.',
              },
            ]}
            submitLabel="Enviar a revisión"
            onCancel={() => setCreating(false)}
            onSubmit={async (body) => {
              if (!body.get('archivo')?.size) body.delete('archivo')
              await api('/science/aportaciones/', { method: 'POST', body })
              setCreating(false)
              resource.refresh()
              notify('Aportación recibida. Puedes consultar aquí su estado de revisión.')
            }}
          />
        </Modal>
      )}
    </>
  )
}
