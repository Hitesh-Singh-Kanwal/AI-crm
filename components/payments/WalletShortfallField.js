'use client'

import { SHORTFALL_METHODS } from '@/lib/paymentMethods'
import { cn } from '@/lib/utils'

// Paying by Wallet used to be all-or-nothing: the Payment model debits the balance when
// the row is written, so a wallet too small for the amount threw and the payment died.
// Now the wallet pays what it can and a second method covers the difference.

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export const walletShortfall = (balance, amountDue) => {
  const available = Math.max(0, Number(balance) || 0)
  const due = Math.max(0, Number(amountDue) || 0)
  const walletApplied = round2(Math.min(available, due))
  return { available, due, walletApplied, remaining: round2(due - walletApplied) }
}

/** True when Wallet is the chosen method but the balance cannot cover the amount. */
export const isWalletShort = (method, balance, amountDue) =>
  method === 'wallet' && walletShortfall(balance, amountDue).remaining > 0

/**
 * What to send to /api/payment or pay-installment.
 *
 * A wallet that covers the amount is recorded exactly as before — one wallet payment,
 * no walletAmount. Only a shortfall splits: the wallet pays all it can and `method`
 * becomes the method that collects the rest.
 */
export function walletPaymentFields({ method, shortfallMethod, balance, amountDue }) {
  if (method !== 'wallet') return { method }

  const { walletApplied, remaining } = walletShortfall(balance, amountDue)
  if (remaining === 0) return { method: 'wallet' }

  return { method: shortfallMethod, walletAmount: walletApplied }
}

export default function WalletShortfallField({
  method,
  balance,
  amountDue,
  shortfallMethod,
  onShortfallMethodChange,
  className,
}) {
  if (method !== 'wallet') return null

  const { available, walletApplied, remaining } = walletShortfall(balance, amountDue)
  if (remaining === 0) {
    return (
      <p className={cn('text-[12px] text-muted-foreground', className)}>
        Wallet balance ${available.toFixed(2)} — covers this payment.
      </p>
    )
  }

  return (
    <div className={cn('rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2', className)}>
      <p className="text-[12px] text-foreground">
        The wallet has{' '}
        <span className="font-semibold">${available.toFixed(2)}</span>, which does not cover
        this payment.{' '}
        {walletApplied > 0 && (
          <>
            It will pay <span className="font-semibold">${walletApplied.toFixed(2)}</span>.{' '}
          </>
        )}
        Collect the remaining <span className="font-semibold">${remaining.toFixed(2)}</span> by:
      </p>

      <select
        value={shortfallMethod}
        onChange={(e) => onShortfallMethodChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] capitalize outline-none focus:border-primary"
      >
        {SHORTFALL_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
