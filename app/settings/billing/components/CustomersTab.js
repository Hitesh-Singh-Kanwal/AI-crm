'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, CreditCard, PhoneCall, Sparkles, Users } from 'lucide-react'
import SearchInput from '@/components/ui/search-input'
import { cn } from '@/lib/utils'
import { formatDate, formatMoney, statusClass } from './billingData'

export default function CustomersTab({ customers }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || null)

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((item) =>
      [item.studioName, item.owner, item.email, item.plan].some((value) => value.toLowerCase().includes(q))
    )
  }, [customers, searchQuery])

  const selectedCustomer =
    filteredCustomers.find((item) => item.id === selectedCustomerId) ||
    customers.find((item) => item.id === selectedCustomerId) ||
    filteredCustomers[0] ||
    null

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Studio Customers</h2>
            <p className="text-xs text-muted-foreground">Studios using AI agent + CRM as a service</p>
          </div>
          <SearchInput
            className="w-full sm:w-[300px]"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search studio, owner, email, plan..."
          />
        </div>

        <div className="space-y-2">
          {filteredCustomers.map((item) => {
            const isSelected = selectedCustomer?.id === item.id
            const usagePercent = Math.min(100, Math.round((item.aiCallsUsed / item.aiCallsLimit) * 100))
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCustomerId(item.id)}
                className={cn(
                  'w-full text-left rounded-xl border p-3 transition-colors',
                  isSelected
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-primary-light)]/50'
                    : 'border-border bg-background hover:bg-muted/40'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.studioName}</p>
                    <p className="text-xs text-muted-foreground">{item.owner} • {item.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {item.plan}
                    </span>
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', statusClass(item.status))}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-md border border-border bg-card px-2 py-1.5">
                    <p className="text-muted-foreground">MRR</p>
                    <p className="text-foreground font-medium">{formatMoney(item.monthlyAmount)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card px-2 py-1.5">
                    <p className="text-muted-foreground">Seats</p>
                    <p className="text-foreground font-medium">{item.seatsUsed}/{item.seatsLimit === 999 ? '∞' : item.seatsLimit}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card px-2 py-1.5">
                    <p className="text-muted-foreground">Leads Imported</p>
                    <p className="text-foreground font-medium">{item.importedLeads}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card px-2 py-1.5">
                    <p className="text-muted-foreground">AI Usage</p>
                    <p className="text-foreground font-medium">{usagePercent}%</p>
                  </div>
                </div>
              </button>
            )
          })}
          {filteredCustomers.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
              No customers match your search.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Customer Billing Profile</h3>
          {!selectedCustomer ? (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              Select a customer to view details.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">{selectedCustomer.studioName}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedCustomer.owner}</p>
                <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="text-foreground font-medium">{selectedCustomer.paymentMethod}</span>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next bill:</span>
                  <span className="text-foreground font-medium">{formatDate(selectedCustomer.nextBillingDate)}</span>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">AI calls:</span>
                  <span className="text-foreground font-medium">{selectedCustomer.aiCallsUsed.toLocaleString()} / {selectedCustomer.aiCallsLimit.toLocaleString()}</span>
                </div>
                <div className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Seats:</span>
                  <span className="text-foreground font-medium">
                    {selectedCustomer.seatsUsed}/{selectedCustomer.seatsLimit === 999 ? 'Unlimited' : selectedCustomer.seatsLimit}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Service Entitlements</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    AI Voice Agent
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    CRM Pipeline
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Human Queue
                  </span>
                  {selectedCustomer.activeIntegrations.map((tool) => (
                    <span key={tool} className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {tool} Sync
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Renewal Checklist
          </div>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Usage threshold alerts at 80% and 100%.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Auto-upgrade recommendations for call volume spikes.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Payment failure retry and owner notification workflow.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
