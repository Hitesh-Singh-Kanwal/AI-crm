'use client'

import { useState, useEffect } from 'react'
import { Search, Mail, UserCog, MoreHorizontal } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import StyledSelect from '@/components/shared/StyledSelect'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import UsersDialog from './components/UsersDialog'
import { getCurrentUser } from '@/lib/auth'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { filterByBranch } from '@/lib/branch-filter'
import { getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const roleColors = {
  'Super Admin': 'badge-error',
  Admin: 'badge-info',
  Staff: 'badge-success',
  Teacher: 'badge-warning',
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [availableRoles, setAvailableRoles] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [loadingUserDetails, setLoadingUserDetails] = useState(false)
  const [usersList, setUsersList] = useState([])
  const [usersDialogOpen, setUsersDialogOpen] = useState(false)
  const [usersDialogInitialId, setUsersDialogInitialId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(10) // Items per page (default: 10)
  const [customLimit, setCustomLimit] = useState('')
  const [showCustomLimit, setShowCustomLimit] = useState(false)
  const toast = useToast()

  // Load available roles on mount
  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    try {
      const result = await api.get('/api/role?limit=1000')
      if (result.success) {
        const roles = result.data || []
        // Extract unique role names
        const uniqueRoles = [...new Set(roles.map(r => r.role))].sort()
        setAvailableRoles(uniqueRoles)
      }
    } catch (e) {
      console.error('Failed to load roles:', e)
    }
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load users when search, page, role filter, or limit changes
  useEffect(() => {
    loadUsers()
  }, [debouncedSearch, currentPage, roleFilter, limit])

  async function loadUsers() {
    try {
      const user = getCurrentUser()
      if (!user) return

      setLoading(true)
      
      // If role filter is applied, fetch all users and paginate client-side
      // Otherwise, use backend pagination
      const useBackendPagination = roleFilter === 'All'
      
      // Build query parameters
      const params = new URLSearchParams()
      if (useBackendPagination) {
        params.append('page', currentPage.toString())
        params.append('limit', limit.toString())
      } else {
        // Fetch all users when filtering by role
        params.append('limit', '1000') // Large limit to get all
      }
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim())
      }

      const result = await api.get(`/api/user?${params.toString()}`)
      if (result.success) {
        let users = result.data || []
        
        // Apply role filter client-side if needed
        if (roleFilter !== 'All') {
          users = users.filter(user => {
            const userRole = user.role?.trim().toLowerCase() || ''
            const filterRole = roleFilter.trim().toLowerCase()
            // Normalize spaces: replace multiple spaces with single space for comparison
            const normalizedUserRole = userRole.replace(/\s+/g, ' ')
            const normalizedFilterRole = filterRole.replace(/\s+/g, ' ')
            return normalizedUserRole === normalizedFilterRole
          })
        }
        
        // Client-side pagination if role filter is applied
        if (!useBackendPagination) {
          const startIndex = (currentPage - 1) * limit
          const endIndex = startIndex + limit
          users = users.slice(startIndex, endIndex)
        }
        
        setUsersList(users)
        
        // Update pagination info
        if (result.pagination) {
          const totalItems = result.pagination.total || 0
          // If role filter applied, count filtered items
          const filteredTotal = roleFilter !== 'All' 
            ? (result.data || []).filter(user => {
                const userRole = user.role?.trim().toLowerCase() || ''
                const filterRole = roleFilter.trim().toLowerCase()
                const normalizedUserRole = userRole.replace(/\s+/g, ' ')
                const normalizedFilterRole = filterRole.replace(/\s+/g, ' ')
                return normalizedUserRole === normalizedFilterRole
              }).length
            : totalItems
          
          setTotal(filteredTotal)
          setTotalPages(Math.ceil(filteredTotal / limit))
        }
      } else {
        console.error('Failed to load users:', result.error)
        toast.error({ title: 'Error', message: result.error || 'Failed to load users' })
      }
    } catch (e) {
      console.error('loadUsers', e)
      toast.error({ title: 'Error', message: 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  function openUsersDialog() {
    setUsersDialogInitialId(null)
    setUsersDialogOpen(true)
  }

  function closeUsersDialog() {
    setUsersDialogOpen(false)
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      const result = await api.delete(`/api/user/${userId}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'User deleted' })
        loadUsers()
        setSelectedUserId(null)
        setSelectedUser(null)
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Unable to delete user' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error' })
    }
  }

  // Filter users by branch
  const displayedUsers = filterByBranch(usersList)

  function handlePageChange(newPage) {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fetch single user details when selectedUserId changes
  useEffect(() => {
    if (selectedUserId) {
      loadUserDetails(selectedUserId)
    } else {
      setSelectedUser(null)
    }
  }, [selectedUserId])

  async function loadUserDetails(userId) {
    setLoadingUserDetails(true)
    try {
      const result = await api.get(`/api/user/${userId}`)
      if (result.success) {
        setSelectedUser(result.data)
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to load user details' })
        setSelectedUserId(null)
      }
    } catch (e) {
      console.error('loadUserDetails', e)
      toast.error({ title: 'Error', message: 'Failed to load user details' })
      setSelectedUserId(null)
    } finally {
      setLoadingUserDetails(false)
    }
  }

  return (
    <MainLayout title="Users" subtitle="Manage team members and their roles">
      <div className="space-y-4 md:space-y-6 min-h-full flex flex-col">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <StyledSelect
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value)
              setCurrentPage(1) // Reset to first page when filter changes
            }}
            options={[
              { value: 'All', label: 'All Roles' },
              ...availableRoles.map(role => ({ value: role, label: role }))
            ]}
            placeholder="All Roles"
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
              <div className="flex items-center gap-2">
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
          <Button variant="gradient" className="w-full sm:w-auto" onClick={openUsersDialog}>
            <UserCog className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <LoadingSpinner size="md" text="Loading users..." />
          </div>
        )}

        {/* Users (row layout) */}
        {!loading && (
          <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[460px] flex flex-col">
            <div className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent bg-muted/40">
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Name</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Email</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Role</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Status</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B]">Joined</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-[#64748B] w-12 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.map((user, index) => (
                  <TableRow
                    key={user._id || user.id || index}
                    onClick={() => setSelectedUserId(user._id || user.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-brand text-brand-foreground text-sm font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.title}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                      <span className="truncate block max-w-[260px]">{user.email}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge className={cn('text-xs', roleColors[user.role])}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant={user.status?.toLowerCase() === 'active' ? 'success' : 'error'}
                        className="text-xs"
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
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
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user._id || user.id)
                              }}
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setUsersDialogInitialId(user._id || user.id)
                                setUsersDialogOpen(true)
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteUser(user._id || user.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}

        {!loading && displayedUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found</p>
            <p className="text-sm text-muted-foreground/80 mt-1">Create your first user to get started</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-row items-center border-t border-slate-200 pt-4 mt-auto">
            <div className="text-sm text-muted-foreground w-52 flex-shrink-0">
              Showing page {currentPage} of {totalPages} ({total} total {total === 1 ? 'user' : 'users'})
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

        {/* User Detail Modal */}
        <Dialog open={!!selectedUserId} onClose={() => setSelectedUserId(null)}>
          <DialogContent onClose={() => setSelectedUserId(null)}>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {loadingUserDetails ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <p className="text-muted-foreground ml-4">Loading user details...</p>
              </div>
            ) : selectedUser ? (
              <div className="space-y-6 mt-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-brand text-brand-foreground text-xl">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.title}</p>
                    <Badge className={cn('mt-2', roleColors[selectedUser.role])}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{selectedUser.phoneNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedUser.status?.toLowerCase() === 'active' ? 'success' : 'error'}>
                      {selectedUser.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                 
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedUserId(null)
                      setUsersDialogInitialId(selectedUser._id)
                      setUsersDialogOpen(true)
                    }}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeleteUser(selectedUser._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load user details</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <UsersDialog open={usersDialogOpen} onClose={closeUsersDialog} users={usersList} onRefresh={loadUsers} initialUserId={usersDialogInitialId} />
      </div>
    </MainLayout>
  )
}


