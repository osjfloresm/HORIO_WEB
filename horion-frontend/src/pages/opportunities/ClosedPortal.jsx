import { Telescope, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { usePortal } from '../../context/AppContext'
import { api } from '../../lib/api'
import SchemaForm from '../../components/SchemaForm'
export default function ClosedPortal() {
  const portal = usePortal(),
    [subscribed, setSubscribed] = useState(false)
  return (
    <section className="closed-portal">
      <Telescope size={46} strokeWidth={1.2} aria-hidden="true" />
      <span className="eyebrow">LA PRÓXIMA OPORTUNIDAD ESTÁ EN EL HORIZONTE</span>
      <h1>Las grandes misiones también tienen su momento.</h1>
      <p>
        {portal.data?.mensaje_estado || 'Actualmente no hay ventanas de convocatoria abiertas.'}
      </p>
      {subscribed ? (
        <div className="notice">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>
            Tu suscripción está registrada. El equipo podrá avisarte cuando se abra una nueva
            convocatoria.
          </span>
        </div>
      ) : (
        <SchemaForm
          fields={[
            {
              name: 'email',
              label: 'Recibe novedades en tu correo',
              type: 'email',
              required: true,
              autoComplete: 'email',
              placeholder: 'tu@institucion.org',
            },
          ]}
          submitLabel="Suscribirme a novedades"
          onSubmit={async (body) => {
            await api('/opportunities/subscribe/', { method: 'POST', body })
            setSubscribed(true)
          }}
        />
      )}
    </section>
  )
}
