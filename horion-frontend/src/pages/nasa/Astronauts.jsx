import { useState } from 'react'
import { Info, Pencil, Plus, RefreshCw, Users } from 'lucide-react'
import { useResource } from '../../lib/hooks'
import { api } from '../../lib/api'
import { datetime } from '../../lib/format'
import { useToast } from '../../context/AppContext'
import {
  Badge,
  Button,
  DataTable,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
  Resource,
  SectionLink,
  Stat,
} from '../../components/ui'
import SchemaForm from '../../components/SchemaForm'

export default function Astronauts() {
  const astronauts = useResource('/nasa/astronautas/', { interval: 30000 })
  const missions = useResource('/nasa/misiones/')
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const notify = useToast()
  const linked = Boolean(editing?.vinculo_confirmado)
  const fields = [
    { name: 'nombre_completo', label: 'Nombre completo', required: true, maxLength: 200 },
    {
      name: 'codigo_astronauta',
      label: 'Código del escritorio',
      required: true,
      maxLength: 50,
      placeholder: 'Ej. AST-001',
      readOnly: linked,
      hint: linked
        ? 'El código se conserva porque este perfil ya recibió datos.'
        : 'Escribe exactamente el código que envía ese escritorio. Crear el perfil no cambia el código del equipo.',
    },
    {
      name: 'mision',
      label: 'Misión asignada',
      required: true,
      disabled: linked,
      options: (missions.data || []).map((mission) => ({
        value: mission.id,
        label: `${mission.codigo_mision} · ${mission.nombre}`,
      })),
      hint: linked
        ? 'La misión se conserva junto con el historial recibido.'
        : 'La misión debe haber comenzado antes de la primera lectura del escritorio.',
    },
    { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
    { name: 'grupo_sanguineo', label: 'Grupo sanguíneo (opcional)', maxLength: 10 },
    { name: 'alergias', label: 'Alergias (opcional)', type: 'textarea' },
  ]
  return (
    <>
      <PageHeader
        eyebrow="CONSOLA NASA / TRIPULACIÓN"
        title="Astronautas"
        description="Registra a cada persona y asocia sus datos de Horion Edge mediante el código de su escritorio."
        actions={
          <>
            <Button variant="secondary" onClick={astronauts.refresh} busy={astronauts.loading}>
              <RefreshCw size={16} aria-hidden="true" />
              Actualizar
            </Button>
            <Button
              onClick={() => setEditing({})}
              disabled={missions.loading || Boolean(missions.error) || !missions.data?.length}
            >
              <Plus size={16} aria-hidden="true" />
              Nuevo astronauta
            </Button>
          </>
        }
      />
      <div className="notice">
        <Info size={18} aria-hidden="true" />
        <span>
          El vínculo se confirma cuando llegan datos con el mismo código. Si tu equipo usa{' '}
          <strong>AST-001</strong>, busca y edita ese perfil si ya existe. Cada persona debe tener
          un código propio.
        </span>
      </div>
      <Resource resource={missions}>
        {(data) =>
          data.length ? null : (
            <Empty
              title="Primero registra una misión"
              description="Crea una misión desde Administración para poder asignarla a los astronautas."
            />
          )
        }
      </Resource>
      <Resource resource={astronauts}>
        {(data) => {
          const query = search.trim().toLocaleLowerCase('es')
          const filtered = data.filter((person) =>
            [person.nombre_completo, person.codigo_astronauta, person.codigo_mision].some((value) =>
              value.toLocaleLowerCase('es').includes(query),
            ),
          )
          const received = data.filter((person) => person.vinculo_confirmado).length
          return (
            <>
              <div className="stat-grid">
                <Stat icon={Users} label="Astronautas registrados" value={data.length} />
                <Stat
                  label="Con datos recibidos"
                  value={received}
                  note="Al menos un envío confirmado"
                />
                <Stat label="Esperando primer envío" value={data.length - received} />
                <Stat
                  label="Misiones asignadas"
                  value={new Set(data.map((person) => person.mision)).size}
                />
              </div>
              <Panel
                title="Perfiles de la tripulación"
                subtitle="La última sincronización indica cuándo se recibieron datos; no confirma que el equipo siga conectado."
                action={<SectionLink to="/nasa-admin/telemetry">Ver telemetría</SectionLink>}
              >
                <div className="filters">
                  <Field
                    label="Buscar por nombre, código o misión"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <DataTable
                  rows={filtered}
                  empty={
                    query
                      ? 'No hay astronautas que coincidan'
                      : 'Todavía no hay astronautas registrados'
                  }
                  columns={[
                    { key: 'nombre_completo', label: 'ASTRONAUTA' },
                    {
                      key: 'codigo_astronauta',
                      label: 'CÓDIGO DEL ESCRITORIO',
                      render: (person) => <span className="mono">{person.codigo_astronauta}</span>,
                    },
                    { key: 'codigo_mision', label: 'MISIÓN' },
                    {
                      key: 'vinculo_confirmado',
                      label: 'VÍNCULO',
                      render: (person) => (
                        <Badge tone={person.vinculo_confirmado ? 'green' : 'amber'}>
                          {person.vinculo_confirmado ? 'Datos recibidos' : 'Esperando primer envío'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'ultima_sincronizacion',
                      label: 'ÚLTIMA SINCRONIZACIÓN',
                      render: (person) => datetime(person.ultima_sincronizacion),
                    },
                    {
                      key: 'actions',
                      label: 'GESTIÓN',
                      render: (person) => (
                        <Button
                          variant="secondary"
                          onClick={() => setEditing(person)}
                          disabled={missions.loading || Boolean(missions.error)}
                          aria-label={`Editar a ${person.nombre_completo}`}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Editar
                        </Button>
                      ),
                    },
                  ]}
                />
              </Panel>
            </>
          )
        }}
      </Resource>
      {editing && (
        <Modal
          title={editing.id ? 'Editar astronauta' : 'Nuevo astronauta'}
          onClose={() => setEditing(null)}
        >
          <SchemaForm
            fields={fields}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (body) => {
              await api(`/nasa/astronautas/${editing.id ? `${editing.id}/` : ''}`, {
                method: editing.id ? 'PATCH' : 'POST',
                body,
              })
              setEditing(null)
              astronauts.refresh()
              notify('Perfil del astronauta guardado.')
            }}
          />
        </Modal>
      )}
    </>
  )
}
