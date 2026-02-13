'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Save, Trash } from 'lucide-react'
import Switch from '@/components/ui/switch'

export default function RoleEditor({
  editingRole,
  isCreating,
  permissionsSchema,
  onChange,
  togglePermission,
  onSave,
  onDelete,
  onCancel,
}) {
  const [expandedSections, setExpandedSections] = useState({})

  function toggleSection(key) {
    setExpandedSections((p) => ({ ...p, [key]: !p[key] }))
  }

  return (
    <div className="col-span-1 md:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand flex items-center justify-center text-white font-medium">
            {editingRole?.role?.charAt(0)?.toUpperCase() || 'R'}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 truncate">{editingRole?.role || 'Role'}</h3>
            <p className="text-xs text-slate-400">{isCreating ? 'Creating new role' : editingRole?._id ? 'Editing role' : 'View role'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingRole && editingRole._id && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(editingRole._id)}>
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={onSave} variant="gradient" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>

      {!editingRole && !isCreating && <p className="text-sm text-slate-500 mb-4">Select a role to view or edit its permissions.</p>}

      {(editingRole || isCreating) && (
        <div className="space-y-4">
          <div>
            <Input
              value={editingRole?.role || ''}
              onChange={(e) => onChange({ ...editingRole, role: e.target.value })}
              placeholder="Role name (e.g., admin, manager)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[64vh] overflow-y-auto pr-2">
            {permissionsSchema &&
              Object.entries(permissionsSchema).map(([sectionKey, sectionVal]) => (
                <div key={sectionKey} className="border border-slate-100 rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800">{sectionVal.name}</h4>
                      <button onClick={() => toggleSection(sectionKey)} className="text-xs text-slate-400 hover:underline">
                        {expandedSections[sectionKey] ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{sectionKey}</p>
                  </div>
                  <div className="space-y-2">
                    {expandedSections[sectionKey] === false ? null : Object.entries(sectionVal.permissions || {}).map(([permKey, permVal]) => {
                      const current = (editingRole?.permissions?.[sectionKey]?.permissions?.[permKey]) || { read: false, write: false, edit: false, delete: false }
                      return (
                        <div key={permKey} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-slate-50">
                          <div>
                            <p className="font-medium text-slate-900">{permKey}</p>
                            <p className="text-xs text-slate-400">{permVal.description || ''}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">R</span>
                              <Switch checked={!!current.read} onChange={() => togglePermission(sectionKey, permKey, 'read')} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">W</span>
                              <Switch checked={!!current.write} onChange={() => togglePermission(sectionKey, permKey, 'write')} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">E</span>
                              <Switch checked={!!current.edit} onChange={() => togglePermission(sectionKey, permKey, 'edit')} />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">D</span>
                              <Switch checked={!!current.delete} onChange={() => togglePermission(sectionKey, permKey, 'delete')} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

