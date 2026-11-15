import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
  Inbox,
  X,
  LoaderCircle,
  ArrowRight,
} from 'lucide-react'
import { label } from '../lib/format'
export function Button({ children, variant = 'primary', busy = false, className = '', ...props }) {
  return (
    <button
      className={`button ${variant} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
export function LinkButton({ children, to, variant = 'primary', ...props }) {
  return (
    <Link className={`button ${variant}`} to={to} {...props}>
      {children}
    </Link>
  )
}
export function Badge({ children, value, tone }) {
  const good = ['PUBLICADO', 'APROBADO', 'APROBADO_MISION', 'SELECCIONADA', 'ABIERTA', 'INFO']
  const bad = ['RECHAZADO', 'CRITICAL', 'NO_SELECCIONADA']
  const color =
    tone ||
    (good.includes(value)
      ? 'green'
      : bad.includes(value)
        ? 'red'
        : ['WARNING', 'PENDIENTE', 'RECIBIDO', 'RECIBIDA'].includes(value)
          ? 'amber'
          : 'blue')
  return (
    <span className={`badge ${color}`}>
      <span className="status-dot" />
      {children || label(value)}
    </span>
  )
}
export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted text-sm">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
export function Stat({ icon: Icon, label: title, value, note, color = 'cyan' }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{title}</span>
        {Icon && <Icon size={18} className={color} aria-hidden="true" />}
      </div>
      <strong>{value}</strong>
      <span className="stat-note">{note}</span>
    </div>
  )
}
export function Empty({
  title = 'Todavía no hay registros',
  description = 'Los nuevos registros aparecerán aquí.',
  action,
}) {
  return (
    <div className="empty">
      <Inbox size={32} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={26} aria-hidden="true" />
      <span>Cargando información…</span>
    </div>
  )
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle aria-hidden="true" />
      <div>
        <h3>No pudimos cargar la información</h3>
        <p>{error?.message}</p>
      </div>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          <RefreshCw size={16} aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
export function Resource({ resource, children }) {
  if (resource.loading) return <Loading />
  if (resource.error) return <ErrorState error={resource.error} retry={resource.refresh} />
  return children(resource.data)
}
export function Field({ label: title, name, error, hint, children, as = 'input', ...props }) {
  const id = useId()
  const Tag = as
  const message = Array.isArray(error) ? error.join(' ') : error
  return (
    <div className="field">
      <label htmlFor={id}>
        {title}
        {props.required && (
          <span className="required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <Tag
        id={id}
        name={name}
        aria-invalid={Boolean(message)}
        aria-describedby={message || hint ? `${id}-help` : undefined}
        {...props}
      >
        {children}
      </Tag>
      {(message || hint) && (
        <p id={`${id}-help`} className={message ? 'field-error' : 'field-hint'}>
          {message || hint}
        </p>
      )}
    </div>
  )
}
export function FormError({ error }) {
  const ref = useRef(null)
  useEffect(() => {
    if (error) ref.current?.focus()
  }, [error])
  return error ? (
    <div className="form-error" role="alert" tabIndex={-1} ref={ref}>
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        {error.message}
        {error.fields &&
          Object.entries(error.fields)
            .filter(([key]) => !['detail', 'non_field_errors'].includes(key))
            .map(([key, value]) => (
              <p key={key}>
                <strong>{key.replaceAll('_', ' ')}:</strong>{' '}
                {Array.isArray(value) ? value.join(' ') : String(value)}
              </p>
            ))}
      </div>
    </div>
  ) : null
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null),
    titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  )
}
export function DataTable({ columns, rows, keyField = 'id', empty }) {
  return rows.length ? (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla de datos">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[keyField] || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title={empty} />
  )
}
export function SectionLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  )
}
export function BackLink({ to, children }) {
  return (
    <Link className="back-link" to={to}>
      <ArrowRight size={16} className="rotate-180" aria-hidden="true" />
      {children}
    </Link>
  )
}
