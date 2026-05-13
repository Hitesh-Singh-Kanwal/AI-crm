'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, MoreHorizontal, Trash2, Pencil, X, ChevronDown, CalendarDays } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const SPECIALTY_SUGGESTIONS = [
  'Ballet', 'Contemporary', 'Hip Hop', 'Jazz', 'Tap', 'Ballroom',
  'Salsa', 'Latin', 'Acrobatics', 'Lyrical', 'Modern', 'Swing',
]

const EMPTY_FORM = {
  name: '',
  email: '',
  phoneNumber: '',
  specialties: [],
  bio: '',
  status: 'active',
}

function FormField({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function TeacherFormDialog({ open, onClose, onSaved, initial }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [specialtyInput, setSpecialtyInput] = useState('')
  const toast = useToast()
  const isEdit = Boolean(initial?._id)

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            name: initial.name || '',
            email: initial.email || '',
            phoneNumber: initial.phoneNumber || '',
            specialties: initial.specialties || [],
            bio: initial.bio || '',
            status: initial.status || 'active',
          }
        : EMPTY_FORM
      )
      setError(null)
      setSpecialtyInput('')
    }
  }, [open, initial])

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const addSpecialty = (s) => {
    const trimmed = s.trim()
    if (!trimmed || form.specialties.includes(trimmed)) return
    setField('specialties', [...form.specialties, trimmed])
    setSpecialtyInput('')
  }

  const removeSpecialty = (s) => setField('specialties', form.specialties.filter((x) => x !== s))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      specialties: form.specialties,
      bio: form.bio.trim() || undefined,
      status: form.status,
    }
    const result = isEdit
      ? await api.put(`/api/teacher/${initial._id}`, payload)
      : await api.post('/api/teacher', payload)

    if (result.success) {
      toast.success(isEdit ? 'Teacher updated.' : 'Teacher created.')
      onSaved()
      onClose()
    } else {
      setError(result.error || 'Something went wrong.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Full name"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary"
              />
            </FormField>
            <FormField label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="email@studio.com"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone">
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setField('phoneNumber', e.target.value)}
                placeholder="+1 555 000 0000"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary"
              />
            </FormField>
            <FormField label="Status">
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] text-foreground outline-none focus:border-primary"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </FormField>
          </div>

          <FormField label="Specialties">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(specialtyInput) } }}
                  placeholder="Type and press Enter…"
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addSpecialty(specialtyInput)}>Add</Button>
              </div>
              {form.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.specialties.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                      {s}
                      <button type="button" onClick={() => removeSpecialty(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {SPECIALTY_SUGGESTIONS.filter((s) => !form.specialties.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSpecialty(s)}
                    className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </FormField>

          <FormField label="Bio">
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Short bio or description…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary"
            />
          </FormField>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Teacher'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TeachersPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const toast = useToast()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter])

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: currentPage, limit })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const result = await api.get(`/api/teacher?${params}`)
    if (result.success) {
      setTeachers(result.data || [])
      const t = result.pagination?.total ?? result.total ?? 0
      setTotal(t)
      setTotalPages(Math.max(1, Math.ceil(t / limit)))
    }
    setLoading(false)
  }, [currentPage, debouncedSearch, statusFilter])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await api.delete(`/api/teacher/${deleteTarget._id}`)
    if (result.success) {
      toast.success('Teacher deleted.')
      setDeleteTarget(null)
      fetchTeachers()
    } else {
      toast.error(result.error || 'Failed to delete teacher.')
    }
    setDeleting(false)
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Teachers</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your studio's instructors</p>
          </div>
          <Button onClick={() => { setEditingTeacher(null); setDialogOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Teacher
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teachers…"
              className="pl-9 h-9 text-[13px]"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] text-foreground outline-none focus:border-primary"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[12px] font-semibold">Teacher</TableHead>
                <TableHead className="text-[12px] font-semibold">Contact</TableHead>
                <TableHead className="text-[12px] font-semibold">Specialties</TableHead>
                <TableHead className="text-[12px] font-semibold">Status</TableHead>
                <TableHead className="text-[12px] font-semibold">Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[13px] text-muted-foreground">
                    No teachers found.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher) => (
                  <TableRow key={teacher._id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                            {getInitials(teacher.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{teacher.name}</p>
                          {teacher.bio && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">{teacher.bio}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[12px] text-foreground">{teacher.email}</p>
                      {teacher.phoneNumber && (
                        <p className="text-[11px] text-muted-foreground">{teacher.phoneNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {teacher.specialties?.length > 0 ? (
                          teacher.specialties.slice(0, 3).map((s) => (
                            <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[12px] text-muted-foreground">—</span>
                        )}
                        {teacher.specialties?.length > 3 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            +{teacher.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'text-[11px] capitalize',
                        teacher.status === 'active' ? 'badge-success' : 'badge-error'
                      )}>
                        {teacher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {formatDate(teacher.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/calendar?teacherID=${teacher._id}`)}>
                            <CalendarDays className="mr-2 h-3.5 w-3.5" />
                            View on Calendar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingTeacher(teacher); setDialogOpen(true) }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(teacher)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{total} teacher{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-7 px-2.5 text-[12px]"
              >
                Previous
              </Button>
              <span className="px-2">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-7 px-2.5 text-[12px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <TeacherFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchTeachers}
        initial={editingTeacher}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
