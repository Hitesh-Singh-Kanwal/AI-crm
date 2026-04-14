'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import StatusSelector from '@/components/shared/StatusSelector'

export default function LocationsDialog({ open, onClose, locations = [], onRefresh, initialLocationId = null }) {
  const [editingLocation, setEditingLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('create') // 'create' or 'edit'
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setEditingLocation(null)
      setMode('create')
      return
    }
    // if an initial location id was provided, pre-select that location for editing
    if (initialLocationId && locations && locations.length > 0) {
      const found = locations.find((l) => l._id === initialLocationId)
      if (found) {
        setEditingLocation({ ...found })
        setMode('edit')
      }
    } else {
      // create mode: show form immediately with empty fields
      setEditingLocation({
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        phoneNumber: '',
        email: '',
        status: 'active',
      })
      setMode('create')
    }
  }, [open, initialLocationId, locations])

  function openEdit(location) {
    setEditingLocation({ ...location })
    setMode('edit')
  }

  function openCreate() {
    setEditingLocation({ 
      name: '', 
      address: '', 
      city: '', 
      state: '', 
      country: '', 
      phoneNumber: '', 
      email: '', 
      status: 'active' 
    })
    setMode('create')
  }

  function closeEdit() {
    setEditingLocation(null)
    setMode('create')
  }

  async function saveLocation() {
    if (!editingLocation) return
    
    // Validation
    if (!editingLocation.name || !editingLocation.address || !editingLocation.email) {
      toast.error({ title: 'Validation Error', message: 'Name, address, and email are required' })
      return
    }

    setLoading(true)
    try {
      if (editingLocation._id) {
        // update
        const result = await api.put(`/api/location/${editingLocation._id}`, {
          name: editingLocation.name,
          address: editingLocation.address,
          city: editingLocation.city,
          state: editingLocation.state,
          country: editingLocation.country,
          phoneNumber: editingLocation.phoneNumber,
          email: editingLocation.email,
          status: editingLocation.status,
        })
        if (result.success) {
          toast.success({ title: 'Saved', message: 'Location updated' })
          closeEdit()
          onRefresh && onRefresh()
          onClose?.()
        } else {
          toast.error({ title: 'Save failed', message: result.error || 'Unable to update location' })
        }
      } else {
        // create
        const result = await api.post('/api/location', {
          name: editingLocation.name,
          address: editingLocation.address,
          city: editingLocation.city,
          state: editingLocation.state,
          country: editingLocation.country,
          phoneNumber: editingLocation.phoneNumber,
          email: editingLocation.email,
          status: editingLocation.status || 'active',
        })
        if (result.success) {
          toast.success({ title: 'Created', message: 'Location created' })
          closeEdit()
          onRefresh && onRefresh()
          onClose?.()
        } else {
          toast.error({ title: 'Create failed', message: result.error || 'Unable to create location' })
        }
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{mode === 'create' ? 'Create New Location' : 'Edit Location'}</DialogTitle>
              <DialogDescription className="mt-1">
                {mode === 'create' ? 'Add a new branch or location to your organization' : 'Update location information'}
              </DialogDescription>
            </div>
            {mode === 'edit' && (
              <Button variant="ghost" size="sm" onClick={openCreate} className="gap-2">
                <Building2 className="h-4 w-4" />
                New Location
              </Button>
            )}
          </div>
        </DialogHeader>

        {editingLocation && (
          <div className="space-y-6 mt-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Location Name *</label>
                  <Input 
                    value={editingLocation.name || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, name: e.target.value }))} 
                    placeholder="e.g., Downtown Branch" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                  <Input 
                    value={editingLocation.email || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, email: e.target.value }))} 
                    placeholder="location@example.com" 
                    type="email"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Street Address *</label>
                <Input 
                  value={editingLocation.address || ''} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, address: e.target.value }))} 
                  placeholder="123 Main Street" 
                  required
                />
              </div>
            </div>

            {/* Address Details Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                  <Input 
                    value={editingLocation.city || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, city: e.target.value }))} 
                    placeholder="City" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                  <Input 
                    value={editingLocation.state || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, state: e.target.value }))} 
                    placeholder="State" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
                  <Input 
                    value={editingLocation.country || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, country: e.target.value }))} 
                    placeholder="Country" 
                  />
                </div>
              </div>
            </div>

            {/* Contact & Status Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contact & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                  <Input 
                    value={editingLocation.phoneNumber || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, phoneNumber: e.target.value }))} 
                    placeholder="(555) 123-4567" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                  <StatusSelector
                    value={editingLocation.status || 'active'}
                    onChange={(status) => setEditingLocation((p) => ({ ...p, status }))}
                    placeholder="Select status"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={closeEdit} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={saveLocation} variant="gradient" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Location' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
