'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'

const METRICS = [
  { metric: 'revenue', label: 'Revenue', prefix: '$' },
  { metric: 'newActiveStudents', label: 'New Active Students', prefix: '' },
  { metric: 'lessons', label: 'Lessons Taught', prefix: '' },
]

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftPeriod(period, delta) {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodLabel(period) {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function GoalsSettingsPage() {
  const [period, setPeriod] = useState(currentPeriod)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({})
  const toast = useToast()

  const loadGoals = useCallback(async (p) => {
    setLoading(true)
    const result = await api.get(`/api/goal?period=${p}`)
    if (result.success) {
      const map = {}
      for (const g of result.data || []) map[g.metric] = String(g.targetValue)
      setValues(map)
    } else {
      toast.error(result.error || 'Failed to load goals.')
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadGoals(period) }, [period, loadGoals])

  const handleSave = async () => {
    setSaving(true)
    const results = await Promise.all(
      METRICS.filter((m) => values[m.metric] !== undefined && values[m.metric] !== '').map((m) =>
        api.post('/api/goal', { metric: m.metric, period, targetValue: Number(values[m.metric]) })
      )
    )
    if (results.every((r) => r.success)) {
      toast.success('Goals saved.')
    } else {
      toast.error('Some goals failed to save.')
    }
    setSaving(false)
  }

  return (
    <MainLayout title="Goals" subtitle="">
      <div className="max-w-[640px] mx-auto min-h-full flex flex-col p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Monthly Goals</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Set organization-wide targets. Actuals are compared against these on the Owner Dashboard.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPeriod((p) => shiftPeriod(p, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center text-[14px] font-semibold text-foreground">
            {periodLabel(period)}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPeriod((p) => shiftPeriod(p, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <GlobalLoader variant="center" size="sm" text="Loading goals…" />
            </div>
          ) : (
            <div className="space-y-4">
              {METRICS.map((m) => (
                <div key={m.metric} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`goal-${m.metric}`} className="text-sm">{m.label}</Label>
                  <div className="flex items-center gap-1.5">
                    {m.prefix && <span className="text-sm text-muted-foreground">{m.prefix}</span>}
                    <Input
                      id={`goal-${m.metric}`}
                      type="number"
                      min="0"
                      placeholder="Not set"
                      value={values[m.metric] ?? ''}
                      onChange={(e) => setValues((p) => ({ ...p, [m.metric]: e.target.value }))}
                      className="h-9 w-[140px] text-sm"
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Goals'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
