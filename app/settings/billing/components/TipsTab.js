'use client'

import { useEffect, useState } from 'react'
import { Gift, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { formatDate, formatMoney } from './billingData'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { toast } from 'sonner'
import { TIP_METHODS as PAYMENT_METHODS } from '@/lib/paymentMethods'

const EMPTY_TIP_FORM = {
  customerID: '',
  teacherID: '',
  amount: '',
  method: 'cash',
  notes: '',
}

function statusClass(status) {
  return {
    completed: 'bg-emerald-500/10 text-emerald-600',
    pending: 'bg-amber-500/10 text-amber-600',
    failed: 'bg-rose-500/10 text-rose-600',
  }[status] ?? 'bg-muted text-muted-foreground'
}

function RecordTipDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_TIP_FORM)
  const [teachers, setTeachers] = useState([])
  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    Promise.all([
      api.get('/api/teacher?limit=200&status=active'),
      api.get('/api/customer?limit=200'),
    ]).then(([tRes, cRes]) => {
      if (tRes.success) setTeachers(tRes.data || [])
      if (cRes.success) setCustomers(cRes.data || [])
    })
  }, [open])

  function setField(key, val) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.customerID) return setError('Please select a customer.')
    if (!form.teacherID) return setError('Please select a teacher.')
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid tip amount.')

    setSaving(true)
    const res = await api.post('/api/tip', {
      customerID: form.customerID,
      teacherID: form.teacherID,
      amount: Number(form.amount),
      method: form.method,
      notes: form.notes || undefined,
    })
    setSaving(false)

    if (res.success) {
      toast.success('Tip recorded successfully.')
      setForm(EMPTY_TIP_FORM)
      onClose()
      onSuccess()
    } else {
      setError(res.error || 'Failed to record tip.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5">
        <p className="text-[14px] font-bold text-foreground mb-1">Record a Tip</p>
        <p className="text-[12px] text-muted-foreground mb-4">
          Record a tip paid by a customer to a teacher.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Customer */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Customer <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <select
                value={form.customerID}
                onChange={(e) => setField('customerID', e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] outline-none focus:border-primary"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.email}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Teacher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Teacher <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <select
                value={form.teacherID}
                onChange={(e) => setField('teacherID', e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] outline-none focus:border-primary"
              >
                <option value="">Select teacher…</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name || t.email}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Amount + Method */}
          <div className="flex gap-2">
            <div className="relative flex-1 space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background pl-6 pr-3 text-[12px] outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="w-36 space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Method</label>
              <div className="relative">
                <select
                  value={form.method}
                  onChange={(e) => setField('method', e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] capitalize outline-none focus:border-primary"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. Great class!"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-[11px] text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-border text-[12px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold disabled:opacity-60"
            >
              {saving ? 'Recording…' : 'Record Tip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TipsTab() {
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function loadTips() {
    setLoading(true)
    const res = await api.get('/api/tip?limit=100')
    if (res.success) setTips(res.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadTips()
  }, [])

  const totalTips = tips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Teacher Tips</h2>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          Record Tip
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Total Tips</p>
          <p className="text-[18px] font-bold text-foreground mt-0.5">{formatMoney(totalTips)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[11px] text-muted-foreground">Tip Count</p>
          <p className="text-[18px] font-bold text-foreground mt-0.5">{tips.length}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : tips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground text-center">
          No tips recorded yet. Tips can be added during enrollment or recorded standalone.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left py-2 font-medium">Customer</th>
                <th className="text-left py-2 font-medium">Teacher</th>
                <th className="text-left py-2 font-medium">Amount</th>
                <th className="text-left py-2 font-medium">Method</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tips.map((t) => (
                <tr key={t._id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="py-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                  <td className="py-3 font-medium text-foreground">{t.customerID?.name ?? '—'}</td>
                  <td className="py-3 text-foreground">{t.teacherID?.name ?? '—'}</td>
                  <td className="py-3 font-semibold text-emerald-600">{formatMoney(t.amount)}</td>
                  <td className="py-3 text-muted-foreground capitalize">{t.method}</td>
                  <td className="py-3">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', statusClass(t.status))}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordTipDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadTips}
      />
    </section>
  )
}
