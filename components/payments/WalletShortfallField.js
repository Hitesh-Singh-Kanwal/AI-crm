'use client'

import { SHORTFALL_METHODS } from '@/lib/paymentMethods'
import { cn } from '@/lib/utils'

// Paying by Wallet used to be all-or-nothing: the Payment model debits the balance when
// the row is written, so a wallet too small for the amount threw and the payment died.
// Now the wallet pays what it can and a second method covers the difference.

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * How much the wallet pays and what is left. `requested` is an amount staff typed in;
 * left empty, the wallet pays all it can.
 */
export const walletShortfall = (balance, amountDue, requested) => {
  const available = Math.max(0, Number(balance) || 0)
  const due = Math.max(0, Number(amountDue) || 0)
  const asked = requested === undefined || requested === '' ? Infinity : Math.max(0, Number(requested) || 0)
  const walletApplied = round2(Math.min(available, due, asked))
  return { available, due, walletApplied, remaining: round2(due - walletApplied), over: asked !== Infinity && asked > available }
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

/**
 * With `onWalletAmountChange`, staff can set how much the wallet pays (it defaults to all
 * it can); `methods` narrows what may collect the rest.
 */
export default function WalletShortfallField({
  method,
  balance,
  amountDue,
  shortfallMethod,
  onShortfallMethodChange,
  walletAmount,
  onWalletAmountChange,
  methods = SHORTFALL_METHODS,
  className,
}) {
  if (method !== 'wallet') return null

  const editable = Boolean(onWalletAmountChange)
  const { available, due, walletApplied, remaining, over } = walletShortfall(balance, amountDue, editable ? walletAmount : undefined)

  const amountInput = editable && (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="wallet-pay-amount" className="text-[12px] text-muted-foreground">
        From wallet
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
        <input
          id="wallet-pay-amount"
          type="number"
          min="0"
          step="0.01"
          max={Math.min(available, due)}
          value={walletAmount === '' || walletAmount === undefined ? walletApplied.toFixed(2) : walletAmount}
          onChange={(e) => onWalletAmountChange(e.target.value)}
          className="h-8 w-32 rounded-lg border border-border bg-background pl-6 pr-2 text-[13px] tabular-nums outline-none focus:border-primary"
        />
      </div>
      <span className="text-[12px] text-muted-foreground">of ${available.toFixed(2)} available</span>
      {over && <p className="w-full text-[12px] text-destructive">More than the wallet holds.</p>}
    </div>
  )

  if (remaining === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        {amountInput}
        <p className="text-[12px] text-muted-foreground">
          Wallet balance ${available.toFixed(2)} — covers this payment.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2', className)}>
      {amountInput}
      <p className="text-[12px] text-foreground">
        {editable && walletApplied > 0 ? (
          <>
            The wallet pays <span className="font-semibold">${walletApplied.toFixed(2)}</span>.{' '}
          </>
        ) : (
          <>
            The wallet has{' '}
            <span className="font-semibold">${available.toFixed(2)}</span>, which does not cover
            this payment.{' '}
            {walletApplied > 0 && (
              <>
                It will pay <span className="font-semibold">${walletApplied.toFixed(2)}</span>.{' '}
              </>
            )}
          </>
        )}
        Collect the remaining <span className="font-semibold">${remaining.toFixed(2)}</span> by:
      </p>

      <select
        aria-label="Collect the rest by"
        value={shortfallMethod}
        onChange={(e) => onShortfallMethodChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] capitalize outline-none focus:border-primary"
      >
        {methods.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
