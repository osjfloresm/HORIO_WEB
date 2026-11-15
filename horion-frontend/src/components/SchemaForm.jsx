import { useState } from 'react'
import { useMutation } from '../lib/hooks'
import { Button, Field, FormError } from './ui'

/** Small form renderer; business-specific fields remain beside each page. */
export default function SchemaForm({
  fields,
  initial = {},
  submitLabel = 'Guardar',
  onSubmit,
  onCancel,
  multipart = false,
  children,
}) {
  const [values, setValues] = useState(initial)
  const mutation = useMutation()
  const submit = (event) => {
    event.preventDefault()
    const body = multipart
      ? new FormData(event.currentTarget)
      : Object.fromEntries(
          fields.map((field) => {
            let value = values[field.name] ?? field.defaultValue ?? ''
            if (field.type === 'checkbox') value = Boolean(value)
            else if (field.type === 'number') value = value === '' ? null : Number(value)
            else if (field.nullable && value === '') value = null
            return [field.name, value]
          }),
        )
    mutation.run(() => onSubmit(body))
  }
  return (
    <form className="form" onSubmit={submit}>
      <FormError error={mutation.error} />
      {fields.map((field) => {
        const { name, label, options, type = 'text', hint, ...rest } = field
        delete rest.nullable
        delete rest.defaultValue
        if (type === 'checkbox')
          return (
            <label className="check-field" key={name}>
              <input
                type="checkbox"
                name={name}
                checked={Boolean(values[name])}
                required={rest.required}
                onChange={(event) => setValues({ ...values, [name]: event.target.checked })}
              />
              {label}
            </label>
          )
        return (
          <Field
            key={name}
            label={label}
            name={name}
            hint={hint}
            error={mutation.error?.fields?.[name]}
            as={options ? 'select' : type === 'textarea' ? 'textarea' : 'input'}
            {...(!options && type !== 'textarea' ? { type } : {})}
            {...rest}
            {...(type !== 'file'
              ? {
                  value: values[name] ?? field.defaultValue ?? '',
                  onChange: (event) => setValues({ ...values, [name]: event.target.value }),
                }
              : {})}
          >
            {options && (
              <>
                <option value="">Seleccionar…</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            )}
          </Field>
        )
      })}
      {children}
      <div className="form-actions">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button busy={mutation.busy} type="submit">
          {mutation.busy ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
