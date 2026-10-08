'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarClock, Mail, MessageSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDateTime } from '@/lib/utils'
import {
  getScheduleMinLocalDatetime,
  toLocalDatetimeInputValue,
  toScheduleIsoOrNull,
} from '@/lib/emailSend'

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[color:var(--studio-primary)] focus:ring-2 focus:ring-[color:var(--studio-primary)]/15'

function relativeFromNow(iso) {
  const mins = Math.round((new Date(iso) - Date.now()) / 60_000)
  if (mins < 60) return `in ${Math.max(1, mins)} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `in ${hours} hr`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

export default function ScheduledMessageView({ item, onSave, onCancelSend, onBackClick }) {
  const [mode, setMode] = useState('view') // view | edit | confirm-cancel
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMode('view')
    setError('')
  }, [item?.id])

  if (!item) {
    return (
      <div className="flex flex-1 items-center justify-center bg-card">
        <div className="px-6 text-center">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">No scheduled message selected</p>
          <p className="mt-1 text-xs text-muted-foreground">Pick one on the left to review, edit or cancel it.</p>
        </div>
      </div>
    )
  }

  const isEmail = item.channel === 'Email'
  const bulk = item.recipientCount > 1
  const minWhen = getScheduleMinLocalDatetime()

  const startEdit = () => {
    setMessage(item.message)
    setSubject(item.subject)
    setWhen(toLocalDatetimeInputValue(item.scheduledAt))
    setError('')
    setMode('edit')
  }

  const save = async () => {
    const iso = toScheduleIsoOrNull(when, { requireFuture: true })
    if (!iso) return setError('Pick a send time in the future.')
    if (!item.isHtml && !message.trim()) return setError('Write a message.')
    if (isEmail && !subject.trim()) return setError('Add a subject.')
    setBusy(true)
    setError('')
    const patch = { scheduleDate: iso }
    if (!item.isHtml) patch.message = message
    if (isEmail) patch.subject = subject.trim()
    const ok = await onSave?.(item.id, patch)
    setBusy(false)
    if (ok) setMode('view')
  }

  const cancelSend = async () => {
    setBusy(true)
    await onCancelSend?.(item.id)
    setBusy(false)
  }

  const shown = item.recipients.slice(0, 6)
  const hidden = item.recipientCount - shown.length

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card lg:border-l border-border">
      <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {onBackClick && (
            <Button variant="ghost" size="icon" onClick={onBackClick} className="h-9 w-9 shrink-0 lg:hidden" aria-label="Back to scheduled list">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{item.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <CalendarClock className="h-5 w-5 shrink-0 text-[color:var(--studio-primary)]" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{formatDateTime(item.scheduledAt)}</p>
              <p className="text-xs text-muted-foreground">Sends {relativeFromNow(item.scheduledAt)}</p>
            </div>
          </div>

          {mode === 'edit' ? (
            <div className="space-y-4">
              {isEmail && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Subject</span>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} />
                </label>
              )}
              {item.isHtml ? (
                <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                  This email uses a designed template. You can change its subject and send time here.
                </p>
              ) : (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className={cn(fieldClass, 'resize-y leading-relaxed')}
                  />
                </label>
              )}
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Send at</span>
                <input
                  type="datetime-local"
                  value={when}
                  min={minWhen}
                  onChange={(e) => setWhen(e.target.value)}
                  className={fieldClass}
                />
              </label>
              {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Message</p>
              {isEmail ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <p className="truncate text-sm font-medium text-foreground">{item.subject || '(No subject)'}</p>
                  </div>
                  <p className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed text-foreground">
                    {item.isHtml ? 'Designed email template' : item.message}
                  </p>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[min(100%,28rem)] space-y-2">
                    {item.mediaUrl?.map((url) => (
                      <img key={url} src={url} alt="Attached photo" className="max-h-56 rounded-2xl border border-border object-cover" />
                    ))}
                    <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-[color:var(--studio-primary)] px-3.5 py-2.5 text-sm text-white">
                      {item.message}
                    </p>
                  </div>
                </div>
              )}
              {bulk && item.message.includes('{{') && (
                <p className="text-xs text-muted-foreground">Name fields fill in for each person when it sends.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {bulk ? `${item.recipientCount} recipients` : 'Recipient'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {shown.map((r, i) => (
                <span key={r._id || `${r.phoneNumber}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground">
                  {isEmail ? <Mail className="h-3 w-3 text-muted-foreground" aria-hidden /> : <MessageSquare className="h-3 w-3 text-muted-foreground" aria-hidden />}
                  {r.name || r.phoneNumber || r.email}
                </span>
              ))}
              {hidden > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" aria-hidden />
                  {hidden} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border px-4 py-3 sm:px-6">
        {mode === 'confirm-cancel' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm text-foreground">Cancel this send? It won’t go out.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode('view')} disabled={busy}>Keep it</Button>
              <Button variant="destructive" size="sm" onClick={cancelSend} disabled={busy}>
                {busy ? 'Canceling…' : 'Cancel send'}
              </Button>
            </div>
          </div>
        ) : mode === 'edit' ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setMode('view')} disabled={busy}>Discard</Button>
            <Button variant="gradient" size="sm" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('confirm-cancel')} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              Cancel send
            </Button>
            <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
          </div>
        )}
      </div>
    </main>
  )
}
