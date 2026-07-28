'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, MessageSquare, Mail, UserRound, GraduationCap, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { cn, getInitials } from '@/lib/utils'
import { fetchInboxContacts, INBOX_CONTACT_PAGE_SIZE } from '@/lib/inbox-contact-search'
import InboxContactPagination from '@/app/inbox/components/InboxContactPagination'

const TYPE_META = {
  Customers: {
    singular: 'customer',
    plural: 'customers',
    Icon: Users,
    searchPlaceholder: 'Search all customers by name, email or phone…',
    empty: 'No customers found for this studio.',
  },
  Leads: {
    singular: 'lead',
    plural: 'leads',
    Icon: UserRound,
    searchPlaceholder: 'Search all leads by name, email or phone…',
    empty: 'No leads found for this studio.',
  },
  Teachers: {
    singular: 'teacher',
    plural: 'teachers',
    Icon: GraduationCap,
    searchPlaceholder: 'Search all teachers by name, email or phone…',
    empty: 'No teachers found for this studio.',
  },
}

export default function NewConversationDialog({
  open,
  onClose,
  onStart,
  contactType = 'Leads',
}) {
  const meta = TYPE_META[contactType] || TYPE_META.Leads
  const TypeIcon = meta.Icon

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [contacts, setContacts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [channel, setChannel] = useState('SMS')
  const requestIdRef = useRef(0)

  const totalPages = Math.max(1, Math.ceil((total || 0) / INBOX_CONTACT_PAGE_SIZE))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadPage = useCallback(async (nextPage, query = debouncedSearch) => {
    const reqId = ++requestIdRef.current
    setLoading(true)
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
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [contactType, debouncedSearch])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setContacts([])
      setPage(1)
      setTotal(0)
      setSelected(null)
      setChannel('SMS')
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

  const handleStart = () => {
    if (!selected) return
    onStart?.({ lead: selected, channel })
    onClose?.()
  }

  const canStart = !!selected && (
    channel === 'SMS' ? !!selected.phoneNumber : !!selected.email
  )

  const selectedHint = useMemo(() => {
    if (!selected) return null
    if (channel === 'SMS' && !selected.phoneNumber) return 'This contact has no phone number.'
    if (channel === 'Email' && !selected.email) return 'This contact has no email address.'
    return null
  }, [selected, channel])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]">
              <TypeIcon className="h-4 w-4" />
            </span>
            Message a {meta.singular}
          </DialogTitle>
          <DialogDescription>
            Search the full {meta.singular} directory for this studio, then start an SMS or email.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={meta.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {meta.plural}
              </p>
              <Badge variant="outline" className="text-xs font-normal">
                {total} total
              </Badge>
            </div>
            <div className="space-y-0.5 max-h-60 overflow-y-auto p-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" text={`Loading ${meta.plural}…`} />
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">{meta.empty}</p>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selected?._id === contact._id
                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => setSelected(contact)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                        isSelected
                          ? 'bg-[color:var(--studio-primary-light)] border border-[color:var(--studio-primary)]'
                          : 'hover:bg-muted/60 border border-transparent',
                      )}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="bg-[color:var(--studio-primary)] text-white text-xs font-semibold">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{contact.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phoneNumber || 'No phone'}
                          <span className="mx-1">·</span>
                          {contact.email || 'No email'}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge
                          variant="outline"
                          className="text-[color:var(--studio-primary)] border-[color:var(--studio-primary)] flex-shrink-0"
                        >
                          Selected
                        </Badge>
                      )}
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
              loading={loading}
              onPageChange={handlePageChange}
            />
          </div>

          {selected && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Channel</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  disabled={!selected.phoneNumber}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors',
                    channel === 'SMS'
                      ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  SMS
                  {!selected.phoneNumber && <span className="text-xs">(no phone)</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('Email')}
                  disabled={!selected.email}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors',
                    channel === 'Email'
                      ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Email
                  {!selected.email && <span className="text-xs">(no email)</span>}
                </button>
              </div>
              {selectedHint && (
                <p className="text-xs text-destructive">{selectedHint}</p>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="gradient" onClick={handleStart} disabled={!canStart}>
              Start {channel} conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
