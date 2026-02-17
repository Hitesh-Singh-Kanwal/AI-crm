'use client'

import { useState, useEffect } from 'react'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import { getSelectedBranch, setSelectedBranch, isSuperAdmin } from '@/lib/auth'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export default function BranchSelector() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedBranch = getSelectedBranch()
    setSelected(savedBranch)
    loadBranches()
  }, [])

  async function loadBranches() {
    try {
      setLoading(true)
      const result = await api.get('/api/location')
      if (result.success) {
        // Filter only active locations
        const activeLocations = (result.data || []).filter(loc => loc.status?.toLowerCase() === 'active')
        setBranches(activeLocations)
      }
    } catch (e) {
      console.error('Failed to load branches:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!isSuperAdmin()) {
    return null
  }

  const selectedBranch = selected ? branches.find((b) => b._id === selected) : null
  const filteredBranches = branches.filter((branch) => {
    const haystack = `${branch.name} ${branch.city || ''} ${branch.state || ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  const handleSelect = (branchId) => {
    setSelected(branchId)
    setSelectedBranch(branchId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm shadow-sm"
      >
        <Building2 className="h-3.5 w-3.5 text-slate-600" />
        <span className="font-medium text-slate-700">{selectedBranch ? selectedBranch.name : 'All Branches'}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 z-50 rounded-xl border border-slate-200 bg-white shadow-xl max-h-96 overflow-hidden animate-scale-in">
            <div className="p-3 border-b border-slate-200">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search branches..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
              />
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-hide p-2">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  !selected 
                    ? 'bg-brand text-white' 
                    : 'hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">All Branches</span>
                </div>
                {!selected && <Check className="h-4 w-4" />}
              </button>

              <div className="my-2 h-px bg-slate-200" />

              {loading ? (
                <div className="px-3 py-4 text-sm text-center text-slate-500">
                  Loading branches...
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-slate-500">
                  {query ? 'No branches found' : 'No branches available'}
                </div>
              ) : (
                filteredBranches.map((branch) => (
                  <button
                    key={branch._id}
                    onClick={() => handleSelect(branch._id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                      selected === branch._id 
                        ? 'bg-brand text-white' 
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{branch.name}</span>
                      {(branch.city || branch.state) && (
                        <span className="text-xs text-slate-500">
                          {branch.city && branch.state 
                            ? `${branch.city}, ${branch.state}` 
                            : branch.city || branch.state}
                        </span>
                      )}
                    </div>
                    {selected === branch._id && <Check className="h-4 w-4" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


