'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Hash, Mail, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import { fetchInboxContacts } from '@/lib/inbox-contact-search'
import { looksLikeEmail, normalizePhoneE164, smsSegments } from '@/lib/inbox-messaging'
import Segmented from './Segmented'

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[color:var(--studio-primary)] focus:ring-2 focus:ring-[color:var(--studio-primary)]/15'

const SEARCH_TYPES = ['Customers', 'Leads', 'Teachers']

/**
 * Right-pane composer for a first message: pick anyone in the CRM, or type a number /
 * email to message it without creating a student, lead or customer.
 */
export default function NewMessagePanel({ onCancel, onSend }) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [recipient, setRecipient] = useState(null) // { kind: 'contact'|'number'|'email', ... }
  const [channel, setChannel] = useState('SMS')
  const [inboxName, setInboxName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const reqRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Search all three directories at once (5 each) while typing.
  useEffect(() => {
    const q = query.trim()
    if (recipient || q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    const reqId = ++reqRef.current
    setSearching(true)
    const t = setTimeout(async () => {
      const pages = await Promise.all(
        SEARCH_TYPES.map((contactType) =>
          fetchInboxContacts({ contactType, search: q, page: 1, limit: 5 }).catch(() => ({ contacts: [] })),
        ),
      )
      if (reqId !== reqRef.current) return
      setResults(pages.flatMap((p) => p.contacts || []))
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query, recipient])

  const typedPhone = normalizePhoneE164(query)
  const typedEmail = looksLikeEmail(query) ? query.trim().toLowerCase() : null

  const options = useMemo(() => {
    const list = results.map((c) => ({ key: `c-${c._id}`, kind: 'contact', contact: c }))
    if (typedPhone) list.unshift({ key: 'num', kind: 'number', phoneNumber: typedPhone })
    if (typedEmail) list.unshift({ key: 'email', kind: 'email', email: typedEmail })
    return list
  }, [results, typedPhone, typedEmail])

  useEffect(() => setHighlight(0), [options.length])

  const choose = (opt) => {
    if (!opt) return
    setRecipient(opt)
    setOpen(false)
    setError('')
    if (opt.kind === 'number') setChannel('SMS')
    else if (opt.kind === 'email') setChannel('Email')
    else setChannel(opt.contact.phoneNumber ? 'SMS' : 'Email')
  }

  const clearRecipient = () => {
    setRecipient(null)
    setInboxName('')
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const onKeyDown = (e) => {
    if (!open || options.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(options[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // A number or email typed into "To" counts without picking it from the dropdown.
  const target =
    recipient ||
    (typedPhone ? { kind: 'number', phoneNumber: typedPhone } : typedEmail ? { kind: 'email', email: typedEmail } : null)
  const contact = target?.kind === 'contact' ? target.contact : null
  const smsDisabled = target ? (contact ? !contact.phoneNumber : target.kind === 'email') : false
  const emailDisabled = target ? (contact ? !contact.email : target.kind === 'number') : false
  const isNewNumber = !target || target.kind === 'number'
  const segments = channel === 'SMS' ? smsSegments(message) : 0

  useEffect(() => {
    if (channel === 'SMS' && smsDisabled && !emailDisabled) setChannel('Email')
    else if (channel === 'Email' && emailDisabled && !smsDisabled) setChannel('SMS')
  }, [channel, smsDisabled, emailDisabled])

  const canSend =
    !!target &&
    !sending &&
    message.trim() &&
    (channel === 'SMS' ? !smsDisabled : !emailDisabled && subject.trim())

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    setError('')
    const ok = await onSend?.({
      recipient: target,
      channel,
      message: message.trim(),
      subject: subject.trim(),
      inboxName: inboxName.trim(),
    })
    setSending(false)
    if (!ok) setError('The message was not sent. Check the details and try again.')
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card lg:border-l border-border">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9 lg:hidden" aria-label="Back to inbox">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <h2 className="text-base font-semibold text-foreground">New message</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="hidden lg:inline-flex text-muted-foreground">
          Cancel
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="space-y-1.5">
            <label htmlFor={`${listId}-to`} className="text-sm font-medium text-foreground">To</label>
            {recipient ? (
              <div className="flex items-center gap-3 rounded-lg border border-[color:var(--studio-primary)]/40 bg-[color:var(--studio-primary-light)]/60 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={cn(
                      'text-xs font-semibold',
                      contact ? 'bg-[color:var(--studio-primary)] text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {contact ? getInitials(contact.name || contact.phoneNumber) : recipient.kind === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {contact ? contact.name || 'Unnamed' : recipient.phoneNumber || recipient.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contact
                      ? [contact.type, contact.phoneNumber, contact.email].filter(Boolean).join(' · ')
                      : 'Not in the CRM'}
                  </p>
                </div>
                <button type="button" onClick={clearRecipient} className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Change recipient">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id={`${listId}-to`}
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 120)}
                  onKeyDown={onKeyDown}
                  role="combobox"
                  aria-expanded={open && options.length > 0}
                  aria-controls={`${listId}-options`}
                  aria-autocomplete="list"
                  autoComplete="off"
                  placeholder="Name, phone number or email"
                  className={fieldClass}
                />
                {open && query.trim().length >= 2 && (
                  <ul
                    id={`${listId}-options`}
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
                  >
                    {options.map((opt, i) => (
                      <li
                        key={opt.key}
                        role="option"
                        aria-selected={i === highlight}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          choose(opt)
                        }}
                        onMouseEnter={() => setHighlight(i)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2',
                          i === highlight ? 'bg-muted' : '',
                        )}
                      >
                        {opt.kind === 'contact' ? (
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-[color:var(--studio-primary)] text-xs font-semibold text-white">
                                {getInitials(opt.contact.name || opt.contact.phoneNumber)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-foreground">{opt.contact.name || 'Unnamed'}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {[opt.contact.phoneNumber, opt.contact.email].filter(Boolean).join(' · ') || 'No phone or email'}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{opt.contact.type}</span>
                          </>
                        ) : (
                          <>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              {opt.kind === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                            </span>
                            <span className="min-w-0 flex-1 text-sm text-foreground">
                              {opt.kind === 'email' ? `Email ${opt.email}` : `Text ${opt.phoneNumber}`}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                    {options.length === 0 && (
                      <li className="px-3 py-3 text-xs text-muted-foreground">
                        {searching ? 'Searching…' : 'No one found. Type a full phone number with area code, or an email.'}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Pick someone in the CRM, or type a number to text it without creating a student, lead or customer.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Send by</p>
            <Segmented
              label="Send by"
              value={channel}
              onChange={setChannel}
              options={[
                { id: 'SMS', label: 'SMS', Icon: MessageSquare, disabled: smsDisabled },
                { id: 'Email', label: 'Email', Icon: Mail, disabled: emailDisabled },
              ]}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input
              value={isNewNumber ? inboxName : ''}
              onChange={(e) => setInboxName(e.target.value)}
              disabled={!isNewNumber}
              placeholder="e.g. Dance With Me Stanford"
              maxLength={120}
              className={cn(fieldClass, 'disabled:cursor-not-allowed disabled:opacity-50')}
            />
            <span className="block text-xs text-muted-foreground">
              {isNewNumber
                ? 'An inbox name for a new number. You can add or change it later.'
                : 'Only for numbers that aren’t in the CRM.'}
            </span>
          </label>

          {channel === 'Email' && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message…"
              className={cn(fieldClass, 'resize-y leading-relaxed')}
            />
            {channel === 'SMS' && message && (
              <span className="block text-xs tabular-nums text-muted-foreground">
                {[...message].length} characters · {segments} segment{segments === 1 ? '' : 's'}
              </span>
            )}
          </label>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
      </div>

      <div className="flex flex-shrink-0 justify-end gap-2 border-t border-border px-4 py-3 sm:px-6">
        <Button variant="outline" onClick={onCancel} disabled={sending}>Cancel</Button>
        <Button variant="gradient" onClick={handleSend} disabled={!canSend}>
          {sending ? 'Sending…' : channel === 'Email' ? 'Send email' : 'Send SMS'}
        </Button>
      </div>
    </main>
  )
}
