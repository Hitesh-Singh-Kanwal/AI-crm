'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RotateCcw, X, Infinity as InfinityIcon } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import GlobalLoader from '@/components/shared/GlobalLoader'
import AssignMembershipForm from './AssignMembershipForm'

const PAYMENT_METHODS = ['cash', 'card', 'online', 'cheque', 'other']

const STATUS_COLORS = {
  active: 'bg-emerald-500/10 text-emerald-600',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-500/10 text-red-600',
}
const PAYMENT_STATUS_COLORS = {
  paid: 'bg-emerald-500/10 text-emerald-600',
  partial: 'bg-amber-500/10 text-amber-600',
  unpaid: 'bg-red-500/10 text-red-600',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PayInstallmentDialog({ target, onClose, onPaid }) {
  const [method, setMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  if (!target) return null
  const { plan, index } = target
  const inst = plan.installments[index]

  async function handlePay() {
    setPaying(true)
    try {
      const r = await api.post(`/api/payment-plan/${plan._id}/pay-installment`, { installmentIndex: index, method })
      if (r.success) { toast.success('Installment paid'); onPaid() }
      else toast.error('Payment failed', { description: r.error })
    } finally { setPaying(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[61] w-[360px] rounded-xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="text-sm font-semibold text-foreground mb-1">Record Payment</h3>
        <p className="text-[12px] text-muted-foreground mb-4">
          Payment {index + 1} · <span className="font-semibold text-foreground">${Number(inst.amount).toFixed(2)}</span>
        </p>
        <label className="text-[12px] font-medium text-foreground block mb-1">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-background text-sm px-2.5 capitalize focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={paying}>Cancel</Button>
          <Button size="sm" onClick={handlePay} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {paying ? 'Saving…' : `Pay $${Number(inst.amount).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerMembershipsTab({ customerID }) {
  const [memberships, setMemberships] = useState([])
  const [plansMap, setPlansMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [payTarget, setPayTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [memRes, planRes] = await Promise.all([
        api.get(`/api/customer-membership/customer/${customerID}`),
        api.get(`/api/payment-plan/customer/${customerID}`),
      ])
      if (memRes.success) setMemberships(Array.isArray(memRes.data) ? memRes.data : [])
      else toast.error('Failed to load memberships', { description: memRes.error })

      const map = {}
      if (planRes.success && Array.isArray(planRes.data)) {
        for (const plan of planRes.data) {
          if (plan.customerMembershipID) map[String(plan.customerMembershipID)] = plan
        }
      }
      setPlansMap(map)
    } catch {
      toast.error('Error', { description: 'Unable to load memberships' })
    } finally {
      setLoading(false)
    }
  }, [customerID])

  useEffect(() => { load() }, [load])

  const hasActive = memberships.some((m) => m.status === 'active')

  async function handleCancel(m) {
    if (!window.confirm(`Cancel "${m.membershipName}"? This stops auto-renewal and ends access.`)) return
    setBusyId(m._id)
    try {
      const r = await api.patch(`/api/customer-membership/${m._id}/cancel`)
      if (r.success) { toast.success('Membership cancelled'); load() }
      else toast.error('Failed', { description: r.error })
    } finally { setBusyId(null) }
  }

  async function handleRenew(m) {
    setBusyId(m._id)
    try {
      const r = await api.patch(`/api/customer-membership/${m._id}/renew`)
      if (r.success) { toast.success('Membership renewed'); load() }
      else toast.error('Failed', { description: r.error })
    } finally { setBusyId(null) }
  }

  async function handleToggleAutoRenew(m) {
    setBusyId(m._id)
    try {
      const r = await api.patch(`/api/customer-membership/${m._id}/auto-renew`, { autoRenew: !m.autoRenew })
      if (r.success) { toast.success(`Auto-renew ${!m.autoRenew ? 'enabled' : 'disabled'}`); load() }
      else toast.error('Failed', { description: r.error })
    } finally { setBusyId(null) }
  }

  if (loading && memberships.length === 0) {
    return <div className="flex items-center justify-center h-64"><GlobalLoader variant="center" size="md" text="Loading memberships…" /></div>
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Memberships</h2>
          <p className="text-[12px] text-muted-foreground">A customer can hold one membership at a time (not combinable with packages).</p>
        </div>
        <Button
          onClick={() => setAssignOpen(true)}
          disabled={hasActive}
          title={hasActive ? 'This customer already has an active membership' : undefined}
          className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2"
        >
          <Plus className="h-4 w-4" />
          Assign Membership
        </Button>
      </div>

      {memberships.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No memberships yet. Click "Assign Membership" to add one.
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((m) => {
            const plan = plansMap[String(m._id)]
            const collected = Number(m.amountCollected ?? 0)
            const total = Number(m.totalPaid ?? 0)
            const outstanding = Math.max(0, total - collected)
            return (
            <div key={m._id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: m.membershipID?.color || '#6366f1' }}>
                    {(m.membershipName || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.membershipName}</p>
                    <p className="text-[12px] text-muted-foreground">
                      Purchased {fmtDate(m.purchaseDate)} · {m.expiryDate ? `Renews ${fmtDate(m.expiryDate)}` : 'No expiry'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', PAYMENT_STATUS_COLORS[m.paymentStatus] || 'bg-muted text-muted-foreground'].join(' ')}>
                    {m.paymentStatus}
                  </span>
                  <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize', STATUS_COLORS[m.status] || 'bg-muted text-muted-foreground'].join(' ')}>
                    {m.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4 text-[12px]">
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-muted-foreground">Price</p>
                  <p className="text-sm font-semibold text-foreground">${total.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-muted-foreground">Collected</p>
                  <p className="text-sm font-semibold text-emerald-600">${collected.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="text-sm font-semibold text-red-600">${outstanding.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-2">
                  <p className="text-muted-foreground">Billing</p>
                  <p className="text-sm font-medium text-foreground capitalize">{(m.billingType || '').replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {(m.services || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] border-b border-border/50 last:border-0 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color || '#6366f1' }} />
                    <span className="text-foreground">{s.serviceName}</span>
                    <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                      {s.accessType === 'unlimited' ? (
                        <><InfinityIcon className="h-3.5 w-3.5" /> once / day</>
                      ) : (
                        <span className="font-medium text-foreground">{s.sessionsRemaining} / {s.sessionsTotal} left</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment schedule (payment plan, or flexible billing with a tracked schedule) */}
              {plan && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Payment Schedule</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        plan.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600'
                          : plan.status === 'cancelled' ? 'bg-muted text-muted-foreground'
                            : 'bg-violet-500/10 text-violet-600'}`}>
                        {plan.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {plan.installments.filter((i) => i.status === 'paid').length} / {plan.numberOfInstallments} paid
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    {plan.installments.map((inst, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-3 py-2.5 ${idx > 0 ? 'border-t border-border' : ''} ${inst.status === 'paid' ? 'bg-emerald-500/5' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            inst.status === 'paid' ? 'bg-emerald-600 text-white'
                              : inst.status === 'failed' ? 'bg-rose-600 text-white'
                                : 'bg-muted text-muted-foreground'}`}>
                            {inst.status === 'paid' ? '✓' : idx + 1}
                          </div>
                          <div>
                            <p className="text-[12px] text-foreground font-medium">
                              Payment {idx + 1}
                              {inst.status === 'paid' && <span className="ml-1.5 text-[11px] font-normal text-emerald-600">Paid</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground">Due {fmtDate(inst.dueDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">${Number(inst.amount).toFixed(2)}</p>
                          {inst.status === 'pending' && plan.status === 'active' && m.status === 'active' && (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => setPayTarget({ plan, index: idx })}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {plan.nextPaymentDate && plan.status === 'active' && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">Next payment due: {fmtDate(plan.nextPaymentDate)}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!m.autoRenew}
                    disabled={m.status !== 'active' || busyId === m._id}
                    onChange={() => handleToggleAutoRenew(m)}
                    className="accent-brand"
                  />
                  Auto-renew
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === m._id || m.status === 'cancelled'}
                    onClick={() => handleRenew(m)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Renew
                  </Button>
                  {m.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === m._id}
                      onClick={() => handleCancel(m)}
                      className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      <Sheet open={assignOpen} onClose={() => setAssignOpen(false)} width="560px">
        <SheetContent onClose={() => setAssignOpen(false)} className="p-0">
          <div className="shrink-0 border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Assign Membership</h2>
            <p className="text-sm text-muted-foreground">Grant this customer daily access to a set of services.</p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AssignMembershipForm
              customerID={customerID}
              onCancel={() => setAssignOpen(false)}
              onSuccess={() => { setAssignOpen(false); load() }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <PayInstallmentDialog target={payTarget} onClose={() => setPayTarget(null)} onPaid={() => { setPayTarget(null); load() }} />
    </div>
  )
}
