'use client'

import { useEffect, useState } from 'react'
import { Clock, Mail, MessageSquare, Send } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function DynamicListMemberSendDialog({
  open,
  onClose,
  leads = [],
  initialChannel = 'SMS',
  onSent,
}) {
  const [channel, setChannel] = useState(initialChannel)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setChannel(initialChannel)
    setSubject('')
    setMessage('')
    setScheduleMode('now')
    setScheduleDate('')
  }, [open, initialChannel])

  const eligibleLeads = leads.filter((lead) =>
    channel === 'SMS' ? Boolean(lead?.phoneNumber) : Boolean(lead?.email)
  )
  const skippedCount = leads.length - eligibleLeads.length

  const canSend =
    eligibleLeads.length > 0 &&
    message.trim() &&
    (channel === 'SMS' || subject.trim()) &&
    (scheduleMode === 'now' || Boolean(scheduleDate))

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  const handleSend = async () => {
    if (!canSend || sending) return
    setSending(true)

    const leadsPayload = eligibleLeads.map((lead) => ({
      _id: lead._id,
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      email: lead.email,
    }))

    try {
      const result =
        channel === 'SMS'
          ? await api.post('/api/sms/', {
              leads: leadsPayload,
              message: message.trim(),
              scheduleNow: scheduleMode === 'now',
              scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
            })
          : await api.post('/api/email/', {
              leads: leadsPayload,
              subject: subject.trim(),
              body: message.trim(),
              scheduleNow: scheduleMode === 'now',
              scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
            })

      if (!result?.success) {
        toast.error(channel === 'SMS' ? 'SMS failed' : 'Email failed', {
          description: result?.error || `Could not send ${channel}.`,
        })
        return
      }

      toast.success(scheduleMode === 'now' ? 'Sent' : 'Scheduled', {
        description: `${channel} ${scheduleMode === 'now' ? 'sent' : 'scheduled'} to ${eligibleLeads.length} member${eligibleLeads.length === 1 ? '' : 's'}.`,
      })
      onSent?.({ channel, leads: eligibleLeads })
      onClose?.()
    } catch (error) {
      console.error(error)
      toast.error('Error', { description: 'Something went wrong while sending.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            Send {channel === 'SMS' ? 'SMS' : 'email'} to {leads.length} member{leads.length === 1 ? '' : 's'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Channel</label>
            <div className="flex gap-2">
              {[
                { id: 'SMS', Icon: MessageSquare },
                { id: 'Email', Icon: Mail },
              ].map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                    channel === id
                      ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {id}
                </button>
              ))}
            </div>
          </div>

          {skippedCount > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
              {skippedCount} selected member{skippedCount === 1 ? '' : 's'}{' '}
              {channel === 'SMS' ? 'without a phone number' : 'without an email'} will be skipped.
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground">
            Sending to {eligibleLeads.length} member{eligibleLeads.length === 1 ? '' : 's'}
            {eligibleLeads.length > 0 && (
              <span className="text-foreground">
                {' '}
                — {eligibleLeads
                  .slice(0, 3)
                  .map((l) => l.name || 'Unnamed')
                  .join(', ')}
                {eligibleLeads.length > 3 ? ` +${eligibleLeads.length - 3} more` : ''}
              </span>
            )}
          </div>

          {channel === 'Email' && (
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Class reminder"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={channel === 'SMS' ? 'Type your SMS…' : 'Type your email body…'}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">When to send</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                  scheduleMode === 'now'
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                )}
              >
                <Send className="h-4 w-4" />
                Send now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('later')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                  scheduleMode === 'later'
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                    : 'border-border text-muted-foreground hover:bg-muted/40'
                )}
              >
                <Clock className="h-4 w-4" />
                Schedule
              </button>
            </div>
            {scheduleMode === 'later' && (
              <input
                type="datetime-local"
                value={scheduleDate}
                min={minDateTime}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[14px] font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {sending
              ? 'Sending…'
              : scheduleMode === 'now'
                ? `Send to ${eligibleLeads.length || '—'}`
                : 'Schedule'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
