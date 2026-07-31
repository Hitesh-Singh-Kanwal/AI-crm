'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import StatusSelector from '@/components/shared/StatusSelector'
import { Select } from '@/components/ui/select'
import {
  DEFAULT_LOCATION_TIMEZONE,
  getTimezoneSelectOptions,
  formatTimezoneLabel,
} from '@/lib/timezones'

const TIMEZONE_OPTIONS = getTimezoneSelectOptions()

function phoneStatusBadge(status) {
  if (status === 'connected') return <Badge variant="success">Calling connected</Badge>
  if (status === 'error') return <Badge variant="error">Calling error</Badge>
  return <Badge variant="secondary">Calling not connected</Badge>
}

const emptyLocation = () => ({
  name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  phoneNumber: '',
  email: '',
  status: 'active',
  timezone: DEFAULT_LOCATION_TIMEZONE,
  emailConversationEnabled: false,
})

export default function LocationsDialog({ open, onClose, locations = [], onRefresh, initialLocationId = null }) {
  const [editingLocation, setEditingLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('create')
  const toast = useToast()

  useEffect(() => {
    if (!open) {
      setEditingLocation(null)
      setMode('create')
      return
    }
    if (initialLocationId && locations && locations.length > 0) {
      const found = locations.find((l) => l._id === initialLocationId)
      if (found) {
        setEditingLocation({
          ...found,
          timezone: found.timezone || DEFAULT_LOCATION_TIMEZONE,
        })
        setMode('edit')
      }
    } else {
      setEditingLocation(emptyLocation())
      setMode('create')
    }
  }, [open, initialLocationId, locations])

  function openCreate() {
    setEditingLocation(emptyLocation())
    setMode('create')
  }

  function closeEdit() {
    setEditingLocation(null)
    setMode('create')
  }

  async function saveLocation() {
    if (!editingLocation) return

    if (!editingLocation.name || !editingLocation.address || !editingLocation.email) {
      toast.error({ title: 'Validation Error', message: 'Name, address, and email are required' })
      return
    }

    if (!editingLocation.timezone) {
      toast.error({ title: 'Validation Error', message: 'Please select a timezone' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: editingLocation.name,
        address: editingLocation.address,
        city: editingLocation.city,
        state: editingLocation.state,
        country: editingLocation.country,
        phoneNumber: editingLocation.phoneNumber,
        email: editingLocation.email,
        status: editingLocation.status || 'active',
        timezone: editingLocation.timezone || DEFAULT_LOCATION_TIMEZONE,
        emailConversationEnabled: Boolean(editingLocation.emailConversationEnabled),
      }

      const result = editingLocation._id
        ? await api.put(`/api/location/${editingLocation._id}`, payload)
        : await api.post('/api/location', payload)

      if (result.success) {
        const saved = result.data
        const phoneOk = !saved?.phoneNumber || saved?.phoneStatus === 'connected'
        if (phoneOk) {
          toast.success({
            title: editingLocation._id ? 'Saved' : 'Created',
            message: editingLocation._id ? 'Location updated' : 'Location created',
          })
        } else {
          toast.error({
            title: 'Location saved — phone not connected',
            message:
              saved?.phoneLastError ||
              result.message ||
              'Check the number is on your Twilio account (E.164, e.g. +15551234567).',
          })
        }
        closeEdit()
        onRefresh && onRefresh()
        onClose?.()
      } else {
        toast.error({
          title: editingLocation._id ? 'Save failed' : 'Create failed',
          message: result.error || 'Unable to save location',
        })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Unexpected error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{mode === 'create' ? 'Create New Location' : 'Edit Location'}</DialogTitle>
              <DialogDescription className="mt-1">
                {mode === 'create'
                  ? 'Add a new branch or location to your organization'
                  : 'Update location information'}
              </DialogDescription>
            </div>
            {mode === 'edit' && (
              <Button variant="ghost" size="sm" onClick={openCreate} className="gap-2">
                <Building2 className="h-4 w-4" />
                New Location
              </Button>
            )}
          </div>
        </DialogHeader>

        {editingLocation && (
          <div className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Location Name *</label>
                  <Input
                    value={editingLocation.name || ''}
                    onChange={(e) => setEditingLocation((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Downtown Branch"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                  <Input
                    value={editingLocation.email || ''}
                    onChange={(e) => setEditingLocation((p) => ({ ...p, email: e.target.value }))}
                    placeholder="studio@yourdomain.com"
                    type="email"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used as the outbound From address for this studio (must be allowed on your SendGrid domain).
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Street Address *</label>
                <Input
                  value={editingLocation.address || ''}
                  onChange={(e) => setEditingLocation((p) => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main Street"
                  required
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                  <Input
                    value={editingLocation.city || ''}
                    onChange={(e) => setEditingLocation((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                  <Input
                    value={editingLocation.state || ''}
                    onChange={(e) => setEditingLocation((p) => ({ ...p, state: e.target.value }))}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
                  <Input
                    value={editingLocation.country || ''}
                    onChange={(e) => setEditingLocation((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Country"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Timezone *</label>
                <Select
                  value={editingLocation.timezone || DEFAULT_LOCATION_TIMEZONE}
                  onChange={(e) =>
                    setEditingLocation((p) => ({ ...p, timezone: e.target.value }))
                  }
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.description})
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used for scheduling, follow-ups, and local business hours for this studio.
                  {editingLocation.timezone
                    ? ` Selected: ${formatTimezoneLabel(editingLocation.timezone)}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">AI Agent Settings</h3>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Conversations</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When off (recommended), email is used for outbound workflows, payment links, and
                    confirmations only — inbound emails are logged but the AI does not reply.
                    Turn on to enable full back-and-forth email conversation.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(editingLocation.emailConversationEnabled)}
                  onClick={() =>
                    setEditingLocation((p) => ({
                      ...p,
                      emailConversationEnabled: !p.emailConversationEnabled,
                    }))
                  }
                  className={[
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    editingLocation.emailConversationEnabled
                      ? 'bg-brand'
                      : 'bg-muted',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                      editingLocation.emailConversationEnabled ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Phone &amp; Status
                </h3>
                {mode === 'edit' && phoneStatusBadge(editingLocation.phoneStatus)}
              </div>
              <p className="text-xs text-muted-foreground">
                Studio phone number for AI calls, SMS, and inbound routing. Use E.164 (e.g. +15551234567).
                The number must already exist on your Twilio account — saving connects webhooks automatically.
                Clear the field to disconnect calling for this studio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                  <Input
                    value={editingLocation.phoneNumber || ''}
                    onChange={(e) => setEditingLocation((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="+15551234567"
                  />
                  {editingLocation.phoneStatus === 'error' && editingLocation.phoneLastError && (
                    <p className="mt-1.5 text-xs text-destructive">{editingLocation.phoneLastError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                  <StatusSelector
                    value={editingLocation.status || 'active'}
                    onChange={(status) => setEditingLocation((p) => ({ ...p, status }))}
                    placeholder="Select status"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={closeEdit} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={saveLocation} variant="gradient" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Location' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
