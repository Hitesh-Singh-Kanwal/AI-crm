'use client'

/**
 * Free-text check number, shown when `method === "cheque"`. Optional — a studio
 * that doesn't bother tracking it can still record the payment — but capturing
 * it is what lets staff match a bank's bounced-cheque notice back to the right
 * Payment row later (see the "Mark bounced" action on PaymentTimeline).
 */
export default function CheckNumberField({ method, checkNumber, onChange, className }) {
  if (method !== 'cheque') return null

  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Check number
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={checkNumber || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 1042"
        className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-primary"
      />
    </div>
  )
}
