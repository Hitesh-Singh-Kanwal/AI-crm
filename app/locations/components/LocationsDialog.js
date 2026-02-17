'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function LocationsDialog({ open, onClose, locations = [], onRefresh, initialLocationId = null }) {
  const [editingLocation, setEditingLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setEditingLocation(null)
      return
    }
    // if an initial location id was provided, pre-select that location for editing
    if (initialLocationId && locations && locations.length > 0) {
      const found = locations.find((l) => l._id === initialLocationId)
      if (found) setEditingLocation({ ...found })
    }
  }, [open, initialLocationId, locations])

  function openEdit(location) {
    setEditingLocation({ ...location })
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
  }

  function closeEdit() {
    setEditingLocation(null)
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
    <Dialog open={open} onClose={onClose} maxWidth="xl">
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Manage Locations</DialogTitle>
          <DialogDescription>View and update locations in this organisation.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Locations</h4>
              <Button size="sm" onClick={openCreate}>New</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {locations.map((l) => (
                <div 
                  key={l._id} 
                  className={cn(
                    "p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors",
                    editingLocation?._id === l._id && "bg-brand/10 border border-brand/20"
                  )} 
                  onClick={() => openEdit(l)}
                >
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-slate-400">{l.city && l.state ? `${l.city}, ${l.state}` : l.address}</div>
                  <div className="text-xs text-slate-500 capitalize">{l.status || 'active'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {!editingLocation && (
              <div className="text-sm text-slate-500">Select a location to edit or create a new location.</div>
            )}
            {editingLocation && (
              <div className="space-y-3">
                <Input 
                  value={editingLocation.name || ''} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, name: e.target.value }))} 
                  placeholder="Location Name *" 
                  required
                />
                <Input 
                  value={editingLocation.address || ''} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, address: e.target.value }))} 
                  placeholder="Address *" 
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    value={editingLocation.city || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, city: e.target.value }))} 
                    placeholder="City" 
                  />
                  <Input 
                    value={editingLocation.state || ''} 
                    onChange={(e) => setEditingLocation((p) => ({ ...p, state: e.target.value }))} 
                    placeholder="State" 
                  />
                </div>
                <Input 
                  value={editingLocation.country || ''} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, country: e.target.value }))} 
                  placeholder="Country" 
                />
                <Input 
                  value={editingLocation.email || ''} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, email: e.target.value }))} 
                  placeholder="Email *" 
                  type="email"
                  required
                />
                <Input 
                  value={editingLocation.phoneNumber || ''} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, phoneNumber: e.target.value }))} 
                  placeholder="Phone Number" 
                />
                <Select 
                  value={editingLocation.status || 'active'} 
                  onChange={(e) => setEditingLocation((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={saveLocation} variant="gradient" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
