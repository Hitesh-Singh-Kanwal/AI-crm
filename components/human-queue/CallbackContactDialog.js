'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Clock3,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Send,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  useLeadStages,
  formatLeadStageLabel,
  getLeadStageColor,
} from '@/lib/lead-stages'
import {
  mapSmsHistoryMessages,
  mapHumanCallToMessage,
  mapAiCallToMessage,
  mergeThreadByTimestamp,
} from '@/lib/inboxThread'
import { mapEmailHistoryRecord, buildSendOneEmailPayload } from '@/lib/emailSend'

function getInitials(name) {
  const parts = String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function resolveLeadId(item) {
  const raw = item?.leadID
  if (!raw) return null
  if (typeof raw === 'object') {
    const id = raw._id ?? raw.id
    return id ? String(id) : null
  }
  return String(raw)
}

const QUEUE_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'pending' },
  { value: 'resolved', label: 'Resolved', tone: 'resolved' },
  { value: 'cancelled', label: 'Cancelled', tone: 'cancelled' },
]

/**
 * Mini-inbox for a Call Center callback / human-intervention work item.
 */
export default function CallbackContactDialog({
  open,
  onClose,
  item,
  canManage = false,
  preferredChannel = 'sms',
  onUpdated,
  onPlaceCall,
}) {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const { stages: stageOptions } = useLeadStages()
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [messages, setMessages] = useState([])
  const [lead, setLead] = useState(null)
  const [composeChannel, setComposeChannel] = useState(preferredChannel)
  const [draft, setDraft] = useState('')
  const [emailSubject, setEmailSubject] = useState('Following up')
  const [sending, setSending] = useState(false)
  const [calling, setCalling] = useState(false)
  const [savingStatus, setSavingStatus] = useState(null)
  const [savingStage, setSavingStage] = useState(null)
  const [queueStatus, setQueueStatus] = useState(item?.status || 'pending')
  const [leadStage, setLeadStage] = useState(item?.leadStage || '')

  const requestGenRef = useRef(0)
  const threadRef = useRef(null)
  const stageTouchedRef = useRef(false)
  const openedForRef = useRef(null)
  const callbackId = item?.id || item?._id ? String(item.id || item._id) : null
  const leadId = resolveLeadId(item)
  const displayName = item?.leadName || lead?.name || 'Lead'
  const phone = item?.phone || lead?.phoneNumber || ''
  const email = item?.email || lead?.email || ''

  useEffect(() => {
    if (!open) {
      openedForRef.current = null
      return
    }
    if (!item || !callbackId) return
    if (openedForRef.current === callbackId) return
    openedForRef.current = callbackId
    stageTouchedRef.current = false
    setLoadingTimeline(true)
    setQueueStatus(item.status === 'called' ? 'resolved' : item.status || 'pending')
    setLeadStage(item.leadStage || '')
    const itemPhone = item.phone || ''
    const itemEmail = item.email || ''
    setComposeChannel(
      preferredChannel === 'call'
        ? itemPhone
          ? 'sms'
          : itemEmail
            ? 'email'
            : 'sms'
        : preferredChannel || 'sms',
    )
    setDraft('')
    setMessages([])
    setLead(null)
  }, [open, item, callbackId, preferredChannel])

  const loadTimeline = useCallback(async () => {
    const gen = ++requestGenRef.current
    const fallbackName = item?.leadName || 'Lead'

    if (!callbackId) {
      if (gen !== requestGenRef.current) return
      setMessages([])
      setLead(null)
      setLoadingTimeline(false)
      return
    }

    setLoadingTimeline(true)
    try {
      const result = await api.get(`/api/callback-requests/${callbackId}/conversation`)
      if (gen !== requestGenRef.current) return
      if (!result.success) {
        throw new Error(result.error || 'Could not load conversation.')
      }

      const payload = result.data || {}
      const leadData = payload.lead || null
      setLead(leadData)
      if (leadData?.stage && !stageTouchedRef.current) setLeadStage(leadData.stage)

      const contactName = leadData?.name || fallbackName
      const smsMessages = mapSmsHistoryMessages(
        Array.isArray(payload.sms) ? payload.sms : [],
        contactName,
      )
      const emailMessages = (Array.isArray(payload.emails) ? payload.emails : []).map((r) =>
        mapEmailHistoryRecord(r, contactName),
      )
      const humanMessages = (Array.isArray(payload.humanCalls) ? payload.humanCalls : []).map(
        mapHumanCallToMessage,
      )
      const aiMessages = (Array.isArray(payload.aiCalls) ? payload.aiCalls : []).map(
        mapAiCallToMessage,
      )

      setMessages(
        mergeThreadByTimestamp(smsMessages, emailMessages, [
          ...humanMessages,
          ...aiMessages,
        ]),
      )
    } catch (err) {
      if (gen !== requestGenRef.current) return
      console.error(err)
      toastRef.current.error({
        title: 'Could not load conversation',
        message: err.message,
      })
    } finally {
      if (gen === requestGenRef.current) {
        setLoadingTimeline(false)
      }
    }
  }, [callbackId, item?.leadName])

  useEffect(() => {
    if (!open) {
      requestGenRef.current += 1
      return
    }
    loadTimeline()
  }, [open, callbackId, loadTimeline])

  useEffect(() => {
    if (loadingTimeline) return
    const el = threadRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [loadingTimeline, messages])

  const lastContactLabel = useMemo(() => {
    const fromItem = item?.lastContactAt || item?.leadLastInboundAt
    const fromMsgs = messages.length ? messages[messages.length - 1]?.timestamp : null
    return formatWhen(fromMsgs || fromItem)
  }, [item, messages])

  const handleSend = async () => {
    if (!canManage) {
      toast.error({ title: 'No access', message: 'Call Center write or edit is required.' })
      return
    }
    const text = draft.trim()
    if (!text) return
    if (!leadId && !phone && !email) {
      toast.error({ title: 'Missing contact', message: 'No lead or contact details on this item.' })
      return
    }

    setSending(true)
    try {
      if (composeChannel === 'sms') {
        if (!phone) throw new Error('This lead has no phone number.')
        const locationRaw = lead?.locationID || item?.locationID
        const locationIDs = Array.isArray(locationRaw)
          ? locationRaw.map((l) => String(l?._id ?? l)).filter(Boolean)
          : locationRaw
            ? [String(locationRaw?._id ?? locationRaw)]
            : []
        const result = await api.post('/api/sms/send-one', {
          lead: {
            _id: leadId,
            phoneNumber: phone,
            name: displayName,
            stage: leadStage || lead?.stage || '',
            locationID: locationIDs,
            email: email || '',
          },
          message: text,
          scheduleNow: true,
        })
        if (!result.success) throw new Error(result.error || 'Could not send SMS.')
        toast.success({
          title: 'SMS sent',
          message: 'Message sent. Queue status stays pending until you resolve it.',
        })
      } else {
        if (!email) throw new Error('This lead has no email address.')
        const leadRecipient = {
          _id: leadId,
          email,
          name: displayName,
          phoneNumber: phone || '',
          stage: leadStage || lead?.stage || '',
          locationID: lead?.locationID || item?.locationID || null,
        }
        const payload = buildSendOneEmailPayload({
          lead: leadRecipient,
          subject: emailSubject || 'Following up',
          content: text,
          scheduleNow: true,
        })
        const preferredLocationID = payload.preferredLocationID || null
        const result = await api.post(
          '/api/email/send-one',
          payload,
          preferredLocationID
            ? { headers: { 'x-location-id': preferredLocationID } }
            : {},
        )
        if (!result.success) throw new Error(result.error || 'Could not send email.')
        toast.success({
          title: 'Email sent',
          message: 'Email sent. Queue status stays pending until you resolve it.',
        })
      }

      if (item?.id || item?._id) {
        await api
          .patch(`/api/callback-requests/${item.id || item._id}/status`, {
            status: queueStatus || 'pending',
            touchLastContact: true,
          })
          .catch(() => {})
      }
      setDraft('')
      await loadTimeline()
      onUpdated?.()
    } catch (err) {
      toast.error({ title: 'Send failed', message: err.message })
    } finally {
      setSending(false)
    }
  }

  const handleCall = async () => {
    if (!canManage) {
      toast.error({ title: 'No access', message: 'Call Center write or edit is required.' })
      return
    }
    if (!phone) {
      toast.error({ title: 'Missing phone', message: 'This lead has no phone number.' })
      return
    }
    setCalling(true)
    try {
      const locationRaw = lead?.locationID || item?.locationID
      const locationIDs = Array.isArray(locationRaw)
        ? locationRaw.map((l) => String(l?._id ?? l)).filter(Boolean)
        : locationRaw
          ? [String(locationRaw?._id ?? locationRaw)]
          : []
      const started = await onPlaceCall?.({
        leadId,
        phone,
        name: displayName,
        locationIDs,
        callbackId: item?.id || item?._id,
        status: queueStatus || 'pending',
        reason: String(item?.reason || item?.ivrLabel || '').trim(),
        aiSummary: String(item?.aiSummary || '').trim(),
      })
      if (started) {
        await loadTimeline()
        onUpdated?.()
      }
    } catch (err) {
      toast.error({ title: 'Call failed', message: err.message })
    } finally {
      setCalling(false)
    }
  }

  const handleSaveQueueStatus = async (next) => {
    if (!canManage || savingStatus) return
    if (next === queueStatus) return
    const cbId = item?.id || item?._id
    if (!cbId) return
    const previous = queueStatus
    setSavingStatus(next)
    setQueueStatus(next)
    try {
      const r = await api.patch(`/api/callback-requests/${cbId}/status`, { status: next })
      if (!r.success) throw new Error(r.error || 'Could not update status.')
      toast.success({
        title: 'Queue updated',
        message: next === 'resolved' ? 'Marked resolved.' : `Status set to ${next}.`,
      })
      onUpdated?.()
      if (next === 'resolved' || next === 'cancelled') onClose?.()
    } catch (err) {
      toast.error({ title: 'Update failed', message: err.message })
      setQueueStatus(previous)
    } finally {
      setSavingStatus(null)
    }
  }

  const handleSaveLeadStage = async (next) => {
    if (!canManage || !leadId || !callbackId || savingStage) return
    if (
      String(next || '').trim().toLowerCase() ===
      String(leadStage || '').trim().toLowerCase()
    ) {
      return
    }
    const previous = leadStage
    stageTouchedRef.current = true
    setSavingStage(next)
    setLeadStage(next)
    try {
      const r = await api.patch(`/api/callback-requests/${callbackId}/lead-stage`, {
        stage: next,
      })
      if (!r.success) throw new Error(r.error || 'Could not update lead stage.')
      if (r.data?.stage) setLeadStage(r.data.stage)
      toast.success({
        title: 'Stage updated',
        message: `Lead stage set to ${formatLeadStageLabel(next, stageOptions)}.`,
      })
      onUpdated?.()
    } catch (err) {
      toast.error({ title: 'Stage update failed', message: err.message })
      setLeadStage(previous || lead?.stage || item?.leadStage || '')
    } finally {
      setSavingStage(null)
    }
  }

  if (!item) return null

  const whyText = String(item.reason || item.ivrLabel || '').trim()
  const summaryText = String(item.aiSummary || '').trim()
  const stageColor = getLeadStageColor(leadStage, stageOptions)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="6xl">
      <DialogContent onClose={onClose} className="flex h-[min(92vh,900px)] max-h-[92vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-[color:var(--studio-primary)] text-white text-sm font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate">{displayName}</DialogTitle>
                {leadStage ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stageColor || '#6B7280' }}
                    />
                    {formatLeadStageLabel(leadStage, stageOptions)}
                  </span>
                ) : null}
              </div>
              <DialogDescription className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {phone && <span>{phone}</span>}
                {email && <span>{email}</span>}
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Last contact {lastContactLabel}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-1">
          {/* Timeline + compose */}
          <div className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 px-4 py-4">
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background py-12 text-center text-sm text-muted-foreground">
                  No messages yet for this lead.
                </div>
              ) : (
                messages.map((m, idx) => {
                  const inbound = m.direction === 'inbound'
                  const isEmail = m.channel === 'Email'
                  return (
                    <div
                      key={`${m.channel || 'msg'}-${m.id || idx}`}
                      className={cn('flex', inbound ? 'justify-start' : 'justify-end')}
                    >
                      <div
                        className={cn(
                          'max-w-[min(100%,36rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                          inbound
                            ? 'rounded-tl-md border border-border bg-card text-foreground'
                            : 'rounded-tr-md bg-[var(--studio-primary)] text-white',
                        )}
                      >
                        <div className={cn('mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide', inbound ? 'text-muted-foreground' : 'text-white/80')}>
                          <span>{m.channel || 'Message'}</span>
                          <span>·</span>
                          <span className="normal-case tracking-normal">{formatWhen(m.timestamp)}</span>
                        </div>
                        {isEmail && (
                          <p className={cn('mb-1 text-xs font-semibold', inbound ? 'text-foreground' : 'text-white')}>
                            {m.subject?.trim() || '(No subject)'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content || (isEmail ? '' : '—')}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="border-t border-border bg-card p-3 space-y-2">
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'sms', label: 'SMS', icon: MessageSquare, disabled: !phone },
                  { id: 'email', label: 'Email', icon: Mail, disabled: !email },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    disabled={ch.disabled}
                    onClick={() => setComposeChannel(ch.id)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                      composeChannel === ch.id
                        ? 'bg-[var(--studio-primary)] text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                      ch.disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <ch.icon className="h-3.5 w-3.5" />
                    {ch.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!phone || calling || !canManage}
                  onClick={handleCall}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
                >
                  {calling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PhoneCall className="h-3.5 w-3.5" />
                  )}
                  Call
                </button>
              </div>

              {composeChannel === 'email' && (
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/30"
                />
              )}

              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!sending && draft.trim() && canManage) handleSend()
                    }
                  }}
                  rows={2}
                  placeholder={
                    composeChannel === 'email'
                      ? 'Write an email…  Enter to send'
                      : 'Write a text…  Enter to send'
                  }
                  className="min-h-[72px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/30"
                />
                <button
                  type="button"
                  disabled={sending || !draft.trim() || !canManage}
                  onClick={handleSend}
                  className="inline-flex h-auto min-w-[44px] items-center justify-center rounded-lg bg-[var(--studio-primary)] px-3 text-white hover:brightness-95 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              {!canManage && (
                <p className="text-xs text-muted-foreground">
                  View only — Call Center write or edit is required to contact this lead.
                </p>
              )}
            </div>
          </div>

          {/* Status / stage panel */}
          <div className="max-h-72 space-y-5 overflow-y-auto bg-card p-4 md:max-h-none">
            {whyText ? (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-foreground">
                <span className="font-medium text-muted-foreground">Why: </span>
                {whyText}
              </div>
            ) : null}
            {summaryText && summaryText !== whyText ? (
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">
                <span className="font-medium text-muted-foreground">Summary: </span>
                {summaryText}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Queue status</label>
              <div className="flex flex-col gap-1.5">
                {QUEUE_STATUSES.map((s) => {
                  const active = queueStatus === s.value
                  const saving = savingStatus === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={!canManage || Boolean(savingStatus)}
                      onClick={() => handleSaveQueueStatus(s.value)}
                      className={cn(
                        'inline-flex h-9 w-full items-center justify-between rounded-lg border px-3 text-sm font-medium transition-colors',
                        active
                          ? s.tone === 'resolved'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : s.tone === 'cancelled'
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              : 'border-[var(--studio-primary)]/40 bg-[var(--studio-primary)]/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        (!canManage || savingStatus) && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      <span>{s.label}</span>
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : active ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sending a message does not resolve this. Set Resolved when you are done.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Lead stage</label>
              <div className="flex flex-wrap gap-1.5">
                {(stageOptions || []).map((s) => {
                  const value = s.key || s.value
                  const label = s.name || formatLeadStageLabel(value, stageOptions)
                  const active =
                    String(leadStage || '').trim().toLowerCase() ===
                    String(value || '').trim().toLowerCase()
                  const saving = savingStage === value
                  const color = getLeadStageColor(value, stageOptions)
                  const disabled = !canManage || !leadId || Boolean(savingStage)
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSaveLeadStage(value)}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-foreground/25 bg-muted text-foreground shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        disabled && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color || '#6B7280' }}
                        />
                      )}
                      {label}
                      {active && !saving ? <Check className="h-3 w-3" /> : null}
                    </button>
                  )
                })}
              </div>
              {!leadId && (
                <p className="text-[11px] text-muted-foreground">
                  No linked lead — stage cannot be changed.
                </p>
              )}
              {leadId && (
                <p className="text-[11px] text-muted-foreground">
                  Changing stage does not remove them from Pending.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border px-3 py-2 text-xs space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>Channel: {String(item.channel || preferredChannel).toUpperCase()}</span>
              </div>
              <div>
                AI replies:{' '}
                <span className="font-medium text-foreground">
                  {item.aiRepliesEnabled === false || lead?.aiRepliesEnabled === false
                    ? 'Off'
                    : 'On'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
