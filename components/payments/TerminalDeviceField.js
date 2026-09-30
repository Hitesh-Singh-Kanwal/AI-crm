'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useCloverDevices } from '@/app/settings/payments/clover/useCloverDevices'
import { resolveLocationID } from '@/app/settings/payments/clover/useCloverConnection'

// Staff's "ask for a tip" choice, shared by every payment form so each submit handler can
// spread `terminalTipPayload()` without threading state through. Resets to on on reload.
const tipPref = { ask: true }

/** Spread into a terminal payment payload: only an explicit `promptTip: false` skips the tip screen. */
export function terminalTipPayload() {
  return tipPref.ask ? {} : { promptTip: false }
}

/**
 * Device picker shown when `method === "terminal"`. Lists Clover devices; if the
 * location has none it falls back to registered Stripe Terminal readers. The
 * parent reads `deviceID` back out via `onDeviceChange` (a document id in both
 * cases — the backend resolves it and dispatches to the right processor).
 *
 * The reader runs its own tip screen (configured on the device); whatever the customer
 * taps arrives on the PaymentIntent and is booked as its own Tip record at settlement.
 * The checkbox only lets staff turn that screen off for a payment (Stripe readers).
 */
export default function TerminalDeviceField({
  method,
  locationID,
  deviceID,
  onDeviceChange,
  className,
}) {
  const { devices, loading } = useCloverDevices(locationID)
  const resolved = resolveLocationID(locationID)
  const [stripeReaders, setStripeReaders] = useState(null)
  const [askTip, setAskTip] = useState(tipPref.ask)

  useEffect(() => {
    if (method !== 'terminal' || !resolved || (devices && devices.length > 0)) { setStripeReaders(null); return }
    let cancelled = false
    api.get(`/api/payments/stripe/readers?locationID=${encodeURIComponent(resolved)}`).then((res) => {
      if (!cancelled) setStripeReaders(res.success && Array.isArray(res.data) ? res.data : [])
    })
    return () => { cancelled = true }
  }, [method, resolved, devices])

  const options = devices.length > 0
    ? devices.map((d) => ({ id: d._id, label: d.name || d.deviceId }))
    : (stripeReaders || []).map((r) => ({ id: r._id, label: r.label || r.readerId }))

  // One terminal is not a choice — preselect it so staff are not made to pick the only
  // option. Runs only while nothing is chosen, so it never overrides a selection.
  useEffect(() => {
    if (method === 'terminal' && options.length === 1 && !deviceID) onDeviceChange(options[0].id)
  }, [method, options, deviceID, onDeviceChange])

  if (method !== 'terminal') return null

  const note = className ?? 'text-[11px] text-muted-foreground'

  if (!resolved) return <p className={note}>No location on this customer — a terminal payment needs one.</p>
  if (loading) return <p className={note}>Loading terminals…</p>

  if (options.length === 0) {
    return (
      <p className={note}>
        {stripeReaders === null ? 'Loading terminals…' : 'No terminals paired for this location. Pair one in Settings → Integrations.'}
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <select
        value={deviceID || ''}
        onChange={(e) => onDeviceChange(e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-primary"
      >
        <option value="" disabled>Select terminal…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={askTip}
          onChange={(e) => { tipPref.ask = e.target.checked; setAskTip(e.target.checked) }}
        />
        Ask customer for a tip on the reader
      </label>
    </div>
  )
}
