'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Plus, Trash2, Pin, PinOff,
  Package, BookOpen, StickyNote, User, ChevronDown, X,
  CreditCard, RotateCcw, Receipt, ClipboardList,
} from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { getInitials, formatDate } from '@/lib/utils'

// ─── helpers ────────────────────────────────────────────────────────────────

function statusColor(status) {
  return {
    active: 'bg-emerald-500/10 text-emerald-600',
    expired: 'bg-amber-500/10 text-amber-600',
    exhausted: 'bg-rose-500/10 text-rose-600',
    cancelled: 'bg-muted text-muted-foreground',
  }[status] ?? 'bg-muted text-muted-foreground'
}

function paymentStatusColor(ps) {
  return {
    paid: 'bg-emerald-500/10 text-emerald-600',
    partial: 'bg-amber-500/10 text-amber-600',
    unpaid: 'bg-rose-500/10 text-rose-600',
  }[ps] ?? 'bg-muted text-muted-foreground'
}

function paymentTypeBadge(type) {
  return {
    package_purchase: { label: 'Package Sale', cls: 'bg-blue-500/10 text-blue-600' },
    credit_topup: { label: 'Credit Top-up', cls: 'bg-violet-500/10 text-violet-600' },
    refund: { label: 'Refund', cls: 'bg-rose-500/10 text-rose-600' },
  }[type] ?? { label: type, cls: 'bg-muted text-muted-foreground' }
}

const PAYMENT_METHODS = ['cash', 'card', 'online', 'cheque', 'other']

function SessionBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">
        {total - used} left / {total}
      </span>
    </div>
  )
}

