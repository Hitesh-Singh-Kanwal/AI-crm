'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import LocationSelector from '@/components/shared/LocationSelector'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'

export default function UsersDialog({ open, onClose, users = [], onRefresh, initialUserId = null }) {
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setEditingUser(null)
      return
    }
    // if an initial user id was provided, pre-select that user for editing
    if (initialUserId && users && users.length > 0) {
      const found = users.find((u) => u._id === initialUserId)
      if (found) setEditingUser({ ...found })
    }
  }, [open, initialUserId, users])

  function openEdit(user) {
    setEditingUser({ ...user })
  }

  function openCreate() {
    setEditingUser({ name: '', email: '', role: '', password: '', locationID: null, phoneNumber: '', status: 'active' })
  }

  function closeEdit() {
    setEditingUser(null)
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
          locationID: editingUser.locationID || null,
          phoneNumber: editingUser.phoneNumber || null,
          status: editingUser.status || 'active',
        })
        if (result.success) {
          toast.success({ title: 'Saved', message: 'User updated' })
          closeEdit()
          onRefresh && onRefresh()
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
    <Dialog open={open} onClose={onClose} maxWidth="xl">
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Manage Users</DialogTitle>
          <DialogDescription>View and update users in this organisation.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Users</h4>
              <Button size="sm" onClick={openCreate}>New</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {users.map((u) => (
                <div key={u._id} className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(u)}>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                  <div className="text-xs text-slate-500">{u.role}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {!editingUser && <div className="text-sm text-slate-500">Select a user to edit or create a new user.</div>}
            {editingUser && (
              <div className="space-y-3">
                <Input value={editingUser.name || ''} onChange={(e) => setEditingUser((p) => ({ ...p, name: e.target.value }))} placeholder="Name *" required />
                <Input value={editingUser.email || ''} onChange={(e) => setEditingUser((p) => ({ ...p, email: e.target.value }))} placeholder="Email *" type="email" required />
                <Input value={editingUser.role || ''} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))} placeholder="Role *" required />
                <Input value={editingUser.phoneNumber || ''} onChange={(e) => setEditingUser((p) => ({ ...p, phoneNumber: e.target.value }))} placeholder="Phone Number" />
                <LocationSelector
                  value={editingUser.locationID}
                  onChange={(locationId) => setEditingUser((p) => ({ ...p, locationID: locationId }))}
                  placeholder="Select location (optional)"
                  showAllOption={true}
                />
                {editingUser._id && (
                  <Select 
                    value={editingUser.status || 'active'} 
                    onChange={(e) => setEditingUser((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                )}
                {!editingUser._id && (
                  <>
                    <Input value={editingUser.password || ''} onChange={(e) => setEditingUser((p) => ({ ...p, password: e.target.value }))} placeholder="Password *" type="password" required />
                    <Select 
                      value={editingUser.status || 'active'} 
                      onChange={(e) => setEditingUser((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Button onClick={saveUser} variant="gradient" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
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

