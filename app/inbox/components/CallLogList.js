'use client'

import { useEffect, useState } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing, Bot, User, Loader2 } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getToken, getEffectiveBranch } from '@/lib/auth'
import { getApiBaseUrl } from '@/lib/api'
import AiCallRecordingPlayer from '@/components/ai-calling/AiCallRecordingPlayer'

function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (['ended', 'completed', 'answered'].includes(s)) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
  }
  if (['failed', 'busy', 'no-answer', 'canceled', 'cancelled'].includes(s)) {
    return 'bg-destructive/10 text-destructive border-destructive/20'
  }
  if (['initiated', 'queued', 'ringing', 'in-progress'].includes(s)) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function HumanRecordingPlayer({ callRecordId }) {
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [started, setStarted] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!callRecordId || !started) return undefined
    let objectUrl = null
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const token = getToken()
        const branch = getEffectiveBranch()
        const headers = {}
        if (token) headers.Authorization = `Bearer ${token}`
        if (branch) headers['x-location-id'] = branch
        const res = await fetch(
          `${getApiBaseUrl()}/api/human-call/${encodeURIComponent(callRecordId)}/recording`,
          { headers },
        )
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message || 'Recording not available yet.')
        }
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setAudioUrl(objectUrl)
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
  }, [callRecordId, started, retryKey])

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--studio-primary)] hover:underline"
      >
        <Phone className="h-3 w-3" />
        Play recording
      </button>
    )
  }

  if (loading) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading recording…
      </p>
    )
  }
  if (error) {
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="text-xs font-medium text-[color:var(--studio-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }
  if (!audioUrl) return null

  return <audio controls className="mt-2 w-full max-w-sm" src={audioUrl} preload="none" />
}

export default function CallLogList({ calls = [], contactName = 'Contact' }) {
  if (!calls.length) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8 px-4">
        No call logs yet. Place a call to see it here.
      </div>
    )
  }

  return (
    <div className="space-y-3 py-1">
      {calls.map((call) => {
        const isAi = call.callKind === 'ai'
        const isInbound = call.direction === 'inbound'
        const Icon = isAi ? Bot : isInbound ? PhoneIncoming : PhoneOutgoing
        return (
          <div
            key={`${call.channel || 'Call'}-${call.id}`}
            className="rounded-xl border border-border bg-card px-3.5 py-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0',
                  isAi
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {isAi ? 'AI call' : isInbound ? 'Inbound call' : 'Outbound call'}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-medium capitalize', statusTone(call.status))}
                  >
                    {call.status || 'unknown'}
                  </Badge>
                  {isAi && (
                    <Badge variant="outline" className="text-[10px]">
                      <Bot className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  )}
                  {!isAi && (
                    <Badge variant="outline" className="text-[10px]">
                      <User className="h-3 w-3 mr-1" />
                      Human
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isInbound ? contactName : 'You'}
                  {call.fromNumber ? ` · from ${call.fromNumber}` : ''}
                  {call.phoneNumber ? ` · to ${call.phoneNumber}` : ''}
                  {call.assistantName ? ` · ${call.assistantName}` : ''}
                  {call.duration != null ? ` · ${call.duration}s` : ''}
                </p>
                {call.content && (
                  <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {call.content}
                  </p>
                )}
                {!isAi && call.hasRecording && call.callRecordId ? (
                  <HumanRecordingPlayer callRecordId={call.callRecordId} />
                ) : null}
                {isAi && call.callDetailId && call.recordingUrl ? (
                  <div className="mt-2">
                    <AiCallRecordingPlayer callDetailId={call.callDetailId} channel="mono" />
                  </div>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatDateTime(call.timestamp)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
