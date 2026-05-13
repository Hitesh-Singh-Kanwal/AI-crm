import { formatDate } from './billingData'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function paymentTypeBadge(type) {
  return {
    package_purchase: { label: 'Package Sale', cls: 'bg-blue-500/10 text-blue-600' },
    credit_topup: { label: 'Credit Top-up', cls: 'bg-violet-500/10 text-violet-600' },
    refund: { label: 'Refund', cls: 'bg-rose-500/10 text-rose-600' },
  }[type] ?? { label: type, cls: 'bg-muted text-muted-foreground' }
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
              const badge = paymentTypeBadge(p.type)
              return (
                <div key={p._id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
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
    </>
  )
}
