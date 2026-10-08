'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  ImagePlus,
  LayoutTemplate,
  ListChecks,
  Mail,
  MessageSquare,
  Search,
  Send,
  Smile,
  UserCheck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import api from '@/lib/api'
import {
  getScheduleMinLocalDatetime,
  htmlToPlainText,
  normalizeLocationIDs,
  toLocalDatetimeInputValue,
  toScheduleIsoOrNull,
} from '@/lib/emailSend'
import { htmlHasStudioFooter } from '@/lib/email-footer'
import { fetchInboxContacts, INBOX_CONTACT_PAGE_SIZE } from '@/lib/inbox-contact-search'
import {
  SMS_OPT_OUT_FOOTER,
  personalizeForPreview,
  skipReason,
  smsSegments,
  withOptOutFooter,
} from '@/lib/inbox-messaging'
import InboxContactPagination from './InboxContactPagination'
import { ScaledInboxHtmlEmail } from './InboxHtmlEmailFrame'
import Segmented from './Segmented'
import WorkflowEmailTemplatePickerDialog from '@/components/workflow/WorkflowEmailTemplatePickerDialog'
import WorkflowSmsTemplatePickerDialog from '@/components/workflow/WorkflowSmsTemplatePickerDialog'

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[color:var(--studio-primary)] focus:ring-2 focus:ring-[color:var(--studio-primary)]/15'

const toolButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'

const EMOJIS = ['😊', '😀', '😍', '🥳', '🎉', '💃', '🕺', '✨', '❤️', '👏', '👋', '🙌', '👍', '🙏', '🔥', '⭐', '🎶', '🗓️', '⏰', '📍', '✅', '💬', '🌟', '🌸']
const NAME_FIELDS = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{name}}', label: 'Full name' },
]
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const PHOTO_MAX_BYTES = 5 * 1024 * 1024 // carrier MMS limit
const NO_NAME_PREVIEW = '__no_name__'

const TYPE_PLURAL = { Customers: 'customers', Leads: 'leads', Teachers: 'teachers' }

function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

function insertAtCursor(el, text, value, setValue) {
  if (!el) {
    setValue(`${value}${text}`)
    return
  }
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  setValue(value.slice(0, start) + text + value.slice(end))
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + text.length, start + text.length)
  })
}

function toLeadPayload(l) {
  return {
    _id: l._id,
    name: l.name,
    phoneNumber: l.phoneNumber,
    email: l.email,
    type: l.type,
    stage: l.stage,
    locationID: normalizeLocationIDs(l.locationID),
  }
}

