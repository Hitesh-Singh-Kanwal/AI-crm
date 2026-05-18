'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarClock, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const TEXTAREA_MIN_H = 52
const TEXTAREA_MAX_H = 168

function useAutoResizeTextarea(value) {
  const ref = useRef(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = `${TEXTAREA_MIN_H}px`
    const next = Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_H), TEXTAREA_MAX_H)
    el.style.height = `${next}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return { ref, resize }
}

export default function ConversationComposer({
  variant = 'sms',
  onSendMessage,
  disabled = false,
  sending = false,
}) {
  const isEmail = variant === 'email'
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduleDate, setScheduleDate] = useState('')

  const { ref: textareaRef, resize } = useAutoResizeTextarea(message)

  const charCount = message.length
  const smsSegments = Math.max(1, Math.ceil(charCount / 160) || 1)

  const canSend =
    !disabled &&
    !sending &&
    message.trim() &&
    (!isEmail || subject.trim()) &&
    (scheduleMode === 'now' || !!scheduleDate)

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  const resetForm = () => {
    setMessage('')
    setSubject('')
    setScheduleMode('now')
    setScheduleDate('')
    requestAnimationFrame(resize)
  }

  const handleSend = () => {
    if (!canSend) return
    onSendMessage?.({
      content: message,
      subject: subject.trim(),
      channel: isEmail ? 'Email' : 'SMS',
      scheduleNow: scheduleMode === 'now',
      scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
    })
    resetForm()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && scheduleMode === 'now') {
      if (isEmail && e.target.tagName === 'INPUT') return
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 bg-card/80 backdrop-blur-sm border-t border-border">
      {isEmail && (
        <div className="mb-3">
          <label className="block">
            <span className="sr-only">Subject</span>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || sending}
              className={cn(
                'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium',
                'placeholder:text-muted-foreground placeholder:font-normal',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--studio-primary)]/25 focus:border-[color:var(--studio-primary)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
          </label>
        </div>
      )}

      <div
        className={cn(
          'rounded-2xl border bg-background shadow-sm transition-shadow',
          'focus-within:border-[color:var(--studio-primary)]/50 focus-within:ring-2 focus-within:ring-[color:var(--studio-primary)]/15',
          scheduleMode === 'later' && 'ring-2 ring-[color:var(--studio-primary)]/20 border-[color:var(--studio-primary)]/40',
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          rows={2}
          placeholder={isEmail ? 'Write your message…' : 'Type a message…'}
          className={cn(
            'w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm leading-relaxed text-foreground',
            'placeholder:text-muted-foreground focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          style={{ minHeight: TEXTAREA_MIN_H, maxHeight: TEXTAREA_MAX_H }}
        />

        {scheduleMode === 'later' && (
          <div className="px-3 pb-3 pt-0 border-t border-border/60">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Send at</span>
              <input
                type="datetime-local"
                value={scheduleDate}
                min={minDateTime}
                onChange={(e) => setScheduleDate(e.target.value)}
                disabled={disabled || sending}
                className={cn(
                  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-[color:var(--studio-primary)]/30 focus:border-[color:var(--studio-primary)]',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border/80 px-2 py-2 sm:px-3">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => setScheduleMode((m) => (m === 'now' ? 'later' : 'now'))}
              disabled={disabled || sending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0',
                scheduleMode === 'later'
                  ? 'bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {scheduleMode === 'later' ? 'Scheduled' : 'Schedule'}
              </span>
            </button>
            {!isEmail && charCount > 0 && (
              <span
                className={cn(
                  'text-[11px] tabular-nums truncate hidden sm:inline',
                  charCount > 160 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                )}
              >
                {charCount} chars · {smsSegments} segment{smsSegments > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden md:inline whitespace-nowrap">
              Enter to send · Shift+Enter new line
            </span>
            <Button
              type="button"
              variant="gradient"
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              className="h-9 px-4 rounded-xl shadow-sm font-semibold gap-1.5 min-w-[88px]"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sending ? 'Sending…' : scheduleMode === 'later' ? 'Schedule' : 'Send'}
              </span>
              <span className="sm:hidden">{sending ? '…' : 'Go'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}