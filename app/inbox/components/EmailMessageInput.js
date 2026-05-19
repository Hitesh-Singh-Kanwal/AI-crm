'use client'

import { useMemo, useState } from 'react'
import { Send, Clock, Eye, EyeOff } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  applyEmailTemplate,
  EMAIL_TEMPLATE_VARIABLES,
} from '@/lib/emailSend'

export default function EmailMessageInput({
  onSendMessage,
  leadPreview = null,
  disabled = false,
  sending = false,
}) {
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const previewLead = leadPreview || {}
  const previewSubject = useMemo(
    () => applyEmailTemplate(subject, previewLead),
    [subject, previewLead],
  )
  const previewBody = useMemo(
    () => applyEmailTemplate(message, previewLead),
    [message, previewLead],
  )

  const canSend =
    !disabled &&
    !sending &&
    message.trim() &&
    subject.trim() &&
    (scheduleMode === 'now' || !!scheduleDate)

  const handleSend = () => {
    if (!canSend) return
    onSendMessage?.({
      content: message,
      subject: subject.trim(),
      channel: 'Email',
      scheduleNow: scheduleMode === 'now',
      scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
    })
    setMessage('')
    setSubject('')
    setScheduleMode('now')
    setScheduleDate('')
    setShowPreview(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && scheduleMode === 'now' && e.target.tagName !== 'INPUT') {
      e.preventDefault()
      handleSend()
    }
  }

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  return (
    <div className="p-1 bg-transparent space-y-2">
      <Input
        placeholder="Subject — e.g. Hi {{first_name}}!"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={disabled || sending}
        className="rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
      />

      <div className="flex flex-wrap gap-1 items-center">
        {EMAIL_TEMPLATE_VARIABLES.slice(0, 5).map(({ token }) => (
          <button
            key={token}
            type="button"
            disabled={disabled || sending}
            onClick={() => setMessage((m) => `${m}${m && !m.endsWith(' ') ? ' ' : ''}${token}`)}
            className="px-2 py-0.5 rounded-md text-[11px] border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {token}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          disabled={disabled || sending || (!subject.trim() && !message.trim())}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
      </div>

      {showPreview && (subject.trim() || message.trim()) && (
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Preview (personalized)</p>
          {previewSubject && (
            <p className="font-medium text-foreground">
              <span className="text-muted-foreground">Subject: </span>
              {previewSubject}
            </p>
          )}
          {previewBody && (
            <p className="text-foreground whitespace-pre-wrap">{previewBody}</p>
          )}
        </div>
      )}

      <div className="relative">
        <Textarea
          placeholder="Write your email… Use {{name}}, {{first_name}}, {{stage}}, etc."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={disabled || sending}
          className="min-h-[64px] sm:min-h-[80px] resize-none rounded-xl border border-border bg-background focus:border-[color:var(--studio-primary)] text-sm text-foreground placeholder:text-muted-foreground pb-10"
        />
        <button
          type="button"
          onClick={() => setScheduleMode((m) => (m === 'now' ? 'later' : 'now'))}
          disabled={disabled || sending}
          className={`absolute left-3 bottom-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            scheduleMode === 'later'
              ? 'bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Schedule"
        >
          <Clock className="h-3.5 w-3.5" />
          {scheduleMode === 'later' ? 'Scheduled' : 'Schedule'}
        </button>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--studio-gradient-css)',
            border: '1px solid rgba(0,0,0,0.04)',
            position: 'absolute',
            right: 12,
            bottom: 8,
            height: 36,
            minWidth: 72,
          }}
        >
          <Send className="h-4 w-4" />
          <span>{sending ? 'Sending…' : scheduleMode === 'later' ? 'Schedule' : 'Send'}</span>
        </button>
      </div>

      {scheduleMode === 'later' && (
        <input
          type="datetime-local"
          value={scheduleDate}
          min={minDateTime}
          onChange={(e) => setScheduleDate(e.target.value)}
          disabled={disabled || sending}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  )
}