function FormField({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── RecordPaymentDialog ─────────────────────────────────────────────────────

function RecordPaymentDialog({ open, onClose, customerID, enrollmentID, outstanding, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function reset() { setAmount(''); setMethod('cash'); setNotes('') }

  const num = parseFloat(amount)
  const isPartial = outstanding != null && !isNaN(num) && num > 0 && num < outstanding
  const isFull = outstanding != null && !isNaN(num) && num >= outstanding

  async function handleSubmit(e) {
    e.preventDefault()
    if (isNaN(num) || num <= 0) return
    setSaving(true)
    const res = await api.post('/api/payment', {
      customerID,
      enrollmentID,
      type: 'package_purchase',
      amount: num,
      method,
      notes: notes.trim() || undefined,
    })
    if (res.success) {
      toast.success(isPartial ? 'Partial payment recorded.' : 'Payment recorded.')
      reset()
      onSuccess()
      onClose()
    } else {
      toast.error(res.error || 'Failed to record payment.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {outstanding != null && (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-[12px] text-muted-foreground">Outstanding</span>
              <span className="text-[13px] font-semibold text-rose-500">${Number(outstanding).toFixed(2)}</span>
            </div>
          )}
          <FormField label="Amount" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
              <input
                type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-[13px] outline-none focus:border-primary"
              />
            </div>
            {isPartial && (
              <p className="text-[11px] text-amber-500 mt-1">Partial payment — ${(outstanding - num).toFixed(2)} will remain outstanding</p>
            )}
            {isFull && (
              <p className="text-[11px] text-emerald-500 mt-1">Full payment — package will be marked as paid</p>
            )}
          </FormField>
          <FormField label="Method" required>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary capitalize"
              >
                {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormField>
          <FormField label="Notes (optional)">
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash on arrival"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !amount || isNaN(num) || num <= 0}>
              {saving ? 'Saving…' : isPartial ? 'Record Partial' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── IssueRefundDialog ───────────────────────────────────────────────────────

function IssueRefundDialog({ open, onClose, payment, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function reset() { setAmount(''); setNotes('') }

  async function handleSubmit(e) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return
    setSaving(true)
    const res = await api.post('/api/payment/refund', {
      paymentID: payment._id,
      amount: num,
      notes: notes.trim() || undefined,
    })
    if (res.success) {
      toast.success('Refund issued.')
      reset()
      onSuccess()
      onClose()
    } else {
      toast.error(res.error || 'Failed to issue refund.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Issue Refund</DialogTitle></DialogHeader>
        {payment && (
          <p className="text-[12px] text-muted-foreground -mt-1">
            Original payment: <span className="text-foreground font-medium">${Number(payment.amount).toFixed(2)}</span> via {payment.method}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <FormField label="Refund amount" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
              <input
                type="number" min="0.01" step="0.01"
                max={payment?.amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-[13px] outline-none focus:border-primary"
              />
            </div>
          </FormField>
          <FormField label="Reason (optional)">
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Class cancelled"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !amount} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? 'Refunding…' : 'Issue Refund'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'active-enrollments', label: 'Active Enrollments', Icon: ClipboardList },
  { id: 'completed-enrollments', label: 'Completed Enrollments', Icon: ClipboardList },
  { id: 'payments', label: 'Payment History', Icon: Receipt },
  { id: 'lessons', label: 'Lessons', Icon: BookOpen },
  { id: 'notes', label: 'Notes', Icon: StickyNote },
]

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ customer, locations, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const toast = useToast()

  function startEdit() {
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phoneNumber: customer.phoneNumber || '',
      locationID: String(customer.locationID?._id ?? customer.locationID ?? ''),
      dateOfBirth: customer.dateOfBirth ? String(customer.dateOfBirth).slice(0, 10) : '',
      gender: customer.gender || '',
      address: {
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        zipCode: customer.address?.zipCode || '',
        country: customer.address?.country || 'USA',
      },
    })
    setEditing(true)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    const addr = {
      street: form.address.street.trim(),
      city: form.address.city.trim(),
      state: form.address.state.trim(),
      zipCode: form.address.zipCode.trim(),
      country: form.address.country.trim() || 'USA',
    }
    const hasAddress = addr.street || addr.city || addr.state || addr.zipCode
    const res = await api.put(`/api/customer/${customer._id}`, {
      name: form.name.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      locationID: form.locationID || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      address: hasAddress ? addr : undefined,
    })
    if (res.success) { toast.success('Profile saved.'); onUpdated(); setEditing(false) }
    else toast.error(res.error || 'Save failed.')
    setSaving(false)
  }

  async function handleAdjust(e) {
    e.preventDefault()
    const num = parseFloat(adjustAmount)
    if (isNaN(num) || num === 0) return
    setAdjusting(true)
    const res = await api.patch(`/api/customer/${customer._id}/adjust-credits`, {
      amount: num,
      reason: adjustReason.trim() || undefined,
    })
    if (res.success) {
      toast.success(`Credits ${num >= 0 ? 'added' : 'deducted'}: $${Math.abs(num).toFixed(2)}`)
      onUpdated()
      setAdjustOpen(false)
      setAdjustAmount('')
      setAdjustReason('')
    } else {
      toast.error(res.error || 'Adjustment failed.')
    }
    setAdjusting(false)
  }

  const locationName = (id) => {
    const loc = locations.find((l) => String(l._id) === String(id))
    return loc?.name || '—'
  }

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Credits Balance', value: `$${(customer.credits ?? 0).toFixed(2)}`, accent: 'text-emerald-500' },
          { label: 'Classes Assigned', value: customer.classAssigned?.length ?? 0 },
          { label: 'Notes', value: customer.notes?.length ?? 0 },
          { label: 'Member Since', value: formatDate(customer.createdAt) },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
            <p className={`text-[15px] font-semibold ${accent ?? 'text-foreground'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Info card */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-foreground">Personal details</h2>
          {!editing && (
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[12px]" onClick={startEdit}>
              <Pencil className="h-3 w-3 mr-1.5" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name" required>
                <input
                  type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
              <FormField label="Email" required>
                <input
                  type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <input
                  type="tel" value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
              <FormField label="Location">
                <div className="relative">
                  <select
                    value={form.locationID}
                    onChange={(e) => setForm({ ...form, locationID: e.target.value })}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                  >
                    <option value="">No location</option>
                    {locations.map((loc) => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date of Birth">
                <input
                  type="date" value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
              <FormField label="Gender">
                <div className="relative">
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                  >
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </FormField>
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[12px] font-semibold text-muted-foreground">Address</p>
              <FormField label="Street">
                <input
                  type="text" value={form.address.street}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City">
                  <input
                    type="text" value={form.address.city}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  />
                </FormField>
                <FormField label="State">
                  <input
                    type="text" value={form.address.state}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Zip Code">
                  <input
                    type="text" value={form.address.zipCode}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  />
                </FormField>
                <FormField label="Country">
                  <input
                    type="text" value={form.address.country}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                  />
                </FormField>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Contact */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: 'Name', value: customer.name },
                  { label: 'Email', value: customer.email },
                  { label: 'Phone', value: customer.phoneNumber || '—' },
                  { label: 'Location', value: locationName(customer.locationID?._id ?? customer.locationID) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-[13px] text-foreground break-all">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Personal */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Personal</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Date of Birth</p>
                  <p className="text-[13px] text-foreground">{customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Gender</p>
                  <p className="text-[13px] text-foreground">
                    {customer.gender ? customer.gender.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Address */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Address</p>
              {(() => {
                const a = customer.address
                const hasAny = a && [a.street, a.city, a.state, a.zipCode, a.country].some(Boolean)
                if (!hasAny) return <p className="text-[13px] text-muted-foreground">—</p>
                return (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: 'Street', value: a.street },
                      { label: 'City', value: a.city },
                      { label: 'State', value: a.state },
                      { label: 'Zip Code', value: a.zipCode },
                      { label: 'Country', value: a.country },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-[13px] text-foreground">{value || '—'}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Credits card */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold text-foreground">Credits balance</h2>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-4xl font-bold text-foreground">${(customer.credits ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" className="flex-1 h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => { setAdjustAmount(''); setAdjustReason(''); setAdjustOpen(true) }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add / Deduct
          </Button>
        </div>
      </div>
      </div>{/* end inner grid */}

      {/* Adjust credits dialog */}
      <Dialog open={adjustOpen} onOpenChange={(v) => { if (!v) setAdjustOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4 mt-2">
            <FormField label="Amount (positive to add, negative to deduct)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
                <input
                  type="number" step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 50 or -20"
                  className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-[13px] outline-none focus:border-primary"
                />
              </div>
            </FormField>
            <FormField label="Reason (optional)">
              <input
                type="text" value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Top-up, refund, correction"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={adjusting}>{adjusting ? 'Saving…' : 'Apply'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── PayInstallmentDialog ────────────────────────────────────────────────────

function PayInstallmentDialog({ open, onClose, plan, installmentIndex, onSuccess }) {
  const [method, setMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const installment = plan?.installments?.[installmentIndex]

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const res = await api.post(`/api/payment-plan/${plan._id}/pay-installment`, {
      installmentIndex,
      method,
    })
    if (res.success) {
      toast.success('Installment payment recorded.')
      onSuccess()
      onClose()
    } else {
      toast.error(res.error || 'Failed to record payment.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Pay Installment</DialogTitle></DialogHeader>
        {installment && (
          <p className="text-[12px] text-muted-foreground -mt-1">
            Payment {installmentIndex + 1} of {plan.numberOfInstallments} ·{' '}
            <span className="text-foreground font-medium">${Number(installment.amount).toFixed(2)}</span>
            {' '}due {new Date(installment.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <FormField label="Payment Method" required>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary capitalize"
              >
                {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Recording…' : `Pay $${Number(installment?.amount ?? 0).toFixed(2)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Packages Tab ─────────────────────────────────────────────────────────────

const BLANK_ADD_FORM = {
  enrollmentID: '',
  packageID: '',
  purchaseDate: '',
  services: [],
  billingType: 'one_time',
  billing: { method: 'cash', numberOfInstallments: 3, frequency: 'monthly', startDate: '' },
}

function PackagesTab({ customerID }) {
  const [customerPkgs, setCustomerPkgs] = useState([])
  const [detailsMap, setDetailsMap] = useState({})
  const [plansMap, setPlansMap] = useState({})   // cpId -> PaymentPlan doc
  const [allPkgs, setAllPkgs] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  // Add package multi-step
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState(1)
  const [addForm, setAddForm] = useState(BLANK_ADD_FORM)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [adding, setAdding] = useState(false)

  // Cancel / pay / pay-installment
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [recordPaymentTarget, setRecordPaymentTarget] = useState(null)
  const [payInstallTarget, setPayInstallTarget] = useState(null) // { plan, index }
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const [pkgRes, allRes, enrRes] = await Promise.all([
      api.get(`/api/customer-package/customer/${customerID}`),
      api.get('/api/package?limit=200&isActive=true'),
      api.get(`/api/enrollment?customerID=${customerID}&status=active`),
    ])
    if (allRes.success) setAllPkgs(allRes.data || [])
    if (enrRes.success) setEnrollments(enrRes.data || [])
    if (pkgRes.success) {
      const list = pkgRes.data || []
      setCustomerPkgs(list)
      if (list.length > 0) {
        const detailResults = await Promise.all(list.map((enr) => api.get(`/api/customer-package/${enr._id}/details`)))
        const detMap = {}
        list.forEach((enr, i) => { if (detailResults[i].success) detMap[String(enr._id)] = detailResults[i].data })
        setDetailsMap(detMap)

        const hasPlanPkgs = list.some((enr) => enr.package?.billingType === 'payment_plan')
        if (hasPlanPkgs) {
          const plansRes = await api.get(`/api/payment-plan/customer/${customerID}`)
          if (plansRes.success) {
            const pm = {}
            ;(plansRes.data || []).forEach((plan) => {
              const enrId = String(plan.enrollmentID?._id ?? plan.enrollmentID)
              pm[enrId] = plan
            })
            setPlansMap(pm)
          }
        }
      }
    }
    setLoading(false)
  }, [customerID])

  useEffect(() => { load() }, [load])

  function openAdd() { setAddForm(BLANK_ADD_FORM); setSelectedPkg(null); setAddStep(1); setAddOpen(true) }
  function closeAdd() { setAddOpen(false) }

  function onPkgChange(pkgId) {
    const pkg = allPkgs.find((p) => String(p._id) === pkgId)
    setSelectedPkg(pkg || null)
    setAddForm((f) => ({
      ...f,
      packageID: pkgId,
      services: (pkg?.services || []).map((s) => ({
        serviceCode: s.serviceCode || '',
        serviceName: s.serviceName || '',
        color: s.color || '',
        numberOfSessions: s.numberOfSessions || 0,
        pricePerSession: s.pricePerSession || 0,
        discountType: s.discountType || 'none',
        discountAmount: s.discountAmount || 0,
        finalAmount: s.finalAmount || 0,
      })),
    }))
  }

  function updateSvc(i, field, val) {
    setAddForm((f) => {
      const svcs = f.services.map((s, idx) => {
        if (idx !== i) return s
        const updated = { ...s, [field]: val }
        const price = Number(updated.pricePerSession) || 0
        const sessions = Number(updated.numberOfSessions) || 0
        let fa = price * sessions
        if (updated.discountType === 'percentage') fa -= fa * ((Number(updated.discountAmount) || 0) / 100)
        if (updated.discountType === 'fixed') fa -= Number(updated.discountAmount) || 0
        updated.finalAmount = Math.max(0, parseFloat(fa.toFixed(2)))
        return updated
      })
      return { ...f, services: svcs }
    })
  }

  function setBilling(field, val) {
    setAddForm((f) => ({ ...f, billing: { ...f.billing, [field]: val } }))
  }

  const totalAmount = addForm.services.reduce((s, svc) => s + (Number(svc.finalAmount) || 0), 0)

  function getInstallments() {
    const { numberOfInstallments, frequency, startDate } = addForm.billing
    if (!startDate || !numberOfInstallments) return []
    const n = Number(numberOfInstallments)
    if (!n || n < 1) return []
    const amt = parseFloat((totalAmount / n).toFixed(2))
    const result = []
    let d = new Date(startDate)
    for (let i = 0; i < n; i++) {
      result.push({ date: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }), amount: amt })
      if (frequency === 'weekly') d = new Date(d.getTime() + 7 * 86400000)
      else if (frequency === 'biweekly') d = new Date(d.getTime() + 14 * 86400000)
      else { d = new Date(d); d.setMonth(d.getMonth() + 1) }
    }
    return result
  }

  async function handleAdd() {
    if (!addForm.enrollmentID) {
      toast.error('Please select an enrollment.')
      return
    }
    if (addForm.billingType === 'payment_plan') {
      const { numberOfInstallments, frequency, startDate } = addForm.billing
      if (!numberOfInstallments || !frequency || !startDate) {
        toast.error('Please fill all payment plan fields.')
        return
      }
    }
    setAdding(true)
    const payload = {
      customerID,
      packageID: addForm.packageID,
      enrollmentID: addForm.enrollmentID,
      services: addForm.services.map((s) => ({
        ...s,
        numberOfSessions: Number(s.numberOfSessions),
        pricePerSession: Number(s.pricePerSession),
        discountAmount: Number(s.discountAmount),
        finalAmount: Number(s.finalAmount),
      })),
      billingType: addForm.billingType,
      billing:
        addForm.billingType === 'one_time'
          ? { method: addForm.billing.method }
          : addForm.billingType === 'payment_plan'
          ? { numberOfInstallments: Number(addForm.billing.numberOfInstallments), frequency: addForm.billing.frequency, startDate: addForm.billing.startDate }
          : {},
    }
    if (addForm.purchaseDate) payload.purchaseDate = addForm.purchaseDate
    const res = await api.post('/api/customer-package/add', payload)
    if (res.success) {
      toast.success('Package added to customer.')
      closeAdd()
      load()
    } else {
      toast.error(res.error || 'Failed to add package.')
    }
    setAdding(false)
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    const res = await api.patch(`/api/customer-package/${cancelTarget._id}/cancel`)
    if (res.success) { toast.success('Package cancelled.'); setCancelTarget(null); load() }
    else toast.error(res.error || 'Failed to cancel.')
    setCancelling(false)
  }

  if (loading) return <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>

  const installments = getInstallments()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{customerPkgs.length} package{customerPkgs.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="h-8 text-[12px]" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Package
        </Button>
      </div>

      {customerPkgs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          No packages yet. Click "Add Package" to assign one.
        </div>
      ) : (
        <div className="space-y-3">
          {customerPkgs.map((enr) => {
            const pkg = enr.package ?? {}
            const det = detailsMap[String(enr._id)]
            const billing = det?.billing ?? {}
            const services = det?.services ?? pkg.services ?? []
            const totalPaid = billing.totalPaid ?? pkg.totalPaid ?? 0
            const collected = billing.amountCollected ?? pkg.amountCollected ?? 0
            const outstanding = billing.outstanding ?? Math.max(0, totalPaid - collected)
            const refunded = billing.totalRefunded ?? 0
            return (
              <div key={enr._id} className="rounded-xl border border-border bg-card p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {pkg.packageRef?.color && (
                      <div className="h-9 w-9 rounded-lg shrink-0 border border-black/10" style={{ backgroundColor: pkg.packageRef.color }} />
                    )}
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{pkg.packageName ?? pkg.packageRef?.packageName ?? 'Package'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Purchased {formatDate(pkg.purchaseDate)}
                        {pkg.expiryDate ? ` · Expires ${formatDate(pkg.expiryDate)}` : ' · No expiry'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                    {pkg.billingType && pkg.billingType !== 'one_time' && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-violet-500/10 text-violet-600 capitalize">
                        {pkg.billingType.replace('_', ' ')}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentStatusColor(pkg.paymentStatus)}`}>
                      {pkg.paymentStatus ?? 'unpaid'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(pkg.status)}`}>
                      {pkg.status}
                    </span>
                    {pkg.status === 'active' && pkg.paymentStatus !== 'paid' && pkg.billingType !== 'payment_plan' && (
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setRecordPaymentTarget({ _id: enr._id, outstanding })}
                      >
                        <CreditCard className="h-3 w-3 mr-1" /> Pay
                      </Button>
                    )}
                    {pkg.status === 'active' && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={() => setCancelTarget({ _id: enr._id, packageName: pkg.packageName })}
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Billing summary — 4 columns */}
                <div className="mt-4 grid grid-cols-4 gap-3 rounded-lg bg-muted/40 p-3">
                  {[
                    { label: 'Total Price', value: `$${Number(totalPaid).toFixed(2)}` },
                    { label: 'Collected', value: `$${Number(collected).toFixed(2)}`, cls: 'text-emerald-600' },
                    { label: 'Outstanding', value: `$${Number(outstanding).toFixed(2)}`, cls: outstanding > 0 ? 'text-rose-600' : 'text-muted-foreground' },
                    { label: 'Refunded', value: `$${Number(refunded).toFixed(2)}`, cls: refunded > 0 ? 'text-amber-600' : 'text-muted-foreground' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className={`text-[13px] font-semibold ${cls ?? 'text-foreground'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Services with full session breakdown */}
                {services.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2.5">Services</p>
                    <div className="space-y-2.5">
                      {services.map((svc, i) => {
                        const sessTotal = svc.sessionsTotal ?? 0
                        const sessUsed = svc.sessionsUsed ?? 0
                        const sessSched = svc.sessionsScheduled ?? 0
                        const sessRemaining = svc.sessionsRemaining ?? Math.max(0, sessTotal - sessUsed)
                        return (
                          <div key={i} className="rounded-lg border border-border/60 bg-background p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              {svc.color && (
                                <span className="h-3 w-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: svc.color }} />
                              )}
                              <p className="text-[12px] font-medium text-foreground flex-1">{svc.serviceName}</p>
                              {svc.pricePerSession > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                                  ${Number(svc.pricePerSession).toFixed(2)}/session
                                  {svc.discountType && svc.discountType !== 'none' && (
                                    <span className="ml-1 text-amber-600">
                                      · {svc.discountType === 'percentage' ? `${svc.discountAmount}% off` : `-$${svc.discountAmount}`}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            {/* Session counts — 4 boxes */}
                            <div className="grid grid-cols-4 gap-1.5 mb-2">
                              {[
                                { label: 'Total', value: sessTotal },
                                { label: 'Used', value: sessUsed, cls: sessUsed > 0 ? 'text-blue-600' : '' },
                                { label: 'Scheduled', value: sessSched, cls: sessSched > 0 ? 'text-violet-600' : '' },
                                { label: 'Remaining', value: sessRemaining, cls: sessRemaining > 0 ? 'text-emerald-600' : 'text-muted-foreground' },
                              ].map(({ label, value, cls }) => (
                                <div key={label} className="text-center bg-muted/40 rounded-md py-1.5">
                                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
                                  <p className={`text-[14px] font-bold ${cls ?? 'text-foreground'}`}>{value}</p>
                                </div>
                              ))}
                            </div>
                            <SessionBar used={sessUsed} total={sessTotal} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Payment plan installment schedule */}
                {pkg.billingType === 'payment_plan' && (() => {
                  const plan = plansMap[String(enr._id)]
                  if (!plan) return null
                  const paidCount = plan.installments.filter((i) => i.status === 'paid').length
                  return (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Payment Schedule
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            plan.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                            plan.status === 'cancelled' ? 'bg-muted text-muted-foreground' :
                            'bg-violet-500/10 text-violet-600'
                          }`}>
                            {plan.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {paidCount} / {plan.numberOfInstallments} paid
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden">
                        {plan.installments.map((inst, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-3 py-2.5 ${idx > 0 ? 'border-t border-border' : ''} ${
                              inst.status === 'paid' ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                inst.status === 'paid'
                                  ? 'bg-emerald-600 text-white'
                                  : inst.status === 'failed'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {inst.status === 'paid' ? '✓' : idx + 1}
                              </div>
                              <div>
                                <p className="text-[12px] text-foreground font-medium">
                                  Payment {idx + 1}
                                  {inst.status === 'paid' && <span className="ml-1.5 text-[11px] font-normal text-emerald-600">Paid</span>}
                                  {inst.status === 'failed' && <span className="ml-1.5 text-[11px] font-normal text-rose-600">Failed</span>}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Due {new Date(inst.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-foreground">${Number(inst.amount).toFixed(2)}</p>
                              {inst.status === 'pending' && plan.status === 'active' && pkg.status === 'active' && (
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => setPayInstallTarget({ plan, index: idx })}
                                >
                                  Pay
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {plan.nextPaymentDate && plan.status === 'active' && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Next payment due: {new Date(plan.nextPaymentDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {/* Record Payment dialog */}
      <RecordPaymentDialog
        open={Boolean(recordPaymentTarget)}
        onClose={() => setRecordPaymentTarget(null)}
        customerID={customerID}
        enrollmentID={recordPaymentTarget?._id}
        outstanding={recordPaymentTarget?.outstanding}
        onSuccess={load}
      />

      {/* Pay installment dialog */}
      <PayInstallmentDialog
        open={Boolean(payInstallTarget)}
        onClose={() => setPayInstallTarget(null)}
        plan={payInstallTarget?.plan}
        installmentIndex={payInstallTarget?.index}
        onSuccess={load}
      />

      {/* Cancel confirm */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(v) => { if (!v) setCancelTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Package</DialogTitle></DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">
            Cancel <span className="font-semibold text-foreground">{cancelTarget?.packageName}</span>? Sessions will no longer be used for new bookings.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button variant="destructive" size="sm" disabled={cancelling} onClick={handleCancel}>
              {cancelling ? 'Cancelling…' : 'Cancel Package'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Package — 3-step dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) closeAdd() }}>
        <DialogContent className={addStep === 2 ? 'max-w-3xl' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>Add Package</DialogTitle>
            {/* Step progress bar */}
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= addStep ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {addStep === 1 ? 'Step 1 of 3 — Choose package' : addStep === 2 ? 'Step 2 of 3 — Configure services & pricing' : 'Step 3 of 3 — Set billing'}
            </p>
          </DialogHeader>

          {/* ── Step 1: Choose package ── */}
          {addStep === 1 && (
            <div className="space-y-4 mt-2">
              <FormField label="Enrollment" required>
                <div className="relative">
                  <select
                    value={addForm.enrollmentID}
                    onChange={(e) => setAddForm((f) => ({ ...f, enrollmentID: e.target.value }))}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                  >
                    <option value="">Select enrollment…</option>
                    {enrollments.filter((e) => !e.package).map((e) => {
                      const ordinal = ['1st','2nd','3rd'][e.enrollmentNumber - 1] ?? `${e.enrollmentNumber}th`
                      return (
                        <option key={e._id} value={e._id}>
                          {ordinal} Enrollment{e.label ? ` — ${e.label}` : ''}
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
                {enrollments.filter((e) => !e.package).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No active enrollments without a package. Create an enrollment first in the Enrollments tab.</p>
                )}
              </FormField>
              <FormField label="Package" required>
                <div className="relative">
                  <select
                    value={addForm.packageID}
                    onChange={(e) => onPkgChange(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                  >
                    <option value="">Select package…</option>
                    {allPkgs.map((p) => <option key={p._id} value={p._id}>{p.packageName}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </FormField>
              {selectedPkg && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-[12px] font-medium text-foreground">{selectedPkg.packageName}</p>
                  {selectedPkg.description && <p className="text-[11px] text-muted-foreground">{selectedPkg.description}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPkg.services?.length ?? 0} service{selectedPkg.services?.length !== 1 ? 's' : ''}
                    {' · '}
                    {selectedPkg.totalDays > 0 ? `${selectedPkg.totalDays} days validity` : 'No expiry'}
                  </p>
                </div>
              )}
              <FormField label="Purchase date (optional)">
                <input
                  type="date" value={addForm.purchaseDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={closeAdd}>Cancel</Button>
                <Button type="button" size="sm" disabled={!addForm.packageID || !addForm.enrollmentID} onClick={() => setAddStep(2)}>Next</Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Configure services ── */}
          {addStep === 2 && (
            <div className="space-y-4 mt-2">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {['Service', 'Color', 'Sessions', 'Price / Session', 'Discount', 'Disc. Amount', 'Final'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {addForm.services.map((svc, i) => (
                      <tr key={i} className={i > 0 ? 'border-t border-border' : ''}>
                        <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{svc.serviceName}</td>
                        <td className="px-3 py-2">
                          <input
                            type="color" value={svc.color || '#6366f1'}
                            onChange={(e) => updateSvc(i, 'color', e.target.value)}
                            className="h-7 w-9 rounded border border-border cursor-pointer p-0.5 bg-background"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min="0" value={svc.numberOfSessions}
                            onChange={(e) => updateSvc(i, 'numberOfSessions', e.target.value)}
                            className="h-7 w-16 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
                            <input
                              type="number" min="0" step="0.01" value={svc.pricePerSession}
                              onChange={(e) => updateSvc(i, 'pricePerSession', e.target.value)}
                              className="h-7 w-20 rounded border border-border bg-background pl-5 pr-2 text-[12px] outline-none focus:border-primary"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={svc.discountType}
                            onChange={(e) => updateSvc(i, 'discountType', e.target.value)}
                            className="h-7 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary"
                          >
                            <option value="none">None</option>
                            <option value="percentage">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min="0" step="0.01" value={svc.discountAmount}
                            disabled={svc.discountType === 'none'}
                            onChange={(e) => updateSvc(i, 'discountAmount', e.target.value)}
                            className="h-7 w-20 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary disabled:opacity-40"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">${Number(svc.finalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={6} className="px-3 py-2 text-[11px] font-medium text-muted-foreground text-right">Total</td>
                      <td className="px-3 py-2 text-[13px] font-bold text-foreground">${totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddStep(1)}>Back</Button>
                <Button type="button" size="sm" disabled={addForm.services.length === 0} onClick={() => setAddStep(3)}>Next</Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Billing ── */}
          {addStep === 3 && (
            <div className="space-y-4 mt-2">
              {/* Billing type selector */}
              <div>
                <p className="text-[12px] font-medium text-muted-foreground mb-2">Billing Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'one_time', label: 'One-time', desc: 'Full payment now' },
                    { value: 'payment_plan', label: 'Payment Plan', desc: 'Autopay installments' },
                    { value: 'flexible', label: 'Flexible', desc: 'Pay as you go' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, billingType: opt.value }))}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        addForm.billingType === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/80 bg-background'
                      }`}
                    >
                      <p className="text-[12px] font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* One-time */}
              {addForm.billingType === 'one_time' && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-muted-foreground">Billing Date</p>
                    <p className="text-[12px] font-medium text-foreground">
                      {addForm.purchaseDate
                        ? new Date(addForm.purchaseDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-[12px] text-muted-foreground">Payable Balance</p>
                    <p className="text-[15px] font-bold text-foreground">${totalAmount.toFixed(2)}</p>
                  </div>
                  <FormField label="Payment Method" required>
                    <div className="relative">
                      <select
                        value={addForm.billing.method}
                        onChange={(e) => setBilling('method', e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary capitalize"
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </FormField>
                </div>
              )}

              {/* Payment plan */}
              {addForm.billingType === 'payment_plan' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="Installments" required>
                      <input
                        type="number" min="2" max="52" value={addForm.billing.numberOfInstallments}
                        onChange={(e) => setBilling('numberOfInstallments', e.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                      />
                    </FormField>
                    <FormField label="Frequency" required>
                      <div className="relative">
                        <select
                          value={addForm.billing.frequency}
                          onChange={(e) => setBilling('frequency', e.target.value)}
                          className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Fortnightly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </FormField>
                    <FormField label="Start Date" required>
                      <input
                        type="date" value={addForm.billing.startDate}
                        onChange={(e) => setBilling('startDate', e.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                      />
                    </FormField>
                  </div>
                  {installments.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Schedule Preview</p>
                        <p className="text-[11px] text-muted-foreground">
                          ${(totalAmount / Number(addForm.billing.numberOfInstallments)).toFixed(2)} / payment
                        </p>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {installments.map((inst, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                            <span className="text-[11px] text-muted-foreground">Payment {i + 1} · {inst.date}</span>
                            <span className="text-[11px] font-medium text-foreground">${inst.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <p className="text-[11px] font-medium text-muted-foreground">Payable Balance</p>
                        <p className="text-[13px] font-bold text-foreground">${totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Flexible */}
              {addForm.billingType === 'flexible' && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    No schedule set. Payments can be recorded manually at any time.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-[12px] text-muted-foreground">Payable Balance</p>
                    <p className="text-[15px] font-bold text-foreground">${totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddStep(2)}>Back</Button>
                <Button type="button" size="sm" disabled={adding} onClick={handleAdd}>
                  {adding ? 'Adding…' : 'Add Package'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Enrollments Tab ─────────────────────────────────────────────────────────

const BLANK_ENR_FORM = {
  packageID: '',
  purchaseDate: '',
  services: [],
  billingType: 'one_time',
  billing: { method: 'cash', numberOfInstallments: 3, frequency: 'monthly', startDate: '' },
}

function EnrollmentsTab({ customerID, statusFilter }) {
  const [enrollments, setEnrollments] = useState([])
  const [detailsMap, setDetailsMap] = useState({})
  const [plansMap, setPlansMap] = useState({})
  const [allPkgs, setAllPkgs] = useState([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createLabel, setCreateLabel] = useState('')
  const [createTeacherID, setCreateTeacherID] = useState('')
  const [teachers, setTeachers] = useState([])
  const [creating, setCreating] = useState(false)

  const [addTargetEnrollment, setAddTargetEnrollment] = useState(null)
  const [addStep, setAddStep] = useState(1)
  const [addForm, setAddForm] = useState(BLANK_ENR_FORM)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [adding, setAdding] = useState(false)

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [recordPaymentTarget, setRecordPaymentTarget] = useState(null)
  const [payInstallTarget, setPayInstallTarget] = useState(null)

  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const [enrRes, allRes, teachersRes] = await Promise.all([
      api.get(`/api/enrollment?customerID=${customerID}`),
      api.get('/api/package?limit=200&isActive=true'),
      api.get('/api/teacher?limit=200&status=active'),
    ])
    if (allRes.success) setAllPkgs(allRes.data || [])
    if (teachersRes.success) setTeachers(teachersRes.data || [])
    if (enrRes.success) {
      const list = enrRes.data || []
      setEnrollments(list)
      const withPkg = list.filter((e) => e.package)
      if (withPkg.length > 0) {
        const detResults = await Promise.all(withPkg.map((e) => api.get(`/api/customer-package/${e._id}/details`)))
        const detMap = {}
        withPkg.forEach((e, i) => { if (detResults[i].success) detMap[String(e._id)] = detResults[i].data })
        setDetailsMap(detMap)
        const hasPlan = withPkg.some((e) => e.package?.billingType === 'payment_plan')
        if (hasPlan) {
          const plansRes = await api.get(`/api/payment-plan/customer/${customerID}`)
          if (plansRes.success) {
            const pm = {}
            ;(plansRes.data || []).forEach((plan) => {
              const enrId = String(plan.enrollmentID?._id ?? plan.enrollmentID)
              pm[enrId] = plan
            })
            setPlansMap(pm)
          }
        }
      }
    }
    setLoading(false)
  }, [customerID])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    const res = await api.post('/api/enrollment', {
      customerID,
      label: createLabel.trim() || undefined,
      teacherID: createTeacherID || undefined,
    })
    if (res.success) {
      toast.success('Enrollment created.')
      setCreateOpen(false)
      setCreateLabel('')
      setCreateTeacherID('')
      load()
    } else {
      toast.error(res.error || 'Failed to create enrollment.')
    }
    setCreating(false)
  }

  function openAddPackage(enrollment) {
    setAddTargetEnrollment(enrollment)
    setAddForm(BLANK_ENR_FORM)
    setSelectedPkg(null)
    setAddStep(1)
  }

  function onEnrPkgChange(pkgId) {
    const pkg = allPkgs.find((p) => String(p._id) === pkgId)
    setSelectedPkg(pkg || null)
    setAddForm((f) => ({
      ...f,
      packageID: pkgId,
      services: (pkg?.services || []).map((s) => ({
        serviceCode: s.serviceCode || '',
        serviceName: s.serviceName || '',
        color: s.color || '',
        numberOfSessions: s.numberOfSessions || 0,
        pricePerSession: s.pricePerSession || 0,
        discountType: s.discountType || 'none',
        discountAmount: s.discountAmount || 0,
        finalAmount: s.finalAmount || 0,
      })),
    }))
  }

  function updateEnrSvc(i, field, val) {
    setAddForm((f) => {
      const svcs = f.services.map((s, idx) => {
        if (idx !== i) return s
        const updated = { ...s, [field]: val }
        const price = Number(updated.pricePerSession) || 0
        const sessions = Number(updated.numberOfSessions) || 0
        let fa = price * sessions
        if (updated.discountType === 'percentage') fa -= fa * ((Number(updated.discountAmount) || 0) / 100)
        if (updated.discountType === 'fixed') fa -= Number(updated.discountAmount) || 0
        updated.finalAmount = Math.max(0, parseFloat(fa.toFixed(2)))
        return updated
      })
      return { ...f, services: svcs }
    })
  }

  function setEnrBilling(field, val) {
    setAddForm((f) => ({ ...f, billing: { ...f.billing, [field]: val } }))
  }

  const enrTotalAmount = addForm.services.reduce((s, svc) => s + (Number(svc.finalAmount) || 0), 0)

  function getEnrInstallments() {
    const { numberOfInstallments, frequency, startDate } = addForm.billing
    if (!startDate || !numberOfInstallments) return []
    const n = Number(numberOfInstallments)
    if (!n || n < 1) return []
    const amt = parseFloat((enrTotalAmount / n).toFixed(2))
    const result = []
    let d = new Date(startDate)
    for (let i = 0; i < n; i++) {
      result.push({ date: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }), amount: amt })
      if (frequency === 'weekly') d = new Date(d.getTime() + 7 * 86400000)
      else if (frequency === 'biweekly') d = new Date(d.getTime() + 14 * 86400000)
      else { d = new Date(d); d.setMonth(d.getMonth() + 1) }
    }
    return result
  }

  async function handleEnrAdd() {
    if (addForm.billingType === 'payment_plan') {
      const { numberOfInstallments, frequency, startDate } = addForm.billing
      if (!numberOfInstallments || !frequency || !startDate) {
        toast.error('Please fill all payment plan fields.')
        return
      }
    }
    setAdding(true)
    const payload = {
      customerID,
      packageID: addForm.packageID,
      enrollmentID: String(addTargetEnrollment._id),
      services: addForm.services.map((s) => ({
        ...s,
        numberOfSessions: Number(s.numberOfSessions),
        pricePerSession: Number(s.pricePerSession),
        discountAmount: Number(s.discountAmount),
        finalAmount: Number(s.finalAmount),
      })),
      billingType: addForm.billingType,
      billing:
        addForm.billingType === 'one_time'
          ? { method: addForm.billing.method }
          : addForm.billingType === 'payment_plan'
          ? { numberOfInstallments: Number(addForm.billing.numberOfInstallments), frequency: addForm.billing.frequency, startDate: addForm.billing.startDate }
          : {},
    }
    if (addForm.purchaseDate) payload.purchaseDate = addForm.purchaseDate
    const res = await api.post('/api/customer-package/add', payload)
    if (res.success) {
      toast.success('Package added.')
      setAddTargetEnrollment(null)
      load()
    } else {
      toast.error(res.error || 'Failed to add package.')
    }
    setAdding(false)
  }

  async function handleEnrCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    const res = await api.patch(`/api/customer-package/${cancelTarget.enrollmentId}/cancel`)
    if (res.success) { toast.success('Package cancelled.'); setCancelTarget(null); load() }
    else toast.error(res.error || 'Failed.')
    setCancelling(false)
  }

  if (loading) return <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>

  const enrInstallments = getEnrInstallments()

  const filteredEnrollments = statusFilter
    ? enrollments.filter((e) => {
        if (statusFilter === 'active') return e.status === 'active'
        if (statusFilter === 'completed') return e.status !== 'active'
        return true
      })
    : enrollments

  const isActiveTab = statusFilter === 'active'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{filteredEnrollments.length} enrollment{filteredEnrollments.length !== 1 ? 's' : ''}</p>
        {isActiveTab && (
          <Button size="sm" className="h-8 text-[12px]" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Enrollment
          </Button>
        )}
      </div>

      {filteredEnrollments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          {isActiveTab ? 'No active enrollments. Click "New Enrollment" to create one.' : 'No completed enrollments yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnrollments.map((enr) => {
            const det = enr.package ? detailsMap[String(enr._id)] : null
            const cp = enr.package ?? null
            const billing = det?.billing ?? {}
            const services = det?.services ?? cp?.services ?? []
            const totalPaid = billing.totalPaid ?? cp?.totalPaid ?? 0
            const collected = billing.amountCollected ?? cp?.amountCollected ?? 0
            const outstanding = billing.outstanding ?? Math.max(0, totalPaid - collected)
            const refunded = billing.totalRefunded ?? 0
            const ordinal = ['1st','2nd','3rd'][enr.enrollmentNumber - 1] ?? `${enr.enrollmentNumber}th`

            return (
              <div key={enr._id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Enrollment header bar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {ordinal} Enrollment
                    </span>
                    {enr.label && (
                      <span className="text-[12px] font-medium text-foreground">· {enr.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {enr.teacherID?.name && (
                      <span className="text-[11px] text-muted-foreground">{enr.teacherID.name}</span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(enr.status)}`}>
                      {enr.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(enr.createdAt)}</span>
                  </div>
                </div>

                {/* No package yet */}
                {!cp ? (
                  <div className="flex items-center justify-between px-5 py-8">
                    <p className="text-[13px] text-muted-foreground">No package assigned yet.</p>
                    {enr.status === 'active' && (
                      <Button size="sm" className="h-8 text-[12px]" onClick={() => openAddPackage(enr)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Package
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-5">
                    {/* Package header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {cp.packageRef?.color && (
                          <div className="h-9 w-9 rounded-lg shrink-0 border border-black/10" style={{ backgroundColor: cp.packageRef.color }} />
                        )}
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{cp.packageName ?? cp.packageRef?.packageName ?? 'Package'}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Purchased {formatDate(cp.purchaseDate)}
                            {cp.expiryDate ? ` · Expires ${formatDate(cp.expiryDate)}` : ' · No expiry'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                        {cp.billingType && cp.billingType !== 'one_time' && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-violet-500/10 text-violet-600 capitalize">
                            {cp.billingType.replace('_', ' ')}
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentStatusColor(cp.paymentStatus)}`}>
                          {cp.paymentStatus ?? 'unpaid'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(cp.status)}`}>
                          {cp.status}
                        </span>
                        {cp.status === 'active' && cp.paymentStatus !== 'paid' && cp.billingType !== 'payment_plan' && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setRecordPaymentTarget({ enrollmentId: enr._id, outstanding })}
                          >
                            <CreditCard className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                        {cp.status === 'active' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                            onClick={() => setCancelTarget({ enrollmentId: enr._id, packageName: cp.packageName })}
                          >
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Billing summary */}
                    <div className="mt-4 grid grid-cols-4 gap-3 rounded-lg bg-muted/40 p-3">
                      {[
                        { label: 'Total Price', value: `$${Number(totalPaid).toFixed(2)}` },
                        { label: 'Collected', value: `$${Number(collected).toFixed(2)}`, cls: 'text-emerald-600' },
                        { label: 'Outstanding', value: `$${Number(outstanding).toFixed(2)}`, cls: outstanding > 0 ? 'text-rose-600' : 'text-muted-foreground' },
                        { label: 'Refunded', value: `$${Number(refunded).toFixed(2)}`, cls: refunded > 0 ? 'text-amber-600' : 'text-muted-foreground' },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                          <p className={`text-[13px] font-semibold ${cls ?? 'text-foreground'}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Services */}
                    {services.length > 0 && (() => {
                      let totalEnrolled = 0, totalUsed = 0, totalSched = 0, totalRemaining = 0, totalCredit = 0
                      const rows = services.map((svc, i) => {
                        const sessTotal = svc.sessionsTotal ?? 0
                        const sessUsed = svc.sessionsUsed ?? 0
                        const sessSched = svc.sessionsScheduled ?? 0
                        const sessRemaining = svc.sessionsRemaining ?? Math.max(0, sessTotal - sessUsed - sessSched)
                        const svcCredit = sessRemaining * (Number(svc.pricePerSession) || 0)
                        totalEnrolled += sessTotal; totalUsed += sessUsed; totalSched += sessSched
                        totalRemaining += sessRemaining; totalCredit += svcCredit
                        return { svc, i, sessTotal, sessUsed, sessSched, sessRemaining, svcCredit }
                      })
                      return (
                        <div className="mt-4 border-t border-border pt-4">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Services</p>
                          <div className="rounded-lg border border-border overflow-hidden">
                            {/* Column headers */}
                            <div className="grid bg-muted/40 border-b border-border px-3 py-2" style={{ gridTemplateColumns: '1fr 80px 80px 80px 80px 100px' }}>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Service</span>
                              {['Enrolled', 'Used', 'Scheduled', 'Remaining', 'Credit Value'].map((h) => (
                                <span key={h} className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right">{h}</span>
                              ))}
                            </div>
                            {/* Service rows */}
                            {rows.map(({ svc, i, sessTotal, sessUsed, sessSched, sessRemaining, svcCredit }) => (
                              <div key={i} className={`grid items-center px-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`} style={{ gridTemplateColumns: '1fr 80px 80px 80px 80px 100px' }}>
                                <div>
                                  <div className="flex items-center gap-2">
                                    {svc.color && <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: svc.color }} />}
                                    <span className="text-[12px] font-medium text-foreground">{svc.serviceName}</span>
                                  </div>
                                  {svc.pricePerSession > 0 && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 pl-[18px]">
                                      ${Number(svc.pricePerSession).toFixed(2)}/session
                                      {svc.discountType && svc.discountType !== 'none' && (
                                        <span className="ml-1 text-amber-600">· {svc.discountType === 'percentage' ? `${svc.discountAmount}% off` : `-$${svc.discountAmount}`}</span>
                                      )}
                                    </p>
                                  )}
                                  <div className="mt-1.5 pl-[18px]">
                                    <SessionBar used={sessUsed} total={sessTotal} />
                                  </div>
                                </div>
                                <span className="text-[13px] font-semibold text-foreground text-right">{sessTotal}</span>
                                <span className={`text-[13px] font-semibold text-right ${sessUsed > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>{sessUsed}</span>
                                <span className={`text-[13px] font-semibold text-right ${sessSched > 0 ? 'text-violet-600' : 'text-muted-foreground'}`}>{sessSched}</span>
                                <span className={`text-[13px] font-semibold text-right ${sessRemaining > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{sessRemaining}</span>
                                <span className={`text-[13px] font-semibold text-right ${svcCredit > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>${svcCredit.toFixed(2)}</span>
                              </div>
                            ))}
                            {/* Totals row */}
                            {rows.length > 1 && (
                              <div className="grid items-center px-3 py-2.5 border-t-2 border-border bg-muted/30" style={{ gridTemplateColumns: '1fr 80px 80px 80px 80px 100px' }}>
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total</span>
                                <span className="text-[13px] font-bold text-foreground text-right">{totalEnrolled}</span>
                                <span className={`text-[13px] font-bold text-right ${totalUsed > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>{totalUsed}</span>
                                <span className={`text-[13px] font-bold text-right ${totalSched > 0 ? 'text-violet-600' : 'text-muted-foreground'}`}>{totalSched}</span>
                                <span className={`text-[13px] font-bold text-right ${totalRemaining > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{totalRemaining}</span>
                                <span className={`text-[13px] font-bold text-right ${totalCredit > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>${totalCredit.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Payment plan installments */}
                    {cp.billingType === 'payment_plan' && (() => {
                      const plan = plansMap[String(enr._id)]
                      if (!plan) return null
                      const paidCount = plan.installments.filter((i) => i.status === 'paid').length
                      return (
                        <div className="mt-4 border-t border-border pt-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Payment Schedule</p>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                plan.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                plan.status === 'cancelled' ? 'bg-muted text-muted-foreground' :
                                'bg-violet-500/10 text-violet-600'
                              }`}>{plan.status}</span>
                              <span className="text-[11px] text-muted-foreground">{paidCount} / {plan.numberOfInstallments} paid</span>
                            </div>
                          </div>
                          <div className="rounded-lg border border-border overflow-hidden">
                            {plan.installments.map((inst, idx) => (
                              <div key={idx} className={`flex items-center justify-between px-3 py-2.5 ${idx > 0 ? 'border-t border-border' : ''} ${inst.status === 'paid' ? 'bg-emerald-500/5' : ''}`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    inst.status === 'paid' ? 'bg-emerald-600 text-white' :
                                    inst.status === 'failed' ? 'bg-rose-600 text-white' :
                                    'bg-muted text-muted-foreground'
                                  }`}>{inst.status === 'paid' ? '✓' : idx + 1}</div>
                                  <div>
                                    <p className="text-[12px] text-foreground font-medium">
                                      Payment {idx + 1}
                                      {inst.status === 'paid' && <span className="ml-1.5 text-[11px] font-normal text-emerald-600">Paid</span>}
                                      {inst.status === 'failed' && <span className="ml-1.5 text-[11px] font-normal text-rose-600">Failed</span>}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Due {new Date(inst.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[13px] font-semibold text-foreground">${Number(inst.amount).toFixed(2)}</p>
                                  {inst.status === 'pending' && plan.status === 'active' && cp.status === 'active' && (
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => setPayInstallTarget({ plan, index: idx })}
                                    >
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {plan.nextPaymentDate && plan.status === 'active' && (
                            <p className="text-[11px] text-muted-foreground mt-1.5">
                              Next payment due: {new Date(plan.nextPaymentDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Record Payment dialog */}
      <RecordPaymentDialog
        open={Boolean(recordPaymentTarget)}
        onClose={() => setRecordPaymentTarget(null)}
        customerID={customerID}
        enrollmentID={recordPaymentTarget?.enrollmentId}
        outstanding={recordPaymentTarget?.outstanding}
        onSuccess={load}
      />

      {/* Pay installment dialog */}
      <PayInstallmentDialog
        open={Boolean(payInstallTarget)}
        onClose={() => setPayInstallTarget(null)}
        plan={payInstallTarget?.plan}
        installmentIndex={payInstallTarget?.index}
        onSuccess={load}
      />

      {/* Cancel confirm */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(v) => { if (!v) setCancelTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Package</DialogTitle></DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">
            Cancel <span className="font-semibold text-foreground">{cancelTarget?.packageName}</span>? Sessions will no longer be used for new bookings.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button variant="destructive" size="sm" disabled={cancelling} onClick={handleEnrCancel}>
              {cancelling ? 'Cancelling…' : 'Cancel Package'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Enrollment dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setCreateLabel(''); setCreateTeacherID('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Enrollment</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <FormField label="Teacher" required>
              <div className="relative">
                <select
                  value={createTeacherID}
                  onChange={(e) => setCreateTeacherID(e.target.value)}
                  required
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                >
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name || t.email}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </FormField>
            <FormField label="Label (optional)">
              <input
                type="text"
                placeholder="e.g. Term 1 2026, Trial…"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); setCreateLabel(''); setCreateTeacherID('') }}>Cancel</Button>
              <Button type="submit" size="sm" disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Package dialog (3 steps, for a specific enrollment) */}
      <Dialog open={Boolean(addTargetEnrollment)} onOpenChange={(v) => { if (!v) setAddTargetEnrollment(null) }}>
        <DialogContent className={addStep === 2 ? 'max-w-3xl' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>Add Package</DialogTitle>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= addStep ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {addStep === 1 ? 'Step 1 of 3 — Choose package' : addStep === 2 ? 'Step 2 of 3 — Configure services & pricing' : 'Step 3 of 3 — Set billing'}
            </p>
          </DialogHeader>

          {addStep === 1 && (
            <div className="space-y-4 mt-2">
              <FormField label="Package" required>
                <div className="relative">
                  <select
                    value={addForm.packageID}
                    onChange={(e) => onEnrPkgChange(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                  >
                    <option value="">Select package…</option>
                    {allPkgs.map((p) => <option key={p._id} value={p._id}>{p.packageName}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </FormField>
              {selectedPkg && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-[12px] font-medium text-foreground">{selectedPkg.packageName}</p>
                  {selectedPkg.description && <p className="text-[11px] text-muted-foreground">{selectedPkg.description}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPkg.services?.length ?? 0} service{selectedPkg.services?.length !== 1 ? 's' : ''}
                    {' · '}{selectedPkg.totalDays > 0 ? `${selectedPkg.totalDays} days validity` : 'No expiry'}
                  </p>
                </div>
              )}
              <FormField label="Purchase date (optional)">
                <input
                  type="date" value={addForm.purchaseDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddTargetEnrollment(null)}>Cancel</Button>
                <Button type="button" size="sm" disabled={!addForm.packageID} onClick={() => setAddStep(2)}>Next</Button>
              </div>
            </div>
          )}

          {addStep === 2 && (
            <div className="space-y-4 mt-2">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {['Service', 'Color', 'Sessions', 'Price / Session', 'Discount', 'Disc. Amount', 'Final'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {addForm.services.map((svc, i) => (
                      <tr key={i} className={i > 0 ? 'border-t border-border' : ''}>
                        <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{svc.serviceName}</td>
                        <td className="px-3 py-2">
                          <input type="color" value={svc.color || '#6366f1'} onChange={(e) => updateEnrSvc(i, 'color', e.target.value)} className="h-7 w-9 rounded border border-border cursor-pointer p-0.5 bg-background" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" value={svc.numberOfSessions} onChange={(e) => updateEnrSvc(i, 'numberOfSessions', e.target.value)} className="h-7 w-16 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
                            <input type="number" min="0" step="0.01" value={svc.pricePerSession} onChange={(e) => updateEnrSvc(i, 'pricePerSession', e.target.value)} className="h-7 w-20 rounded border border-border bg-background pl-5 pr-2 text-[12px] outline-none focus:border-primary" />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={svc.discountType} onChange={(e) => updateEnrSvc(i, 'discountType', e.target.value)} className="h-7 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary">
                            <option value="none">None</option>
                            <option value="percentage">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={svc.discountAmount} disabled={svc.discountType === 'none'} onChange={(e) => updateEnrSvc(i, 'discountAmount', e.target.value)} className="h-7 w-20 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary disabled:opacity-40" />
                        </td>
                        <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">${Number(svc.finalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={6} className="px-3 py-2 text-[11px] font-medium text-muted-foreground text-right">Total</td>
                      <td className="px-3 py-2 text-[13px] font-bold text-foreground">${enrTotalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddStep(1)}>Back</Button>
                <Button type="button" size="sm" disabled={addForm.services.length === 0} onClick={() => setAddStep(3)}>Next</Button>
              </div>
            </div>
          )}

          {addStep === 3 && (
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-[12px] font-medium text-muted-foreground mb-2">Billing Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'one_time', label: 'One-time', desc: 'Full payment now' },
                    { value: 'payment_plan', label: 'Payment Plan', desc: 'Autopay installments' },
                    { value: 'flexible', label: 'Flexible', desc: 'Pay as you go' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setAddForm((f) => ({ ...f, billingType: opt.value }))}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${addForm.billingType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 bg-background'}`}>
                      <p className="text-[12px] font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {addForm.billingType === 'one_time' && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-[12px] text-muted-foreground">Payable Balance</p>
                    <p className="text-[15px] font-bold text-foreground">${enrTotalAmount.toFixed(2)}</p>
                  </div>
                  <FormField label="Payment Method" required>
                    <div className="relative">
                      <select value={addForm.billing.method} onChange={(e) => setEnrBilling('method', e.target.value)} className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary capitalize">
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </FormField>
                </div>
              )}

              {addForm.billingType === 'payment_plan' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="Installments" required>
                      <input type="number" min="2" max="52" value={addForm.billing.numberOfInstallments} onChange={(e) => setEnrBilling('numberOfInstallments', e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary" />
                    </FormField>
                    <FormField label="Frequency" required>
                      <div className="relative">
                        <select value={addForm.billing.frequency} onChange={(e) => setEnrBilling('frequency', e.target.value)} className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary">
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Fortnightly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </FormField>
                    <FormField label="Start Date" required>
                      <input type="date" value={addForm.billing.startDate} onChange={(e) => setEnrBilling('startDate', e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary" />
                    </FormField>
                  </div>
                  {enrInstallments.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Schedule Preview</p>
                        <p className="text-[11px] text-muted-foreground">${(enrTotalAmount / Number(addForm.billing.numberOfInstallments)).toFixed(2)} / payment</p>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {enrInstallments.map((inst, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                            <span className="text-[11px] text-muted-foreground">Payment {i + 1} · {inst.date}</span>
                            <span className="text-[11px] font-medium text-foreground">${inst.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <p className="text-[11px] font-medium text-muted-foreground">Payable Balance</p>
                        <p className="text-[13px] font-bold text-foreground">${enrTotalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {addForm.billingType === 'flexible' && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                  <p className="text-[12px] text-muted-foreground">No schedule set. Payments can be recorded manually at any time.</p>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-[12px] text-muted-foreground">Payable Balance</p>
                    <p className="text-[15px] font-bold text-foreground">${enrTotalAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddStep(2)}>Back</Button>
                <Button type="button" size="sm" disabled={adding} onClick={handleEnrAdd}>
                  {adding ? 'Adding…' : 'Add Package'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Payment History Tab ─────────────────────────────────────────────────────

function PaymentsTab({ customerID }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refundTarget, setRefundTarget] = useState(null)
  const LIMIT = 20

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const res = await api.get(`/api/payment/customer/${customerID}?page=${p}&limit=${LIMIT}`)
    if (res.success) {
      setPayments(res.data || [])
      setTotal(res.meta?.total ?? (res.data?.length ?? 0))
    }
    setLoading(false)
  }, [customerID])

  useEffect(() => { load(page) }, [load, page])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  if (loading) return <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{total} transaction{total !== 1 ? 's' : ''}</p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          No payment records yet.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Date', 'Type', 'Amount', 'Method', 'Package', 'Processed By', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => {
                  const badge = paymentTypeBadge(p.type)
                  return (
                    <tr key={p._id} className={`${i > 0 ? 'border-t border-border' : ''} hover:bg-muted/20`}>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${p.type === 'refund' ? 'text-rose-600' : 'text-foreground'}`}>
                        {p.type === 'refund' ? '-' : ''}${Number(p.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{p.method}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.customerPackageID?.packageID?.packageName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.processedBy?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                          p.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-rose-500/10 text-rose-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.type !== 'refund' && p.status === 'completed' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-rose-600"
                            onClick={() => setRefundTarget(p)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[12px]" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" className="h-7 text-[12px]" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <IssueRefundDialog
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        payment={refundTarget}
        onSuccess={() => load(page)}
      />
    </div>
  )
}

// ─── Lessons Tab ──────────────────────────────────────────────────────────────

function LessonsTab({ customer, onUpdated }) {
  const [allLessons, setAllLessons] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(null)
  const toast = useToast()

  const assigned = customer.classAssigned || []

  useEffect(() => {
    api.get('/api/lesson?limit=200').then((res) => {
      if (res.success) setAllLessons(res.data || [])
    })
  }, [])

  const unassignedLessons = allLessons.filter(
    (l) => !assigned.some((a) => String(a._id) === String(l._id))
  )

  async function handleAssign(e) {
    e.preventDefault()
    if (!selected.length) return
    setSaving(true)
    const res = await api.post(`/api/customer/${customer._id}/assign-lessons`, { lessonIds: selected })
    if (res.success) {
      toast.success('Lessons assigned.')
      onUpdated()
      setAssignOpen(false)
      setSelected([])
    } else toast.error(res.error || 'Failed.')
    setSaving(false)
  }

  async function handleRemove(lessonId) {
    setRemoving(lessonId)
    const res = await api.post(`/api/customer/${customer._id}/unassign-lessons`, { lessonIds: [lessonId] })
    if (res.success) { toast.success('Lesson removed.'); onUpdated() }
    else toast.error(res.error || 'Failed.')
    setRemoving(null)
  }

  function toggleSelect(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{assigned.length} lesson{assigned.length !== 1 ? 's' : ''} assigned</p>
        <Button size="sm" className="h-8 text-[12px]" onClick={() => { setSelected([]); setAssignOpen(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Assign Lesson
        </Button>
      </div>

      {assigned.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          No lessons assigned yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {assigned.map((lesson, i) => (
            <div
              key={lesson._id}
              className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <div className="flex items-center gap-3">
                {lesson.color && (
                  <div className="h-6 w-6 rounded shrink-0 border border-black/10" style={{ backgroundColor: lesson.color }} />
                )}
                <div>
                  <p className="text-[13px] text-foreground font-medium">{lesson.name}</p>
                  {lesson.duration && (
                    <p className="text-[11px] text-muted-foreground">{lesson.duration} min · Unit {lesson.unit ?? 1}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                disabled={removing === lesson._id}
                onClick={() => handleRemove(lesson._id)}
              >
                <X className="h-3.5 w-3.5 mr-1" />{removing === lesson._id ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={(v) => { if (!v) setAssignOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Lessons</DialogTitle></DialogHeader>
          {unassignedLessons.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-4">All lessons are already assigned.</p>
          ) : (
            <form onSubmit={handleAssign} className="space-y-3 mt-2">
              <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                {unassignedLessons.map((l) => (
                  <label key={l._id} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(l._id)}
                      onChange={() => toggleSelect(l._id)}
                      className="rounded border-border"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {l.color && <div className="h-4 w-4 rounded shrink-0 border border-black/10" style={{ backgroundColor: l.color }} />}
                      <span className="text-[13px] text-foreground truncate">{l.name}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving || !selected.length}>
                  {saving ? 'Assigning…' : `Assign ${selected.length > 0 ? `(${selected.length})` : ''}`}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ customer, onUpdated }) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pinningId, setPinningId] = useState(null)
  const toast = useToast()

  const notes = [...(customer.notes || [])].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  async function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    const res = await api.post(`/api/customer/${customer._id}/notes`, { text: text.trim() })
    if (res.success) { toast.success('Note added.'); setText(''); onUpdated() }
    else toast.error(res.error || 'Failed.')
    setAdding(false)
  }

  async function handlePin(noteId) {
    setPinningId(noteId)
    await api.patch(`/api/customer/${customer._id}/notes/${noteId}`)
    onUpdated()
    setPinningId(null)
  }

  async function handleDelete(noteId) {
    setDeletingId(noteId)
    const res = await api.delete(`/api/customer/${customer._id}/notes/${noteId}`)
    if (res.success) { toast.success('Note deleted.'); onUpdated() }
    else toast.error(res.error || 'Failed.')
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text" value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          className="flex-1 h-9 rounded-lg border border-border bg-card px-3 text-[13px] outline-none focus:border-primary"
        />
        <Button type="submit" size="sm" className="h-9 px-4 text-[12px]" disabled={adding || !text.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </form>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note._id}
              className={`rounded-xl border bg-card px-4 py-3.5 ${note.isPinned ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] text-foreground leading-relaxed flex-1">{note.text}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    disabled={pinningId === note._id}
                    onClick={() => handlePin(note._id)}
                  >
                    {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === note._id}
                    onClick={() => handleDelete(note._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{formatDate(note.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')

  const load = useCallback(async () => {
    const [custRes, locRes] = await Promise.all([
      api.get(`/api/customer/${id}`),
      api.get('/api/location?limit=200'),
    ])
    if (custRes.success) setCustomer(custRes.data)
    if (locRes.success) setLocations(locRes.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <LoadingSpinner />
        </div>
      </MainLayout>
    )
  }

  if (!customer) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
          <p className="text-[13px] text-muted-foreground">Customer not found.</p>
          <Button variant="outline" onClick={() => router.back()}>Go back</Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-[13px] font-semibold bg-primary/10 text-primary">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground truncate">{customer.name}</h1>
              <p className="text-[13px] text-muted-foreground truncate">{customer.email}</p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
              ${(customer.credits ?? 0).toFixed(2)} credits
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ id: tabId, label, Icon }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors',
                tab === tabId
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === 'profile' && <ProfileTab customer={customer} locations={locations} onUpdated={load} />}
          {tab === 'active-enrollments' && <EnrollmentsTab customerID={customer._id} statusFilter="active" />}
          {tab === 'completed-enrollments' && <EnrollmentsTab customerID={customer._id} statusFilter="completed" />}
          {tab === 'payments' && <PaymentsTab customerID={customer._id} />}
          {tab === 'lessons' && <LessonsTab customer={customer} onUpdated={load} />}
          {tab === 'notes' && <NotesTab customer={customer} onUpdated={load} />}
        </div>
      </div>
    </MainLayout>
  )
}
