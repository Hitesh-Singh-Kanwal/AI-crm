'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, X } from 'lucide-react'
import LocationSelector from '@/components/shared/LocationSelector'
import RoleSelector from '@/components/shared/RoleSelector'
import StatusSelector from '@/components/shared/StatusSelector'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function UsersDialog({ open, onClose, users = [], onRefresh, initialUserId = null }) {
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('create') // 'create' or 'edit'
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setEditingUser(null)
      setMode('create')
      return
    }
    // if an initial user id was provided, pre-select that user for editing
    if (initialUserId && users && users.length > 0) {
      const found = users.find((u) => u._id === initialUserId)
      if (found) {
        setEditingUser({ ...found })
        setMode('edit')
      }
    } else {
      // create mode: show form immediately with empty fields
      setEditingUser({ name: '', email: '', role: '', password: '', locationID: [], phoneNumber: '', status: 'active' })
      setMode('create')
    }
  }, [open, initialUserId, users])

  function openEdit(user) {
    setEditingUser({ ...user })
    setMode('edit')
  }

  function openCreate() {
    setEditingUser({ name: '', email: '', role: '', password: '', locationID: [], phoneNumber: '', status: 'active' })
    setMode('create')
  }

  function closeEdit() {
    setEditingUser(null)
    setMode('create')
  }

  async function saveUser() {
    if (!editingUser) return
    setLoading(true)
    try {
      if (editingUser._id) {
        // update
        const result = await api.put(`/api/user/${editingUser._id}`, {
          name: editingUser.name,
          role: editingUser.role,
          locationID: editingUser.locationID || [],
          phoneNumber: editingUser.phoneNumber || null,
          status: editingUser.status || 'active',
        })
        if (result.success) {
          toast.success({ title: 'Saved', message: 'User updated' })
          closeEdit()
          onRefresh && onRefresh()
          onClose?.()
        } else {
          toast.error({ title: 'Save failed', message: result.error || 'Unable to update user' })
        }
      } else {
        // create
        const result = await api.post('/api/user', editingUser)
        if (result.success) {
          toast.success({ title: 'Created', message: 'User created' })
          closeEdit()
          onRefresh && onRefresh()
          onClose?.()
        } else {
          toast.error({ title: 'Create failed', message: result.error || 'Unable to create user' })
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
              <DialogTitle className="text-2xl">{mode === 'create' ? 'Create New User' : 'Edit User'}</DialogTitle>
              <DialogDescription className="mt-1">
                {mode === 'create' ? 'Add a new user to your organization' : 'Update user information'}
              </DialogDescription>
            </div>
            {mode === 'edit' && (
              <Button variant="ghost" size="sm" onClick={openCreate} className="gap-2">
                <UserPlus className="h-4 w-4" />
                New User
              </Button>
            )}
          </div>
        </DialogHeader>

        {editingUser && (
          <div className="space-y-6 mt-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                  <Input 
                    value={editingUser.name || ''} 
                    onChange={(e) => setEditingUser((p) => ({ ...p, name: e.target.value }))} 
                    placeholder="Enter full name" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Address *</label>
                  <Input 
                    value={editingUser.email || ''} 
                    onChange={(e) => setEditingUser((p) => ({ ...p, email: e.target.value }))} 
                    placeholder="user@example.com" 
                    type="email" 
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                  <Input 
                    value={editingUser.phoneNumber || ''} 
                    onChange={(e) => setEditingUser((p) => ({ ...p, phoneNumber: e.target.value }))} 
                    placeholder="(555) 123-4567" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Role *</label>
                  <RoleSelector
                    value={editingUser.role}
                    onChange={(role) => setEditingUser((p) => ({ ...p, role }))}
                    placeholder="Select role"
                  />
                </div>
              </div>
            </div>

            {/* Account Settings Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Account Settings</h3>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
                <LocationSelector
                  multiple={true}
                  value={editingUser.locationID}
                  onChange={(locationIds) => setEditingUser((p) => ({ ...p, locationID: locationIds }))}
                  placeholder="Select location(s) (optional)"
                  showAllOption={true}
                />
              </div>
              {mode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                  <Input 
                    value={editingUser.password || ''} 
                    onChange={(e) => setEditingUser((p) => ({ ...p, password: e.target.value }))} 
                    placeholder="Enter password" 
                    type="password" 
                    required 
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <StatusSelector
                  value={editingUser.status || 'active'}
                  onChange={(status) => setEditingUser((p) => ({ ...p, status }))}
                  placeholder="Select status"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={closeEdit} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={saveUser} variant="gradient" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

