'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, MoreHorizontal, Trash2, Pencil, ChevronDown } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
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

const EMPTY_FORM = {
  name: '',
  email: '',
  phoneNumber: '',
  credits: 0,
  locationID: '',
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

function CustomerFormDialog({ open, onClose, onSaved, initial, locations }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()
  const isEdit = Boolean(initial?._id)

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            name: initial.name || '',
            email: initial.email || '',
            phoneNumber: initial.phoneNumber || '',
            credits: initial.credits ?? 0,
            locationID: String(initial.locationID?._id ?? initial.locationID ?? ''),
          }
        : EMPTY_FORM
      )
      setError(null)
    }
  }, [open, initial])

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (!form.locationID) {
      setError('Please select a location.')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      credits: Number(form.credits) || 0,
      locationID: form.locationID,
    }
    const result = isEdit
      ? await api.put(`/api/customer/${initial._id}`, payload)
      : await api.post('/api/customer', payload)

    if (result.success) {
      toast.success(isEdit ? 'Customer updated.' : 'Customer created.')
      onSaved()
      onClose()
    } else {
      setError(result.error || 'Something went wrong.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
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
                placeholder="email@example.com"
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
            <FormField label="Credits">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.credits}
                  onChange={(e) => setField('credits', e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background pl-6 pr-3 text-[13px] text-foreground outline-none focus:border-primary"
                />
              </div>
            </FormField>
          </div>
          <FormField label="Location" required>
            <div className="relative">
              <select
                value={form.locationID}
                onChange={(e) => setField('locationID', e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] text-foreground outline-none focus:border-primary"
              >
                <option value="">Select location…</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormField>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const toast = useToast()

  useEffect(() => {
    api.get('/api/location?limit=200').then((res) => {
      if (res.success) setLocations(res.data || [])
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setCurrentPage(1) }, [debouncedSearch])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: currentPage, limit })
    if (debouncedSearch) params.set('search', debouncedSearch)
    const result = await api.get(`/api/customer?${params}`)
    if (result.success) {
      setCustomers(result.data || [])
      const t = result.pagination?.total ?? result.total ?? 0
      setTotal(t)
      setTotalPages(Math.max(1, Math.ceil(t / limit)))
    }
    setLoading(false)
  }, [currentPage, debouncedSearch])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await api.delete(`/api/customer/${deleteTarget._id}`)
    if (result.success) {
      toast.success('Customer deleted.')
      setDeleteTarget(null)
      fetchCustomers()
    } else {
      toast.error(result.error || 'Failed to delete customer.')
    }
    setDeleting(false)
  }

  const locationName = (id) => {
    const loc = locations.find((l) => String(l._id) === String(id))
    return loc?.name || '—'
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Customers</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your studio's students and clients</p>
          </div>
          <Button onClick={() => { setEditingCustomer(null); setDialogOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="pl-9 h-9 text-[13px]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[12px] font-semibold">Customer</TableHead>
                <TableHead className="text-[12px] font-semibold">Contact</TableHead>
                <TableHead className="text-[12px] font-semibold">Location</TableHead>
                <TableHead className="text-[12px] font-semibold">Credits</TableHead>
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
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[13px] text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer._id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-[13px] font-medium text-foreground">{customer.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[12px] text-foreground">{customer.email}</p>
                      {customer.phoneNumber && (
                        <p className="text-[11px] text-muted-foreground">{customer.phoneNumber}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {locationName(customer.locationID)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        ${customer.credits ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {formatDate(customer.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingCustomer(customer); setDialogOpen(true) }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(customer)}
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
            <span>{total} customer{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} className="h-7 px-2.5 text-[12px]">
                Previous
              </Button>
              <span className="px-2">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="h-7 px-2.5 text-[12px]">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <CustomerFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchCustomers}
        initial={editingCustomer}
        locations={locations}
      />

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
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
