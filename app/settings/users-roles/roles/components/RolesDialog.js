'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import RoleEditor from './RoleEditor'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { getToken, getCurrentUser, refreshSession } from '@/lib/auth'
import { isRole } from '@/lib/constants'
import { getApiBaseUrl } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { ROLE_PRESETS, applyRolePreset } from '@/lib/rolePresets'

const API_BASE = getApiBaseUrl()

/** A module with nothing granted. `scope` defaults to 'all' — never 'own'. */
const emptyActions = () => ({
  read: false,
  write: false,
  edit: false,
  delete: false,
  scope: 'all',
  subPermissions: {},
})

/** Fill in false for any catalog subPermission key missing from saved data. */
function normalizeSubPermissions(subPerms, catalogSubPerms) {
  if (!catalogSubPerms) return undefined
  const out = {}
  for (const key of Object.keys(catalogSubPerms)) {
    out[key] = !!subPerms?.[key]
  }
  return out
}

/** Only an explicit 'own' narrows; everything else is 'all'. Matches the backend. */
const normalizeScope = (scope) => (scope === 'own' ? 'own' : 'all')

function deepClonePermissions(schema) {
  if (!schema) return {}
  const out = {}
  for (const [sectionKey, sectionVal] of Object.entries(schema)) {
    out[sectionKey] = { name: sectionVal.name, permissions: {} }
    for (const [permKey, permVal] of Object.entries(sectionVal.permissions || {})) {
      out[sectionKey].permissions[permKey] = {
        read: !!permVal.read,
        write: !!permVal.write,
        edit: !!permVal.edit,
        delete: !!permVal.delete,
        scope: normalizeScope(permVal.scope),
        subPermissions: normalizeSubPermissions(undefined, permVal.subPermissions) || {},
      }
    }
  }
  return out
}

/**
 * Write an explicit scope onto every module of a role loaded from the API.
 *
 * Roles saved before scoping existed have no scope key. Normalizing on load
 * means the next save persists 'all' explicitly and the data converges without
 * a migration — and the editor never shows an empty scope selector.
 */
function normalizeLoadedPermissions(rolePermissions) {
  const out = {}
  for (const [sectionKey, sectionVal] of Object.entries(rolePermissions || {})) {
    out[sectionKey] = { ...sectionVal, permissions: {} }
    for (const [permKey, permVal] of Object.entries(sectionVal?.permissions || {})) {
      out[sectionKey].permissions[permKey] = {
        ...permVal,
        scope: normalizeScope(permVal?.scope),
        subPermissions: permVal?.subPermissions || {},
      }
    }
  }
  return out
}

