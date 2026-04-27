'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Plus, Trash2, Pin, PinOff,
  Package, BookOpen, StickyNote, User, ChevronDown, X, Check,
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

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'packages', label: 'Packages', Icon: Package },
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
    })
    setEditing(true)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    const res = await api.put(`/api/customer/${customer._id}`, {
      name: form.name.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      locationID: form.locationID || undefined,
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
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Name', value: customer.name },
              { label: 'Email', value: customer.email },
              { label: 'Phone', value: customer.phoneNumber || '—' },
              { label: 'Location', value: locationName(customer.locationID?._id ?? customer.locationID) },
              { label: 'Joined', value: formatDate(customer.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                <p className="text-[13px] text-foreground">{value}</p>
              </div>
            ))}
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

// ─── Packages Tab ─────────────────────────────────────────────────────────────

function PackagesTab({ customerID }) {
  const [customerPkgs, setCustomerPkgs] = useState([])
  const [allPkgs, setAllPkgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [sellOpen, setSellOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [form, setForm] = useState({ packageID: '', purchaseDate: '', totalPaid: '' })
  const [selling, setSelling] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const [pkgRes, allRes] = await Promise.all([
      api.get(`/api/customer-package/customer/${customerID}`),
      api.get('/api/package?limit=200&isActive=true'),
    ])
    if (pkgRes.success) setCustomerPkgs(pkgRes.data || [])
    if (allRes.success) setAllPkgs(allRes.data || [])
    setLoading(false)
  }, [customerID])

  useEffect(() => { load() }, [load])

  async function handleSell(e) {
    e.preventDefault()
    if (!form.packageID) return
    setSelling(true)
    const payload = { customerID, packageID: form.packageID }
    if (form.purchaseDate) payload.purchaseDate = form.purchaseDate
    if (form.totalPaid !== '') payload.totalPaid = Number(form.totalPaid)
    const res = await api.post('/api/customer-package', payload)
    if (res.success) {
      toast.success('Package sold to customer.')
      setSellOpen(false)
      setForm({ packageID: '', purchaseDate: '', totalPaid: '' })
      load()
    } else {
      toast.error(res.error || 'Failed to sell package.')
    }
    setSelling(false)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{customerPkgs.length} package{customerPkgs.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="h-8 text-[12px]" onClick={() => setSellOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Sell Package
        </Button>
      </div>

      {customerPkgs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          No packages yet. Click "Sell Package" to assign one.
        </div>
      ) : (
        <div className="space-y-3">
          {customerPkgs.map((cp) => (
            <div key={cp._id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {cp.packageID?.color && (
                    <div className="h-9 w-9 rounded-lg shrink-0 border border-black/10" style={{ backgroundColor: cp.packageID.color }} />
                  )}
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{cp.packageID?.packageName ?? 'Package'}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Purchased {formatDate(cp.purchaseDate)}
                      {cp.expiryDate ? ` · Expires ${formatDate(cp.expiryDate)}` : ' · No expiry'}
                      {cp.totalPaid != null ? ` · $${Number(cp.totalPaid).toFixed(2)} paid` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(cp.status)}`}>
                    {cp.status}
                  </span>
                  {cp.status === 'active' && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                      onClick={() => setCancelTarget(cp)}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>

              {cp.services?.length > 0 && (
                <div className="mt-4 space-y-2.5 border-t border-border pt-4">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Sessions</p>
                  {cp.services.map((svc, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] text-foreground">{svc.serviceName}</p>
                        <span className="text-[11px] text-muted-foreground">{svc.sessionsUsed} used</span>
                      </div>
                      <SessionBar used={svc.sessionsUsed} total={svc.sessionsTotal} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sell Package modal */}
      <Dialog open={sellOpen} onOpenChange={(v) => { if (!v) setSellOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sell Package</DialogTitle></DialogHeader>
          <form onSubmit={handleSell} className="space-y-4 mt-2">
            <FormField label="Package" required>
              <div className="relative">
                <select
                  value={form.packageID}
                  onChange={(e) => setForm({ ...form, packageID: e.target.value })}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary"
                >
                  <option value="">Select package…</option>
                  {allPkgs.map((p) => (
                    <option key={p._id} value={p._id}>{p.packageName}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </FormField>
            <FormField label="Purchase date (optional)">
              <input
                type="date" value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
              />
            </FormField>
            <FormField label="Amount paid (leave blank for package default)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
                <input
                  type="number" min="0" step="0.01" value={form.totalPaid}
                  onChange={(e) => setForm({ ...form, totalPaid: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-3 text-[13px] outline-none focus:border-primary"
                />
              </div>
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setSellOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={selling || !form.packageID}>{selling ? 'Saving…' : 'Sell'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(v) => { if (!v) setCancelTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Package</DialogTitle></DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">
            Cancel <span className="font-semibold text-foreground">{cancelTarget?.packageID?.packageName}</span>? Sessions will no longer be used for new bookings.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button variant="destructive" size="sm" disabled={cancelling} onClick={handleCancel}>
              {cancelling ? 'Cancelling…' : 'Cancel Package'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
          {tab === 'packages' && <PackagesTab customerID={customer._id} />}
          {tab === 'lessons' && <LessonsTab customer={customer} onUpdated={load} />}
          {tab === 'notes' && <NotesTab customer={customer} onUpdated={load} />}
        </div>
      </div>
    </MainLayout>
  )
}
