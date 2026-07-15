'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { getCurrentUser, getUserLocations, getSelectedBranch, setSelectedBranch, getEffectiveBranch } from '@/lib/auth'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Location display/switcher for non-superadmin users (staff, admin, or any
 * custom role). Renders:
 *  - 0 assigned locations: a plain "No location assigned" label
 *  - 1 assigned location: a plain label with the resolved location name
 *  - 2+ assigned locations: a dropdown to switch the active one
 *
 * The backend's login response returns `locationID` as an array of bare
 * ids (never populated with names), so every case here resolves display
 * names via `/api/location` rather than trusting `user.branchName` (a
 * legacy field the current backend never sets).
 *
 * Unlike BranchSelector (superadmin, can view "All Branches"), a
 * multi-location user here must always have exactly one active location
 * selected — the backend rejects requests from a non-admin user with more
 * than one assigned location and no location chosen.
 */
export default function StaffLocationSwitcher() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    const assigned = getUserLocations(user)

    const active = getEffectiveBranch()
    setSelected(active)
    if (!getSelectedBranch() && active) {
      // Persist the auto-selected default so it survives a reload and so
      // the api client's header stays in sync with what's shown here. Silent:
      // this is the already-effective location, not a user switch, so it must
      // not trigger MainLayout's reload-on-branch-change.
      setSelectedBranch(active, { silent: true })
    }

    loadLocationNames(assigned)
  }, [])

  async function loadLocationNames(assigned) {
    if (assigned.length === 0) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await api.get('/api/location')
      const allLocations = result.success ? result.data || [] : []
      const assignedIds = new Set(assigned.map((loc) => loc._id))
      const resolved = allLocations
        .filter((loc) => assignedIds.has(loc._id))
        .map((loc) => ({ _id: loc._id, name: loc.name, city: loc.city, state: loc.state }))

      // Fall back to whatever name (if any) the session already carried,
      // for any assigned id the /api/location call didn't return.
      const resolvedIds = new Set(resolved.map((loc) => loc._id))
      const missing = assigned
        .filter((loc) => !resolvedIds.has(loc._id))
        .map((loc) => ({ _id: loc._id, name: loc.name || 'Unnamed location' }))

      setLocations([...resolved, ...missing])
    } catch (e) {
      console.error('Failed to load assigned locations:', e)
      setLocations(assigned.map((loc) => ({ _id: loc._id, name: loc.name || 'Unnamed location' })))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 h-[38px] px-3 rounded-full bg-muted text-sm text-muted-foreground">
        <MapPin className="h-5 w-5 shrink-0" />
        <span className="truncate">Loading…</span>
      </div>
    )
  }

  // 0 or 1 assigned locations: nothing to switch between, plain label.
  if (locations.length <= 1) {
    const only = locations[0]
    return (
      <div className="flex items-center gap-1.5 h-[38px] px-3 rounded-full bg-muted text-sm text-muted-foreground">
        <MapPin className="h-5 w-5 shrink-0" />
        <span className="truncate">{only?.name || 'No location assigned'}</span>
      </div>
    )
  }

  const selectedLocation = locations.find((loc) => loc._id === selected)

  const handleSelect = (locationId) => {
    setSelected(locationId)
    setSelectedBranch(locationId)
    setOpen(false)
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center justify-between gap-2 w-full h-[38px] px-3 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-normal text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate">{selectedLocation?.name || 'Select location'}</span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute top-full left-0 mt-2 w-72 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl max-h-80 overflow-y-auto scrollbar-hide p-2 animate-scale-in"
          >
            {locations.map((location) => (
              <button
                key={location._id}
                role="option"
                aria-selected={selected === location._id}
                onClick={() => handleSelect(location._id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1 last:mb-0',
                  selected === location._id
                    ? 'bg-brand text-brand-foreground'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium text-sm truncate">{location.name}</span>
                  {(location.city || location.state) && (
                    <span className="text-xs text-muted-foreground truncate">
                      {location.city && location.state
                        ? `${location.city}, ${location.state}`
                        : location.city || location.state}
                    </span>
                  )}
                </div>
                {selected === location._id && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
