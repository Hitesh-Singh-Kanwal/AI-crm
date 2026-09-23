'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Link2, Loader2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import SearchableSelect from '@/components/ui/searchable-select'
import PaymentMethodPicker from '@/components/payments/PaymentMethodPicker'
import TerminalDeviceField from '@/components/payments/TerminalDeviceField'
import LessonSlotPicker, { slotWallTimesToUtcRange } from '@/components/calendar/LessonSlotPicker'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useStudioTimezone } from '@/lib/hooks/useStudioTimezone'
import api from '@/lib/api'

const SHEET_WIDTH = '560px'

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

function locationMatches(service, locationID) {
  if (!locationID) return true
  const locs = Array.isArray(service.locationID) ? service.locationID : [service.locationID]
  return locs.some((l) => String(l?._id || l) === String(locationID))
}

export default function SellIntroSheet({ open, onClose, onSuccess }) {
  const toast = useToast()
  const studioTz = useStudioTimezone()

  const [leadOptions, setLeadOptions] = useState([])
  const [selectedLeadID, setSelectedLeadID] = useState('')
  const [introCatalog, setIntroCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [selectedIntroID, setSelectedIntroID] = useState('')
  const [method, setMethod] = useState('link')
  const [channel, setChannel] = useState('sms')
  const [deviceID, setDeviceID] = useState('')
  const [includeSlot, setIncludeSlot] = useState(false)
  const [teacherOptions, setTeacherOptions] = useState([])
  const [teacherID, setTeacherID] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [durationMins, setDurationMins] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const selectedLead = useMemo(
    () => leadOptions.find((l) => l.value === selectedLeadID) || null,
    [leadOptions, selectedLeadID],
  )
  const locationID = selectedLead?.locationID || null

  const locationIntros = useMemo(
    () =>
      introCatalog.filter(
        (s) =>
          s.isActive !== false &&
          locationMatches(s, locationID) &&
          Number(s.price) > 0 &&
          s.isChargeable !== false,
      ),
    [introCatalog, locationID],
  )

  const selectedIntro = useMemo(
    () => locationIntros.find((s) => String(s._id) === String(selectedIntroID)) || null,
    [locationIntros, selectedIntroID],
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')
    setResult(null)
    setSelectedLeadID('')
    setSelectedIntroID('')
    setMethod('link')
    setChannel('sms')
    setDeviceID('')
    setIncludeSlot(false)
    setTeacherID('')
    setSlotDate('')
    setSelectedSlot(null)
    setSubmitting(false)

    async function load() {
      setCatalogLoading(true)
      const [leadsRes, introsRes, teachersRes, locationsRes] = await Promise.all([
        api.get('/api/lead?limit=200&page=1'),
        api.get('/api/calendar-service?type=intro&limit=200'),
        api.get('/api/teacher?limit=200&status=active'),
        api.get('/api/location?limit=50'),
      ])
      if (cancelled) return

      if (leadsRes?.success && Array.isArray(leadsRes.data)) {
        setLeadOptions(
          leadsRes.data.map((lead) => {
            const loc = lead.locationID
            const locId = Array.isArray(loc)
              ? loc[0]?._id || loc[0] || null
              : loc?._id || loc || null
            return {
              value: String(lead._id ?? lead.id),
              label: [lead.name || 'Unnamed lead', lead.phoneNumber || lead.email || null]
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

      if (introsRes?.success && Array.isArray(introsRes.data)) {
        setIntroCatalog(introsRes.data)
      } else {
        setIntroCatalog([])
      }

      if (teachersRes?.success && Array.isArray(teachersRes.data)) {
        setTeacherOptions(
          teachersRes.data.map((t) => ({
            value: String(t._id ?? t.id),
            label: t.name || t.email || String(t._id),
          })),
        )
      } else {
        setTeacherOptions([])
      }

      if (locationsRes?.success && Array.isArray(locationsRes.data)) {
        const loc = locationsRes.data.find((l) => String(l._id) === String(locationID)) || locationsRes.data[0]
        const mins = Number(loc?.defaultLessonMinutes)
        if (Number.isFinite(mins) && mins >= 15) setDurationMins(mins)
      }

      setCatalogLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps -- reset+load on open only

  useEffect(() => {
    if (!selectedIntroID) return
    if (!locationIntros.some((s) => String(s._id) === String(selectedIntroID))) {
      setSelectedIntroID('')
    }
  }, [locationIntros, selectedIntroID])

  function handleClose() {
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
    if (!selectedIntro) {
      setError('Select an intro from Setup before selling.')
      return
    }
    if (!(Number(selectedIntro.price) > 0) || selectedIntro.isChargeable === false) {
      setError('That intro is not chargeable. Fix the price in Settings → Setup → Intro.')
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

    let slotPayload
    if (includeSlot) {
      if (!teacherID || !slotDate || !selectedSlot) {
        setError('Pick a teacher, date, and time slot, or turn off “Hold a slot”.')
        return
      }
      const range = slotWallTimesToUtcRange(slotDate, selectedSlot, studioTz)
      if (!range) {
        setError('Could not resolve the selected slot time.')
        return
      }
      slotPayload = {
        startDateTime: range.startDateTime,
        endDateTime: range.endDateTime,
        calendarServiceID: selectedIntro._id,
        serviceType: selectedIntro.serviceName,
        teacherID,
      }
    }

    setError('')
    setSubmitting(true)
    setResult(null)

    const body = {
      leadID: selectedLeadID,
      calendarServiceID: selectedIntro._id,
      amount: Number(selectedIntro.price),
      description: selectedIntro.serviceName,
      method,
      ...(method === 'link' ? { channel } : {}),
      ...(method === 'terminal' ? { billing: { deviceID } } : {}),
      ...(slotPayload ? { slot: slotPayload } : {}),
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

      if (method === 'link') toast.success('Payment link sent to lead.')
      else if (method === 'cash') toast.success('Trial sold — cash collected.')
      else if (method === 'card') toast.success('Checkout opened — complete payment on the card page.')
      else if (data.pending) toast.success('Charge sent to the reader — waiting for the card.')
      else toast.success('Trial sold — terminal payment collected.')

      onSuccess?.(data)
    } catch (err) {
      setError(err?.message || 'Failed to sell the intro.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={handleClose} width={SHEET_WIDTH}>
      <SheetContent onClose={handleClose} className="flex flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b border-border bg-muted/30 px-5 pt-5 pb-3">
          <p className="text-[14px] font-bold text-foreground">Sell Trial / Intro</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Sell a Setup intro to a lead — share a payment link or collect cash, card, or terminal in person.
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
                    Current stage:{' '}
                    <span className="font-medium text-foreground">{selectedLead.stage}</span>
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">Intro</p>
                {catalogLoading ? (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading intros…
                  </p>
                ) : locationIntros.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    No chargeable intros for this location. Create one in{' '}
                    <Link
                      href="/settings/setup"
                      className="font-medium text-[var(--studio-primary)] hover:underline"
                    >
                      Settings → Setup → Services → Intro
                    </Link>{' '}
                    first.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {locationIntros.map((intro) => {
                      const isSelected = String(intro._id) === String(selectedIntroID)
                      return (
                        <button
                          key={intro._id}
                          type="button"
                          onClick={() => setSelectedIntroID(String(intro._id))}
                          className={[
                            'flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-colors',
                            isSelected
                              ? 'border-brand bg-brand/10'
                              : 'border-border bg-background hover:bg-muted/40',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {intro.color && (
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ background: intro.color }}
                              />
                            )}
                            <span className="text-[12px] font-medium truncate">
                              {intro.serviceName}
                            </span>
                          </div>
                          <span className="text-[12px] font-semibold shrink-0 ml-2">
                            ${Number(intro.price).toFixed(2)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {selectedIntro && (
                  <p className="text-[11px] text-muted-foreground">
                    Price locked from Setup — staff cannot override.
                  </p>
                )}
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
                      if (!e.target.checked) {
                        setSelectedSlot(null)
                        setTeacherID('')
                        setSlotDate('')
                      }
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
                    ) : !selectedIntro ? (
                      <p className="text-[11px] text-muted-foreground">
                        Select an intro above before picking a slot.
                      </p>
                    ) : (
                      <LessonSlotPicker
                        teacherOptions={teacherOptions}
                        teacherID={teacherID}
                        onTeacherChange={setTeacherID}
                        date={slotDate}
                        onDateChange={setSlotDate}
                        selectedSlot={selectedSlot}
                        onSlotChange={setSelectedSlot}
                        durationMins={durationMins}
                        slotStepMins={durationMins}
                        studioTz={studioTz}
                      />
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
