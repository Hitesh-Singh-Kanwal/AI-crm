'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { getToken } from '@/lib/auth'
import { ToastProvider, useToast } from '@/components/ui/toast'
import RolesList from '@/app/roles/components/RolesList'
import RoleEditor from '@/app/roles/components/RoleEditor'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

function RolesPageInner() {
  const [roles, setRoles] = useState([])
  const [permissionsSchema, setPermissionsSchema] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [editingRole, setEditingRole] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadPermissions()
    loadRoles()
  }, [])

  // users are managed in the Users page; roles page does not load users

  async function loadRoles() {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/role`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json && json.success) setRoles(json.data || [])
    } catch (e) {
      console.error('loadRoles', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadPermissions() {
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/role/permissions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json && json.success) setPermissionsSchema(json.data || null)
    } catch (e) {
      console.error('loadPermissions', e)
    }
  }

  function openCreate() {
    setIsCreating(true)
    setEditingRole({
      role: '',
      permissions: permissionsSchema ? deepClonePermissions(permissionsSchema) : {},
    })
    setSelectedRole(null)
  }

  function deepClonePermissions(schema) {
    // clone the schema into a permissions object with same structure but boolean flags
    const out = {}
    for (const [sectionKey, sectionVal] of Object.entries(schema || {})) {
      out[sectionKey] = { name: sectionVal.name, permissions: {} }
      for (const [permKey, permVal] of Object.entries(sectionVal.permissions || {})) {
        out[sectionKey].permissions[permKey] = {
          read: !!permVal.read,
          write: !!permVal.write,
          edit: !!permVal.edit,
          delete: !!permVal.delete,
        }
      }
    }
    return out
  }

  function onSelectRole(role) {
    setSelectedRole(role)
    setIsCreating(false)
    // clone to editing state
    setEditingRole({ role: role.role, permissions: JSON.parse(JSON.stringify(role.permissions || {})), _id: role._id })
  }

  async function handleSave() {
    if (!editingRole) return
    try {
      const payload = {
        role: editingRole.role,
        permissions: editingRole.permissions,
      }
      const url = editingRole._id ? `${API_BASE}/api/role/${editingRole._id}` : `${API_BASE}/api/role`
      const method = editingRole._id ? 'PUT' : 'POST'
      const token = getToken()
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json && json.success) {
        await loadRoles()
        setIsCreating(false)
        setSelectedRole(null)
        setEditingRole(null)
      } else {
        console.error('save failed', json)
      }
    } catch (e) {
      console.error('handleSave', e)
    }
  }

  async function handleDelete(roleId) {
    if (!confirm('Delete this role? This cannot be undone.')) return
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/role/${roleId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json && json.success) {
        await loadRoles()
        setSelectedRole(null)
        setEditingRole(null)
      }
    } catch (e) {
      console.error('handleDelete', e)
    }
  }

  function openDeleteModal(id) {
    setRoleToDelete(id)
    setDeleteModalOpen(true)
  }

  // users dialog removed from roles page

  function bulkToggleSection(sectionKey, value) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      for (const permKey of Object.keys(next.permissions[sectionKey].permissions || {})) {
        next.permissions[sectionKey].permissions[permKey] = {
          read: !!value,
          write: !!value,
          edit: !!value,
          delete: !!value,
        }
      }
      return next
    })
  }

  function togglePermission(sectionKey, permKey, action) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      if (!next.permissions[sectionKey].permissions[permKey]) next.permissions[sectionKey].permissions[permKey] = { read: false, write: false, edit: false, delete: false }
      next.permissions[sectionKey].permissions[permKey][action] = !next.permissions[sectionKey].permissions[permKey][action]
      return next
    })
  }

  return (
    <MainLayout title="Roles" subtitle="Manage roles and permissions">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <RolesList roles={roles} loading={loading} selectedRoleId={selectedRole?._id} onSelect={onSelectRole} onDelete={handleDelete} onCreate={openCreate} />
        <RoleEditor
          editingRole={editingRole}
          isCreating={isCreating}
          permissionsSchema={permissionsSchema}
          onChange={(next) => setEditingRole(next)}
          togglePermission={togglePermission}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={() => { setEditingRole(null); setIsCreating(false); setSelectedRole(null) }}
          onBulkToggle={bulkToggleSection}
        />
      </div>
      {/* Users management moved to /users */}
    </MainLayout>
  )
}

export default function RolesPage() {
  return (
    <ToastProvider>
      <RolesPageInner />
    </ToastProvider>
  )
}

