'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, User } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import GlobalLoader from '@/components/shared/GlobalLoader'
import SuccessEvaluationDisplay from '@/components/ai-calling/SuccessEvaluationDisplay'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null
  const ms = new Date(endedAt) - new Date(startedAt)
  if (!Number.isFinite(ms) || ms < 0) return null
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatEndedReason(reason) {
  if (!reason) return null
  const map = {
    customer_hangup: 'Caller hung up',
    agent_resolve: 'Marked resolved',
    agent_hangup: 'Agent ended call',
    conference_end: 'Call ended',
    stale: 'Timed out in queue',
    transfer_failed: 'Transfer failed',
    'assistant-forwarded-call': 'Transferred to human',
    'assistant-ended-call': 'Assistant ended call',
  }
  if (map[reason]) return map[reason]
  return String(reason).replace(/[-_]/g, ' ')
}

function endedReasonLabel(reason) {
  return formatEndedReason(reason)
}

function getMessages(call) {
  if (Array.isArray(call?.artifact?.messages) && call.artifact.messages.length) {
    return call.artifact.messages
  }
  if (Array.isArray(call?.messages) && call.messages.length) {
    return call.messages
  }
  return []
}

function getRecordingUrl(call) {
  return call?.artifact?.recordingUrl || call?.recordingUrl || null
}

function getStereoUrl(call) {
  return call?.artifact?.stereoRecordingUrl || call?.stereoRecordingUrl || null
}

/**
 * Full call history detail (recording + transcript) for a resolved Human Queue item.
 * Loads AiCallDetail via the queue item's vapiCallId.
 */
