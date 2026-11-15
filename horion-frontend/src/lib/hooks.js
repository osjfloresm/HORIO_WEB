import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export function useResource(path, { interval = 0 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setData(null)
    const load = async () => {
      try {
        const result = await api(path, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    const timer = interval
      ? setInterval(() => {
          if (document.visibilityState === 'visible') load()
        }, interval)
      : null
    return () => {
      controller.abort()
      if (timer) clearInterval(timer)
    }
  }, [path, revision, interval])
  return { data, error, loading, refresh }
}
export function useMutation() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = async (operation, onSuccess) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await operation()
      await onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run, setError }
}