export default function BulkMessagePanel({ contactType = 'Customers', onClose, onSent }) {
  const toast = useToast()

  const [step, setStep] = useState('compose')
  const [channel, setChannel] = useState('SMS')
  const [mode, setMode] = useState('list')

  // Saved lists
  const [lists, setLists] = useState([])
  const [listsLoading, setListsLoading] = useState(true)
  const [listId, setListId] = useState('')
  const [listData, setListData] = useState(null) // { listName, recipients }
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')

  // Hand-picked people
  const [peopleType, setPeopleType] = useState(TYPE_PLURAL[contactType] ? contactType : 'Customers')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [contacts, setContacts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [picked, setPicked] = useState([])
  const contactsReqRef = useRef(0)

  // Message
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [contentHtml, setContentHtml] = useState(null)
  const [template, setTemplate] = useState(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [photo, setPhoto] = useState(null) // { url, name }
  const [photoUploading, setPhotoUploading] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const emojiRef = useRef(null)

  // Timing
  const [when, setWhen] = useState('now')
  const [sendAt, setSendAt] = useState('')

  const [previewId, setPreviewId] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    api.get('/api/inbox/lists').then((res) => {
      if (!active) return
      setLists(res.success && Array.isArray(res.data) ? res.data : [])
      setListsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!listId) {
      setListData(null)
      return
    }
    let active = true
    setListLoading(true)
    setListError('')
    api.get(`/api/inbox/lists/${listId}/recipients`).then((res) => {
      if (!active) return
      if (res.success) setListData(res.data)
      else {
        setListData(null)
        setListError(res.error || 'Could not load this list.')
      }
      setListLoading(false)
    })
    return () => {
      active = false
    }
  }, [listId])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadContacts = useCallback(async (nextPage) => {
    const reqId = ++contactsReqRef.current
    setContactsLoading(true)
    const result = await fetchInboxContacts({ contactType: peopleType, search: debouncedSearch, page: nextPage })
    if (reqId !== contactsReqRef.current) return
    setContacts(result.contacts)
    setPage(result.page)
    setTotal(result.total)
    setContactsLoading(false)
  }, [peopleType, debouncedSearch])

  useEffect(() => {
    if (mode === 'people') loadContacts(1)
  }, [mode, loadContacts])

  // Close the emoji tray on outside click.
  useEffect(() => {
    if (!emojiOpen) return
    const onDown = (e) => {
      if (!emojiRef.current?.contains(e.target)) setEmojiOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [emojiOpen])

  const switchChannel = (next) => {
    if (next === channel) return
    setChannel(next)
    setMessage('')
    setSubject('')
    setContentHtml(null)
    setTemplate(null)
    setPhoto(null)
  }

  const togglePerson = (c) => {
    setPicked((prev) => (prev.some((p) => p._id === c._id) ? prev.filter((p) => p._id !== c._id) : [...prev, c]))
  }

  const selectAllOnPage = () => {
    setPicked((prev) => {
      const map = new Map(prev.map((p) => [p._id, p]))
      for (const c of contacts) if (!skipReason(c, channel)) map.set(c._id, c)
      return [...map.values()]
    })
  }

  const recipients = mode === 'list' ? listData?.recipients || [] : picked
  const eligible = useMemo(() => recipients.filter((r) => !skipReason(r, channel)), [recipients, channel])
  const skipped = recipients.length - eligible.length
  const audienceName = mode === 'list' ? listData?.listName || 'Saved list' : 'Selected people'

  const usingHtml = channel === 'Email' && Boolean(String(contentHtml || '').trim())
  const finalText = channel === 'SMS' ? withOptOutFooter(message) : message.trim()
  const segments = smsSegments(finalText)
  const scheduleIso = when === 'later' ? toScheduleIsoOrNull(sendAt, { requireFuture: true }) : null

  const blocker = (() => {
    if (mode === 'list' && !listId) return 'Choose a list'
    if (recipients.length === 0) return mode === 'list' ? 'This list has no one in it yet' : 'Choose at least one person'
    if (eligible.length === 0) return `No one here can receive ${channel === 'SMS' ? 'texts' : 'email'}`
    if (channel === 'Email' && !subject.trim()) return 'Add a subject'
    if (!usingHtml && !message.trim()) return 'Write a message'
    if (photoUploading) return 'Photo is still uploading'
    if (when === 'later' && !scheduleIso) return 'Pick a send time in the future'
    return null
  })()

  const handleTemplateSelect = (tpl) => {
    if (channel === 'Email') {
      const html = String(tpl.htmlBody || '').trim()
      if (!html) {
        toast.error({ title: 'Template unavailable', message: 'This email template has no content.' })
        return
      }
      setContentHtml(html)
      setMessage('')
      setTemplate({ id: tpl.emailTemplateId, name: tpl.emailTemplateSubject || tpl.subject || 'Email template' })
    } else {
      const script = String(tpl.script || '').trim()
      if (!script) {
        toast.error({ title: 'Template unavailable', message: 'This SMS template has no message.' })
        return
      }
      setMessage(script)
      setTemplate({ id: tpl.smsTemplateId, name: tpl.smsTemplateName || 'SMS template' })
    }
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error({ title: 'Photo not added', message: 'Use a JPG, PNG or GIF image.' })
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error({ title: 'Photo not added', message: 'Photos sent by text must be 5 MB or smaller.' })
      return
    }
    const form = new FormData()
    form.append('file', file)
    setPhotoUploading(true)
    const res = await api.request('/api/sms/media', { method: 'POST', body: form })
    setPhotoUploading(false)
    if (!res.success || !res.data?.url) {
      toast.error({ title: 'Photo not added', message: res.error || 'Upload failed. Try again.' })
      return
    }
    setPhoto({ url: res.data.url, name: file.name })
  }

  const previewPeople = eligible.slice(0, 25)
  const previewPerson =
    previewId === NO_NAME_PREVIEW
      ? { name: '' }
      : previewPeople.find((p) => String(p._id) === previewId) || previewPeople[0] || { name: '' }

  const goPreview = () => {
    if (blocker) return
    setPreviewId(previewPeople[0] ? String(previewPeople[0]._id) : NO_NAME_PREVIEW)
    setStep('preview')
  }

  const handleSend = async () => {
    if (blocker || sending) return
    setSending(true)
    const leads = eligible.map(toLeadPayload)
    const label = mode === 'list' ? listData?.listName : null
    const timing = { scheduleNow: when === 'now', scheduleDate: scheduleIso }
    let result
    if (channel === 'SMS') {
      result = await api.post('/api/sms/', {
        leads,
        message: finalText,
        label,
        ...(photo ? { mediaUrl: [photo.url] } : {}),
        ...timing,
      })
    } else {
      const html = usingHtml ? String(contentHtml).trim() : null
      const footerSaved = usingHtml && htmlHasStudioFooter(html)
      result = await api.post('/api/email/', {
        leads,
        subject: subject.trim(),
        label,
        ...(usingHtml
          ? {
              html,
              body: html,
              useTemplate: true,
              emailType: 'template',
              hasFooter: footerSaved,
              ...(footerSaved ? { skipStudioFooter: true } : {}),
            }
          : { text: message.trim() }),
        ...timing,
      })
    }
    setSending(false)
    if (!result.success) {
      toast.error({ title: 'Not sent', message: result.error || 'Something went wrong. Nothing was sent.' })
      return
    }
    toast.success({
      title: when === 'now' ? 'Sending' : 'Scheduled',
      message: `${channel} ${when === 'now' ? 'is going out to' : 'scheduled for'} ${eligible.length} ${eligible.length === 1 ? 'person' : 'people'}.`,
    })
    onSent?.({
      channel,
      leads: eligible,
      subject: subject.trim(),
      content: channel === 'SMS' ? finalText : message.trim() || htmlToPlainText(contentHtml || ''),
      scheduleNow: when === 'now',
      timestamp: new Date().toISOString(),
    })
  }

  const peopleTotalPages = Math.max(1, Math.ceil((total || 0) / INBOX_CONTACT_PAGE_SIZE))
  const recipientsSummary =
    recipients.length === 0
      ? null
      : `${eligible.length} ${eligible.length === 1 ? 'person' : 'people'} can receive this${skipped ? ` · ${skipped} skipped` : ''}`

  // ── Preview ─────────────────────────────────────────────────────────────
  if (step === 'preview') {
    const personalized = personalizeForPreview(finalText, previewPerson)
    const skippedReasons = channel === 'SMS' ? 'opted out or no phone number' : 'unsubscribed or no email address'
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-card lg:rounded-lg">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 py-4 sm:px-8">
          <Button variant="ghost" size="icon" onClick={() => setStep('compose')} className="h-9 w-9" aria-label="Back to editing">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Preview</h2>
            <p className="truncate text-xs text-muted-foreground">
              {audienceName} · {eligible.length} recipients · {channel === 'Email' ? 'Email' : photo ? 'MMS' : 'SMS'}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="space-y-6">
              <Field label="Preview as" htmlFor="bulk-preview-person" hint="Anyone without a first name on file sees “there” instead.">
                <Select id="bulk-preview-person" value={previewId} onChange={(e) => setPreviewId(e.target.value)} className="h-10">
                  {previewPeople.map((p) => (
                    <option key={p._id} value={String(p._id)}>{p.name || p.phoneNumber || p.email}</option>
                  ))}
                  <option value={NO_NAME_PREVIEW}>Someone without a name</option>
                </Select>
              </Field>

              <dl className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--studio-primary)]" aria-hidden />
                  <div>
                    <dt className="font-medium text-foreground">{when === 'now' ? 'Sends right away' : 'Scheduled'}</dt>
                    {when === 'later' && (
                      <dd className="text-muted-foreground">{formatDateTime(scheduleIso)}</dd>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--studio-primary)]" aria-hidden />
                  <div>
                    <dt className="font-medium text-foreground">Each person gets their own message</dt>
                    <dd className="text-muted-foreground">Replies land in that person’s conversation.</dd>
                  </div>
                </div>
                {skipped > 0 && (
                  <div className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="font-medium text-foreground">{skipped} skipped</dt>
                      <dd className="text-muted-foreground">They’re {skippedReasons}.</dd>
                    </div>
                  </div>
                )}
                {channel === 'SMS' && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--studio-primary)]" aria-hidden />
                    <div>
                      <dt className="font-medium text-foreground">
                        {photo ? 'Picture message (MMS)' : `${segments} SMS segment${segments === 1 ? '' : 's'} per person`}
                      </dt>
                      <dd className="text-muted-foreground">Billed by your messaging provider at their usual rates.</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            <div className="lg:pt-6">
              {channel === 'SMS' ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-5">
                  <p className="mb-3 text-xs text-muted-foreground">Text message</p>
                  <div className="ml-auto max-w-[85%] space-y-2">
                    {photo && <img src={photo.url} alt="Attached photo" className="w-full rounded-2xl border border-border object-cover" />}
                    <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-[color:var(--studio-primary)] px-3.5 py-2.5 text-sm leading-relaxed text-white">
                      {personalized}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <div className="border-b border-border bg-muted/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="truncate text-sm font-medium text-foreground">{personalizeForPreview(subject, previewPerson)}</p>
                  </div>
                  {usingHtml ? (
                    <div className="bg-white">
                      <ScaledInboxHtmlEmail html={personalizeForPreview(contentHtml, previewPerson)} title="Email preview" minHeight={200} maxHeight={480} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-relaxed text-foreground">{personalized}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-8">
          <Button variant="outline" onClick={() => setStep('compose')} disabled={sending}>Edit message</Button>
          <Button variant="gradient" onClick={handleSend} disabled={sending || !!blocker} className="gap-2">
            {when === 'now' ? <Send className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {sending
              ? when === 'now' ? 'Sending…' : 'Scheduling…'
              : `${when === 'now' ? 'Send to' : 'Schedule for'} ${eligible.length} ${eligible.length === 1 ? 'person' : 'people'}`}
          </Button>
        </footer>
      </section>
    )
  }

  // ── Compose ─────────────────────────────────────────────────────────────
  const leadLists = lists.filter((l) => l.entityType !== 'customer')
  const customerLists = lists.filter((l) => l.entityType === 'customer')

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-card lg:rounded-lg">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 py-4 sm:px-8">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9" aria-label="Back to inbox">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Bulk message</h2>
          <p className="truncate text-xs text-muted-foreground">One message, sent separately to each person.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-8">
          <Field label="Send by">
            <div>
              <Segmented
                label="Send by"
                value={channel}
                onChange={switchChannel}
                options={[
                  { id: 'SMS', label: 'SMS', Icon: MessageSquare },
                  { id: 'Email', label: 'Email', Icon: Mail },
                ]}
              />
            </div>
          </Field>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Recipients</p>
            <Segmented
              label="Recipients"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'list', label: 'Saved list', Icon: ListChecks },
                { id: 'people', label: 'Choose people', Icon: UserCheck },
              ]}
            />

            {mode === 'list' ? (
              <div className="space-y-2">
                <label htmlFor="bulk-list" className="sr-only">Saved list</label>
                <Select id="bulk-list" value={listId} onChange={(e) => setListId(e.target.value)} disabled={listsLoading} className="h-10">
                  <option value="">{listsLoading ? 'Loading lists…' : lists.length ? 'Choose a saved list' : 'No saved lists yet'}</option>
                  {customerLists.length > 0 && (
                    <optgroup label="Customer lists">
                      {customerLists.map((l) => (
                        <option key={l._id} value={l._id}>{l.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {leadLists.length > 0 && (
                    <optgroup label="Lead lists">
                      {leadLists.map((l) => (
                        <option key={l._id} value={l._id}>{l.name}</option>
                      ))}
                    </optgroup>
                  )}
                </Select>
                {listLoading ? (
                  <div className="h-4 w-56 animate-pulse rounded bg-muted" aria-label="Loading list" />
                ) : listError ? (
                  <p className="text-xs text-destructive" role="alert">{listError}</p>
                ) : listData ? (
                  <p className="text-xs text-muted-foreground">
                    {listData.recipients.length} in this list · {recipientsSummary || 'no one can receive this'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Lists come from your CRM, so there’s nothing separate to maintain. Members are taken from the list when you send or schedule.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    label="Directory"
                    value={peopleType}
                    onChange={(t) => {
                      setPeopleType(t)
                      setSearch('')
                    }}
                    options={['Customers', 'Leads', 'Teachers'].map((t) => ({ id: t, label: t }))}
                  />
                  {picked.length > 0 && (
                    <button type="button" onClick={() => setPicked([])} className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground">
                      Clear {picked.length} selected
                    </button>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search ${TYPE_PLURAL[peopleType]}…`}
                      aria-label={`Search ${TYPE_PLURAL[peopleType]}`}
                      className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {contacts.length > 0 && (
                      <button type="button" onClick={selectAllOnPage} className="shrink-0 text-xs font-medium text-[color:var(--studio-primary)] hover:underline">
                        Select page
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {contactsLoading ? (
                      <div className="space-y-1 p-1" aria-label="Loading">
                        {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/70" />)}
                      </div>
                    ) : contacts.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {debouncedSearch ? `No ${TYPE_PLURAL[peopleType]} match “${debouncedSearch}”.` : `No ${TYPE_PLURAL[peopleType]} yet.`}
                      </p>
                    ) : (
                      contacts.map((c) => {
                        const checked = picked.some((p) => p._id === c._id)
                        const reason = skipReason(c, channel)
                        return (
                          <label
                            key={c._id}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors',
                              checked ? 'bg-[color:var(--studio-primary-light)]' : 'hover:bg-muted/60',
                              reason && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!!reason && !checked}
                              onChange={() => togglePerson(c)}
                              className="h-4 w-4 accent-[color:var(--studio-primary)]"
                            />
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--studio-primary)] text-xs font-semibold text-white">
                              {getInitials(c.name || c.phoneNumber)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-foreground">{c.name || 'Unnamed'}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {reason ? `Can’t receive: ${reason}` : channel === 'SMS' ? c.phoneNumber : c.email}
                              </span>
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                  <InboxContactPagination
                    page={page}
                    totalPages={peopleTotalPages}
                    total={total}
                    pageSize={INBOX_CONTACT_PAGE_SIZE}
                    loading={contactsLoading}
                    onPageChange={(p) => loadContacts(Math.min(Math.max(1, p), peopleTotalPages))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {picked.length ? `${picked.length} selected · ${recipientsSummary}` : 'Selections stay when you switch pages or directories.'}
                </p>
              </div>
            )}
          </div>

          {channel === 'Email' && (
            <Field label="Subject" htmlFor="bulk-subject">
              <input id="bulk-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Your next lesson" className={fieldClass} />
            </Field>
          )}

          <div className="space-y-2">
            <label htmlFor="bulk-message" className="block text-sm font-medium text-foreground">Message</label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setTemplatePickerOpen(true)} className={cn(toolButtonClass, template && 'border-[color:var(--studio-primary)]/40 bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]')}>
                <LayoutTemplate className="h-3.5 w-3.5" aria-hidden />
                {template ? 'Change template' : 'Use template'}
              </button>
              {!usingHtml && (
                <>
                  <label className="sr-only" htmlFor="bulk-insert-name">Insert a name field</label>
                  <select
                    id="bulk-insert-name"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) insertAtCursor(textareaRef.current, e.target.value, message, setMessage)
                    }}
                    className={cn(toolButtonClass, 'cursor-pointer pr-2')}
                  >
                    <option value="">Insert name…</option>
                    {NAME_FIELDS.map((f) => <option key={f.token} value={f.token}>{f.label}</option>)}
                  </select>
                  <div ref={emojiRef} className="relative">
                    <button type="button" onClick={() => setEmojiOpen((o) => !o)} aria-expanded={emojiOpen} className={toolButtonClass}>
                      <Smile className="h-3.5 w-3.5" aria-hidden />
                      Emoji
                    </button>
                    {emojiOpen && (
                      <div className="absolute left-0 top-full z-20 mt-1 grid w-64 grid-cols-8 gap-0.5 rounded-xl border border-border bg-card p-2 shadow-lg" role="menu" aria-label="Emoji">
                        {EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              insertAtCursor(textareaRef.current, em, message, setMessage)
                              setEmojiOpen(false)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-lg hover:bg-muted"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {channel === 'SMS' && (
                <>
                  <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} className="hidden" onChange={handlePhoto} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={photoUploading || !!photo} className={toolButtonClass}>
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                    {photoUploading ? 'Uploading…' : 'Add photo'}
                  </button>
                </>
              )}
            </div>

            {usingHtml ? (
              <div className="overflow-hidden rounded-xl border border-[color:var(--studio-primary)]/30">
                <div className="flex items-center gap-3 border-b border-border bg-[color:var(--studio-primary-light)]/60 px-3.5 py-2.5">
                  <LayoutTemplate className="h-4 w-4 shrink-0 text-[color:var(--studio-primary)]" aria-hidden />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{template?.name || 'Email template'}</p>
                  <button type="button" onClick={() => { setContentHtml(null); setTemplate(null) }} className="rounded-md p-1 text-muted-foreground hover:bg-background" aria-label="Remove template">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="bg-white">
                  <ScaledInboxHtmlEmail html={contentHtml} title="Selected email template" minHeight={140} maxHeight={280} />
                </div>
              </div>
            ) : (
              <textarea
                id="bulk-message"
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  if (template && !e.target.value.trim()) setTemplate(null)
                }}
                rows={6}
                placeholder={channel === 'SMS' ? 'Hi {{first_name}}, ready for your next lesson?' : 'Write your email…'}
                className={cn(fieldClass, 'resize-y leading-relaxed')}
              />
            )}

            {photo && (
              <div className="flex items-center gap-3 rounded-lg border border-border px-2.5 py-2">
                <img src={photo.url} alt="" className="h-12 w-12 rounded-md object-cover" />
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{photo.name}</p>
                <button type="button" onClick={() => setPhoto(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Remove photo">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {channel === 'SMS' && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {photo ? 'Picture message (MMS)' : message ? `${segments} segment${segments === 1 ? '' : 's'} with the opt-out line` : 'Text only'}
              </p>
            )}
          </div>

          {channel === 'SMS' && (
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Added to every bulk text</p>
              <p className="mt-0.5 text-sm text-foreground">{SMS_OPT_OUT_FOOTER}</p>
            </div>
          )}

          <Field label="When to send">
            <div className="space-y-3">
              <Segmented
                label="When to send"
                value={when}
                onChange={(v) => {
                  setWhen(v)
                  if (v === 'later' && !sendAt) setSendAt(toLocalDatetimeInputValue(new Date(Date.now() + 60 * 60_000)))
                }}
                options={[
                  { id: 'now', label: 'Send now', Icon: Send },
                  { id: 'later', label: 'Schedule', Icon: CalendarClock },
                ]}
              />
              {when === 'later' && (
                <input
                  type="datetime-local"
                  aria-label="Send at"
                  value={sendAt}
                  min={getScheduleMinLocalDatetime()}
                  onChange={(e) => setSendAt(e.target.value)}
                  className={cn(fieldClass, 'max-w-xs')}
                />
              )}
            </div>
          </Field>
        </div>
      </div>

      <footer className="flex flex-shrink-0 flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {blocker || recipientsSummary}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={goPreview} disabled={!!blocker}>Preview message</Button>
        </div>
      </footer>

      {channel === 'Email' ? (
        <WorkflowEmailTemplatePickerDialog
          open={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          selectedId={template?.id || ''}
          description="Templates from Email Builder."
          onSelect={handleTemplateSelect}
        />
      ) : (
        <WorkflowSmsTemplatePickerDialog
          open={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          selectedId={template?.id || ''}
          description="The message fills in so you can edit it before sending."
          onSelect={handleTemplateSelect}
        />
      )}
    </section>
  )
}
