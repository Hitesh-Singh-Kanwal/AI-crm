'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCardProcessor } from '@/app/settings/payments/useCardProcessor'
import { openCheckoutTab, navigateCheckoutTab, closeCheckoutTab, CHECKOUT_TOAST } from '@/lib/clover'

import { PURCHASE_METHODS } from '@/lib/paymentMethods'

function todayISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

// Shared membership-assignment form. Used inside the customer Memberships tab and
// the enroll menu's Membership tab.
export default function AssignMembershipForm({ customerID, locationID, onSuccess, onCancel }) {
  const [templates, setTemplates] = useState([])
  const [membershipID, setMembershipID] = useState('')
  const [billingType, setBillingType] = useState('one_time')
  const [method, setMethod] = useState('cash')
  // Flexible billing — same "initial payment + future payments" builder as
  // enrollments/events so staff see one consistent flow everywhere.
  const [flexInitialAmount, setFlexInitialAmount] = useState('0')
  const [flexInitialDate, setFlexInitialDate] = useState(todayISO())
  const [flexFuturePayments, setFlexFuturePayments] = useState([{ _key: 'fp-0', dueDate: '', amount: '' }])
  const [collectInitialNow, setCollectInitialNow] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [walletBalance, setWalletBalance] = useState(null)
  const [useWallet, setUseWallet] = useState(false)
  const [walletAmount, setWalletAmount] = useState('')
  const { ready: cloverReady } = useCardProcessor(locationID)

  useEffect(() => {
    api.get('/api/membership?isActive=true&limit=200').then((res) => {
      if (res.success) setTemplates(Array.isArray(res.data) ? res.data : [])
    })
  }, [])

  useEffect(() => {
    if (!customerID) { setWalletBalance(null); return }
    api.get(`/api/wallet/${customerID}/balance`).then((res) => {
      if (res.success) setWalletBalance(Number(res.data?.balance ?? 0))
    })
  }, [customerID])

  const selected = templates.find((t) => t._id === membershipID)
  const price = Number(selected?.price ?? 0)

  // How much of the one-time price is paid from the wallet vs. the chosen method.
  const walletEligible = billingType === 'one_time' && useWallet && walletBalance != null
  const walletEntered = walletEligible ? Number(walletAmount) || 0 : 0
  const walletApplied = Math.min(walletEntered, price, walletBalance ?? 0)
  const remaining = Math.max(0, price - walletApplied)
  const walletOver = walletEligible && walletEntered > (walletBalance ?? 0)

  const flexInitialAmountN = Number(flexInitialAmount || 0)
  const flexFutureTotal = flexFuturePayments.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const flexAmountLeftToSchedule = price - flexInitialAmountN - flexFutureTotal
  const flexBalanced = Math.abs(flexAmountLeftToSchedule) < 0.01
  const collectingFlexInitial = billingType === 'flexible' && flexInitialAmountN > 0 && collectInitialNow

  // One-time card purchases, and a flexible schedule's collected-now initial
  // payment, settle through Clover's hosted page; everything else (cash,
  // wallet, future-dated installments) is recorded directly.
  const payWithClover =
    ((billingType === 'one_time' && remaining > 0) || collectingFlexInitial) && method === 'card' && cloverReady
  const cloverNotConnected =
    ((billingType === 'one_time' && remaining > 0) || collectingFlexInitial) && method === 'card' && !cloverReady

  // Adding/removing a row (or changing the initial payment) changes how many
  // ways the remaining balance splits, so re-spread it evenly across all rows
  // rather than leaving a stray $0 box or a stale amount.
  function splitFlexEvenly(rows, remaining) {
    const base = rows.length ? Math.floor((remaining / rows.length) * 100) / 100 : 0
    return rows.map((r, i) => ({
      ...r,
      amount: (i === rows.length - 1 ? Number((remaining - base * (rows.length - 1)).toFixed(2)) : base).toFixed(2),
    }))
  }
  function updateFlexInitialAmount(value) {
    setFlexInitialAmount(value)
    setFlexFuturePayments((prev) => splitFlexEvenly(prev, price - (Number(value) || 0)))
  }
  function addFlexFuturePayment() {
    setFlexFuturePayments((prev) => {
      const rows = [...prev, { _key: String(Date.now() + Math.random()), dueDate: '', amount: '' }]
      return splitFlexEvenly(rows, price - flexInitialAmountN)
    })
  }
  function updateFlexFuturePayment(key, field, value) {
    setFlexFuturePayments((prev) => {
      if (field !== 'amount') return prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
      const remaining = price - flexInitialAmountN
      const leftover = Math.max(0, remaining - (Number(value) || 0))
      const otherRows = prev.filter((r) => r._key !== key)
      const splitOthers = splitFlexEvenly(otherRows, leftover)
      return prev.map((r) => (r._key === key ? { ...r, amount: value } : splitOthers.find((o) => o._key === r._key)))
    })
  }
  function removeFlexFuturePayment(key) {
    setFlexFuturePayments((prev) => {
      const rows = prev.filter((r) => r._key !== key)
      return splitFlexEvenly(rows, price - flexInitialAmountN)
    })
  }

  async function handleSubmit() {
    if (!customerID) { toast.error('Select a student first'); return }
    if (!membershipID) { toast.error('Select a membership'); return }
    if (walletOver) {
      toast.error('Insufficient wallet balance', { description: `Wallet has $${walletBalance.toFixed(2)} but you entered $${walletEntered.toFixed(2)}.` })
      return
    }

    const billing = {}
    if (billingType === 'one_time') {
      billing.method = method
      if (walletApplied > 0) billing.walletAmount = walletApplied
    }
    else if (billingType === 'flexible') {
      if (!flexBalanced) {
        toast.error(`Amount left to schedule is $${flexAmountLeftToSchedule.toFixed(2)} — it must be $0 before saving.`)
        return
      }
      if (flexInitialAmountN > 0 && !flexInitialDate) { toast.error('Please set the initial payment date'); return }
      const futureRows = flexFuturePayments.filter((c) => Number(c.amount) > 0)
      if (futureRows.some((c) => !c.dueDate)) { toast.error('Every future payment needs a due date'); return }

      const scheduleRows = [
        ...(flexInitialAmountN > 0 ? [{ dueDate: flexInitialDate, amount: flexInitialAmountN }] : []),
        ...futureRows.map((c) => ({ dueDate: c.dueDate, amount: Number(c.amount) })),
      ]
      if (scheduleRows.length === 0) { toast.error('Add at least one payment'); return }

      billing.customInstallments = scheduleRows
      billing.method = method
      if (flexInitialAmountN > 0) billing.collectNow = collectInitialNow
    }

    const checkoutTab = payWithClover ? openCheckoutTab() : null
    setSubmitting(true)
    try {
      const result = await api.post('/api/customer-membership', {
        customerID,
        membershipID,
        billingType,
        billing,
        notes: notes.trim() || undefined,
      })
      if (result.success) {
        if (result.data?.checkoutUrl) {
          navigateCheckoutTab(checkoutTab, result.data.checkoutUrl)
          toast.success(CHECKOUT_TOAST)
        } else {
          closeCheckoutTab(checkoutTab)
          toast.success('Membership assigned')
        }
        onSuccess?.()
      } else {
        closeCheckoutTab(checkoutTab)
        toast.error('Failed to assign membership', { description: result.error })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <Label>Membership *</Label>
        <select
          value={membershipID}
          onChange={(e) => setMembershipID(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Select a membership…</option>
          {templates.map((t) => (
            <option key={t._id} value={t._id}>
              {t.membershipName} — ${Number(t.price ?? 0).toFixed(2)} / {t.durationDays}d
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{selected.membershipName}</span>
            <span className="text-sm font-semibold text-foreground">${Number(selected.price ?? 0).toFixed(2)}</span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">
            {selected.durationDays} days · {selected.autoRenew ? 'auto-renews' : 'no auto-renew'}
          </p>
          <div className="space-y-1.5">
            {(selected.services || []).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color || '#6366f1' }} />
                <span className="text-foreground">{s.serviceName}</span>
                <span className="ml-auto text-muted-foreground">
                  {s.accessType === 'unlimited' ? 'Unlimited' : `${s.numberOfSessions} sessions`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Billing</Label>
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5 w-fit">
          {[
            { v: 'one_time', label: 'One-time' },
            { v: 'flexible', label: 'Flexible' },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setBillingType(opt.v)}
              className={[
                'h-8 px-3 rounded-md text-[12px] font-medium transition-colors',
                billingType === opt.v ? 'bg-brand text-brand-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {billingType === 'one_time' && (
        <div className="space-y-3">
          {walletBalance != null && walletBalance > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-[12px] font-medium text-foreground">
                  Use wallet balance
                  <span className="text-muted-foreground font-normal"> (${walletBalance.toFixed(2)} available)</span>
                </span>
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => {
                    setUseWallet(e.target.checked)
                    setWalletAmount(e.target.checked ? String(Math.min(price, walletBalance).toFixed(2)) : '')
                  }}
                  className="h-4 w-4 accent-brand"
                />
              </label>
              {useWallet && (
                <>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={Math.min(price, walletBalance)}
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      className="h-8 pl-5"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">From wallet</span>
                    <span className="font-medium text-foreground">${walletApplied.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Remaining ({method})</span>
                    <span className="font-semibold text-foreground">${remaining.toFixed(2)}</span>
                  </div>
                  {walletOver && (
                    <p className="text-[10px] text-destructive">Amount exceeds wallet balance.</p>
                  )}
                </>
              )}
            </div>
          )}

          {remaining > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>{walletApplied > 0 ? 'Remaining payment method' : 'Payment Method'}</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 capitalize"
              >
                {PURCHASE_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

        </div>
      )}

      {billingType === 'flexible' && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-1">
            This arrangement will be included in the student agreement — get it right here, it can&apos;t be changed on the payment step.
          </p>

          {/* Initial payment */}
          <div className="flex flex-col gap-1.5">
            <Label>Initial payment <span className="font-normal text-muted-foreground">(optional — enter $0 if none)</span></Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min="0" max={price} step="0.01" placeholder="0.00" value={flexInitialAmount} onChange={(e) => updateFlexInitialAmount(e.target.value)} />
              <Input type="date" value={flexInitialDate} onChange={(e) => setFlexInitialDate(e.target.value)} />
            </div>
          </div>

          {/* Future payments */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
            <Label>Future payments</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              One row is the remaining balance's single due date. Add more to split it into a schedule.
            </p>
            <div className="flex flex-col gap-1.5">
              {flexFuturePayments.map((r, i) => (
                <div key={r._key} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                  <Input type="date" value={r.dueDate} onChange={(e) => updateFlexFuturePayment(r._key, 'dueDate', e.target.value)} className="flex-1" />
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={r.amount} onChange={(e) => updateFlexFuturePayment(r._key, 'amount', e.target.value)} className="w-28" />
                  <button type="button" onClick={() => removeFlexFuturePayment(r._key)} disabled={flexFuturePayments.length === 1}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove payment">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addFlexFuturePayment}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 h-8 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-brand/50">
              <Plus className="h-3.5 w-3.5" /> Add another payment
            </button>
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Amount left to schedule</span>
              <span className={`text-sm font-semibold ${flexBalanced ? 'text-success' : 'text-destructive'}`}>${flexAmountLeftToSchedule.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Membership Price</span>
              <span className="text-sm font-bold">${price.toFixed(2)}</span>
            </div>
            {!flexBalanced && (
              <p className="text-[11px] text-destructive">Initial payment plus future payments must add up to the membership price.</p>
            )}
          </div>

          {flexInitialAmountN > 0 && (
            <div className="flex flex-col gap-3 pt-2 border-t border-border">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={collectInitialNow} onChange={(e) => setCollectInitialNow(e.target.checked)} />
                Collect the initial payment now (${flexInitialAmountN.toFixed(2)})
              </label>
              {collectInitialNow && (
                <div className="flex flex-col gap-1.5">
                  <Label>Payment Method</Label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 capitalize"
                  >
                    {PURCHASE_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="h-9" />
      </div>

      <div className="flex flex-col gap-1.5 pt-2">
        {cloverNotConnected && (
          <p className="text-[11px] text-amber-600 text-right">Connect a card processor (Clover or Stripe) in Settings → Integrations to charge a card.</p>
        )}
        <div className="flex justify-end gap-2">
          {onCancel && <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>}
          <Button onClick={() => handleSubmit()} disabled={submitting || walletOver || cloverNotConnected || (billingType === 'flexible' && !flexBalanced)} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            {submitting ? 'Assigning…' : payWithClover ? 'Pay by card' : 'Assign Membership'}
          </Button>
        </div>
      </div>
    </div>
  )
}
