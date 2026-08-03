'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { UserPlus, CalendarClock, Trash2, StickyNote, Send } from 'lucide-react'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { useToast } from '@/components/ui/toast'
import { cn, formatDateTime } from '@/lib/utils'
import LocationSelector from '@/components/shared/LocationSelector'
import PhoneNumberInput from '@/components/shared/PhoneNumberInput'
import { useLeadStages } from '@/lib/lead-stages'

const bookingStatusOptions = [
  { value: 'Not Booked', label: 'Not Booked' },
  { value: 'Booked', label: 'Booked' },
]

const emptyLead = {
  name: '',
  email: '',
  phoneNumber: '',
  location: '',
  locationID: [],
  stage: 'new',
  bookingStatus: 'Not Booked',
  assignedAiAgent: '',
  assignedHumanAgent: '',
  isEscalated: false,
  agentFollowupEnabled: true,
  callbackDate: '',
  notes: '',
}

const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : '')

export default function LeadsDialog({
  open,
  onClose,
  leads = [],
  onRefresh,
  initialLeadId = null,
  viewOnly = false,
}) {
  const [editingLead, setEditingLead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('create')
  const [savingCallbackDate, setSavingCallbackDate] = useState(false)
  const [savedCallbackDate, setSavedCallbackDate] = useState('')
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false)
  const [paymentLinkForm, setPaymentLinkForm] = useState({ amount: '', description: 'Intro Lesson', channel: 'sms', showForm: false })
  const toast = useToast()
  const { stages: stageOptions } = useLeadStages()

  const PAYMENT_LINK_STAGES = new Set(['engaged', 're_engaged', 'pending_payment'])

  async function handleSendPaymentLink() {
    if (!editingLead?._id) return
    const { amount, description, channel } = paymentLinkForm
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error({ title: 'Validation', message: 'Enter a valid amount' })
      return
    }
    if (!description) {
      toast.error({ title: 'Validation', message: 'Enter a description' })
      return
    }
    setSendingPaymentLink(true)
    const result = await api.post('/api/payment-request/lead', {
      leadID: editingLead._id,
      amount: Number(amount),
      description,
      channel,
    })
    setSendingPaymentLink(false)
    if (result.success) {
      toast.success({ title: 'Payment link sent', message: `$${Number(amount).toFixed(2)} link sent via ${channel.toUpperCase()}` })
      setPaymentLinkForm((p) => ({ ...p, showForm: false }))
      onRefresh?.()
    } else {
      toast.error({ title: 'Failed to send', message: result.error || 'Unable to send the payment link' })
    }
  }

  useEffect(() => {
    if (!open) {
      setEditingLead(null)
      setMode('create')
      return
    }
    if (initialLeadId && leads && leads.length > 0) {
      const found = leads.find((l) => l._id === initialLeadId)
      if (found) {
        const initialCallbackDate = toDateInputValue(found.callbackDate)
        setEditingLead({ ...found, callbackDate: initialCallbackDate, notes: Array.isArray(found.notes) ? found.notes : [] })
        setSavedCallbackDate(initialCallbackDate)
        setMode(viewOnly ? 'view' : 'edit')
      }
    } else {
      setEditingLead({ ...emptyLead })
      setMode('create')
    }
  }, [open, initialLeadId, leads, viewOnly])

  function openEdit(lead) {
    setEditingLead({ ...lead })
    setMode('edit')
  }

  function openCreate() {
    setEditingLead({ ...emptyLead })
    setMode('create')
  }

  function closeEdit() {
    setEditingLead(null)
    setMode('create')
  }

  async function saveLead() {
    if (viewOnly) return
    if (!editingLead) return

    if (!editingLead.name || !editingLead.email || !editingLead.phoneNumber) {
      toast.error({ title: 'Validation Error', message: 'Name, email, and phone number are required' })
      return
    }

    const selectedLocationIDs = (
      Array.isArray(editingLead.locationID)
        ? editingLead.locationID
        : editingLead.locationID
          ? [editingLead.locationID]
          : []
    )
      .map((l) => String(l?._id ?? l))
      .filter(Boolean)

    if (selectedLocationIDs.length === 0) {
      toast.error({ title: 'Validation Error', message: 'Please select at least one location' })
      return
    }

    const user = getCurrentUser()
    if (!user?.organisationID && !editingLead._id) {
      toast.error({ title: 'Validation Error', message: 'You must be logged in to an organisation to create leads' })
      return
    }

    setLoading(true)
    try {
      if (editingLead._id) {
        const result = await api.put(`/api/lead/${editingLead._id}`, {
          name: editingLead.name,
          email: editingLead.email,
          phoneNumber: editingLead.phoneNumber,
          location: editingLead.location,
          locationID: selectedLocationIDs,
          stage: editingLead.stage,
          bookingStatus: editingLead.bookingStatus,
          assignedAiAgent: editingLead.assignedAiAgent || '',
          assignedHumanAgent: editingLead.assignedHumanAgent || '',
          isEscalated: editingLead.isEscalated || false,
          agentFollowupEnabled: editingLead.agentFollowupEnabled !== false,
          callbackDate: editingLead.callbackDate || null,
        })
        if (result.success) {
          toast.success({ title: 'Saved', message: 'Lead updated successfully' })
          closeEdit()
          onRefresh && onRefresh()
          onClose?.()
        } else {
          toast.error({ title: 'Save failed', message: result.error || 'Unable to update lead' })
        }
      } else {
        const payload = {
          ...editingLead,
          locationID: selectedLocationIDs,
          organisationID: user?.organisationID,
          agentFollowupEnabled: editingLead.agentFollowupEnabled !== false,
          callbackDate: editingLead.callbackDate || undefined,
        }
        const result = await api.post('/api/lead', payload)
        if (result.success) {
          toast.success({ title: 'Created', message: 'Lead created successfully' })
          closeEdit()
          onRefresh && onRefresh()
          onClose?.()
        } else {
          toast.error({ title: 'Create failed', message: result.error || 'Unable to create lead' })
        }
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  async function saveCallbackDate() {
    if (!editingLead?._id) return
    setSavingCallbackDate(true)
    try {
      const result = await api.put(`/api/lead/${editingLead._id}`, {
        callbackDate: editingLead.callbackDate || null,
      })
      if (result.success) {
        toast.success({ title: 'Saved', message: 'Callback date updated' })
        setSavedCallbackDate(editingLead.callbackDate || '')
        onRefresh && onRefresh()
      } else {
        toast.error({ title: 'Save failed', message: result.error || 'Unable to update callback date' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error occurred' })
    } finally {
      setSavingCallbackDate(false)
    }
  }

  if (!editingLead) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {mode === 'view' ? 'Lead Details' : mode === 'edit' ? 'Edit Lead' : 'Create New Lead'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'view'
              ? 'View lead information'
              : mode === 'edit'
              ? 'Update lead information'
              : 'Add a new lead to your CRM'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                value={editingLead.name || ''}
                onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                disabled={viewOnly}
                placeholder="Enter lead name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={editingLead.email || ''}
                onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                disabled={viewOnly}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number *</label>
              <PhoneNumberInput
                value={editingLead.phoneNumber || ''}
                onChange={(value) => setEditingLead({ ...editingLead, phoneNumber: value })}
                disabled={viewOnly}
                placeholder="e.g. 8287032815"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location *</label>
              <LocationSelector
                value={
                  Array.isArray(editingLead.locationID)
                    ? editingLead.locationID.map((l) => String(l?._id ?? l)).filter(Boolean)
                    : editingLead.locationID
                      ? [String(editingLead.locationID?._id ?? editingLead.locationID)]
                      : []
                }
                onChange={(ids) => setEditingLead((prev) => ({ ...prev, locationID: ids }))}
                placeholder="Select location(s)"
                showAllOption={false}
                multiple={true}
                disabled={viewOnly}
                className="mt-0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stage</label>
              <select
                value={editingLead.stage || 'new'}
                onChange={(e) => setEditingLead({ ...editingLead, stage: e.target.value })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-info"
              >
                {stageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Send Payment Link — shown for engaged/re_engaged leads in view mode */}
            {viewOnly && editingLead?._id && PAYMENT_LINK_STAGES.has(editingLead.stage) && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-muted-foreground" />
                    Send Payment Link
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaymentLinkForm((p) => ({ ...p, showForm: !p.showForm }))}
                    className="text-xs text-brand hover:underline"
                  >
                    {paymentLinkForm.showForm ? 'Hide' : 'Set up'}
                  </button>
                </div>
                {paymentLinkForm.showForm && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Amount ($)</label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={paymentLinkForm.amount}
                          onChange={(e) => setPaymentLinkForm((p) => ({ ...p, amount: e.target.value }))}
                          placeholder="75.00"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Send via</label>
                        <select
                          value={paymentLinkForm.channel}
                          onChange={(e) => setPaymentLinkForm((p) => ({ ...p, channel: e.target.value }))}
                          className="h-8 w-full rounded-md border border-border bg-background text-sm px-2"
                        >
                          <option value="sms">SMS</option>
                          <option value="email">Email</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-muted-foreground">Description</label>
                      <Input
                        value={paymentLinkForm.description}
                        onChange={(e) => setPaymentLinkForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Intro Lesson"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendPaymentLink}
                      disabled={sendingPaymentLink}
                      className="w-full"
                    >
                      {sendingPaymentLink ? 'Sending…' : 'Send Payment Link'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Booking Status</label>
              <select
                value={editingLead.bookingStatus || 'Not Booked'}
                onChange={(e) => setEditingLead({ ...editingLead, bookingStatus: e.target.value })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-info"
              >
                {bookingStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assigned AI Agent</label>
              <Input
                value={editingLead.assignedAiAgent || ''}
                onChange={(e) => setEditingLead({ ...editingLead, assignedAiAgent: e.target.value })}
                disabled={viewOnly}
                placeholder="AI agent ID (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Human Agent</label>
              <Input
                value={editingLead.assignedHumanAgent || ''}
                onChange={(e) => setEditingLead({ ...editingLead, assignedHumanAgent: e.target.value })}
                disabled={viewOnly}
                placeholder="Human agent email/ID (optional)"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                Callback Date
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={toDateInputValue(editingLead.callbackDate)}
                  onChange={(e) => setEditingLead({ ...editingLead, callbackDate: e.target.value })}
                  disabled={!editingLead._id && viewOnly}
                  className="w-44"
                />
                {viewOnly && editingLead._id && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveCallbackDate}
                    disabled={savingCallbackDate || (editingLead.callbackDate || '') === savedCallbackDate}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {savingCallbackDate ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Next date to follow up or call this lead back
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                <input
                  type="checkbox"
                  checked={editingLead.isEscalated || false}
                  onChange={(e) => setEditingLead({ ...editingLead, isEscalated: e.target.checked })}
                  disabled={viewOnly}
                  className="w-4 h-4"
                />
                <span>Is Escalated</span>
              </label>
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Agent follow-up</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When off, this lead is opted out of automated AI follow-ups (even if location settings allow them).
                </p>
              </div>
              <Switch
                checked={editingLead.agentFollowupEnabled !== false}
                onCheckedChange={(checked) =>
                  setEditingLead({ ...editingLead, agentFollowupEnabled: checked })
                }
                disabled={viewOnly}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              Notes
            </label>
            {editingLead._id ? (
              <LeadNotesSection
                leadId={editingLead._id}
                notes={editingLead.notes}
                onChanged={(notes) => {
                  setEditingLead((prev) => ({ ...prev, notes }))
                  onRefresh && onRefresh()
                }}
              />
            ) : (
              <>
                <textarea
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  disabled={viewOnly}
                  rows={3}
                  placeholder="Add an initial note (optional). You'll be able to add more once the lead is created."
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-info disabled:opacity-60"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Notes carry over to the customer when this lead is converted
                </p>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {viewOnly ? 'Close' : 'Cancel'}
          </Button>
          {!viewOnly && (
            <Button onClick={saveLead} disabled={loading} variant="gradient">
              {loading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Lead'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LeadNotesSection({ leadId, notes, onChanged }) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const toast = useToast()

  const sortedNotes = [...(notes || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  async function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    const result = await api.post(`/api/lead/${leadId}/notes`, { text: text.trim() })
    if (result.success) {
      setText('')
      onChanged && onChanged(result.data)
    } else {
      toast.error({ title: 'Error', message: result.error || 'Unable to add note' })
    }
    setAdding(false)
  }

  async function handleDelete(noteId) {
    setDeletingId(noteId)
    const result = await api.delete(`/api/lead/${leadId}/notes/${noteId}`)
    if (result.success) {
      onChanged && onChanged(result.data)
    } else {
      toast.error({ title: 'Error', message: result.error || 'Unable to delete note' })
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          className="flex-1 h-9 px-3 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-info"
        />
        <Button type="submit" size="sm" disabled={adding || !text.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </form>

      {sortedNotes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {sortedNotes.map((note) => (
            <div key={note._id} className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground leading-relaxed flex-1 whitespace-pre-wrap">
                  {note.text}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(note._id)}
                  disabled={deletingId === note._id}
                  className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {note.createdBy?.name || note.createdBy?.email || 'Unknown'} · {formatDateTime(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
