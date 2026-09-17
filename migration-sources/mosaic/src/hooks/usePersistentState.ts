import { useCallback, useEffect, useRef, useState } from 'react'

type StateUpdate<T> = T | ((previous: T) => T)

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) as T : initialValue
    } catch {
      return initialValue
    }
  })
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Persistence is best-effort. Private browsing/storage limits should not break execution.
    }
  }, [key, value])

  const setPersistentValue = useCallback((next: StateUpdate<T>) => {
    const current = valueRef.current
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current) : next
    valueRef.current = resolved
    try {
      // Write immediately so Duplicate/Export in the next interaction cannot
      // observe a one-render-old block value.
      localStorage.setItem(key, JSON.stringify(resolved))
    } catch {
      // State remains usable even when persistence is unavailable.
    }
    setValue(resolved)
  }, [key])

  return [value, setPersistentValue] as const
}
