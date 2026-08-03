'use client'

import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { getToken, getEffectiveBranch } from '@/lib/auth'
import { getApiBaseUrl } from '@/lib/api'

/**
 * Plays AI call audio via our authenticated proxy.
 * Stored Vapi recording URLs point at private R2 buckets and will not play
 * in a browser <audio src> without Authorization.
 */
export default function AiCallRecordingPlayer({
  callDetailId,
  channel = 'mono',
  hasRecording = true,
  className = 'w-full',
  autoStart = false,
}) {
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [started, setStarted] = useState(autoStart)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!callDetailId || !hasRecording || !started) return undefined
    let objectUrl = null
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setAudioUrl(null)
      try {
        const token = getToken()
        const branch = getEffectiveBranch()
        const headers = {}
        if (token) headers.Authorization = `Bearer ${token}`
        if (branch) headers['x-location-id'] = branch

        const qs = channel === 'stereo' ? '?channel=stereo' : ''
        const res = await fetch(
          `${getApiBaseUrl()}/api/ai-calling/${encodeURIComponent(callDetailId)}/recording${qs}`,
          { headers },
        )
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message || body?.error || 'Recording not available yet.')
        }
        const blob = await res.blob()
        const nextUrl = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        objectUrl = nextUrl
        setAudioUrl(objectUrl)
      } catch (err) {
        if (!cancelled) {
          setAudioUrl(null)
          setError(err?.message || 'Could not load recording')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [callDetailId, channel, hasRecording, started, retryKey])

  if (!hasRecording || !callDetailId) return null

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <Play className="h-3 w-3" />
        Play {channel === 'stereo' ? 'stereo' : 'mono'} recording
      </button>
    )
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading recording…
      </p>
    )
  }

  if (error) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!audioUrl) return null

  return <audio controls className={className} src={audioUrl} preload="metadata" />
}
