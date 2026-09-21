'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Link2, Loader2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import SearchableSelect from '@/components/ui/searchable-select'
import PaymentMethodPicker from '@/components/payments/PaymentMethodPicker'
import TerminalDeviceField from '@/components/payments/TerminalDeviceField'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

const SHEET_WIDTH = '560px'
const DEFAULT_AMOUNT = 49
const DEFAULT_DESCRIPTION = 'Intro Lesson'

const INTRO_PAYMENT_METHODS = [
  { value: 'link', label: 'Share Link' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'terminal', label: 'Terminal' },
]

const LINK_CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'both', label: 'Both' },
]

function formatSlotTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function groupSlotsByDay(slots) {
  const groups = []
  const map = new Map()
  for (const slot of slots || []) {
    const dayKey = new Date(slot.start).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (!map.has(dayKey)) {
      const g = { dayKey, slots: [] }
      map.set(dayKey, g)
      groups.push(g)
    }
    map.get(dayKey).slots.push(slot)
  }
  return groups
}

export default function SellIntroSheet({ open, onClose, onSuccess }) {
  const toast = useToast()
  const [leadOptions, setLeadOptions] = useState([])
  const [selectedLeadID, setSelectedLeadID] = useState('')
  const [amount, setAmount] = useState(String(DEFAULT_AMOUNT))
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION)
  const [method, setMethod] = useState('link')
  const [channel, setChannel] = useState('sms')
  const [deviceID, setDeviceID] = useState('')
  const [availSlots, setAvailSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [includeSlot, setIncludeSlot] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const selectedLead = useMemo(
    () => leadOptions.find((l) => l.value === selectedLeadID) || null,
    [leadOptions, selectedLeadID],
  )

  const locationID = selectedLead?.locationID || null

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadLeads() {
      setError('')
      setResult(null)
      const res = await api.get('/api/lead?limit=200&page=1')
      if (cancelled) return
      if (res?.success && Array.isArray(res.data)) {
        setLeadOptions(
          res.data.map((lead) => {
            const loc = lead.locationID
            const locId = Array.isArray(loc)
              ? loc[0]?._id || loc[0] || null
              : loc?._id || loc || null
            return {
              value: String(lead._id ?? lead.id),
              label: [
                lead.name || 'Unnamed lead',
                lead.phoneNumber || lead.email || null,
              ]
                .filter(Boolean)
                .join(' · '),
              locationID: locId ? String(locId) : null,
              phoneNumber: lead.phoneNumber || null,
              email: lead.email || null,
              stage: lead.stage || null,
            }
          }),
        )
      } else {
        setLeadOptions([])
      }
    }

    loadLeads()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !includeSlot || !locationID) {
      setAvailSlots([])
      setSelectedSlot(null)
      return
    }
    let cancelled = false
    setSlotsLoading(true)
    setSelectedSlot(null)
    api
      .get(`/api/calendar/availability?locationID=${locationID}&days=14&maxSlots=20`)
      .then((res) => {
        if (cancelled) return
        if (res.success) setAvailSlots(res.data?.slots || res.data || [])
        else setAvailSlots([])
      })
      .catch(() => {
        if (!cancelled) setAvailSlots([])
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, includeSlot, locationID])

  function handleClose() {
    setSelectedLeadID('')
    setAmount(String(DEFAULT_AMOUNT))
    setDescription(DEFAULT_DESCRIPTION)
    setMethod('link')
    setChannel('sms')
    setDeviceID('')
    setIncludeSlot(false)
    setSelectedSlot(null)
    setAvailSlots([])
    setError('')
    setResult(null)
    setSubmitting(false)
    onClose?.()
  }

  async function handleSubmit() {
    if (!selectedLeadID) {
      setError('Please select a lead.')
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (!String(description || '').trim()) {
      setError('Description is required.')
      return
    }
    if (method === 'link') {
      if (channel !== 'email' && !selectedLead?.phoneNumber) {
        setError('This lead has no phone number — pick Email or add a phone first.')
        return
      }
      if (channel !== 'sms' && !selectedLead?.email) {
        setError('This lead has no email — pick SMS or add an email first.')
        return
      }
    }
    if (method === 'terminal' && !deviceID) {
      setError('Select a terminal to charge.')
      return
    }
    if (includeSlot && !selectedSlot) {
      setError('Pick a time slot, or turn off “Hold a slot”.')
      return
    }

    setError('')
    setSubmitting(true)
    setResult(null)

    const body = {
      leadID: selectedLeadID,
      amount: amt,
      description: String(description).trim(),
      method,
      ...(method === 'link' ? { channel } : {}),
      ...(method === 'terminal' ? { billing: { deviceID } } : {}),
      ...(includeSlot && selectedSlot
        ? {
            slot: {
              startDateTime: selectedSlot.start,
              endDateTime: selectedSlot.end,
              serviceType: description.trim() || 'Intro Lesson',
            },
          }
        : {}),
    }

    try {
      const res = await api.post('/api/payment-request/lead', body)
      if (!res?.success) {
        setError(res?.error || 'Failed to sell the intro.')
        setSubmitting(false)
        return
      }

      const data = res.data || {}
      setResult({
        method,
        message: res.message || 'Done',
        checkoutUrl: data.checkoutUrl || null,
        customerID: data.customerID || null,
        pending: Boolean(data.pending),
      })

      if (method === 'link') {
        toast.success('Payment link sent to lead.')
      } else if (method === 'cash') {
        toast.success('Trial sold — cash collected.')
      } else if (method === 'card') {
        toast.success('Checkout opened — complete payment on the card page.')
      } else if (data.pending) {
        toast.success('Charge sent to the reader — waiting for the card.')
      } else {
        toast.success('Trial sold — terminal payment collected.')
      }

      onSuccess?.(data)
    } catch (err) {
      setError(err?.message || 'Failed to sell the intro.')
    } finally {
      setSubmitting(false)
    }
  }

  const slotGroups = groupSlotsByDay(availSlots)

  return (
    <Sheet open={open} onClose={handleClose} width={SHEET_WIDTH}>
      <SheetContent onClose={handleClose} className="flex flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b border-border bg-muted/30 px-5 pt-5 pb-3">
          <p className="text-[14px] font-bold text-foreground">Sell Trial / Intro</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Sell a first lesson to a lead — share a payment link or collect cash, card, or terminal in person.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {result ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
              <p className="text-[13px] font-semibold text-foreground">{result.message}</p>
              {result.checkoutUrl && (
                <a
                  href={result.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--studio-primary)] hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Open checkout page
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {result.customerID && (
                <Link
                  href={`/settings/users-roles/customers/${result.customerID}`}
                  className="block text-[12px] font-medium text-[var(--studio-primary)] hover:underline"
                  onClick={handleClose}
                >
                  View customer profile →
                </Link>
              )}
              {result.pending && (
                <p className="text-[12px] text-muted-foreground">
                  Waiting for the customer to tap their card on the reader. The lead will convert once payment clears.
                </p>
              )}
              <div className="pt-1">
                <Button type="button" size="sm" variant="outline" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Lead</p>
                <SearchableSelect
                  value={selectedLeadID}
                  onChange={setSelectedLeadID}
                  options={leadOptions}
                  placeholder="Select lead…"
                />
                {selectedLead?.stage && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Current stage: <span className="font-medium text-foreground">{selectedLead.stage}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">Amount ($)</p>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  />
                </div>
                <div className="rounded-xl border border-border bg-card p-3 col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">Description</p>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                    placeholder="Intro Lesson"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                <p className="text-[11px] font-medium text-muted-foreground">Payment</p>
                <PaymentMethodPicker
                  methods={INTRO_PAYMENT_METHODS}
                  value={method}
                  onChange={(v) => {
                    setMethod(v)
                    setDeviceID('')
                  }}
                />

                {method === 'link' && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Send via</p>
                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                      {LINK_CHANNELS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setChannel(c.value)}
                          className={[
                            'h-8 px-3 rounded-md text-[12px] font-medium transition-colors',
                            channel === c.value
                              ? 'bg-brand text-brand-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          ].join(' ')}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {method === 'terminal' && (
                  <TerminalDeviceField
                    method="terminal"
                    locationID={locationID}
                    deviceID={deviceID}
                    onDeviceChange={setDeviceID}
                  />
                )}

                {method === 'card' && (
                  <p className="text-[11px] text-muted-foreground">
                    Opens a hosted checkout page you can show the lead (or share) while they&apos;re here.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                <label className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={includeSlot}
                    onChange={(e) => {
                      setIncludeSlot(e.target.checked)
                      if (!e.target.checked) setSelectedSlot(null)
                    }}
                  />
                  Hold a time slot (optional)
                </label>
                {includeSlot && (
                  <>
                    {!locationID ? (
                      <p className="text-[11px] text-muted-foreground">
                        This lead has no location — assign one before holding a slot.
                      </p>
                    ) : slotsLoading ? (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading available times…
                      </p>
                    ) : slotGroups.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">No open slots in the next 14 days.</p>
                    ) : (
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {slotGroups.map((g) => (
                          <div key={g.dayKey}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              {g.dayKey}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {g.slots.map((slot) => {
                                const active =
                                  selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
                                return (
                                  <button
                                    key={`${slot.start}-${slot.end}`}
                                    type="button"
                                    onClick={() => setSelectedSlot(slot)}
                                    className={[
                                      'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                                      active
                                        ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                                        : 'border-border bg-background text-foreground hover:border-foreground/30',
                                    ].join(' ')}
                                  >
                                    {formatSlotTime(slot.start).replace(/^.*,\s*/, '')}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedSlot && (
                      <p className="text-[11px] text-muted-foreground">
                        Selected: <span className="font-medium text-foreground">{formatSlotTime(selectedSlot.start)}</span>
                      </p>
                    )}
                  </>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12px] text-destructive">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!result && (
          <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Working…
                </>
              ) : method === 'link' ? (
                'Send payment link'
              ) : method === 'cash' ? (
                'Collect cash'
              ) : method === 'card' ? (
                'Open card checkout'
              ) : (
                'Charge terminal'
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
