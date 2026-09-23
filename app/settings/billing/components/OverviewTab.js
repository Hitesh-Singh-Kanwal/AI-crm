import { useEffect, useState } from 'react'
import { formatDate } from './billingData'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'

function paymentTypeBadge(type) {
  return {
    package_purchase: { label: 'Package Sale', cls: 'bg-blue-500/10 text-blue-600' },
    credit_topup: { label: 'Credit Top-up', cls: 'bg-violet-500/10 text-violet-600' },
    refund: { label: 'Refund', cls: 'bg-rose-500/10 text-rose-600' },
  }[type] ?? { label: type, cls: 'bg-muted text-muted-foreground' }
}

// Studios vary on what they charge back when a customer's cheque bounces — this
// is the studio's own setting (Organisation.billingSettings.bouncedCheckFee),
// not a fixed amount, so it's editable here rather than baked into the backend.
function BouncedCheckFeeSettings() {
  const [fee, setFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.get('/api/organisation/billing-settings').then((res) => {
      if (res.success) setFee(String(res.data?.bouncedCheckFee ?? 15))
      setLoading(false)
    })
  }, [])

  async function save() {
    const n = Number(fee)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a valid, non-negative amount.')
      return
    }
    setSaving(true)
    const res = await api.patch('/api/organisation/billing-settings', { bouncedCheckFee: n })
    setSaving(false)
    if (res.success) toast.success('Bounced cheque fee updated.')
    else toast.error(res.error || 'Failed to update the fee.')
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Bounced Cheque Fee</h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Added on top of the original amount when staff mark a cheque as bounced.
      </p>
      {loading ? (
        <div className="mt-3"><LoadingSpinner /></div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-6 pr-2.5 text-[13px] outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </section>
  )
}

export default function OverviewTab({
  totalCollected,
  outstanding,
  activePackageCount,
  recentPayments,
  loading,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Collected This Month</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">${totalCollected.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className={`mt-1 text-2xl font-semibold ${outstanding > 0 ? 'text-rose-600' : 'text-foreground'}`}>
            ${outstanding.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Active Packages</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{activePackageCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Last 5 transactions</p>
        {recentPayments.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
            No payment records yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {recentPayments.map((p) => {
              return (
                <div key={p._id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[13px] text-muted-foreground truncate">
                      {p.customerID?.name ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`text-[13px] font-semibold ${p.type === 'refund' ? 'text-rose-600' : 'text-foreground'}`}>
                      {p.type === 'refund' ? '-' : ''}${Number(p.amount).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(p.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <BouncedCheckFeeSettings />
    </>
  )
}
