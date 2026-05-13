'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { cn } from '@/lib/utils'
import OverviewTab from './components/OverviewTab'
import CustomersTab from './components/CustomersTab'
import InvoicesTab from './components/InvoicesTab'
import PlansTab from './components/PlansTab'
import { INITIAL_CUSTOMERS, PLAN_CATALOG } from './components/billingData'
import api from '@/lib/api'

const BILLING_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'plans', label: 'Plans' },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [payments, setPayments] = useState([])
  const [activePackages, setActivePackages] = useState([])
  const [loadingBilling, setLoadingBilling] = useState(true)

  useEffect(() => {
    async function loadBillingData() {
      const [payRes, pkgRes] = await Promise.all([
        api.get('/api/payment?limit=50'),
        api.get('/api/customer-package?status=active&limit=100'),
      ])
      if (payRes.success) setPayments(payRes.data || [])
      if (pkgRes.success) setActivePackages(pkgRes.data || [])
      setLoadingBilling(false)
    }
    loadBillingData()
  }, [])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalCollected = payments
    .filter((p) => p.type !== 'refund' && p.status === 'completed' && new Date(p.createdAt) >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const outstanding = activePackages
    .filter((cp) => cp.paymentStatus !== 'paid')
    .reduce((sum, cp) => sum + Math.max(0, (cp.totalPaid ?? 0) - (cp.amountCollected ?? 0)), 0)

  const recentPayments = [...payments].slice(0, 5)

  return (
    <MainLayout title="Billing" subtitle="Manage studio subscriptions, plans, invoices, and SaaS usage">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 rounded-full bg-muted p-1 w-fit">
            {BILLING_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-4 text-sm transition-all',
                    isActive
                      ? 'bg-background text-[var(--studio-primary)] shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </section>

        {activeTab === 'overview' && (
          <>
            <OverviewTab
              totalCollected={totalCollected}
              outstanding={outstanding}
              activePackageCount={activePackages.length}
              recentPayments={recentPayments}
              loading={loadingBilling}
            />
            <InvoicesTab payments={payments} loading={loadingBilling} />
            <PlansTab plans={PLAN_CATALOG} />
          </>
        )}

        {activeTab === 'customers' && <CustomersTab customers={INITIAL_CUSTOMERS} />}
        {activeTab === 'invoices' && <InvoicesTab payments={payments} loading={loadingBilling} />}
        {activeTab === 'plans' && <PlansTab plans={PLAN_CATALOG} />}
      </div>
    </MainLayout>
  )
}
