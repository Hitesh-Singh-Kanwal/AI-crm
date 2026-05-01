'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, MoreHorizontal, FileText } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'
import ServiceDialog from '@/app/calendar/services/components/ServiceDialog'
import LessonDialog from '@/app/calendar/lessons/components/LessonDialog'

const ROWS_PER_PAGE = 10

const TABS = [
  { id: 'services', label: 'Services' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'packages', label: 'Packages' },
]

function BoolBadge({ value }) {
  return value
    ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600">Yes</span>
    : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">No</span>
}

function ServicesTab() {
  const [services, setServices] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE))

  const loadServices = useCallback(async (page, search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ROWS_PER_PAGE) })
      if (search) params.set('search', search)
      const result = await api.get(`/api/calendar-service?${params}`)
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : []
        setServices(data)
        setTotalCount(result.pagination?.total ?? data.length)
      } else {
        toast.error('Failed to load services', { description: result.error })
      }
    } catch (e) {
      toast.error('Error', { description: 'Unable to load services' })
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }, [])

  useEffect(() => { loadServices(currentPage, searchQuery) }, [currentPage, searchQuery, loadServices])

  const toggleOne = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () => { if (selectedIds.length === services.length) setSelectedIds([]); else setSelectedIds(services.map((s) => s._id)) }

  async function handleDelete(service) {
    if (!window.confirm(`Delete "${service.serviceName}"? This cannot be undone.`)) return
    try {
      const result = await api.delete(`/api/calendar-service/${service._id}`)
      if (result.success) { toast.success('Service deleted'); loadServices(currentPage, searchQuery) }
      else toast.error('Delete failed', { description: result.error })
    } catch { toast.error('Error', { description: 'Unable to delete service' }) }
  }

  async function handleToggleStatus(service) {
    try {
      const result = await api.patch(`/api/calendar-service/${service._id}/toggle`)
      if (result.success) { toast.success(`Service ${service.isActive ? 'deactivated' : 'activated'}`); loadServices(currentPage, searchQuery) }
      else toast.error('Failed', { description: result.error })
    } catch { toast.error('Error', { description: 'Unable to update service status' }) }
  }

  if (loading && services.length === 0) {
    return <div className="flex items-center justify-center h-64"><GlobalLoader variant="center" size="md" text="Loading services…" /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-[220px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="pl-9 h-9 rounded-lg bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
            {totalCount} {totalCount === 1 ? 'service' : 'services'}
          </span>
          <Button
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2 shrink-0"
            onClick={() => { setEditingService(null); setDialogOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card min-h-[480px] flex flex-col">
        <div className="flex-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent bg-muted/30">
                <TableHead className="w-12 py-3 pl-4 pr-0">
                  <Checkbox checked={selectedIds.length === services.length && services.length > 0} onClick={toggleAll} className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand" />
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Service Name</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Service Code</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Location</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Description</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Price</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Chargeable</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Group</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Sundry</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">On Calendar</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Documents</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="w-12 py-3 pr-4 pl-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-16 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'No services match your search.' : 'No services yet. Click "Add Service" to create one.'}
                  </TableCell>
                </TableRow>
              ) : services.map((service) => (
                <TableRow key={service._id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3 pl-4 pr-0">
                    <Checkbox checked={selectedIds.includes(service._id)} onClick={() => toggleOne(service._id)} className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand" />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${service.color ? '' : 'bg-muted text-muted-foreground'}`}
                        style={service.color ? { backgroundColor: service.color, color: '#fff' } : undefined}
                      >
                        {service.serviceName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-normal text-foreground">{service.serviceName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-medium bg-muted text-foreground border border-border">{service.serviceCode}</span>
                  </TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{service.locationID?.name || <span className="text-muted-foreground">—</span>}</p></TableCell>
                  <TableCell className="py-3 px-4 max-w-[200px]"><p className="text-sm text-muted-foreground truncate">{service.description || '—'}</p></TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{service.price != null ? `$${Number(service.price).toFixed(2)}` : '—'}</p></TableCell>
                  <TableCell className="py-3 px-4"><BoolBadge value={service.isChargeable} /></TableCell>
                  <TableCell className="py-3 px-4"><BoolBadge value={service.isGroup} /></TableCell>
                  <TableCell className="py-3 px-4"><BoolBadge value={service.isSundry} /></TableCell>
                  <TableCell className="py-3 px-4"><BoolBadge value={service.countOnCalendar} /></TableCell>
                  <TableCell className="py-3 px-4">
                    {service.documents?.length > 0 ? (
                      <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-sm text-foreground">{service.documents.length}</span></div>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', service.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'].join(' ')}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 pr-4 pl-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingService(service); setDialogOpen(true) }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(service)}>{service.isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(service)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>

      <ServiceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} service={editingService} onRefresh={() => loadServices(currentPage, searchQuery)} />
    </div>
  )
}

function LessonsTab() {
  const [lessons, setLessons] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE))

  const loadLessons = useCallback(async (page, search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ROWS_PER_PAGE) })
      if (search) params.set('search', search)
      const result = await api.get(`/api/lesson?${params}`)
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : []
        setLessons(data)
        setTotalCount(result.pagination?.total ?? data.length)
      } else {
        toast.error('Failed to load lessons', { description: result.error })
      }
    } catch { toast.error('Error', { description: 'Unable to load lessons' }) }
    finally { setLoading(false); setSelectedIds([]) }
  }, [])

  useEffect(() => { loadLessons(currentPage, searchQuery) }, [currentPage, searchQuery, loadLessons])

  const toggleOne = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () => { if (selectedIds.length === lessons.length) setSelectedIds([]); else setSelectedIds(lessons.map((l) => l._id)) }

  const isActiveLesson = (lesson) => { const end = lesson?.endDate ? new Date(lesson.endDate) : null; return !end || end >= new Date() }

  async function handleDelete(lesson) {
    if (!window.confirm(`Delete "${lesson.name}"? This cannot be undone.`)) return
    try {
      const result = await api.delete(`/api/lesson/${lesson._id}`)
      if (result.success) { toast.success('Lesson deleted'); loadLessons(currentPage, searchQuery) }
      else toast.error('Delete failed', { description: result.error })
    } catch { toast.error('Error', { description: 'Unable to delete lesson' }) }
  }

  if (loading && lessons.length === 0) {
    return <div className="flex items-center justify-center h-64"><GlobalLoader variant="center" size="md" text="Loading lessons…" /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-[220px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lessons…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="pl-9 h-9 rounded-lg bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
            {totalCount} {totalCount === 1 ? 'lesson' : 'lessons'}
          </span>
          <Button
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2 shrink-0"
            onClick={() => { setEditingLesson(null); setDialogOpen(true) }}
          >
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card min-h-[480px] flex flex-col">
        <div className="flex-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent bg-muted/30">
                <TableHead className="w-12 py-3 pl-4 pr-0">
                  <Checkbox checked={selectedIds.length === lessons.length && lessons.length > 0} onClick={toggleAll} className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand" />
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Lesson</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Location Name</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Duration</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Unit</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Color</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Active</TableHead>
                <TableHead className="w-12 py-3 pr-4 pl-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'No lessons match your search.' : 'No lessons yet. Click "Create New" to add one.'}
                  </TableCell>
                </TableRow>
              ) : lessons.map((lesson) => (
                <TableRow key={lesson._id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3 pl-4 pr-0">
                    <Checkbox checked={selectedIds.includes(lesson._id)} onClick={() => toggleOne(lesson._id)} className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand" />
                  </TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{lesson.name}</p></TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{typeof lesson.locationID === 'object' ? (lesson.locationID?.name || '—') : '—'}</p></TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{lesson.duration ?? 50}</p></TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{lesson.unit ?? 1}</p></TableCell>
                  <TableCell className="py-3 px-4">
                    {lesson.color ? (
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-10 rounded border border-black/10 shrink-0" style={{ backgroundColor: lesson.color }} />
                        <span className="text-xs font-mono text-muted-foreground">{lesson.color}</span>
                      </div>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', isActiveLesson(lesson) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'].join(' ')}>
                      {isActiveLesson(lesson) ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 pr-4 pl-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingLesson(lesson); setDialogOpen(true) }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(lesson)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>

      <LessonDialog open={dialogOpen} onClose={() => setDialogOpen(false)} lesson={editingLesson} onRefresh={() => loadLessons(currentPage, searchQuery)} />
    </div>
  )
}

function PackagesTab() {
  const router = useRouter()
  const [packages, setPackages] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])

  const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE))

  const loadPackages = useCallback(async (page, search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ROWS_PER_PAGE) })
      if (search) params.set('search', search)
      const result = await api.get(`/api/package?${params}`)
      if (result.success) {
        setPackages(Array.isArray(result.data) ? result.data : [])
        setTotalCount(result.pagination?.total ?? 0)
      } else {
        toast.error('Failed to load packages', { description: result.error })
      }
    } catch { toast.error('Error', { description: 'Unable to load packages' }) }
    finally { setLoading(false); setSelectedIds([]) }
  }, [])

  useEffect(() => { loadPackages(currentPage, searchQuery) }, [currentPage, searchQuery, loadPackages])

  const toggleOne = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () => { if (selectedIds.length === packages.length) setSelectedIds([]); else setSelectedIds(packages.map((p) => p._id)) }

  async function handleDelete(pkg) {
    if (!window.confirm(`Delete "${pkg.packageName}"? This cannot be undone.`)) return
    try {
      const result = await api.delete(`/api/package/${pkg._id}`)
      if (result.success) { toast.success('Package deleted'); loadPackages(currentPage, searchQuery) }
      else toast.error('Delete failed', { description: result.error })
    } catch { toast.error('Error', { description: 'Unable to delete package' }) }
  }

  async function handleToggleStatus(pkg) {
    try {
      const result = await api.patch(`/api/package/${pkg._id}/toggle`)
      if (result.success) { toast.success(`Package ${pkg.isActive ? 'deactivated' : 'activated'}`); loadPackages(currentPage, searchQuery) }
      else toast.error('Failed', { description: result.error })
    } catch { toast.error('Error', { description: 'Unable to update package status' }) }
  }

  if (loading && packages.length === 0) {
    return <div className="flex items-center justify-center h-64"><GlobalLoader variant="center" size="md" text="Loading packages…" /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-[220px] shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="pl-9 h-9 rounded-lg bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
            {totalCount} {totalCount === 1 ? 'package' : 'packages'}
          </span>
          <Button
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2 shrink-0"
            onClick={() => router.push('/calendar/packages/new')}
          >
            <Plus className="h-4 w-4" />
            Add Package
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card min-h-[480px] flex flex-col">
        <div className="flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent bg-muted/30">
                <TableHead className="w-12 py-3 pl-4 pr-0">
                  <Checkbox checked={selectedIds.length === packages.length && packages.length > 0} onClick={toggleAll} className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand" />
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Package Name</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Location</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Description</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Sort Order</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Color</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Services</TableHead>
                <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="w-12 py-3 pr-4 pl-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'No packages match your search.' : 'No packages yet. Click "Add Package" to create one.'}
                  </TableCell>
                </TableRow>
              ) : packages.map((pkg) => (
                <TableRow key={pkg._id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`/calendar/packages/${pkg._id}`)}>
                  <TableCell className="py-3 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.includes(pkg._id)} onClick={(e) => { e.stopPropagation(); toggleOne(pkg._id) }} className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand" />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: pkg.color || '#6366f1' }}>
                        {pkg.packageName.charAt(0).toUpperCase()}
                      </span>
                      <p className="text-sm font-medium text-foreground">{pkg.packageName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{pkg.locationID?.name || <span className="text-muted-foreground">—</span>}</p></TableCell>
                  <TableCell className="py-3 px-4 max-w-[200px]"><p className="text-sm text-muted-foreground truncate">{pkg.description || '—'}</p></TableCell>
                  <TableCell className="py-3 px-4"><p className="text-sm text-foreground">{pkg.sortOrder ?? 0}</p></TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: pkg.color || '#6366f1' }} />
                      <span className="text-xs font-mono text-muted-foreground">{pkg.color || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-foreground">
                      {pkg.services?.length ?? 0} service{(pkg.services?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', pkg.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'].join(' ')}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 pr-4 pl-0" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/calendar/packages/${pkg._id}`)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(pkg)}>{pkg.isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(pkg)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading} className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return TABS.find(t => t.id === tab) ? tab : 'services'
  })

  return (
    <MainLayout title="Setup" subtitle="Manage your studio's services, lessons, and packages">
      <div className="max-w-[1204px] mx-auto min-h-full flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Setup</h1>
          </div>
          <p className="text-sm font-normal text-muted-foreground">
            Configure your studio's services, lessons, and packages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-full bg-muted p-1 w-fit">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'px-5 py-1.5 rounded-full text-sm font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'lessons' && <LessonsTab />}
        {activeTab === 'packages' && <PackagesTab />}
      </div>
    </MainLayout>
  )
}
