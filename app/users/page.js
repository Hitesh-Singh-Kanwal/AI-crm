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
import { getToken, getCurrentUser } from '@/lib/auth'
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
  const [roleFilter, setRoleFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)
  const [usersList, setUsersList] = useState([])
  const [usersDialogOpen, setUsersDialogOpen] = useState(false)
  const [usersDialogInitialId, setUsersDialogInitialId] = useState(null)
  const toast = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const user = getCurrentUser()
      const orgId = user?.organisationID || user?.organisationId || user?.organisation || ''
      if (!orgId) return
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/user?organisationID=${orgId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json && json.success) setUsersList(json.data || [])
    } catch (e) {
      console.error('loadUsers', e)
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
      const token = getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/user/${userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json && json.success) {
        toast.success({ title: 'Deleted', message: 'User deleted' })
        loadUsers()
        setSelectedUser(null)
      } else {
        toast.error({ title: 'Delete failed', message: json?.message || 'Unable to delete user' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error' })
    }
  }

  // Filter users by branch
  const filteredUsers = filterByBranch(usersList)

  // Apply search and role filter
  const displayedUsers = filteredUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'All' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

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
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full sm:w-48">
            <option value="All">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Teacher">Teacher</option>
          </Select>
          <Button variant="gradient" className="w-full sm:w-auto" onClick={openUsersDialog}>
            <UserCog className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* User Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedUsers.map((user, index) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
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
                  <Badge variant={user.status === 'Active' ? 'success' : 'error'} className="text-xs">
                    {user.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Joined:</span>
                  <span className="text-xs text-slate-700">{formatDate(user.joinedDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* User Detail Modal */}
        <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)}>
          {selectedUser && (
            <DialogContent onClose={() => setSelectedUser(null)}>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
              </DialogHeader>
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
                    <span className="font-medium">{selectedUser.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedUser.status === 'Active' ? 'success' : 'error'}>
                      {selectedUser.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{formatDate(selectedUser.joinedDate)}</span>
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
                      setSelectedUser(null)
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
            </DialogContent>
          )}
        </Dialog>
        <UsersDialog open={usersDialogOpen} onClose={closeUsersDialog} users={usersList} onRefresh={loadUsers} initialUserId={usersDialogInitialId} />
      </div>
    </MainLayout>
  )
}


