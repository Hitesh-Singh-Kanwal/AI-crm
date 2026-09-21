'use client'

import { Banknote, CreditCard, Link2, Smartphone, Wallet, WalletCards } from 'lucide-react'

// Shared payment-method control — every payment surface (Pay Now balance,
// pay-installment, new enrollment/package, membership assign, event
// purchases) renders this instead of its own <select> so the method picker
// looks and behaves identically everywhere.
const METHOD_ICONS = {
  cash: Banknote,
  card: CreditCard,
  terminal: Smartphone,
  wallet: Wallet,
  link: Link2,
  saved_card: WalletCards,
}

export default function PaymentMethodPicker({ methods, value, onChange, className }) {
  return (
    <div
      className={`grid gap-1.5 ${className || ''}`}
      style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }}
    >
      {methods.map((m) => {
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
    </div>
  )
}
