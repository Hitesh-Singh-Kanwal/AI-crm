'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserPlus, X } from 'lucide-react'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import LocationSelector from '@/components/shared/LocationSelector'
import PhoneNumberInput from '@/components/shared/PhoneNumberInput'

const stageOptions = [
  { value: 'new', label: 'New' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'bookingInProgress', label: 'Booking In Progress' },
  { value: 'cold', label: 'Cold' },
  { value: 'booked', label: 'Booked' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'lost', label: 'Lost' },
]

const bookingStatusOptions = [
  { value: 'Not Booked', label: 'Not Booked' },
  { value: 'Booked', label: 'Booked' },
]

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
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setEditingLead(null)
      setMode('create')
      return
    }
    if (initialLeadId && leads && leads.length > 0) {
      const found = leads.find((l) => l._id === initialLeadId)
      if (found) {
        setEditingLead({ ...found })
        setMode(viewOnly ? 'view' : 'edit')
      }
    } else {
      setEditingLead({
        name: '',
        email: '',
        phoneNumber: '',
        location: '',
        stage: 'new',
        bookingStatus: 'Not Booked',
        assignedAiAgent: '',
        assignedHumanAgent: '',
        isEscalated: false,
      })
      setMode('create')
    }
  }, [open, initialLeadId, leads, viewOnly])

  function openEdit(lead) {
    setEditingLead({ ...lead })
    setMode('edit')
  }

  function openCreate() {
    setEditingLead({
      name: '',
      email: '',
      phoneNumber: '',
      location: '',
      stage: 'new',
      bookingStatus: 'Not Booked',
      assignedAiAgent: '',
      assignedHumanAgent: '',
      isEscalated: false,
    })
    setMode('create')
  }

  function closeEdit() {
    setEditingLead(null)
    setMode('create')
  }

  async function saveLead() {
    if (viewOnly) return
    if (!editingLead) return

    if (!editingLead.name || !editingLead.email || !editingLead.phoneNumber || !editingLead.location) {
      toast.error({ title: 'Validation Error', message: 'Name, email, phone number, and location are required' })
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
          locationID: editingLead.locationID,
          stage: editingLead.stage,
          bookingStatus: editingLead.bookingStatus,
          assignedAiAgent: editingLead.assignedAiAgent || '',
          assignedHumanAgent: editingLead.assignedHumanAgent || '',
          isEscalated: editingLead.isEscalated || false,
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
        const payload = { ...editingLead, organisationID: user?.organisationID }
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
                value={editingLead.locationID || editingLead.location || ''}
                onChange={(id) => setEditingLead({ ...editingLead, locationID: id })}
                onChangeObject={(loc) => setEditingLead((prev) => ({ ...prev, location: loc.name, locationID: loc._id }))}
                placeholder="Select location"
                showAllOption={false}
                multiple={false}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {stageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Booking Status</label>
              <select
                value={editingLead.bookingStatus || 'Not Booked'}
                onChange={(e) => setEditingLead({ ...editingLead, bookingStatus: e.target.value })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingLead.isEscalated || false}
                  onChange={(e) => setEditingLead({ ...editingLead, isEscalated: e.target.checked })}
                  disabled={viewOnly}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Is Escalated</span>
              </label>
            </div>
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
