'use client'

import { useState, useEffect } from 'react'
import { Building2, Check, ChevronDown, MapPin } from 'lucide-react'
import { getSelectedBranch, setSelectedBranch } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/permissions'
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
      const result = await api.get('/api/location?limit=200')
      if (result.success) {
        // Filter only active locations — this switcher only scopes what data
        // you see in the app; creates pick location inside each form.
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
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 w-full h-[38px] px-3 rounded-[32px] bg-muted hover:bg-muted/80 transition-colors text-sm font-normal text-muted-foreground"
      >
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate">{selectedBranch ? selectedBranch.name : 'All Branch'}</span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl max-h-96 overflow-hidden animate-scale-in">
            <div className="p-3 border-b border-border">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-7 w-full rounded-md border border-border bg-muted/30 px-2.5 text-[11px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-hide p-2">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  !selected 
                    ? 'bg-brand text-brand-foreground' 
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">All Branches</span>
                </div>
                {!selected && <Check className="h-4 w-4" />}
              </button>

              <div className="my-2 h-px bg-border" />

              {loading ? (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                  Loading branches...
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground">
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
                        ? 'bg-brand text-brand-foreground' 
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{branch.name}</span>
                      {(branch.city || branch.state) && (
                        <span className="text-xs text-muted-foreground">
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


