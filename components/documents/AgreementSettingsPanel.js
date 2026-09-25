'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { hasPermission } from '@/lib/permissions'
import { useToast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'

const ENROLLMENT_TYPES = [
  { value: 'package', label: 'Packages' },
  { value: 'membership', label: 'Memberships' },
  { value: 'service', label: 'Single services / drop-ins' },
  { value: 'trial', label: 'Trials' },
  { value: 'competition', label: 'Competition enrollments' },
  { value: 'custom', label: 'Custom purchases' },
]

export default function AgreementSettingsPanel() {
  const canWrite = hasPermission('settings', 'documents', 'edit')
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const result = await api.get('/api/organisation/agreement-settings')
    if (result.success) setSettings(result.data)
    else toast.error(result.error || 'Failed to load settings.')
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    const result = await api.patch('/api/organisation/agreement-settings', settings)
    if (result.success) {
      toast.success('Agreement settings saved.')
      setSettings(result.data)
    } else {
      toast.error(result.error || 'Failed to save settings.')
    }
    setSaving(false)
  }

  if (loading || !settings) return <GlobalLoader />

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-[13px] text-muted-foreground">
        Decide whether this studio uses agreements and contracts at all, and — if so — which enrollment types trigger
        "Review and Pay" (the shared iPad + text acceptance flow) instead of going straight to
        "Create Enrollment and Package".
      </p>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enabled}
          disabled={!canWrite}
          onChange={(e) => setSettings((p) => ({ ...p, enabled: e.target.checked }))}
          className="h-4 w-4 rounded border-border"
        />
        <span className="text-[13px] font-medium">Use agreements &amp; contracts</span>
      </label>

      {settings.enabled && (
        <div className="space-y-2 pl-7">
          <p className="text-[12px] font-medium text-muted-foreground">Require Review and Pay for:</p>
          {ENROLLMENT_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enrollmentTypeRules?.[t.value] !== false}
                disabled={!canWrite}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    enrollmentTypeRules: { ...p.enrollmentTypeRules, [t.value]: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-[13px]">{t.label}</span>
            </label>
          ))}

          <div className="pt-3 space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">
              Send standalone Participation Waiver this many hours before a student's first scheduled visit
            </label>
            <Input
              type="number"
              min={0}
              value={settings.waiverHoursBeforeFirstVisit}
              disabled={!canWrite}
              onChange={(e) => setSettings((p) => ({ ...p, waiverHoursBeforeFirstVisit: Number(e.target.value) }))}
              className="h-9 text-[13px] w-32"
            />
          </div>
        </div>
      )}

      {canWrite && (
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
      )}
    </div>
  )
}
