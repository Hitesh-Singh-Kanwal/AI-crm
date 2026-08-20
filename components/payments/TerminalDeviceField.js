'use client'

import { useCloverDevices } from '@/app/settings/payments/clover/useCloverDevices'

/**
 * Device picker shown when `method === "terminal"`. Mirrors WalletShortfallField's
 * shape: renders nothing unless relevant, and the parent form reads `deviceID` back
 * out via `onDeviceChange` to include in the /api/payment body.
 *
 * A terminal charge blocks the request until the customer completes it at the
 * device (see backend cloverDevicePayment.service.js) — there is no separate
 * "waiting" screen to poll; the submit button's own loading state covers it.
 */
export default function TerminalDeviceField({ method, locationID, deviceID, onDeviceChange, className }) {
  const { devices, loading } = useCloverDevices(locationID)

  if (method !== 'terminal') return null

  if (!locationID) {
    return (
      <p className={className ?? 'text-[11px] text-muted-foreground'}>
        No location on this customer — a terminal payment needs one.
      </p>
    )
  }

  if (loading) {
    return <p className={className ?? 'text-[11px] text-muted-foreground'}>Loading terminals…</p>
  }

  if (devices.length === 0) {
    return (
      <p className={className ?? 'text-[11px] text-muted-foreground'}>
        No terminals paired for this location. Pair one in Settings → Integrations.
      </p>
    )
  }

  return (
    <select
      value={deviceID || ''}
      onChange={(e) => onDeviceChange(e.target.value)}
      className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-primary"
    >
      <option value="" disabled>
        Select terminal…
      </option>
      {devices.map((d) => (
        <option key={d._id} value={d._id}>
          {d.name || d.deviceId}
        </option>
      ))}
    </select>
  )
}
