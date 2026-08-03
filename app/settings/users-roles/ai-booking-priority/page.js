'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GripVertical,
  Plus,
  X,
  Sparkles,
  Clock3,
  Users,
  ArrowDown,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import MainLayout from '@/components/layout/MainLayout'
import SettingsBackHeader from '@/app/settings/users-roles/components/SettingsBackHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { getInitials, cn } from '@/lib/utils'

function SortablePriorityRow({ teacher, index, onRemove, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(teacher._id),
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm',
        isDragging
          ? 'z-10 border-brand/40 shadow-md ring-2 ring-brand/20'
          : 'border-border hover:border-brand/25',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to change priority for ${teacher.name}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
          index === 0
            ? 'bg-brand text-white'
            : 'bg-brand/10 text-brand',
        )}
      >
        {index + 1}
      </span>

      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
          {getInitials(teacher.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{teacher.name}</p>
          {index === 0 ? (
            <Badge variant="success" className="text-[10px]">
              First pick
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{teacher.role || 'Staff'}</p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onRemove(teacher)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="mr-1 h-3.5 w-3.5" />
        Remove
      </Button>
    </div>
  )
}

function AvailableRow({ teacher, onAdd, disabled }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/30">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
          {getInitials(teacher.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{teacher.name}</p>
        <p className="truncate text-xs text-muted-foreground">{teacher.role || 'Staff'}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onAdd(teacher)}
        className="shrink-0 gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add to AI
      </Button>
    </div>
  )
}

export default function AiBookingPriorityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prioritized, setPrioritized] = useState([])
  const [available, setAvailable] = useState([])
  const [loadError, setLoadError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sameId = (a, b) => String(a) === String(b)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setLoadError('')
    try {
      let list = []
      const teacherRes = await api.get('/api/teacher?limit=200&status=active')
      if (teacherRes?.success) {
        list = Array.isArray(teacherRes.data) ? teacherRes.data : []
      } else {
        const userRes = await api.get('/api/user?limit=200&status=active')
        if (userRes?.success) {
          const users = Array.isArray(userRes.data) ? userRes.data : []
          list = users.filter(
            (u) =>
              u.aiBookingPriority != null ||
              u.showOnCalendar === true ||
              String(u.role || '').toLowerCase().includes('teacher') ||
              String(u.role || '').toLowerCase().includes('instructor'),
          )
        } else {
          setLoadError(teacherRes?.error || userRes?.error || 'Unable to load staff')
        }
      }

      const withP = list
        .filter((t) => t.aiBookingPriority != null)
        .sort((a, b) => Number(a.aiBookingPriority) - Number(b.aiBookingPriority))
      const without = list.filter((t) => t.aiBookingPriority == null)
      setPrioritized(withP)
      setAvailable(without)
    } catch (e) {
      console.error(e)
      setLoadError('Could not load calendar staff')
      toast.error('Could not load calendar staff')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function persist(nextPrioritized, nextAvailable) {
    setSaving(true)
    // Optimistic UI first
    setPrioritized(nextPrioritized.map((t, idx) => ({ ...t, aiBookingPriority: idx + 1 })))
    setAvailable(nextAvailable.map((t) => ({ ...t, aiBookingPriority: null })))

    try {
      const result = await api.patch('/api/teacher/ai-booking-priority', {
        order: nextPrioritized.map((t) => String(t._id)),
        clear: nextAvailable.map((t) => String(t._id)),
      })
      if (!result?.success) {
        toast.error(result?.error || result?.message || 'Unable to save priority')
        await load({ silent: true })
        return
      }

      // Prefer server payload so badges/counts stay in sync without a full reload.
      if (Array.isArray(result.data?.prioritized)) {
        const serverPrioritized = result.data.prioritized
        const prioritizedIds = new Set(serverPrioritized.map((t) => String(t._id)))
        setPrioritized(serverPrioritized)
        setAvailable(nextAvailable.filter((t) => !prioritizedIds.has(String(t._id))))
      } else {
        await load({ silent: true })
      }
      toast.success('AI booking priority updated')
    } catch (e) {
      console.error(e)
      toast.error('Unexpected error saving priority')
      await load({ silent: true })
    } finally {
      setSaving(false)
    }
  }

  function onDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = prioritized.findIndex((t) => sameId(t._id, active.id))
    const newIndex = prioritized.findIndex((t) => sameId(t._id, over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(prioritized, oldIndex, newIndex)
    persist(next, available)
  }

  function addToPriority(teacher) {
    if (prioritized.some((t) => sameId(t._id, teacher._id))) return
    const nextP = [...prioritized, { ...teacher, aiBookingPriority: prioritized.length + 1 }]
    const nextA = available.filter((t) => !sameId(t._id, teacher._id))
    persist(nextP, nextA)
  }

  function removeFromPriority(teacher) {
    const nextP = prioritized
      .filter((t) => !sameId(t._id, teacher._id))
      .map((t, idx) => ({ ...t, aiBookingPriority: idx + 1 }))
    const nextA = [{ ...teacher, aiBookingPriority: null }, ...available.filter((t) => !sameId(t._id, teacher._id))]
    persist(nextP, nextA)
  }

  return (
    <MainLayout title="AI Booking Priority" subtitle="Who gets intro lessons first">
      <div className="w-full space-y-6">
        <SettingsBackHeader
          href="/settings/users-roles"
          backLabel="Users & Roles"
          title="AI Booking Priority"
          subtitle="Control which calendar staff the agent can book, and who gets offered first."
          actions={
            saving ? (
              <Badge variant="secondary" className="gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                Saving
              </Badge>
            ) : null
          }
        />

        {/* How it works */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">Who is bookable</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Only people in the priority list can be assigned by the AI agent.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">Priority order</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              #1 is tried first. If they’re busy, the agent moves to #2, then #3, and so on.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Clock3 className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">Free time only</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Slots come from studio hours and each teacher’s existing calendar bookings.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {loadError ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadError}
              </p>
            ) : null}

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* Priority list */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Priority list</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Drag to reorder. Top of the list is offered first.
                  </p>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {prioritized.length} bookable
                </Badge>
              </div>

              <div className="space-y-2 p-4">
                {prioritized.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No AI-bookable staff yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                      Add instructors from the list on the right. Until then, the agent uses studio-wide
                      availability without assigning a teacher.
                    </p>
                    {available.length > 0 ? (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand lg:hidden">
                        Scroll down to add
                        <ArrowDown className="h-3.5 w-3.5" />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext
                      items={prioritized.map((t) => String(t._id))}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {prioritized.map((t, i) => (
                          <SortablePriorityRow
                            key={String(t._id)}
                            teacher={t}
                            index={i}
                            disabled={saving}
                            onRemove={removeFromPriority}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </section>

            {/* Available pool */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Available calendar staff</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    On the calendar, but not used by the AI until you add them.
                  </p>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {available.length}
                </Badge>
              </div>

              <div className="space-y-2 p-4">
                {available.length === 0 ? (
                  <p className="rounded-xl bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    {prioritized.length > 0
                      ? 'Everyone on the calendar is already in the priority list.'
                      : 'No calendar staff found. Enable Show on Calendar for a role or user first.'}
                  </p>
                ) : (
                  available.map((t) => (
                    <AvailableRow
                      key={String(t._id)}
                      teacher={t}
                      disabled={saving}
                      onAdd={addToPriority}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
