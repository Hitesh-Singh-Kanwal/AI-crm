'use client'

import { useState } from 'react'
import { Send, Clock } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

export default function MessageInput({ onSendMessage, channel = 'SMS' }) {
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduleDate, setScheduleDate] = useState('')

  const canSend =
    message.trim() &&
    (channel !== 'Email' || subject.trim()) &&
    (scheduleMode === 'now' || !!scheduleDate)

  const handleSend = () => {
    if (!canSend) return
    onSendMessage?.({
      content: message,
      subject: subject.trim(),
      channel,
      scheduleNow: scheduleMode === 'now',
      scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
    })
    setMessage('')
    setSubject('')
    setScheduleMode('now')
    setScheduleDate('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && scheduleMode === 'now') {
      e.preventDefault()
      handleSend()
    }
  }

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  return (
    <div className="p-1 bg-slate-50 space-y-1">
      {channel === 'Email' && (
        <Input
          placeholder="Subject…"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white text-sm"
        />
      )}
      <div className="relative">
        <Textarea
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="min-h-[64px] sm:min-h-[80px] resize-none rounded-xl border border-slate-200 bg-white focus:border-[color:var(--studio-primary)] text-sm pb-10"
        />
        {/* Schedule toggle inside textarea bottom-left */}
        <button
          type="button"
          onClick={() => setScheduleMode((m) => m === 'now' ? 'later' : 'now')}
          className={`absolute left-3 bottom-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            scheduleMode === 'later'
              ? 'bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]'
              : 'text-[#94A3B8] hover:text-slate-600'
          }`}
          title="Schedule"
        >
          <Clock className="h-3.5 w-3.5" />
          {scheduleMode === 'later' ? 'Scheduled' : 'Schedule'}
        </button>
        {/* Send button */}
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
          <span>{scheduleMode === 'later' ? 'Schedule' : 'Send'}</span>
        </button>
      </div>
      {scheduleMode === 'later' && (
        <input
          type="datetime-local"
          value={scheduleDate}
          min={minDateTime}
          onChange={(e) => setScheduleDate(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  )
}
