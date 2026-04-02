'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export default function LocationSelector({
  value,
  onChange,
  onChangeObject,
  placeholder = 'Select location...',
  showAllOption = false,
  filterActiveOnly = true,
  className = '',
  multiple = false,
  disabled = false,
}) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    if (open && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect()
          setDropdownPosition({
            top: buttonRect.bottom + 4,
            left: buttonRect.left,
            width: buttonRect.width
          })
        }
      }
      
      updatePosition()
      
      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [open])

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

  const isMultiple = multiple || Array.isArray(value)
  const selectedLocations = isMultiple
    ? locations.filter((loc) => (value || []).includes(loc._id))
    : locations.find((loc) => loc._id === value)

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (disabled) return
          setOpen(!open)
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200',
          'bg-white text-sm text-slate-900 hover:border-slate-300 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1',
          open && 'border-brand ring-2 ring-brand ring-offset-1',
          disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed'
        )}
        disabled={loading || disabled}
      >
          <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={cn('truncate', ((!selectedLocations || (isMultiple && selectedLocations.length === 0)) && 'text-slate-400'))}>
            {loading
              ? 'Loading...'
              : isMultiple
                ? (selectedLocations && selectedLocations.length > 0
                    ? selectedLocations.map((s) => s.name).join(', ')
                    : placeholder)
                : (selectedLocations ? selectedLocations.name : placeholder)}
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
          <div 
            ref={dropdownRef}
            className="fixed z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-x-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
          >
            {showAllOption && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange(isMultiple ? [] : null)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors',
                    ((!isMultiple && !value) || (isMultiple && (!value || value.length === 0))) && 'bg-brand/10 text-brand font-medium'
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
                    if (isMultiple) {
                      const current = Array.isArray(value) ? [...value] : []
                      const idx = current.indexOf(location._id)
                      if (idx > -1) current.splice(idx, 1)
                      else current.push(location._id)
                      onChange(current)
                      // keep dropdown open to allow multiple selection
                    } else {
                      onChange(location._id)
                      onChangeObject?.(location)
                      setOpen(false)
                    }
                  }}
                  className={cn(
                    'w-full flex items-start gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors',
                    (isMultiple ? (value || []).includes(location._id) : value === location._id) && 'bg-brand/10 text-brand font-medium'
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
                  {isMultiple && (value || []).includes(location._id) && (
                    <div className="ml-2 text-sm text-brand">✓</div>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
