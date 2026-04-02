'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X, MessageSquare, Mail, Send, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { getInitials } from '@/lib/utils'
import api from '@/lib/api'

export default function BatchSendDialog({ open, onClose, onSent }) {
  const toast = useToast()

  const [channel, setChannel] = useState('SMS')
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState([])

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const [scheduleMode, setScheduleMode] = useState('now') // 'now' | 'later'
  const [scheduleDate, setScheduleDate] = useState('')

  const [sending, setSending] = useState(false)

  const searchLeads = useCallback(async (q) => {
    setLoadingLeads(true)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (q.trim()) params.set('search', q.trim())
      const result = await api.get(`/api/lead?${params.toString()}`)
      const list = Array.isArray(result.data) ? result.data : result.data?.leads ?? []
      setLeads(list)
    } catch (e) {
      console.error(e)
      setLeads([])
    } finally {
      setLoadingLeads(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setLeads([])
      setSelectedLeads([])
      setSubject('')
      setMessage('')
      setScheduleMode('now')
      setScheduleDate('')
      setChannel('SMS')
      return
    }
    searchLeads('')
  }, [open, searchLeads])

  useEffect(() => {
    const t = setTimeout(() => searchLeads(search), 300)
    return () => clearTimeout(t)
  }, [search, searchLeads])

  const toggleLead = (lead) => {
    setSelectedLeads((prev) => {
      const exists = prev.find((l) => l._id === lead._id)
      if (exists) return prev.filter((l) => l._id !== lead._id)
      // Only add if they have the required contact field for the channel
      if (channel === 'SMS' && !lead.phoneNumber) return prev
      if (channel === 'Email' && !lead.email) return prev
      return [...prev, lead]
    })
  }

  // Drop selected leads that don't have the required field when channel changes
  useEffect(() => {
    setSelectedLeads((prev) =>
      prev.filter((l) => (channel === 'SMS' ? !!l.phoneNumber : !!l.email))
    )
  }, [channel])

  const canSend =
    selectedLeads.length > 0 &&
    message.trim() &&
    (channel === 'SMS' || subject.trim()) &&
    (scheduleMode === 'now' || !!scheduleDate)

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const leadsPayload = selectedLeads.map((l) => ({
        _id: l._id,
        name: l.name,
        phoneNumber: l.phoneNumber,
        email: l.email,
      }))

      if (channel === 'SMS') {
        const result = await api.post('/api/sms/', {
          leads: leadsPayload,
          message: message.trim(),
          scheduleNow: scheduleMode === 'now',
          scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
        })
        if (!result.success) {
          toast.error({ title: 'Failed', message: result.error || 'Could not send SMS batch.' })
          return
        }
      } else {
        const result = await api.post('/api/email/', {
          leads: leadsPayload,
          subject: subject.trim(),
          body: message.trim(),
          scheduleNow: scheduleMode === 'now',
          scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
        })
        if (!result.success) {
          toast.error({ title: 'Failed', message: result.error || 'Could not send email batch.' })
          return
        }
      }

      onSent?.({
        channel,
        leads: selectedLeads,
        subject: subject.trim(),
        content: message.trim(),
        scheduleNow: scheduleMode === 'now',
        scheduleDate: scheduleMode === 'later' ? new Date(scheduleDate).toISOString() : null,
        timestamp: new Date().toISOString(),
      })

      toast.success({
        title: scheduleMode === 'now' ? 'Sent' : 'Scheduled',
        message: `${channel} ${scheduleMode === 'now' ? 'sent' : 'scheduled'} to ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}.`,
      })
      onClose?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Something went wrong.' })
    } finally {
      setSending(false)
    }
  }

  // Min datetime = now (can't schedule in the past)
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Batch send</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-5">

          {/* Channel */}
          <div className="space-y-2">
            <Label>Channel</Label>
            <div className="flex gap-2">
              {[{ id: 'SMS', Icon: MessageSquare }, { id: 'Email', Icon: Mail }].map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    channel === id
                      ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {id}
                </button>
              ))}
            </div>
          </div>

          {/* Lead search */}
          <div className="space-y-2">
            <Label>Recipients</Label>

            {/* Selected badges */}
            {selectedLeads.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 rounded-lg border border-border bg-muted/20">
                {selectedLeads.map((l) => (
                  <span
                    key={l._id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)] border border-[color:var(--studio-primary)]"
                  >
                    {l.name}
                    <button type="button" onClick={() => toggleLead(l)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto border border-border rounded-lg">
              {loadingLeads ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" text="Searching…" />
                </div>
              ) : leads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No leads found.</p>
              ) : (
                leads.map((lead) => {
                  const isSelected = !!selectedLeads.find((l) => l._id === lead._id)
                  const disabled = channel === 'SMS' ? !lead.phoneNumber : !lead.email
                  return (
                    <button
                      key={lead._id}
                      type="button"
                      onClick={() => toggleLead(lead)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isSelected ? 'bg-[color:var(--studio-primary-light)]' : 'hover:bg-slate-50'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={isSelected}
                        className="h-4 w-4 accent-[color:var(--studio-primary)]"
                      />
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="bg-[color:var(--studio-primary)] text-white text-xs">
                          {getInitials(lead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel === 'SMS' ? (lead.phoneNumber || 'No phone') : (lead.email || 'No email')}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
            {selectedLeads.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedLeads.length} recipient{selectedLeads.length > 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* Subject (email only) */}
          {channel === 'Email' && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Class reminder" />
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={channel === 'SMS' ? 'Type your SMS…' : 'Type your email body…'}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label>When to send</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  scheduleMode === 'now'
                    ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                    : 'border-border text-muted-foreground hover:bg-slate-50'
                }`}
              >
                <Send className="h-4 w-4" />
                Send now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('later')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  scheduleMode === 'later'
                    ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                    : 'border-border text-muted-foreground hover:bg-slate-50'
                }`}
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button variant="gradient" onClick={handleSend} disabled={!canSend || sending}>
              {sending ? 'Sending…' : scheduleMode === 'now'
                ? `Send to ${selectedLeads.length || '—'} lead${selectedLeads.length !== 1 ? 's' : ''}`
                : 'Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
