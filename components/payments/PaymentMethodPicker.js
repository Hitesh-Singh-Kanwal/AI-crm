'use client'

import { useEffect, useState } from 'react'
import { Banknote, CreditCard, FileCheck2, Landmark, Link2, MoreHorizontal, Smartphone, Wallet, WalletCards } from 'lucide-react'

// Shared payment-method control — every payment surface (Pay Now balance,
// pay-installment, new enrollment/package, membership assign, event
// purchases) renders this instead of its own <select> so the method picker
// looks and behaves identically everywhere.
const METHOD_ICONS = {
  cash: Banknote,
  cheque: FileCheck2,
  card: CreditCard,
  ach: Landmark,
  terminal: Smartphone,
  wallet: Wallet,
  link: Link2,
  saved_card: WalletCards,
}

// What a studio takes payment by day to day, in this exact order; everything
// else in a caller's `methods` list sits behind "More" instead of crowding the
// default view. A caller's own list still decides what's offered at all — this
// only decides what's shown first, and in what order.
const PRIMARY_ORDER = ['terminal', 'saved_card', 'cash', 'ach']

export default function PaymentMethodPicker({ methods, value, onChange, className }) {
  const primary = PRIMARY_ORDER.map((v) => methods.find((m) => m.value === v)).filter(Boolean)
  const secondary = methods.filter((m) => !PRIMARY_ORDER.includes(m.value))

  // Starts expanded if the current value is already one of the "more" methods
  // (e.g. a draft loaded with method: "cheque") — collapsing it would hide the
  // very button showing what's selected.
  const [expanded, setExpanded] = useState(() => secondary.some((m) => m.value === value))
  useEffect(() => {
    if (secondary.some((m) => m.value === value)) setExpanded(true)
    // Only widening (never re-collapsing) on a value change from outside, so this
    // doesn't fight a staff member who just clicked "More" themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const visible = expanded || secondary.length === 0 ? [...primary, ...secondary] : primary

  return (
    <div
      className={`grid gap-1.5 ${className || ''}`}
      // Fixed at `repeat(methods.length, 1fr)` squeezed every option into one row no
      // matter how many there were — fine at 4-5 methods, unreadable once cheque/ACH
      // pushed it to 7. auto-fill instead sizes columns to a sane minimum and wraps
      // the rest onto new rows, so it stays readable as more methods get added.
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
    >
      {visible.map((m) => {
        const Icon = METHOD_ICONS[m.value]
        const active = value === m.value
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 text-[10.5px] font-medium transition-all ${
              active
                ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-[var(--studio-primary)] shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {m.label}
          </button>
        )
      })}
      {!expanded && secondary.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2.5 text-[10.5px] font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>
      )}
    </div>
  )
}
