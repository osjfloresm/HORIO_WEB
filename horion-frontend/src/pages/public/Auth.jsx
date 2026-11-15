import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FlaskConical, Stethoscope, Building2, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useAuth, useToast } from '../../context/AppContext'
import { api } from '../../lib/api'
import { useMutation } from '../../lib/hooks'
import { homeFor } from '../../lib/format'
import { Button, Field, FormError } from '../../components/ui'
const roles = [
  {
    value: 'RESEARCHER',
    title: 'Investigador',
    detail: 'Ciencia y conocimiento',
    icon: FlaskConical,
  },
  {
    value: 'PROFESSIONAL',
    title: 'Profesional',
    detail: 'Experiencia especializada',
    icon: Stethoscope,
  },
  { value: 'ENTERPRISE', title: 'Empresa', detail: 'Tecnología e innovación', icon: Building2 },
]
export default function Auth({ register = false }) {
  const { signIn } = useAuth(),
    notify = useToast(),
    navigate = useNavigate(),
    location = useLocation()
  const [role, setRole] = useState('RESEARCHER'),
    [values, setValues] = useState({ email: '', password: '' })
  const mutation = useMutation()
  const bind = (name) => ({
    name,
    value: values[name] || '',
    onChange: (event) => setValues({ ...values, [name]: event.target.value }),
    error: mutation.error?.fields?.[name],
  })
  const submit = (event) => {
    event.preventDefault()
    mutation.run(
      () =>
        api(`/auth/${register ? 'register' : 'login'}/`, {
          method: 'POST',
          body: { ...values, ...(register ? { role } : {}) },
        }),
      (result) => {
        if (!result.access) {
          notify(result.detail)
          navigate('/login')
          return
        }
        signIn(result)
        const destination = location.state?.from
        navigate(
          destination?.startsWith('/') &&
            !destination.startsWith('//') &&
            !destination.includes('\\')
            ? destination
            : homeFor(result.user.role),
          { replace: true },
        )
      },
    )
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <p className="eyebrow">BIENVENIDO A HORION</p>
        <h1>
          {register ? (
            <>
              Tu conocimiento.
              <br />
              Nuestro siguiente
              <br />
              <span>horizonte.</span>
            </>
          ) : (
            <>
              Cada misión
              <br />
              comienza con
              <br />
              una <span>conexión.</span>
            </>
          )}
        </h1>
        <p>
          Un espacio para conectar la exploración, la investigación y las personas que hacen posible
          el futuro.
        </p>
        <div className="auth-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>H</span>
        </div>
        <div className="auth-note">
          <ShieldCheck size={20} aria-hidden="true" />
          Acceso protegido por perfil y permisos.
        </div>
      </aside>
      <section className="auth-form-panel">
        <p className="eyebrow">{register ? 'CREA TU CUENTA' : 'ACCESO A LA PLATAFORMA'}</p>
        <h2>{register ? 'Encuentra tu lugar en Horion' : 'Es bueno tenerte de vuelta'}</h2>
        <p className="muted">
          {register
            ? 'Selecciona tu perfil para personalizar tu experiencia.'
            : 'Ingresa tus credenciales para continuar tu misión.'}
        </p>
        {register && (
          <div className="role-selector" role="group" aria-label="Tipo de cuenta">
            {roles.map(({ value, title, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={role === value ? 'selected' : ''}
                aria-pressed={role === value}
                onClick={() => setRole(value)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{title}</span>
              </button>
            ))}
          </div>
        )}
        <form className="form" onSubmit={submit}>
          <FormError error={mutation.error} />
          {register && (
            <Field
              label={role === 'ENTERPRISE' ? 'Razón social' : 'Nombre completo'}
              required
              autoComplete="name"
              {...bind('name')}
            />
          )}
          <Field
            label="Correo electrónico"
            type="email"
            required
            autoComplete="email"
            {...bind('email')}
          />
          <Field
            label="Contraseña"
            type="password"
            required
            minLength={register ? 8 : undefined}
            autoComplete={register ? 'new-password' : 'current-password'}
            hint={register ? 'Usa al menos 8 caracteres y evita contraseñas comunes.' : undefined}
            {...bind('password')}
          />
          {register && (
            <>
              {role === 'RESEARCHER' && (
                <Field label="Institución" required {...bind('institution')} />
              )}
              {role === 'PROFESSIONAL' && (
                <Field label="Especialidad médica o técnica" required {...bind('specialty')} />
              )}
              {role === 'ENTERPRISE' && (
                <Field label="Sector" as="select" required {...bind('sector')}>
                  <option value="">Seleccionar sector</option>
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Biotecnología</option>
                </Field>
              )}
              <Field
                label={role === 'ENTERPRISE' ? 'ID fiscal / DUNS' : 'Código ORCID'}
                required
                {...bind('identifier')}
              />
              <Field label="País" autoComplete="country-name" required {...bind('country')} />
            </>
          )}
          <Button type="submit" busy={mutation.busy}>
            {register ? 'Crear mi cuenta' : 'Iniciar sesión'}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? '¿Ya tienes una cuenta?' : '¿Es tu primera misión?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Inicia sesión' : 'Crea una cuenta'}
          </Link>
        </p>
        {!register && import.meta.env.DEV && (
          <details className="demo-accounts">
            <summary>Probar con una cuenta de demostración</summary>
            <p>Disponible después de ejecutar seed_demo con la contraseña de la guía.</p>
            <div className="demo-account-buttons">
              {['admin', 'researcher', 'professional', 'enterprise'].map((account) => (
                <button
                  type="button"
                  key={account}
                  onClick={() =>
                    setValues({ email: `${account}@horion.demo`, password: 'HorionDemo2026!' })
                  }
                >
                  {account}
                </button>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  )
}
