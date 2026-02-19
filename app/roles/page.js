'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, Shield, Edit, Trash } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import StyledSelect from '@/components/shared/StyledSelect'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import RolesDialog from '@/app/roles/components/RolesDialog'
import { cn } from '@/lib/utils'

function formatDate(value) {
  if (!value) return 'N/A'
  const d = new Date(value)
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function RolesPage() {
  const [roles, setRoles] = useState([])
  const [permissionsSchema, setPermissionsSchema] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false)
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false)
  const [rolesDialogInitialId, setRolesDialogInitialId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(10)
  const [customLimit, setCustomLimit] = useState('')
  const [showCustomLimit, setShowCustomLimit] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadPermissions()
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load roles when search, page or limit changes (backend pagination + search)
  useEffect(() => {
    loadRoles()
  }, [debouncedSearch, currentPage, limit])

  async function loadRoles() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', currentPage.toString())
      params.set('limit', limit.toString())
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const result = await api.get(`/api/role?${params.toString()}`)
      if (result.success) {
        setRoles(result.data || [])
        const pag = result.pagination
        if (pag) {
          setTotal(pag.total ?? 0)
          setTotalPages(Math.max(1, pag.totalPages ?? 1))
        }
      } else {
        toast.error({ title: 'Error', message: result.error || result.message || 'Failed to load roles' })
      }
    } catch (e) {
      console.error('loadRoles', e)
      toast.error({ title: 'Error', message: 'Failed to load roles' })
    } finally {
      setLoading(false)
    }
  }

  async function loadPermissions() {
    try {
      const result = await api.get('/api/role/permissions')
      if (result.success) setPermissionsSchema(result.data || null)
    } catch (e) {
      console.error('loadPermissions', e)
    }
  }

  useEffect(() => {
    if (selectedRoleId) {
      loadRoleDetails(selectedRoleId)
    } else {
      setSelectedRole(null)
    }
  }, [selectedRoleId])

  async function loadRoleDetails(roleId) {
    setLoadingRoleDetails(true)
    try {
      const result = await api.get(`/api/role/${roleId}`)
      if (result.success && result.data) {
        setSelectedRole(result.data)
      } else {
        toast.error({ title: 'Error', message: result.error || result.message || 'Failed to load role details' })
        setSelectedRoleId(null)
      }
    } catch (e) {
      console.error('loadRoleDetails', e)
      toast.error({ title: 'Error', message: 'Failed to load role details' })
      setSelectedRoleId(null)
    } finally {
      setLoadingRoleDetails(false)
    }
  }

  function handlePageChange(newPage) {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCreateRole() {
    setRolesDialogInitialId(null)
    setRolesDialogOpen(true)
  }

  function openEditRole(role) {
    setRolesDialogInitialId(role._id)
    setRolesDialogOpen(true)
  }

  function closeRolesDialog() {
    setRolesDialogOpen(false)
    setRolesDialogInitialId(null)
  }

  async function handleDeleteRole(roleId) {
    if (!confirm('Delete this role? This cannot be undone.')) return
    try {
      const result = await api.delete(`/api/role/${roleId}`)
      if (result.success) {
        toast.success({ title: 'Role Deleted', message: 'Role has been deleted successfully' })
        loadRoles()
        if (selectedRoleId === roleId) setSelectedRoleId(null)
      } else {
        toast.error({
          title: 'Delete Failed',
          message: result.error || result.message || 'Unable to delete role',
        })
      }
    } catch (e) {
      console.error('handleDeleteRole', e)
      toast.error({ title: 'Error', message: 'An unexpected error occurred while deleting the role' })
    }
  }

  return (
    <MainLayout title="Roles" subtitle="Manage roles and permissions">
      <div className="space-y-4 md:space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-40">
            {!showCustomLimit ? (
              <StyledSelect
                value={[10, 20, 50, 100].includes(limit) ? limit.toString() : 'custom'}
                onChange={(value) => {
                  if (value === 'custom') {
                    setShowCustomLimit(true)
                    setCustomLimit(limit.toString())
                  } else {
                    const newLimit = parseInt(value, 10)
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
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={customLimit}
                  onChange={(e) => setCustomLimit(e.target.value)}
                  onBlur={() => {
                    const newLimit = parseInt(customLimit, 10)
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
                      const newLimit = parseInt(customLimit, 10)
                      if (newLimit && newLimit >= 1 && newLimit <= 1000) {
                        setLimit(newLimit)
                        setCurrentPage(1)
                        setShowCustomLimit(false)
                      } else {
                        setShowCustomLimit(false)
                        setCustomLimit(limit.toString())
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
          <Button variant="gradient" className="w-full sm:w-auto" onClick={openCreateRole}>
            <Shield className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center">
            <LoadingSpinner size="md" text="Loading roles..." />
          </div>
        )}

        {/* Role Grid */}
        {!loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role, index) => (
              <div
                key={role._id}
                onClick={() => setSelectedRoleId(role._id)}
                className={cn(
                  'animate-fade-in cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                  selectedRoleId === role._id && 'ring-2 ring-brand/30 border-brand/40'
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Shield className="h-6 w-6 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-slate-900">{role.role}</h3>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {Object.keys(role.permissions || {}).length} permission sections
                    </p>
                    <Badge className="mt-2 text-xs" variant="secondary">
                      {Object.keys(role.permissions || {}).length} sections
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Created</span>
                    <span className="text-xs text-slate-700">{formatDate(role.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-row items-center border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-600 w-52 flex-shrink-0">
              Showing page {currentPage} of {totalPages} ({total} total {total === 1 ? 'role' : 'roles'})
            </div>
            <div className="flex-1 flex justify-center">
              {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) pageNum = i + 1
                    else if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'gradient' : 'outline'}
                        size="sm"
                        className="min-w-[2.5rem]"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
              )}
            </div>
            <div className="w-52 flex-shrink-0" aria-hidden="true" />
          </div>
        )}

        {!loading && roles.length === 0 && (
          <div className="py-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-slate-500">No roles found</p>
            <p className="mt-1 text-sm text-slate-400">Create your first role to get started</p>
            <Button variant="gradient" className="mt-4" onClick={openCreateRole}>
              <Shield className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </div>
        )}

        {/* Role Detail Modal */}
        <Dialog open={!!selectedRoleId} onClose={() => setSelectedRoleId(null)}>
          <DialogContent onClose={() => setSelectedRoleId(null)}>
            <DialogHeader>
              <DialogTitle>Role Details</DialogTitle>
            </DialogHeader>
            {loadingRoleDetails ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <p className="ml-4 text-slate-500">Loading role details...</p>
              </div>
            ) : selectedRole ? (
              <div className="mt-4 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Shield className="h-8 w-8 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedRole.role}</h3>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(selectedRole.permissions || {}).length} permission sections
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role name</span>
                    <span className="font-medium">{selectedRole.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permission sections</span>
                    <span className="font-medium">{Object.keys(selectedRole.permissions || {}).length}</span>
                  </div>
                  {selectedRole.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{formatDate(selectedRole.createdAt)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedRoleId(null)
                      openEditRole(selectedRole)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Role
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeleteRole(selectedRole._id)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-500">Failed to load role details</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <RolesDialog
          open={rolesDialogOpen}
          onClose={closeRolesDialog}
          onRefresh={loadRoles}
          initialRoleId={rolesDialogInitialId}
          permissionsSchema={permissionsSchema}
        />
      </div>
    </MainLayout>
  )
}
