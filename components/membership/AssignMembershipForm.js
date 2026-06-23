'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const PAYMENT_METHODS = ['cash', 'card', 'online', 'cheque', 'other']

// Shared membership-assignment form. Used inside the customer Memberships tab and
// the enroll menu's Membership tab.
export default function AssignMembershipForm({ customerID, onSuccess, onCancel }) {
  const [templates, setTemplates] = useState([])
  const [membershipID, setMembershipID] = useState('')
  const [billingType, setBillingType] = useState('one_time')
  const [method, setMethod] = useState('cash')
  const [dueDate, setDueDate] = useState('')
  const [scheduleMode, setScheduleMode] = useState('single')
  const [customInstallments, setCustomInstallments] = useState([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/api/membership?isActive=true&limit=200').then((res) => {
      if (res.success) setTemplates(Array.isArray(res.data) ? res.data : [])
    })
  }, [])

  const selected = templates.find((t) => t._id === membershipID)
  const price = Number(selected?.price ?? 0)

  const customTotal = useMemo(
    () => customInstallments.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [customInstallments],
  )

  function addInstallment() {
    setCustomInstallments((prev) => [
      ...prev,
      { _key: String(Date.now() + Math.random()), dueDate: '', amount: '' },
    ])
  }
  function updateInstallment(key, field, value) {
    setCustomInstallments((prev) => prev.map((c) => (c._key === key ? { ...c, [field]: value } : c)))
  }
  function removeInstallment(key) {
    setCustomInstallments((prev) => prev.filter((c) => c._key !== key))
  }

  async function handleSubmit() {
    if (!customerID) { toast.error('Select a student first'); return }
    if (!membershipID) { toast.error('Select a membership'); return }

    const billing = {}
    if (billingType === 'one_time') billing.method = method
    else if (billingType === 'flexible') {
      if (scheduleMode === 'custom') {
        const valid = customInstallments.filter((c) => c.dueDate && Number(c.amount) > 0)
        if (valid.length === 0) { toast.error('Add at least one scheduled payment with a date and amount'); return }
        if (Math.abs(customTotal - price) > 0.01) {
          toast.error(`Scheduled payments total $${customTotal.toFixed(2)} but the price is $${price.toFixed(2)}`); return
        }
        billing.customInstallments = valid.map((c) => ({ dueDate: c.dueDate, amount: Number(c.amount) }))
      } else {
        if (!dueDate) { toast.error('Due date is required for flexible billing'); return }
        billing.dueDate = dueDate
      }
    }

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
        toast.success('Membership assigned')
        onSuccess?.()
      } else {
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
                  {s.accessType === 'unlimited' ? 'Unlimited · once/day' : `${s.numberOfSessions} sessions`}
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
        <div className="flex flex-col gap-1.5">
          <Label>Payment Method</Label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 capitalize"
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {billingType === 'flexible' && (
        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {[
              { v: 'single', label: 'Single due date' },
              { v: 'custom', label: 'Scheduled payments' },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setScheduleMode(opt.v)}
                className={[
                  'h-7 px-3 rounded-md text-[11px] font-medium transition-colors',
                  scheduleMode === opt.v ? 'bg-brand text-brand-foreground' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {scheduleMode === 'custom' ? (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Add any number of payments, each with its own date and amount. Each is tracked and collected individually.
              </p>
              {customInstallments.map((c, i) => (
                <div key={c._key} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                  <Input type="date" value={c.dueDate} onChange={(e) => updateInstallment(c._key, 'dueDate', e.target.value)} className="h-8 flex-1" />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={c.amount} onChange={(e) => updateInstallment(c._key, 'amount', e.target.value)} className="h-8 w-full pl-5" />
                  </div>
                  <button type="button" onClick={() => removeInstallment(c._key)} className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove payment">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addInstallment}
                className="flex items-center gap-1 h-7 px-2 rounded border border-dashed border-border bg-background text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-brand transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Payment
              </button>
              <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Scheduled total</span>
                  <span className={`text-[12px] font-semibold ${Math.abs(customTotal - price) > 0.01 ? 'text-destructive' : 'text-foreground'}`}>
                    ${customTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Membership price</span>
                  <span className="text-[12px] font-bold text-foreground">${price.toFixed(2)}</span>
                </div>
                {Math.abs(customTotal - price) > 0.01 && (
                  <p className="text-[10px] text-destructive">Scheduled payments must add up to the membership price.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="h-9" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>}
        <Button onClick={handleSubmit} disabled={submitting} className="bg-brand hover:bg-brand-dark text-brand-foreground">
          {submitting ? 'Assigning…' : 'Assign Membership'}
        </Button>
      </div>
    </div>
  )
}
