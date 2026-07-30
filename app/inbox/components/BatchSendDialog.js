'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, MessageSquare, Mail, Send, Clock, UserRound, GraduationCap, Users, LayoutTemplate } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { cn, getInitials } from '@/lib/utils'
import api from '@/lib/api'
import { htmlToPlainText, plainTextToHtml, toScheduleIsoOrNull, getScheduleMinLocalDatetime } from '@/lib/emailSend'
import { fetchInboxContacts, INBOX_CONTACT_PAGE_SIZE } from '@/lib/inbox-contact-search'
import InboxContactPagination from '@/app/inbox/components/InboxContactPagination'
import { ScaledInboxHtmlEmail } from '@/app/inbox/components/InboxHtmlEmailFrame'
import WorkflowEmailTemplatePickerDialog from '@/components/workflow/WorkflowEmailTemplatePickerDialog'
import WorkflowSmsTemplatePickerDialog from '@/components/workflow/WorkflowSmsTemplatePickerDialog'

const TYPE_META = {
  Customers: {
    singular: 'customer',
    plural: 'customers',
    Icon: Users,
    searchPlaceholder: 'Search all customers…',
    empty: 'No customers found for this studio.',
  },
  Leads: {
    singular: 'lead',
    plural: 'leads',
    Icon: UserRound,
    searchPlaceholder: 'Search all leads…',
    empty: 'No leads found for this studio.',
  },
  Teachers: {
    singular: 'teacher',
    plural: 'teachers',
    Icon: GraduationCap,
    searchPlaceholder: 'Search all teachers…',
    empty: 'No teachers found for this studio.',
  },
}

