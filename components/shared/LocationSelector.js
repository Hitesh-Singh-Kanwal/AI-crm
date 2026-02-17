'use client'

import { useState, useEffect } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Reusable Location Selector Component
 * Fetches locations from API and provides a dropdown selector
 */
export default function LocationSelector({ 
  value, 
  onChange, 
  placeholder = 'Select location...',
  showAllOption = false,
  filterActiveOnly = true,
  className = ''
}) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
    try {
      setLoading(true)
      const result = await api.get('/api/location')
      if (result.success) {
        let locs = result.data || []
        
        // Filter active only if requested
        if (filterActiveOnly) {
          locs = locs.filter(loc => loc.status?.toLowerCase() === 'active')
        }
        
        setLocations(locs)
      }
    } catch (e) {
      console.error('Failed to load locations:', e)
    } finally {
      setLoading(false)
    }
  }

  const selectedLocation = locations.find(loc => loc._id === value)

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200',
          'bg-white text-sm text-slate-900 hover:border-slate-300 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1',
          open && 'border-brand ring-2 ring-brand ring-offset-1'
        )}
        disabled={loading}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={cn('truncate', !selectedLocation && 'text-slate-400')}>
            {loading 
              ? 'Loading...' 
              : selectedLocation 
                ? selectedLocation.name 
                : placeholder}
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {showAllOption && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors',
                    !value && 'bg-brand/10 text-brand font-medium'
                  )}
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>No Location</span>
                </button>
                <div className="h-px bg-slate-200 my-1" />
              </>
            )}
            {locations.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-slate-500">
                {loading ? 'Loading locations...' : 'No locations available'}
              </div>
            ) : (
              locations.map((location) => (
                <button
                  key={location._id}
                  type="button"
                  onClick={() => {
                    onChange(location._id)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-start gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors',
                    value === location._id && 'bg-brand/10 text-brand font-medium'
                  )}
                >
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{location.name}</div>
                    {(location.city || location.state) && (
                      <div className="text-xs text-slate-500 truncate">
                        {location.city && location.state 
                          ? `${location.city}, ${location.state}` 
                          : location.city || location.state}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
