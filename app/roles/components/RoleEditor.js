'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Trash, ChevronDown, ChevronRight } from 'lucide-react'
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
          {/* Role name */}
          <div className="space-y-2">
          
            <div>
              <label className="my-1.5 block text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                value={editingRole?.role || ''}
                onChange={(e) => onChange({ ...editingRole, role: e.target.value })}
                placeholder="e.g. Admin, Manager, Staff"
                className="max-w-md"
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Permissions
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose read (R), write (W), edit (E), and delete (D) for each resource.
            </p>

            <div className="space-y-4">
              {permissionsSchema &&
                Object.entries(permissionsSchema).map(([sectionKey, sectionVal]) => {
                  const isExpanded = expandedSections[sectionKey] !== false
                  const perms = Object.entries(sectionVal.permissions || {})
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
                                <TableHead className="w-20 text-center text-xs font-medium text-muted-foreground">
                                  Read
                                </TableHead>
                                <TableHead className="w-20 text-center text-xs font-medium text-muted-foreground">
                                  Write
                                </TableHead>
                                <TableHead className="w-20 text-center text-xs font-medium text-muted-foreground">
                                  Edit
                                </TableHead>
                                <TableHead className="w-20 text-center text-xs font-medium text-muted-foreground">
                                  Delete
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
                                return (
                                  <TableRow
                                    key={permKey}
                                    className="hover:bg-muted/40"
                                  >
                                    <TableCell>
                                      <div>
                                        <p className="font-medium text-foreground">{permKey === '*' ? 'Master' : permKey}</p>
                                        {permVal.description && (
                                          <p className="text-xs text-muted-foreground">
                                            {permVal.description}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.read}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'read')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.write}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'write')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.edit}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'edit')
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={!!current.delete}
                                        onChange={() =>
                                          togglePermission(sectionKey, permKey, 'delete')
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
