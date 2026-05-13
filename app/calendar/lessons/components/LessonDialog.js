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
  calendarServiceID: '',
}

export default function LessonDialog({ open, onClose, lesson, onRefresh }) {
  const isEdit = Boolean(lesson)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState([])

  useEffect(() => {
    api.get('/api/calendar-service?limit=200&isActive=true').then((res) => {
      if (res.success && Array.isArray(res.data)) setServices(res.data)
    })
  }, [])

  useEffect(() => {
    if (!open) return
    if (lesson) {
      setForm({
        name:              lesson.name || '',
        locationID:        typeof lesson.locationID === 'object' ? (lesson.locationID?._id || '') : (lesson.locationID || ''),
        duration:          lesson.duration ?? '',
        unit:              lesson.unit ?? '',
        color:             lesson.color || '#6366f1',
        startDate:         lesson.startDate ? lesson.startDate.slice(0, 10) : '',
        endDate:           lesson.endDate ? lesson.endDate.slice(0, 10) : '',
        calendarServiceID: typeof lesson.calendarServiceID === 'object'
          ? (lesson.calendarServiceID?._id || '')
          : (lesson.calendarServiceID || ''),
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
        name:              form.name,
        locationID:        form.locationID,
        duration:          form.duration === '' ? 50 : Number(form.duration),
        unit:              form.unit === '' ? 1 : Number(form.unit),
        color:             form.color || undefined,
        startDate:         form.startDate || undefined,
        endDate:           form.endDate || undefined,
        calendarServiceID: form.calendarServiceID || undefined,
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

          {/* Billing service — the serviceCode from this service is what gets matched
              against CustomerPackage sessions when a group class event is booked */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson-service">Billing Service</Label>
            <div className="relative">
              <select
                id="lesson-service"
                value={form.calendarServiceID}
                onChange={(e) => set('calendarServiceID', e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No billing service</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.serviceCode ? `[${s.serviceCode}] ` : ''}{s.serviceName}
                    {s.isChargeable && s.price > 0 ? ` — $${Number(s.price).toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
            {form.calendarServiceID && (() => {
              const svc = services.find((s) => s._id === form.calendarServiceID)
              return svc ? (
                <p className="text-[11px] text-muted-foreground px-0.5">
                  {svc.isChargeable
                    ? `Sessions will be deducted from packages with code "${svc.serviceCode}"`
                    : 'This service is not chargeable — no sessions will be deducted'}
                </p>
              ) : null
            })()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-duration">Duration (min)</Label>
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
