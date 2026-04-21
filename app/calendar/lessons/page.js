'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, MoreHorizontal } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'
import LessonDialog from './components/LessonDialog'

const ROWS_PER_PAGE = 10

export default function LessonsPage() {
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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ROWS_PER_PAGE),
      })
      if (search) params.set('search', search)

      const result = await api.get(`/api/lesson?${params.toString()}`)
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : []
        const total = result.pagination?.total ?? data.length
        setLessons(data)
        setTotalCount(total)
      } else {
        toast.error('Failed to load lessons', { description: result.error })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unable to load lessons' })
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }, [])

  useEffect(() => {
    loadLessons(currentPage, searchQuery)
  }, [currentPage, searchQuery, loadLessons])

  const toggleOne = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleAll = () => {
    if (selectedIds.length === lessons.length) setSelectedIds([])
    else setSelectedIds(lessons.map((l) => l._id))
  }

  function openCreate() {
    setEditingLesson(null)
    setDialogOpen(true)
  }

  function openEdit(lesson) {
    setEditingLesson(lesson)
    setDialogOpen(true)
  }

  async function handleDelete(lesson) {
    if (!window.confirm(`Delete "${lesson.name}"? This cannot be undone.`)) return
    try {
      const result = await api.delete(`/api/lesson/${lesson._id}`)
      if (result.success) {
        toast.success('Lesson deleted')
        loadLessons(currentPage, searchQuery)
      } else {
        toast.error('Delete failed', { description: result.error })
      }
    } catch (e) {
      console.error(e)
      toast.error('Error', { description: 'Unable to delete lesson' })
    }
  }

  const fmt = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading && lessons.length === 0) {
    return (
      <MainLayout title="Lessons" subtitle="">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <GlobalLoader variant="center" size="md" text="Loading lessons…" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Lessons" subtitle="">
      <div className="max-w-[1204px] mx-auto min-h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Lessons</h1>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-brand bg-background border border-border">
              {totalCount} {totalCount === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>
          <p className="text-sm font-normal text-muted-foreground">
            Manage your studio's lesson offerings.
          </p>
        </div>

        {/* Search + Add */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="relative w-[220px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="pl-9 h-9 rounded-lg bg-background text-sm placeholder:text-muted-foreground"
            />
          </div>
          <Button
            className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2 shrink-0"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Add Lesson
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card min-h-[560px] flex flex-col">
          <div className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent bg-muted/30">
                  <TableHead className="w-12 py-3 pl-4 pr-0">
                    <Checkbox
                      checked={selectedIds.length === lessons.length && lessons.length > 0}
                      onClick={toggleAll}
                      className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                    />
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Name</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Credits</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-medium text-muted-foreground">Created</TableHead>
                  <TableHead className="w-12 py-3 pr-4 pl-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                      {searchQuery ? 'No lessons match your search.' : 'No lessons yet. Click "Add Lesson" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  lessons.map((lesson) => (
                    <TableRow
                      key={lesson._id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 pl-4 pr-0">
                        <Checkbox
                          checked={selectedIds.includes(lesson._id)}
                          onClick={() => toggleOne(lesson._id)}
                          className="rounded border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                        />
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                            {lesson.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-normal text-foreground leading-tight">{lesson.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <p className="text-sm font-normal text-foreground leading-tight">${lesson.credits ?? 0}</p>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <p className="text-sm font-normal text-foreground leading-tight">{fmt(lesson.createdAt)}</p>
                        <p className="text-xs font-normal text-muted-foreground leading-tight">
                          Last: {fmt(lesson.updatedAt)}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 pr-4 pl-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(lesson)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(lesson)}
                            >
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        <LessonDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          lesson={editingLesson}
          onRefresh={() => loadLessons(currentPage, searchQuery)}
        />
      </div>
    </MainLayout>
  )
}