export default function ResolvedCallDetail({ queueItem, onBack }) {
  const [call, setCall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  const vapiCallId = queueItem?.vapiCallId || null
  const callerName = queueItem?.leadName || queueItem?.callerName || call?.customer?.name || call?.leadID?.name || 'Unknown caller'
  const callerPhone = queueItem?.phone || queueItem?.callerPhone || call?.customer?.number || call?.leadID?.phoneNumber || ''

  const loadCall = async ({ silent = false } = {}) => {
    if (!vapiCallId) {
      setCall(null)
      setError('No Vapi call ID on this queue item — recording may not be available.')
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    try {
      const r = await api.get(`/api/ai-calling/by-call-id/${encodeURIComponent(vapiCallId)}`)
      if (!r.success || !r.data) {
        setCall(null)
        setError(r.error || 'Call recording / transcript not found yet. It may still be syncing from Vapi.')
        return
      }
      setCall(r.data)
    } catch (err) {
      setCall(null)
      setError(err?.message || 'Failed to load call details')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadCall()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vapiCallId])

  const handleSync = async () => {
    if (!call?._id) return
    setSyncing(true)
    try {
      const r = await api.post(`/api/ai-calling/${call._id}/sync`, {})
      if (r.success && r.data) setCall(r.data)
      else await loadCall({ silent: true })
    } catch {
      await loadCall({ silent: true })
    } finally {
      setSyncing(false)
    }
  }

  const messages = useMemo(() => getMessages(call), [call])
  const recordingUrl = getRecordingUrl(call)
  const stereoUrl = getStereoUrl(call)

  const startedAt = call?.startedAt || queueItem?.createdAt || null
  const endedAt =
    call?.endedAt
    || queueItem?.resolvedAt
    || queueItem?.abandonedAt
    || queueItem?.callerLeftAt
    || null
  const duration = formatDuration(startedAt, endedAt)
  const endedReasonDisplay =
    formatEndedReason(call?.endedReason)
    || endedReasonLabel(queueItem?.endedReason)
    || (queueItem?.redirectSucceeded ? 'Transferred to human' : null)
    || null

  const assistantLabel =
    call?.dbAssistantId?.name
    || queueItem?.assistantName
    || call?.assistantName
    || 'AI Agent'
  const evalRubric = call?.dbAssistantId?.successEvaluationRubric || null
  const callerLabel = call?.customer?.name || call?.leadID?.name || callerName

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          className="text-xs text-[var(--studio-primary)] hover:underline underline-offset-2"
          onClick={onBack}
        >
          ← Call history
        </button>
        {call?._id && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? <GlobalLoader variant="inline" size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync from Vapi
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <GlobalLoader variant="inline" size="md" text="Loading call recording…" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-[color:var(--studio-primary)] text-white font-semibold">
                    {getInitials(callerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground truncate">{callerName}</p>
                  <p className="text-sm text-muted-foreground truncate">{callerPhone}</p>
                  {queueItem?.intent && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{queueItem.intent}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                {typeof call?.cost === 'number' && call.cost > 0 && (
                  <p className="text-sm font-semibold text-foreground">
                    ${call.cost.toFixed(4)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">cost</span>
                  </p>
                )}
                <p>Escalated {formatDateTime(queueItem?.createdAt)}</p>
                {(queueItem?.endedAt || queueItem?.resolvedAt || queueItem?.abandonedAt) && (
                  <p>Ended {formatDateTime(queueItem.endedAt || queueItem.resolvedAt || queueItem.abandonedAt)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-5 space-y-6">
            {error && !call && (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                {error}
              </div>
            )}

            {call && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { label: 'Assistant', value: assistantLabel },
                    { label: 'Duration', value: duration || '—' },
                    { label: 'Ended reason', value: endedReasonDisplay || '—' },
                    { label: 'Started', value: startedAt ? new Date(startedAt).toLocaleTimeString() : '—' },
                    { label: 'Ended', value: endedAt ? new Date(endedAt).toLocaleTimeString() : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                      <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                    {call.analysis?.summary || call.summary || queueItem?.aiSummary || 'No summary available'}
                  </p>
                </div>

                {call.analysis?.successEvaluation && (
                  <SuccessEvaluationDisplay
                    evaluation={call.analysis.successEvaluation}
                    rubric={evalRubric}
                    variant="full"
                  />
                )}

                {(recordingUrl || stereoUrl) && (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Recording</p>
                    {recordingUrl && (
                      <audio controls className="w-full" src={recordingUrl} />
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--studio-primary)]">
                      {recordingUrl && (
                        <a href={recordingUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          Open mono recording
                        </a>
                      )}
                      {stereoUrl && (
                        <a href={stereoUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          Open stereo recording
                        </a>
                      )}
                      {call.logUrl && (
                        <a href={call.logUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          View raw call log
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {messages.length > 0 && (
                  <div className="space-y-3">
                    {messages.some((m) => m.role === 'system') && (
                      <>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Script (system prompt)</p>
                        <div className="text-[11px] text-foreground bg-muted/50 rounded-lg p-3 max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                          {messages.find((m) => m.role === 'system')?.message || 'Script not available'}
                        </div>
                      </>
                    )}

                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Turn-by-turn transcript</p>
                    <div className="max-h-[420px] overflow-y-auto border border-dashed border-border rounded-lg p-3 bg-muted/30 space-y-2">
                      {messages
                        .filter((msg) => msg.role !== 'system')
                        .map((msg, idx) => {
                          const isAI = msg.role === 'bot' || msg.role === 'assistant'
                          const isUser = !isAI
                          return (
                            <div
                              key={idx}
                              className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed shadow-sm',
                                  isAI
                                    ? 'bg-indigo-500/10 text-foreground rounded-bl-sm'
                                    : 'bg-card text-foreground border border-border rounded-br-sm',
                                )}
                              >
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {isAI ? 'AI Agent' : callerLabel}
                                </p>
                                <p className="whitespace-pre-wrap">{msg.message || msg.content || ''}</p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {!recordingUrl && !stereoUrl && messages.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                    Recording and transcript are not available yet. Try Sync from Vapi.
                  </div>
                )}
              </>
            )}

            {!call && !error && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                No call detail loaded.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
