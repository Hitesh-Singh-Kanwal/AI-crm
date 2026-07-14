'use client'

import { useEffect, useState } from 'react'

export function useCallTimer(active, startedAt) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return undefined
    }

    const start = startedAt ? new Date(startedAt).getTime() : Date.now()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [active, startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { elapsed, formatted }
}
