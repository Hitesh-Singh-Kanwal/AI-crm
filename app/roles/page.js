'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Search, Shield, Edit, Trash, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import StyledSelect from '@/components/shared/StyledSelect'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import RolesDialog from '@/app/roles/components/RolesDialog'
import { cn } from '@/lib/utils'

function formatDate(value) {
  if (!value) return 'N/A'
  const d = new Date(value)
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function getEnabledPermissionSections(permissions) {
  const perms = permissions || {}
  const sectionKeys = Object.keys(perms)
  const enabledSections = []

  for (const sectionKey of sectionKeys) {
    const section = perms?.[sectionKey]
    const sectionPerms = section?.permissions || {}
    let sectionEnabled = false
    for (const moduleKey of Object.keys(sectionPerms)) {
      const actions = sectionPerms?.[moduleKey]
      const enabled =
        actions &&
        typeof actions === 'object' &&
        (actions.read || actions.write || actions.edit || actions.delete)
      if (enabled) {
        sectionEnabled = true
        break
      }
    }
    if (sectionEnabled) enabledSections.push(sectionKey)
  }

  // de-dupe while preserving order
  return [...new Set(enabledSections)]
}

function getPermissionActionBadges(actions) {
  const a = actions || {}
  return [
    { key: 'read', label: 'Read', on: !!a.read },
    { key: 'write', label: 'Write', on: !!a.write },
    { key: 'edit', label: 'Edit', on: !!a.edit },
    { key: 'delete', label: 'Delete', on: !!a.delete },
  ]
}

function PermissionsTable({ permissions }) {
  const [expandedSections, setExpandedSections] = useState({})

  function toggleSection(key) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const entries = Object.entries(permissions || {})

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-900">Permissions</h4>
      <div className="rounded-lg border border-slate-200">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_6rem] bg-slate-50 border-b border-slate-200 px-2 py-2.5 text-xs font-medium text-slate-500">
          <div />
          <div>Section</div>
          <div className="text-right pr-2">Modules</div>
        </div>

        {entries.map(([sectionKey, section], idx) => {
          const sectionName = section?.name || sectionKey
          const modules = Object.entries(section?.permissions || {})
          const isExpanded = !!expandedSections[sectionKey]
          const isLast = idx === entries.length - 1

          return (
            <div key={sectionKey} className={!isLast || isExpanded ? 'border-b border-slate-200' : ''}>
              {/* Section row */}
              <div
                onClick={() => toggleSection(sectionKey)}
                className="grid grid-cols-[2rem_1fr_6rem] items-center px-2 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="text-slate-400 flex items-center">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="font-medium text-slate-900 text-sm">{sectionName}</div>
                <div className="flex justify-end pr-2">
                  <Badge variant="secondary" className="text-xs">{modules.length} modules</Badge>
                </div>
              </div>

              {/* Expanded modules */}
              {isExpanded && (
                <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-3">
                  {modules.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">No modules configured</p>
                  ) : (
                    <div>
                      <div className="flex justify-between pb-2 border-b border-slate-200 text-xs font-medium text-slate-400">
                        <span>Module</span>
                        <span>Allowed actions</span>
                      </div>
                      {modules.map(([moduleKey, actions], mIdx) => {
                        const badges = getPermissionActionBadges(actions)
                        const enabledCount = badges.filter((b) => b.on).length
                        return (
                          <div
                            key={moduleKey}
                            className={`flex items-center justify-between py-2 ${mIdx < modules.length - 1 ? 'border-b border-slate-100' : ''}`}
                          >
                            <div>
                              <span className="text-sm font-medium text-slate-800">
                                {moduleKey === '*' ? 'Master' : moduleKey}
                              </span>
                              <span className="ml-2 text-xs text-slate-400">
                                {enabledCount > 0 ? `${enabledCount} allowed` : 'No access'}
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              {badges.map((b) => (
                                <Badge key={b.key} variant={b.on ? 'success' : 'outline'} className="text-[11px]">
                                  {b.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
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

        {/* Roles (row layout) */}
        {!loading && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent bg-[#F8FAFC]">
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Role</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Permissions</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Created</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B] w-12 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role, index) => {
                  const enabledSections = getEnabledPermissionSections(role.permissions)
                  const shown = enabledSections.slice(0, 3)
                  const remaining = Math.max(0, enabledSections.length - shown.length)
                  return (
                    <TableRow
                      key={role._id || index}
                      onClick={() => setSelectedRoleId(role._id)}
                      className={cn('cursor-pointer', selectedRoleId === role._id && 'bg-muted/50')}
                    >
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                            <Shield className="h-4.5 w-4.5 text-brand" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">{role.role}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {enabledSections.length > 0 ? `${enabledSections.length} sections enabled` : 'No permissions enabled'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {shown.map((name) => (
                            <Badge key={name} className="text-xs" variant="secondary">
                              {name}
                            </Badge>
                          ))}
                          {remaining > 0 && (
                            <Badge className="text-xs" variant="outline">
                              +{remaining} more
                            </Badge>
                          )}
                          {enabledSections.length === 0 && (
                            <Badge className="text-xs" variant="outline">
                              —
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(role.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setSelectedRoleId(role._id)}>
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditRole(role)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteRole(role._id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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
        <Dialog open={!!selectedRoleId} onClose={() => setSelectedRoleId(null)} maxWidth="6xl">
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

                {/* Permissions breakdown */}
                <PermissionsTable permissions={selectedRole.permissions} />

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
