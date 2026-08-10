'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import LocationSelector from '@/components/shared/LocationSelector'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

const DEFAULT_DURATION_MINUTES = 30

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Creates a standalone task (a calendar to-do — see deriveKind() in
 * useUpcomingTasks.js: any calendar event with type "event" shows up in the
 * Upcoming Tasks feed) with an assignee. Reuses CalendarEvent's existing
 * teacherID assignment mechanism rather than a new Task model, since
 * `/api/calendar` already supports title/due-time/assignee and the Upcoming
 * Tasks list already knows how to render exactly this shape.
 */
export default function CreateTaskDialog({ onCreated, compact = false }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [dueTime, setDueTime] = useState('09:00')
  const [assignedTo, setAssignedTo] = useState('')
  const [locationID, setLocationID] = useState('')
  const [notes, setNotes] = useState('')
  const [staff, setStaff] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setLoadingStaff(true)
    // Any active staff member — teachers and admins both — can be assigned a
    // task; there's no dedicated "assignable roles" endpoint, so this just
    // pulls the same active-user list Settings > Users already uses.
    api
      .get('/api/user?limit=200&status=active')
      .then((res) => setStaff(res.success ? res.data || [] : []))
      .finally(() => setLoadingStaff(false))
  }, [open])

  function reset() {
    setTitle('')
    setDueDate(defaultDueDate())
    setDueTime('09:00')
    setAssignedTo('')
    setLocationID('')
    setNotes('')
  }

  function close() {
    if (saving) return
    setOpen(false)
    reset()
  }

  async function createTask(e) {
    e.preventDefault()
    if (!title.trim() || !dueDate || !locationID) return
    setSaving(true)
    const start = new Date(`${dueDate}T${dueTime || '09:00'}:00`)
    const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60000)
    const res = await api.post('/api/calendar', {
      title: title.trim(),
      type: 'event',
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      teacherID: assignedTo || undefined,
      locationID,
      notes: notes.trim() || undefined,
      status: 'scheduled',
    })
    if (res.success) {
      toast.success({ title: 'Task created', message: assignedTo ? 'Assigned and added to Upcoming Tasks.' : 'Added to Upcoming Tasks.' })
      close()
      onCreated?.()
    } else {
      toast.error({ title: 'Could not create task', message: res.error || 'Please try again.' })
    }
    setSaving(false)
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          title="New Task"
          onClick={() => setOpen(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button size="sm" className="h-9 px-3 gap-1.5 text-[13px]" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      )}

      <Dialog open={open} onClose={close} maxWidth="md">
        <DialogContent onClose={close}>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a to-do and optionally assign it to a teacher or admin.</DialogDescription>
          </DialogHeader>

          <form onSubmit={createTask} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Call about renewal, prep recital music…"
                className="h-9 text-[13px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due date *</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-[13px]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due time</label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Assign to</label>
              <div className="relative">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={loadingStaff}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[13px] outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {staff.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.role ? `(${u.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Location *</label>
              <LocationSelector value={locationID} onChange={setLocationID} multiple={false} showAllOption={false} />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional details…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={saving || !title.trim() || !dueDate || !locationID} variant="gradient">
              {saving ? 'Creating…' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