export default function BatchSendDialog({
  open,
  onClose,
  onSent,
  contactType = 'Leads',
}) {
  const toast = useToast()
  const meta = TYPE_META[contactType] || TYPE_META.Leads
  const TypeIcon = meta.Icon

  const [channel, setChannel] = useState('SMS')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [contacts, setContacts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selected, setSelected] = useState([])

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [contentHtml, setContentHtml] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const [scheduleMode, setScheduleMode] = useState('now')
  const [scheduleDate, setScheduleDate] = useState('')

  const [sending, setSending] = useState(false)
  const requestIdRef = useRef(0)
  const prevChannelRef = useRef(channel)

  const totalPages = Math.max(1, Math.ceil((total || 0) / INBOX_CONTACT_PAGE_SIZE))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadPage = useCallback(async (nextPage, query = debouncedSearch) => {
    const reqId = ++requestIdRef.current
    setLoadingContacts(true)
    try {
      const result = await fetchInboxContacts({
        contactType,
        search: query,
        page: nextPage,
      })
      if (reqId !== requestIdRef.current) return
      setContacts(result.contacts)
      setPage(result.page)
      setTotal(result.total)
    } catch (e) {
      console.error(e)
      if (reqId !== requestIdRef.current) return
      setContacts([])
      setTotal(0)
    } finally {
      if (reqId === requestIdRef.current) setLoadingContacts(false)
    }
  }, [contactType, debouncedSearch])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setContacts([])
      setPage(1)
      setTotal(0)
      setSelected([])
      setSubject('')
      setMessage('')
      setContentHtml(null)
      setSelectedTemplate(null)
      setTemplatePickerOpen(false)
      setScheduleMode('now')
      setScheduleDate('')
      setChannel('SMS')
      prevChannelRef.current = 'SMS'
      return
    }
  }, [open, contactType])

  useEffect(() => {
    if (!open) return
    setPage(1)
    loadPage(1, debouncedSearch)
  }, [open, contactType, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages)
    if (clamped === page && contacts.length > 0) return
    loadPage(clamped, debouncedSearch)
  }

  const toggleContact = (contact) => {
    setSelected((prev) => {
      const exists = prev.find((l) => l._id === contact._id)
      if (exists) return prev.filter((l) => l._id !== contact._id)
      if (channel === 'SMS' && !contact.phoneNumber) return prev
      if (channel === 'Email' && !contact.email) return prev
      return [...prev, contact]
    })
  }

  useEffect(() => {
    setSelected((prev) =>
      prev.filter((l) => (channel === 'SMS' ? !!l.phoneNumber : !!l.email))
    )
  }, [channel])

  // Clear compose fields only when the user switches channel (not on first mount).
  useEffect(() => {
    if (prevChannelRef.current === channel) return
    prevChannelRef.current = channel
    setMessage('')
    setSubject('')
    setContentHtml(null)
    setSelectedTemplate(null)
    setTemplatePickerOpen(false)
  }, [channel])

  const hasContent = Boolean(String(contentHtml || '').trim() || message.trim())

  const canSend =
    selected.length > 0 &&
    hasContent &&
    (channel === 'SMS' || subject.trim()) &&
    (scheduleMode === 'now' || !!scheduleDate)

  const handleTemplateSelect = (tpl) => {
    if (channel === 'Email') {
      const html = String(tpl.htmlBody || '').trim()
      if (!html) {
        toast.error({
          title: 'Template unavailable',
          message: 'This email template has no HTML content.',
        })
        return
      }
      setSubject('')
      setContentHtml(html)
      setMessage('')
      setSelectedTemplate({
        id: tpl.emailTemplateId,
        name: tpl.emailTemplateSubject || tpl.subject || 'Email template',
      })
    } else {
      const script = String(tpl.script || '').trim()
      if (!script) {
        toast.error({
          title: 'Template unavailable',
          message: 'This SMS template has no message content.',
        })
        return
      }
      setMessage(script)
      setContentHtml(null)
      setSelectedTemplate({
        id: tpl.smsTemplateId,
        name: tpl.smsTemplateName || 'SMS template',
      })
    }
  }

  const handleMessageChange = (e) => {
    const next = e.target.value
    setMessage(next)
    if (selectedTemplate && channel === 'SMS' && !next.trim()) {
      setSelectedTemplate(null)
    }
  }

  const clearTemplate = () => {
    setContentHtml(null)
    setSelectedTemplate(null)
    if (channel === 'Email') setMessage('')
  }

  const usingHtmlTemplate = Boolean(channel === 'Email' && String(contentHtml || '').trim())

  const handleSend = async () => {
    if (!canSend) return
    const scheduleIso =
      scheduleMode === 'later'
        ? toScheduleIsoOrNull(scheduleDate, { requireFuture: true })
        : null
    if (scheduleMode === 'later' && !scheduleIso) {
      toast.error({ title: 'Invalid schedule time', message: 'Please pick a valid future date and time.' })
      return
    }
    setSending(true)
    try {
      const leadsPayload = selected.map((l) => ({
        _id: l._id,
        name: l.name,
        phoneNumber: l.phoneNumber,
        email: l.email,
        type: l.type,
        locationID: Array.isArray(l.locationID)
          ? l.locationID.map((id) => String(id?._id ?? id)).filter(Boolean)
          : l.locationID
            ? [String(l.locationID?._id ?? l.locationID)]
            : [],
      }))

      if (channel === 'SMS') {
        const result = await api.post('/api/sms/', {
          leads: leadsPayload,
          message: message.trim(),
          scheduleNow: scheduleMode === 'now',
          scheduleDate: scheduleIso,
        })
        if (!result.success) {
          toast.error({ title: 'Failed', message: result.error || 'Could not send SMS batch.' })
          return
        }
      } else {
        const htmlBody = String(contentHtml || '').trim()
          ? String(contentHtml).trim()
          : plainTextToHtml(message.trim())
        const result = await api.post('/api/email/', {
          leads: leadsPayload,
          subject: subject.trim(),
          html: htmlBody,
          body: htmlBody,
          scheduleNow: scheduleMode === 'now',
          scheduleDate: scheduleIso,
        })
        if (!result.success) {
          toast.error({ title: 'Failed', message: result.error || 'Could not send email batch.' })
          return
        }
      }

      onSent?.({
        channel,
        leads: selected,
        subject: subject.trim(),
        content: message.trim() || htmlToPlainText(contentHtml || ''),
        contentHtml: contentHtml || undefined,
        scheduleNow: scheduleMode === 'now',
        scheduleDate: scheduleIso,
        timestamp: new Date().toISOString(),
      })

      toast.success({
        title: scheduleMode === 'now' ? 'Sent' : 'Scheduled',
        message: `${channel} ${scheduleMode === 'now' ? 'sent' : 'scheduled'} to ${selected.length} ${
          selected.length === 1 ? meta.singular : meta.plural
        }.`,
      })
      onClose?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Something went wrong.' })
    } finally {
      setSending(false)
    }
  }

  const minDateTime = getScheduleMinLocalDatetime()

  const selectableCount = useMemo(
    () => contacts.filter((c) => (channel === 'SMS' ? !!c.phoneNumber : !!c.email)).length,
    [contacts, channel],
  )

  const selectAllOnPage = () => {
    const eligible = contacts.filter((c) => (channel === 'SMS' ? !!c.phoneNumber : !!c.email))
    setSelected((prev) => {
      const map = new Map(prev.map((p) => [p._id, p]))
      for (const c of eligible) map.set(c._id, c)
      return Array.from(map.values())
    })
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]">
              <TypeIcon className="h-4 w-4" />
            </span>
            Bulk message {meta.plural}
          </DialogTitle>
          <DialogDescription>
            Search the full {meta.singular} directory, then send one SMS or email to multiple people.
            Selected recipients stay selected when you change pages.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label>Channel</Label>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'SMS', Icon: MessageSquare }, { id: 'Email', Icon: Mail }].map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors',
                    channel === id
                      ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {id}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Recipients</Label>
              {selectableCount > 0 && (
                <button
                  type="button"
                  onClick={selectAllOnPage}
                  className="text-xs font-medium text-[color:var(--studio-primary)] hover:underline"
                >
                  Select all on page ({selectableCount})
                </button>
              )}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-border bg-muted/20">
                {selected.map((l) => (
                  <span
                    key={l._id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)] border border-[color:var(--studio-primary)]/40"
                  >
                    {l.name || meta.singular}
                    <button
                      type="button"
                      onClick={() => toggleContact(l)}
                      className="h-4 w-4 rounded-full hover:bg-[color:var(--studio-primary)]/15 flex items-center justify-center"
                      aria-label={`Remove ${l.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={meta.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {meta.plural}
                </p>
                <Badge variant="outline" className="text-xs font-normal">
                  {selected.length} selected · {total} total
                </Badge>
              </div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto p-1">
                {loadingContacts ? (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner size="sm" text={`Loading ${meta.plural}…`} />
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 px-4">{meta.empty}</p>
                ) : (
                  contacts.map((contact) => {
                    const isSelected = !!selected.find((l) => l._id === contact._id)
                    const disabled = channel === 'SMS' ? !contact.phoneNumber : !contact.email
                    return (
                      <button
                        key={contact._id}
                        type="button"
                        onClick={() => toggleContact(contact)}
                        disabled={disabled}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                          isSelected ? 'bg-[color:var(--studio-primary-light)]' : 'hover:bg-muted/60',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={isSelected}
                          className="h-4 w-4 accent-[color:var(--studio-primary)]"
                        />
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-[color:var(--studio-primary)] text-white text-xs">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {channel === 'SMS'
                              ? (contact.phoneNumber || 'No phone')
                              : (contact.email || 'No email')}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <InboxContactPagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={INBOX_CONTACT_PAGE_SIZE}
                loading={loadingContacts}
                onPageChange={handlePageChange}
              />
            </div>
          </div>

          {channel === 'Email' && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Class reminder"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Message</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 gap-1.5 font-semibold',
                  (selectedTemplate || usingHtmlTemplate) &&
                    'border-[color:var(--studio-primary)]/40 bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]',
                )}
                onClick={() => setTemplatePickerOpen(true)}
                disabled={sending}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {usingHtmlTemplate || selectedTemplate ? 'Change template' : 'Use template'}
              </Button>
            </div>

            {usingHtmlTemplate ? (
              <div className="overflow-hidden rounded-xl border border-[color:var(--studio-primary)]/30 bg-background shadow-sm">
                <div className="flex items-start gap-3 border-b border-border/80 bg-[color:var(--studio-primary-light)]/60 px-3.5 py-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--studio-primary)] text-white">
                    <LayoutTemplate className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--studio-primary)]">
                      HTML email template
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedTemplate?.name || 'Selected template'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearTemplate}
                    disabled={sending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-background disabled:opacity-50"
                    aria-label="Remove template"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 w-full overflow-hidden bg-white">
                  <ScaledInboxHtmlEmail
                    html={contentHtml}
                    title="Selected email template"
                    minHeight={140}
                    maxHeight={280}
                  />
                </div>
              </div>
            ) : (
              <>
                {selectedTemplate && channel === 'SMS' && (
                  <div className="flex items-center gap-2 rounded-xl border border-[color:var(--studio-primary)]/25 bg-[color:var(--studio-primary-light)] px-3 py-2">
                    <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-[color:var(--studio-primary)]" />
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-[color:var(--studio-primary)]">
                      SMS template: {selectedTemplate.name}
                    </p>
                    <button
                      type="button"
                      onClick={clearTemplate}
                      disabled={sending}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--studio-primary)] hover:bg-white/60 disabled:opacity-50"
                      aria-label="Clear template"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <Textarea
                  value={message}
                  onChange={handleMessageChange}
                  rows={5}
                  placeholder={
                    channel === 'SMS'
                      ? `Type your SMS to ${meta.plural}…`
                      : `Type your email to ${meta.plural}…`
                  }
                />
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>When to send</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors',
                  scheduleMode === 'now'
                    ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                <Send className="h-4 w-4" />
                Send now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('later')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors',
                  scheduleMode === 'later'
                    ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button variant="gradient" onClick={handleSend} disabled={!canSend || sending}>
              {sending
                ? 'Sending…'
                : scheduleMode === 'now'
                  ? `Send to ${selected.length || '—'} ${selected.length === 1 ? meta.singular : meta.plural}`
                  : `Schedule for ${selected.length || '—'} ${selected.length === 1 ? meta.singular : meta.plural}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {channel === 'Email' ? (
      <WorkflowEmailTemplatePickerDialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        selectedId={selectedTemplate?.id || ''}
        description="Templates from Email Builder — select one to send to these recipients."
        onSelect={handleTemplateSelect}
      />
    ) : (
      <WorkflowSmsTemplatePickerDialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        selectedId={selectedTemplate?.id || ''}
        description="Templates from SMS Builder — select one to send to these recipients."
        onSelect={handleTemplateSelect}
      />
    )}
    </>
  )
}