export default function RolesDialog({
  open,
  onClose,
  onRefresh,
  initialRoleId,
  permissionsSchema,
}) {
  const [editingRole, setEditingRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [effectiveSchema, setEffectiveSchema] = useState(permissionsSchema || null)
  const toast = useToast()

  const isCreating = !initialRoleId

  useEffect(() => {
    if (!open) {
      setEditingRole(null)
      return
    }
    if (initialRoleId) {
      setLoading(true)
      fetch(`${API_BASE}/api/role/${initialRoleId}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      })
        .then((res) => res.json())
        .then((json) => {
          if (json?.success && json.data) {
            const role = json.data
            const rolePermissions = JSON.parse(JSON.stringify(role.permissions || {}))

            // Build schema from ALL available sections/modules, overlaying this role's saved values
            const fullSchema = {}
            for (const [sectionKey, baseSection] of Object.entries(permissionsSchema || {})) {
              const roleSection = rolePermissions[sectionKey]
              fullSchema[sectionKey] = {
                name: baseSection.name || sectionKey,
                permissions: {},
              }

              for (const [permKey, basePerm] of Object.entries(baseSection.permissions || {})) {
                const actions = roleSection?.permissions?.[permKey] || {}
                fullSchema[sectionKey].permissions[permKey] = {
                  read: !!actions.read,
                  write: !!actions.write,
                  edit: !!actions.edit,
                  delete: !!actions.delete,
                  scope: normalizeScope(actions.scope),
                  label: basePerm.label,
                  description: basePerm.description,
                  // Which modules offer an All/Own selector, or sub-permissions,
                  // is declared in the backend catalog — mirrored here so
                  // RoleEditor can render labels without a second list to drift.
                  scopeable: !!basePerm.scopeable,
                  scopeLabels: basePerm.scopeLabels,
                  subPermissions: basePerm.subPermissions,
                }
              }
            }

            setEffectiveSchema(fullSchema)

            setEditingRole({
              role: role.role,
              showOnCalendar: !!role.showOnCalendar,
              isCallCenterAgent: !!role.isCallCenterAgent,
              permissions: normalizeLoadedPermissions(rolePermissions),
              _id: role._id,
            })
          } else {
            toast.error({ title: 'Error', message: json?.message || 'Failed to load role' })
            onClose()
          }
        })
        .catch((e) => {
          console.error(e)
          toast.error({ title: 'Error', message: 'Failed to load role' })
          onClose()
        })
        .finally(() => setLoading(false))
    } else {
      setEffectiveSchema(permissionsSchema || null)
      setEditingRole({
        role: '',
        showOnCalendar: false,
        isCallCenterAgent: false,
        permissions: deepClonePermissions(permissionsSchema),
      })
    }
  }, [open, initialRoleId, permissionsSchema])

  // "Edit" is no longer a separate permission in the UI — every toggle of
  // "write" mirrors onto the legacy `edit` key too, so roles saved from here
  // still satisfy any backend/frontend check that ORs write and edit.
  function applyAction(actions, action, value) {
    actions[action] = value
    if (action === 'write') actions.edit = value
  }

  function togglePermission(sectionKey, permKey, action) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      if (!next.permissions[sectionKey].permissions[permKey]) {
        next.permissions[sectionKey].permissions[permKey] = emptyActions()
      }
      const actions = next.permissions[sectionKey].permissions[permKey]
      applyAction(actions, action, !actions[action])
      return next
    })
  }

  function toggleSubPermission(sectionKey, permKey, subKey) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      if (!next.permissions[sectionKey].permissions[permKey]) {
        next.permissions[sectionKey].permissions[permKey] = emptyActions()
      }
      const mod = next.permissions[sectionKey].permissions[permKey]
      if (!mod.subPermissions) mod.subPermissions = {}
      mod.subPermissions[subKey] = !mod.subPermissions[subKey]
      return next
    })
  }

  function toggleAllPermissions(sectionKey, permKey, enable) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      // Spread rather than replace: this used to overwrite the whole module
      // object, which silently reset a configured scope of 'own' back to 'all'
      // — a privilege escalation from flipping an unrelated toggle.
      next.permissions[sectionKey].permissions[permKey] = {
        ...(next.permissions[sectionKey].permissions[permKey] || emptyActions()),
        read: enable,
        write: enable,
        edit: enable,
        delete: enable,
      }
      return next
    })
  }

  function applyPreset(preset) {
    setEditingRole((prev) => {
      if (!prev) return prev
      return { ...prev, permissions: applyRolePreset(prev.permissions, preset) }
    })
  }

  function setPermissionScope(sectionKey, permKey, scope) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      if (!next.permissions[sectionKey].permissions[permKey]) {
        next.permissions[sectionKey].permissions[permKey] = emptyActions()
      }
      next.permissions[sectionKey].permissions[permKey].scope = normalizeScope(scope)
      return next
    })
  }

  function toggleColumnPermission(sectionKey, permKeys, action, enable) {
    setEditingRole((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      if (!next.permissions[sectionKey]) next.permissions[sectionKey] = { permissions: {} }
      for (const permKey of permKeys) {
        if (!next.permissions[sectionKey].permissions[permKey]) {
          next.permissions[sectionKey].permissions[permKey] = emptyActions()
        }
        applyAction(next.permissions[sectionKey].permissions[permKey], action, enable)
      }
      return next
    })
  }

  async function handleSave() {
    if (!editingRole) return
    setSaving(true)
    try {
      const payload = {
        role: editingRole.role,
        showOnCalendar: !!editingRole.showOnCalendar,
        isCallCenterAgent: !!editingRole.isCallCenterAgent,
        permissions: editingRole.permissions,
      }
      const url = editingRole._id ? `${API_BASE}/api/role/${editingRole._id}` : `${API_BASE}/api/role`
      const method = editingRole._id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success({
          title: editingRole._id ? 'Role Updated' : 'Role Created',
          message: editingRole._id ? 'Role has been updated successfully' : 'Role has been created successfully',
        })
        // Editing your own role changes what you can see. Pull the new
        // permissions immediately rather than leaving this session on the old
        // copy until its next scheduled refresh.
        if (isRole(getCurrentUser()?.role, editingRole.role)) {
          await refreshSession()
        }
        onRefresh?.()
        onClose()
      } else {
        toast.error({
          title: 'Save Failed',
          message: json?.message || json?.error || 'Unable to save role',
        })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'An unexpected error occurred while saving the role' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(roleId) {
    if (!confirm('Delete this role? This cannot be undone.')) return
    try {
      const res = await fetch(`${API_BASE}/api/role/${roleId}`, {
        method: 'DELETE',
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      })
      const json = await res.json()
      if (json?.success) {
        toast.success({ title: 'Role Deleted', message: 'Role has been deleted successfully' })
        onRefresh?.()
        onClose()
      } else {
        toast.error({
          title: 'Delete Failed',
          message: json?.message || json?.error || 'Unable to delete role',
        })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'An unexpected error occurred while deleting the role' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="4xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Create Role' : 'Edit Role'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isCreating
              ? 'Name the role, choose whether it appears on the calendar, and set permissions.'
              : 'Update the name, calendar visibility, and permissions for this role.'}
          </p>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
            <p className="ml-4 text-muted-foreground">Loading role...</p>
          </div>
        ) : (
          <RoleEditor
            editingRole={editingRole}
            isCreating={isCreating}
            permissionsSchema={effectiveSchema || permissionsSchema}
            onChange={setEditingRole}
            togglePermission={togglePermission}
            toggleSubPermission={toggleSubPermission}
            toggleAllPermissions={toggleAllPermissions}
            toggleColumnPermission={toggleColumnPermission}
            setPermissionScope={setPermissionScope}
            presets={ROLE_PRESETS}
            onApplyPreset={applyPreset}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={onClose}
            embedded
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
