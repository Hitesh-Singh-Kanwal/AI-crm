'use client'

import { useState, useEffect } from 'react'
import { Search, Mail, UserCog } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import UsersDialog from '@/app/users/components/UsersDialog'
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
          users = users.filter(user => 
            user.role?.toLowerCase() === roleFilter.toLowerCase()
          )
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
            ? (result.data || []).filter(user => 
                user.role?.toLowerCase() === roleFilter.toLowerCase()
              ).length
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
      <div className="space-y-4 md:space-y-6">
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
          <Select 
            value={roleFilter} 
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setCurrentPage(1) // Reset to first page when filter changes
            }} 
            className="w-full sm:w-48"
          >
            <option value="All">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Teacher">Teacher</option>
          </Select>
          <div className="relative w-full sm:w-40">
            {!showCustomLimit ? (
              <Select 
                value={[10, 20, 50, 100].includes(limit) ? limit.toString() : 'custom'} 
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setShowCustomLimit(true)
                    setCustomLimit(limit.toString())
                  } else {
                    const newLimit = parseInt(e.target.value)
                    setLimit(newLimit)
                    setCurrentPage(1)
                  }
                }} 
                className="w-full"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="custom">{limit} per page (custom)</option>
              </Select>
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            <p className="text-slate-500 mt-4">Loading users...</p>
          </div>
        )}

        {/* User Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedUsers.map((user, index) => (
            <div
              key={user._id || user.id || index}
              onClick={() => setSelectedUserId(user._id || user.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-fade-in shadow-sm"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-brand text-brand-foreground text-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{user.name}</h3>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{user.title}</p>
                  <Badge className={cn('mt-2 text-xs', roleColors[user.role])}>{user.role}</Badge>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Status:</span>
                  <Badge variant={user.status?.toLowerCase() === 'active' ? 'success' : 'error'} className="text-xs">
                    {user.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Joined:</span>
                  <span className="text-xs text-slate-700">{user.createdAt ? formatDate(user.createdAt) : 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {!loading && displayedUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCog className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No users found</p>
            <p className="text-sm text-slate-400 mt-1">Create your first user to get started</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-600">
              Showing page {currentPage} of {totalPages} ({total} total {total === 1 ? 'user' : 'users'})
            </div>
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
        )}

        {/* User Detail Modal */}
        <Dialog open={!!selectedUserId} onClose={() => setSelectedUserId(null)}>
          <DialogContent onClose={() => setSelectedUserId(null)}>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {loadingUserDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                <p className="text-slate-500 ml-4">Loading user details...</p>
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
                  <Button variant="gradient" className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
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
                <p className="text-slate-500">Failed to load user details</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <UsersDialog open={usersDialogOpen} onClose={closeUsersDialog} users={usersList} onRefresh={loadUsers} initialUserId={usersDialogInitialId} />
      </div>
    </MainLayout>
  )
}


