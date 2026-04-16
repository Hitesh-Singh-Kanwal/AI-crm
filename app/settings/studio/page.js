'use client'

import { useState, useEffect } from 'react'
import { Search, Building2, MapPin, Phone, Mail } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import StyledSelect from '@/components/shared/StyledSelect'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LocationsDialog from './components/LocationsDialog'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { filterByBranch } from '@/lib/branch-filter'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function LocationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [loadingLocationDetails, setLoadingLocationDetails] = useState(false)
  const [locationsList, setLocationsList] = useState([])
  const [locationsDialogOpen, setLocationsDialogOpen] = useState(false)
  const [locationsDialogInitialId, setLocationsDialogInitialId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(10) // Items per page (default: 10)
  const [customLimit, setCustomLimit] = useState('')
  const [showCustomLimit, setShowCustomLimit] = useState(false)
  const toast = useToast()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load locations when search, page, status filter, or limit changes
  useEffect(() => {
    loadLocations()
  }, [debouncedSearch, currentPage, statusFilter, limit])

  async function loadLocations() {
    try {
      setLoading(true)
      
      // If status filter is applied, fetch all locations and paginate client-side
      // Otherwise, use backend pagination
      const useBackendPagination = statusFilter === 'All'
      
      // Build query parameters
      const params = new URLSearchParams()
      if (useBackendPagination) {
        params.append('page', currentPage.toString())
        params.append('limit', limit.toString())
      } else {
        // Fetch all locations when filtering by status
        params.append('limit', '1000') // Large limit to get all
      }
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim())
      }

      const result = await api.get(`/api/location?${params.toString()}`)
      if (result.success) {
        let locations = result.data || []
        
        // Apply status filter client-side if needed
        if (statusFilter !== 'All') {
          locations = locations.filter(loc => 
            loc.status?.toLowerCase() === statusFilter.toLowerCase()
          )
        }
        
        // Client-side pagination if status filter is applied
        if (!useBackendPagination) {
          const startIndex = (currentPage - 1) * limit
          const endIndex = startIndex + limit
          locations = locations.slice(startIndex, endIndex)
        }
        
        setLocationsList(locations)
        
        // Update pagination info
        if (result.pagination) {
          const totalItems = result.pagination.total || 0
          // If status filter applied, count filtered items
          const filteredTotal = statusFilter !== 'All' 
            ? (result.data || []).filter(loc => 
                loc.status?.toLowerCase() === statusFilter.toLowerCase()
              ).length
            : totalItems
          
          setTotal(filteredTotal)
          setTotalPages(Math.ceil(filteredTotal / limit))
        }
      } else {
        console.error('Failed to load locations:', result.error)
        toast.error({ title: 'Error', message: result.error || 'Failed to load locations' })
      }
    } catch (e) {
      console.error('loadLocations', e)
      toast.error({ title: 'Error', message: 'Failed to load locations' })
    } finally {
      setLoading(false)
    }
  }

  function openLocationsDialog() {
    setLocationsDialogInitialId(null)
    setLocationsDialogOpen(true)
  }

  function closeLocationsDialog() {
    setLocationsDialogOpen(false)
  }

  async function handleDeleteLocation(locationId) {
    if (!confirm('Delete this location? This cannot be undone.')) return
    try {
      const result = await api.delete(`/api/location/${locationId}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Location deleted' })
        loadLocations()
        setSelectedLocationId(null)
        setSelectedLocation(null)
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Unable to delete location' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error' })
    }
  }

  // Filter locations by branch
  const displayedLocations = filterByBranch(locationsList)

  function handlePageChange(newPage) {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fetch single location details when selectedLocationId changes
  useEffect(() => {
    if (selectedLocationId) {
      loadLocationDetails(selectedLocationId)
    } else {
      setSelectedLocation(null)
    }
  }, [selectedLocationId])

  async function loadLocationDetails(locationId) {
    setLoadingLocationDetails(true)
    try {
      const result = await api.get(`/api/location/${locationId}`)
      if (result.success) {
        setSelectedLocation(result.data)
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to load location details' })
        setSelectedLocationId(null)
      }
    } catch (e) {
      console.error('loadLocationDetails', e)
      toast.error({ title: 'Error', message: 'Failed to load location details' })
      setSelectedLocationId(null)
    } finally {
      setLoadingLocationDetails(false)
    }
  }

  return (
    <MainLayout title="Locations" subtitle="Manage branch locations and their details">
      <div className="space-y-4 md:space-y-6 min-h-full flex flex-col">
        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Locations</h2>
            <p className="text-sm text-muted-foreground">Manage branch locations and their details</p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end md:w-auto md:flex-nowrap md:gap-4">
            <div className="relative w-full sm:w-[360px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <StyledSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1) // Reset to first page when filter changes
              }}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              placeholder="All Status"
              className="w-full sm:w-48"
            />

            <div className="relative w-full sm:w-40">
              {!showCustomLimit ? (
                <StyledSelect
                  value={[10, 20, 50, 100].includes(limit) ? limit.toString() : 'custom'}
                  onChange={(value) => {
                    if (value === 'custom') {
                      setShowCustomLimit(true)
                      setCustomLimit(limit.toString())
                    } else {
                      const newLimit = parseInt(value)
                      setLimit(newLimit)
                      setCurrentPage(1)
                    }
                  }}
                  options={[
                    { value: '10', label: '10 per page' },
                    { value: '20', label: '20 per page' },
                    { value: '50', label: '50 per page' },
                    { value: '100', label: '100 per page' },
                    { value: 'custom', label: `${limit} per page (custom)` }
                  ]}
                  placeholder="10 per page"
                  className="w-full"
                />
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    onBlur={() => {
                      const newLimit = parseInt(customLimit)
                      if (newLimit && newLimit >= 1 && newLimit <= 1000) {
                        setLimit(newLimit)
                        setCurrentPage(1)
                        setShowCustomLimit(false)
                      } else {
                        setCustomLimit(limit.toString())
                        setShowCustomLimit(false)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newLimit = parseInt(customLimit)
                        if (newLimit && newLimit >= 1 && newLimit <= 1000) {
                          setLimit(newLimit)
                          setCurrentPage(1)
                          setShowCustomLimit(false)
                        }
                      } else if (e.key === 'Escape') {
                        setShowCustomLimit(false)
                        setCustomLimit(limit.toString())
                      }
                    }}
                    placeholder="Enter limit"
                    className="w-24"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCustomLimit(false)
                      setCustomLimit(limit.toString())
                    }}
                    className="px-2"
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>

            <Button variant="gradient" className="w-full sm:w-auto" onClick={openLocationsDialog}>
              <Building2 className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <LoadingSpinner size="md" text="Loading locations..." />
          </div>
        )}

        {/* Location Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedLocations.map((location, index) => (
            <div
              key={location._id || location.id || index}
              onClick={() => setSelectedLocationId(location._id || location.id)}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-fade-in shadow-sm"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {location.city && location.state ? `${location.city}, ${location.state}` : location.address}
                  </p>
                  <Badge 
                    variant={location.status?.toLowerCase() === 'active' ? 'success' : 'error'} 
                    className="mt-2 text-xs"
                  >
                    {location.status || 'Active'}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm border-t border-border pt-4">
                {location.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs line-clamp-2">{location.address}</span>
                  </div>
                )}
                {location.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-xs">{location.email}</span>
                  </div>
                )}
                {location.phoneNumber && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">{location.phoneNumber}</span>
                  </div>
                )}
                {location.createdAt && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">Created:</span>
                    <span className="text-xs text-foreground">{formatDate(location.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-row items-center border-t border-border pt-4 mt-auto">
            <div className="text-sm text-muted-foreground w-52 flex-shrink-0">
              Showing page {currentPage} of {totalPages} ({total} total {total === 1 ? 'location' : 'locations'})
            </div>
            <div className="flex-1 flex justify-center">
              {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'gradient' : 'outline'}
                        onClick={() => handlePageChange(pageNum)}
                        size="sm"
                        className="min-w-[2.5rem]"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
              )}
            </div>
            <div className="w-52 flex-shrink-0" aria-hidden="true" />
          </div>
        )}

        {!loading && displayedLocations.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No locations found</p>
            <p className="text-sm text-muted-foreground/80 mt-1">Create your first location to get started</p>
          </div>
        )}

        {/* Location Detail Modal */}
        <Dialog open={!!selectedLocationId} onClose={() => setSelectedLocationId(null)}>
          <DialogContent onClose={() => setSelectedLocationId(null)}>
            <DialogHeader>
              <DialogTitle>Location Details</DialogTitle>
            </DialogHeader>
            {loadingLocationDetails ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <p className="text-muted-foreground ml-4">Loading location details...</p>
              </div>
            ) : selectedLocation ? (
              <div className="space-y-6 mt-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedLocation.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedLocation.city && selectedLocation.state 
                        ? `${selectedLocation.city}, ${selectedLocation.state}` 
                        : selectedLocation.address}
                    </p>
                    <Badge 
                      variant={selectedLocation.status?.toLowerCase() === 'active' ? 'success' : 'error'}
                      className="mt-2"
                    >
                      {selectedLocation.status || 'Active'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedLocation.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium text-right max-w-[60%]">{selectedLocation.address}</span>
                    </div>
                  )}
                  {selectedLocation.city && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City:</span>
                      <span className="font-medium">{selectedLocation.city}</span>
                    </div>
                  )}
                  {selectedLocation.state && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">State:</span>
                      <span className="font-medium">{selectedLocation.state}</span>
                    </div>
                  )}
                  {selectedLocation.country && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country:</span>
                      <span className="font-medium">{selectedLocation.country}</span>
                    </div>
                  )}
                  {selectedLocation.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedLocation.email}</span>
                    </div>
                  )}
                  {selectedLocation.phoneNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedLocation.phoneNumber}</span>
                    </div>
                  )}
                  {selectedLocation.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{formatDate(selectedLocation.createdAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedLocationId(null)
                      setLocationsDialogInitialId(selectedLocation._id)
                      setLocationsDialogOpen(true)
                    }}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Edit Location
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeleteLocation(selectedLocation._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load location details</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <LocationsDialog 
          open={locationsDialogOpen} 
          onClose={closeLocationsDialog} 
          locations={locationsList} 
          onRefresh={loadLocations} 
          initialLocationId={locationsDialogInitialId} 
        />
      </div>
    </MainLayout>
  )
}
