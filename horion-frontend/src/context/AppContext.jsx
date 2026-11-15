import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, session } from '../lib/api'
import { useResource } from '../lib/hooks'
const AuthContext = createContext(null)
const PortalContext = createContext(null)
const ToastContext = createContext(null)
export function Providers({ children }) {
  const [user, setUser] = useState(session.get()?.user || null)
  const [checking, setChecking] = useState(Boolean(session.get()))
  const [toasts, setToasts] = useState([])
  const portal = useResource('/opportunities/status/', { interval: 30000 })
  const notify = useCallback((message) => {
    const id = crypto.randomUUID()
    setToasts((values) => [...values, { id, message }])
    setTimeout(() => setToasts((values) => values.filter((item) => item.id !== id)), 6000)
  }, [])
  useEffect(() => {
    const clear = () => {
      setUser(null)
      setChecking(false)
    }
    window.addEventListener('horion:logout', clear)
    if (session.get())
      api('/auth/me/')
        .then((value) => {
          setUser(value)
          session.set({ ...session.get(), user: value })
        })
        .catch((error) => {
          if (error.status === 401 || error.status === 403) {
            session.set(null)
            clear()
          }
        })
        .finally(() => setChecking(false))
    return () => window.removeEventListener('horion:logout', clear)
  }, [])
  const signIn = (value) => {
    session.set(value)
    setUser(value.user)
  }
  const signOut = async () => {
    await api('/auth/logout/', { method: 'POST', body: { refresh: session.get()?.refresh } })
    session.set(null)
    setUser(null)
  }
  return (
    <AuthContext.Provider value={{ user, checking, signIn, signOut }}>
      <PortalContext.Provider value={portal}>
        <ToastContext.Provider value={notify}>
          {children}
          <div className="toast-stack" role="status" aria-live="polite">
            {toasts.map((item) => (
              <div className="toast" key={item.id}>
                {item.message}
                <button
                  aria-label="Cerrar notificación"
                  onClick={() => setToasts((values) => values.filter((v) => v.id !== item.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </PortalContext.Provider>
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
export const usePortal = () => useContext(PortalContext)
export const useToast = () => useContext(ToastContext)
