'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import LocationSelector from '@/components/shared/LocationSelector'

const EMPTY_FORM = {
  name: '',
  locationID: '',
  duration: '',
  unit: '',
  color: '#6366f1',
  startDate: '',
  endDate: '',
}

export default function LessonDialog({ open, onClose, lesson, onRefresh }) {
  const isEdit = Boolean(lesson)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (lesson) {
      setForm({
        name: lesson.name || '',
        locationID: typeof lesson.locationID === 'object' ? (lesson.locationID?._id || '') : (lesson.locationID || ''),
        duration: lesson.duration ?? '',
        unit: lesson.unit ?? '',
        color: lesson.color || '#6366f1',
        startDate: lesson.startDate ? lesson.startDate.slice(0, 10) : '',
        endDate: lesson.endDate ? lesson.endDate.slice(0, 10) : '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, lesson])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.locationID) {
      toast.error('Missing fields', { description: 'Name and location are required.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        locationID: form.locationID,
        duration: form.duration === '' ? 50 : Number(form.duration),
        unit: form.unit === '' ? 1 : Number(form.unit),
        color: form.color || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }
      const result = isEdit
        ? await api.put(`/api/lesson/${lesson._id}`, payload)
        : await api.post('/api/lesson', payload)

      if (result.success) {
        toast.success(isEdit ? 'Lesson updated' : 'Lesson created')
        onRefresh()
        onClose()
      } else {
        toast.error('Failed', { description: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-name">Name</Label>
            <Input
              id="lesson-name"
              placeholder="Lesson name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <LocationSelector
              value={form.locationID}
              onChange={(id) => set('locationID', id)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-duration">Duration</Label>
              <Input
                id="lesson-duration"
                type="number"
                min="0"
                placeholder="50"
                value={form.duration}
                onChange={(e) => set('duration', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-unit">Unit</Label>
              <Input
                id="lesson-unit"
                type="number"
                min="1"
                placeholder="1"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-color">Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="lesson-color"
                type="color"
                value={form.color || '#6366f1'}
                onChange={(e) => set('color', e.target.value)}
                className="h-9 w-12 rounded border border-border bg-background p-1"
              />
              <Input
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                placeholder="#6366f1"
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-start">Start date</Label>
              <Input
                id="lesson-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-end">End date</Label>
              <Input
                id="lesson-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
