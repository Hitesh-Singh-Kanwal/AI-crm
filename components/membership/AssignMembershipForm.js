'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const PAYMENT_METHODS = ['cash', 'card', 'online', 'cheque', 'other']
const FREQUENCIES = ['weekly', 'biweekly', 'monthly']

// Shared membership-assignment form. Used inside the customer Memberships tab and
// the enroll menu's Membership tab.
export default function AssignMembershipForm({ customerID, onSuccess, onCancel }) {
  const [templates, setTemplates] = useState([])
  const [membershipID, setMembershipID] = useState('')
  const [billingType, setBillingType] = useState('one_time')
  const [method, setMethod] = useState('cash')
  const [numberOfInstallments, setNumberOfInstallments] = useState(3)
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/api/membership?isActive=true&limit=200').then((res) => {
      if (res.success) setTemplates(Array.isArray(res.data) ? res.data : [])
    })
  }, [])

  const selected = templates.find((t) => t._id === membershipID)

  async function handleSubmit() {
    if (!customerID) { toast.error('Select a student first'); return }
    if (!membershipID) { toast.error('Select a membership'); return }

    const billing = {}
    if (billingType === 'one_time') billing.method = method
    else if (billingType === 'payment_plan') {
      if (!startDate) { toast.error('Start date is required for a payment plan'); return }
      billing.numberOfInstallments = Number(numberOfInstallments)
      billing.frequency = frequency
      billing.startDate = startDate
    } else if (billingType === 'flexible') {
      if (!dueDate) { toast.error('Due date is required for flexible billing'); return }
      billing.dueDate = dueDate
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
            { v: 'payment_plan', label: 'Payment Plan' },
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

      {billingType === 'payment_plan' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label># Installments</Label>
            <Input type="number" min="1" value={numberOfInstallments} onChange={(e) => setNumberOfInstallments(e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Frequency</Label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 capitalize"
            >
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>
        </div>
      )}

      {billingType === 'flexible' && (
        <div className="flex flex-col gap-1.5">
          <Label>Due Date *</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
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
