import { useEffect, useRef } from 'react'

export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => document.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => document.removeEventListener(e, reset))
    }
  }, [timeoutMs, enabled])
}
