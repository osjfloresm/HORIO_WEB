import { LinkButton } from '../../components/ui'
export default function NotFound() {
  return (
    <div className="not-found">
      <p className="eyebrow">404 · FUERA DE ÓRBITA</p>
      <h1>No encontramos esta página.</h1>
      <p className="muted">El enlace puede haber cambiado. Regresa al inicio para continuar.</p>
      <LinkButton to="/">Volver a Horion</LinkButton>
    </div>
  )
}
