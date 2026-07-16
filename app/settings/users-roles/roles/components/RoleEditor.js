'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Trash, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react'
import Switch from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export default function RoleEditor({
  editingRole,
  isCreating,
  permissionsSchema,
  onChange,
  togglePermission,
  toggleAllPermissions,
  toggleColumnPermission,
  onSave,
  onDelete,
  onCancel,
  embedded = false,
}) {
  const [expandedSections, setExpandedSections] = useState({})

  function toggleSection(key) {
    setExpandedSections((p) => ({ ...p, [key]: !p[key] }))
  }

  const showCompactHeader = embedded

  // The "All Permissions" master (*) switch grants an action on every resource
  // (enforced in the backend's roleMiddleware). Reflect that here: when a master
  // column is on, the matching per-resource toggles show as on and locked.
  const masterPerms = editingRole?.permissions?.master?.permissions?.['*'] || {}

  return (
    <div
      className={cn(
        'flex flex-col',
        !embedded && 'col-span-1 md:col-span-4 rounded-xl border border-border bg-card p-4 shadow-sm'
      )}
    >
      {!showCompactHeader && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand font-medium text-white">
              {editingRole?.role?.charAt(0)?.toUpperCase() || 'R'}
            </div>
            <div>
              <h3 className="truncate text-lg font-semibold text-foreground">
                {editingRole?.role || 'Role'}
              </h3>
              <p className="text-xs text-muted-foreground/80">
                {isCreating ? 'Creating new role' : editingRole?._id ? 'Editing role' : 'View role'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editingRole?._id && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(editingRole._id)}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button size="sm" variant="gradient" onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!editingRole && !isCreating && (
        <p className="mb-4 text-sm text-muted-foreground">
          Select a role to view or edit its permissions.
        </p>
      )}

      {(editingRole || isCreating) && (
        <div className="space-y-6">
          {/* Role name + calendar visibility */}
          <div className="space-y-4">
            <div>
              <label className="my-1.5 block text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                value={editingRole?.role || ''}
                onChange={(e) => onChange({ ...editingRole, role: e.target.value })}
                placeholder="e.g. Admin, Manager, Staff, Instructor"
                className="max-w-md"
              />
            </div>

            <div
              className={cn(
                'max-w-md rounded-xl border p-4 transition-colors',
                editingRole?.showOnCalendar
                  ? 'border-brand/40 bg-brand/5'
                  : 'border-border bg-muted/30',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      editingRole?.showOnCalendar
                        ? 'bg-brand/15 text-brand'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Show on calendar
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      When on, users with this role appear as staff columns and can be
                      assigned to lessons and appointments.
                    </p>
                    <p
                      className={cn(
                        'mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                        editingRole?.showOnCalendar
                          ? 'bg-brand/15 text-brand'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {editingRole?.showOnCalendar
                        ? 'Visible on calendar'
                        : 'Hidden from calendar'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!editingRole?.showOnCalendar}
                  onCheckedChange={(checked) =>
                    onChange({ ...editingRole, showOnCalendar: checked })
                  }
                  aria-label="Show on calendar"
                />
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Permissions
            </h3>
            <p className="text-sm text-muted-foreground">
              For each resource choose what this role can do:
            </p>
            <ul className="ml-1 space-y-1 text-xs text-muted-foreground">
              <li><span className="font-medium text-foreground">Read</span> — view the resource.</li>
              <li><span className="font-medium text-foreground">Write</span> — create new entries.</li>
              <li><span className="font-medium text-foreground">Edit</span> — update existing entries.</li>
              <li><span className="font-medium text-foreground">Delete</span> — permanently remove entries.</li>
            </ul>

            <div className="space-y-4">
              {permissionsSchema &&
                Object.entries(permissionsSchema).map(([sectionKey, sectionVal]) => {
                  const isExpanded = expandedSections[sectionKey] !== false
                  const perms = Object.entries(sectionVal.permissions || {})
                  const permKeys = perms.map(([permKey]) => permKey)
                  const columnAllOn = (action) =>
                    perms.length > 0 &&
                    perms.every(([permKey]) => {
                      const isMasterRow = sectionKey === 'master' && permKey === '*'
                      const current =
                        editingRole?.permissions?.[sectionKey]?.permissions?.[permKey] || {}
                      return !!current[action] || (!isMasterRow && !!masterPerms[action])
                    })
                  return (
                    <div
                      key={sectionKey}
                      className="rounded-xl border border-border bg-muted/40 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(sectionKey)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <span>{sectionVal.name}</span>
                        <span className="text-muted-foreground/80">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border bg-card">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="font-semibold text-foreground">
                                  Resource
                                </TableHead>
                                {['read', 'write', 'edit', 'delete'].map((action) => (
                                  <TableHead
                                    key={action}
                                    className="w-20 cursor-pointer select-none text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                                    title={`Toggle ${action} for every resource in this section`}
                                    onClick={() =>
                                      toggleColumnPermission(sectionKey, permKeys, action, !columnAllOn(action))
                                    }
                                  >
                                    {action.charAt(0).toUpperCase() + action.slice(1)}
                                  </TableHead>
                                ))}
                                <TableHead className="w-20 text-center text-xs font-medium text-muted-foreground">
                                  All
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {perms.map(([permKey, permVal]) => {
                                const current =
                                  editingRole?.permissions?.[sectionKey]?.permissions?.[permKey] || {
                                    read: false,
                                    write: false,
                                    edit: false,
                                    delete: false,
                                  }
                                const isMasterRow = sectionKey === 'master' && permKey === '*'
                                const overridden = (action) => !isMasterRow && !!masterPerms[action]
                                const allOverridden =
                                  overridden('read') && overridden('write') && overridden('edit') && overridden('delete')
                                const allOn =
                                  (current.read || overridden('read')) &&
                                  (current.write || overridden('write')) &&
                                  (current.edit || overridden('edit')) &&
                                  (current.delete || overridden('delete'))
                                return (
                                  <TableRow
                                    key={permKey}
                                    className="hover:bg-muted/40"
                                  >
                                    <TableCell>
                                      <div>
                                        <p className="font-medium text-foreground">{permVal.label || (permKey === '*' ? 'Master' : permKey)}</p>
                                        {permVal.description && (
                                          <p className="text-xs text-muted-foreground">
                                            {permVal.description}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.read || overridden('read')}
                                        disabled={overridden('read')}
                                        title={overridden('read') ? 'Granted by All Permissions (Master)' : undefined}
                                        className={cn(overridden('read') && 'opacity-70 cursor-not-allowed')}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'read')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.write || overridden('write')}
                                        disabled={overridden('write')}
                                        title={overridden('write') ? 'Granted by All Permissions (Master)' : undefined}
                                        className={cn(overridden('write') && 'opacity-70 cursor-not-allowed')}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'write')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.edit || overridden('edit')}
                                        disabled={overridden('edit')}
                                        title={overridden('edit') ? 'Granted by All Permissions (Master)' : undefined}
                                        className={cn(overridden('edit') && 'opacity-70 cursor-not-allowed')}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'edit')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.delete || overridden('delete')}
                                        disabled={overridden('delete')}
                                        title={overridden('delete') ? 'Granted by All Permissions (Master)' : undefined}
                                        className={cn(overridden('delete') && 'opacity-70 cursor-not-allowed')}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'delete')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={allOn}
                                        disabled={allOverridden}
                                        title={
                                          allOverridden
                                            ? 'Granted by All Permissions (Master)'
                                            : 'Toggle read, write, edit, and delete at once'
                                        }
                                        className={cn(allOverridden && 'opacity-70 cursor-not-allowed')}
                                        onChange={() =>
                                          toggleAllPermissions(sectionKey, permKey, !allOn)
                                        }
                                      />
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Actions when embedded */}
          {embedded && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
              {editingRole?._id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDelete(editingRole._id)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete role
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="button" variant="gradient" onClick={onSave}>
                <Save className="mr-2 h-4 w-4" />
                {isCreating ? 'Create role' : 'Save changes'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
