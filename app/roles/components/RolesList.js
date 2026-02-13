'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash, Plus, X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function RolesList({ roles, loading, selectedRoleId, onSelect, onDelete, onCreate }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return roles
    return roles.filter((r) => r.role.toLowerCase().includes(query.toLowerCase()))
  }, [roles, query])

  return (
    <div className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Roles</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onSelect(null)} title="Clear selection">
            <X className="h-4 w-4" />
          </Button>
          {/* users management moved to Users page */}
          <Button onClick={onCreate} variant="gradient" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roles..."
          className="pl-9"
        />
        <Search className="absolute left-6 top-3.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="overflow-y-auto space-y-2" style={{ maxHeight: '64vh' }}>
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-slate-500">No roles found</p>}
        {filtered.map((r) => (
          <div
            key={r._id}
            onClick={() => onSelect(r)}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${
              selectedRoleId === r._id ? 'bg-brand/5 border border-brand/20' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{r.role}</p>
              <p className="text-xs text-slate-400 truncate">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="badge-info">{Object.keys(r.permissions || {}).length}</Badge>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(r._id) }} title="Delete role">
                <Trash className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

