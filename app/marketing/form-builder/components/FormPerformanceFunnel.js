'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { FORM_ANALYTICS_RANGES } from '@/lib/form-analytics'

function pct(part, whole) {
  const n = Number(part) || 0
  const d = Number(whole) || 0
  if (d <= 0) return '0%'
  const value = (n / d) * 100
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}%`
}

function money(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return null
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function RateBadge({ children }) {
  return (
    <span className="inline-flex rounded-lg bg-[#fde8ef] px-2 py-1 text-[11px] font-semibold leading-tight text-[#be185d]">
      {children}
    </span>
  )
}

function FunnelCard({ label, value, hint, badge, action }) {
  return (
    <div className="flex min-h-[148px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {badge}
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-auto pt-3 text-sm text-slate-500">{action || hint}</div>
    </div>
  )
}

/**
 * Form performance funnel: visitors → leads → customers → cost per customer.
 * Ad spend is kept in this browser so cost can be calculated without a spend integration.
 */
export default function FormPerformanceFunnel({
  loading = false,
  visitors,
  views,
  leads,
  customers,
  range,
  from = '',
  to = '',
  onRangeChange,
  onCustomChange,
  spendScope = 'org',
}) {
  const [spendInput, setSpendInput] = useState('')
  const [editingSpend, setEditingSpend] = useState(false)
  const spendKey = `cadance-form-ad-spend:${spendScope}:${range}:${from || ''}:${to || ''}`

  useEffect(() => {
    const stored = window.localStorage.getItem(spendKey)
    setSpendInput(stored || '')
    setEditingSpend(false)
  }, [spendKey])

  const ready = !loading && visitors !== undefined
  const visitorCount = Number(visitors) || 0
  const viewCount = Number(views) || 0
  const leadCount = Number(leads) || 0
  const customerCount = Number(customers) || 0
  const spend = spendInput.trim() === '' ? null : Number(spendInput)
  const cost = spend != null && customerCount > 0 ? spend / customerCount : null

  const saveSpend = (raw) => {
    const next = String(raw || '').trim()
    setSpendInput(next)
    if (next) window.localStorage.setItem(spendKey, next)
    else window.localStorage.removeItem(spendKey)
    setEditingSpend(false)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Form performance</h2>
          <p className="mt-0.5 text-sm text-slate-500">From first visit to paying customer</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {FORM_ANALYTICS_RANGES.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={loading}
                onClick={() => onRangeChange?.(item.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors',
                  range === item.value && 'bg-white text-slate-900 shadow-sm',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {range === 'custom' ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => onCustomChange?.(e.target.value, to)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => onCustomChange?.(from, e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FunnelCard
          label="Visitors"
          value={ready ? visitorCount.toLocaleString() : '—'}
          hint={ready ? `${viewCount.toLocaleString()} form views` : ' '}
        />
        <FunnelCard
          label="Leads"
          value={ready ? leadCount.toLocaleString() : '—'}
          hint="Submitted a form"
          badge={ready ? <RateBadge>{pct(leadCount, visitorCount)} of visitors</RateBadge> : null}
        />
        <FunnelCard
          label="Customers"
          value={ready ? customerCount.toLocaleString() : '—'}
          hint="Purchased intro lesson"
          badge={ready ? <RateBadge>{pct(customerCount, leadCount)} of leads</RateBadge> : null}
        />
        <FunnelCard
          label="Cost per customer"
          value={ready && cost != null ? money(cost) : <span className="text-slate-400">$—</span>}
          badge={ready ? <RateBadge>{pct(customerCount, visitorCount)} visitor → customer</RateBadge> : null}
          action={
            editingSpend ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const data = new FormData(e.currentTarget)
                  saveSpend(data.get('spend'))
                }}
              >
                <input
                  name="spend"
                  inputMode="decimal"
                  defaultValue={spendInput}
                  placeholder="Ad spend"
                  className="h-8 w-24 rounded-md border border-slate-200 px-2 text-sm"
                />
                <button type="submit" className="text-sm font-medium text-[#be185d]">
                  Save
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditingSpend(true)}
                className="text-sm font-medium text-[#be185d] hover:underline"
              >
                {spend != null ? 'Edit ad spend →' : 'Add ad spend →'}
              </button>
            )
          }
        />
      </div>
    </section>
  )
}
