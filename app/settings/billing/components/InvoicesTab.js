import { Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatMoney } from './billingData'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function paymentTypeBadge(type) {
  return {
    package_purchase: { label: 'Package Sale', cls: 'bg-blue-500/10 text-blue-600' },
    credit_topup: { label: 'Credit Top-up', cls: 'bg-violet-500/10 text-violet-600' },
    refund: { label: 'Refund', cls: 'bg-rose-500/10 text-rose-600' },
  }[type] ?? { label: type, cls: 'bg-muted text-muted-foreground' }
}

function statusClass(status) {
  return {
    completed: 'bg-emerald-500/10 text-emerald-600',
    pending: 'bg-amber-500/10 text-amber-600',
    failed: 'bg-rose-500/10 text-rose-600',
  }[status] ?? 'bg-muted text-muted-foreground'
}

export default function InvoicesTab({ payments, loading }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><LoadingSpinner /></div>
      ) : payments.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
          No payment records yet.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left py-2 font-medium">Customer</th>
                <th className="text-left py-2 font-medium">Amount</th>
                <th className="text-left py-2 font-medium">Type</th>
                <th className="text-left py-2 font-medium">Method</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const badge = paymentTypeBadge(p.type)
                return (
                  <tr key={p._id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="py-3 font-medium text-foreground">{p.customerID?.name ?? '—'}</td>
                    <td className={`py-3 font-semibold ${p.type === 'refund' ? 'text-rose-600' : 'text-foreground'}`}>
                      {p.type === 'refund' ? '-' : ''}{formatMoney(p.amount)}
                    </td>
                    <td className="py-3">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', badge.cls)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground capitalize">{p.method}</td>
                    <td className="py-3">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', statusClass(p.status))}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
