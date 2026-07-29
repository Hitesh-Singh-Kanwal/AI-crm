'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { extractSmsCategoriesList } from '../smsBuilderApi'
import { SMS_VARIABLES, previewMessage } from './constants'

export default function SmsCreatorTab({ initialTemplate, onCreated, onBack, dataVersion = 0 }) {
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)

  const [name, setName] = useState(initialTemplate?.name || '')
  const [categoryId, setCategoryId] = useState(initialTemplate?.categoryID?._id || '')
  const [locationID, setLocationID] = useState(
    initialTemplate?.allLocations
      ? ALL_BRANCHES_VALUE
      : Array.isArray(initialTemplate?.locationID)
        ? initialTemplate.locationID.map((l) => l?._id || l).filter(Boolean)
        : initialTemplate?.locationID?._id || initialTemplate?.locationID
          ? [initialTemplate.locationID?._id || initialTemplate.locationID]
          : []
  )
  const [message, setMessage] = useState(initialTemplate?.message || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initialTemplate) return
    setName(initialTemplate.name || '')
    setCategoryId(initialTemplate.categoryID?._id || '')
    setLocationID(
      initialTemplate.allLocations
        ? ALL_BRANCHES_VALUE
        : Array.isArray(initialTemplate.locationID)
          ? initialTemplate.locationID.map((l) => l?._id || l).filter(Boolean)
          : initialTemplate.locationID?._id || initialTemplate.locationID
            ? [initialTemplate.locationID?._id || initialTemplate.locationID]
            : []
    )
    setMessage(initialTemplate.message || '')
  }, [initialTemplate])

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const result = await api.get('/api/smsBuilder/categories')
      if (result.success) setCategories(extractSmsCategoriesList(result))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingCats(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories, dataVersion])

  const locationScopedCategories = useMemo(() => {
    if (!locationID || (locationID !== ALL_BRANCHES_VALUE && (!Array.isArray(locationID) || locationID.length === 0))) {
      return categories
    }
    if (locationID === ALL_BRANCHES_VALUE) {
      return categories
    }
    return categories.filter((cat) => {
      if (cat.allLocations) return true
      const catLocs = (Array.isArray(cat.locationID) ? cat.locationID : cat.locationID ? [cat.locationID] : [])
        .map((l) => String(l?._id || l))
      return locationID.every((id) => catLocs.includes(String(id)))
    })
  }, [categories, locationID])

  useEffect(() => {
    if (!locationScopedCategories.length) {
      setCategoryId('')
      return
    }
    setCategoryId((prev) =>
      locationScopedCategories.some((c) => String(c._id) === String(prev))
        ? prev
        : locationScopedCategories[0]._id
    )
  }, [locationScopedCategories])

  const meta = useMemo(() => {
    const chars = String(message || '').length
    const parts = Math.max(1, Math.ceil(chars / 160))
    return { chars, parts }
  }, [message])

  const insertVariable = (v) => setMessage((m) => `${m}${m ? ' ' : ''}${v}`)

  const canSave =
    !!name.trim() &&
    !!message.trim() &&
    !!categoryId &&
    !!(locationID === ALL_BRANCHES_VALUE || (Array.isArray(locationID) && locationID.length > 0))

  const createTemplate = async () => {
    if (!(locationID === ALL_BRANCHES_VALUE || (Array.isArray(locationID) && locationID.length > 0))) {
      toast.error({ title: 'Missing location', message: 'Select one or more studios, or All branches.' })
      return
    }
    if (!canSave) return
    setSaving(true)
    try {
      const allLocations = locationID === ALL_BRANCHES_VALUE
      const payload = {
        name: name.trim(),
        categoryID: categoryId,
        message: String(message || ''),
        allLocations,
        locationID: allLocations ? [] : locationID,
      }
      const result = await api.post('/api/smsBuilder', payload)
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create template.' })
        return
      }
      toast.success({ title: 'Created', message: 'Template created successfully.' })
      setName('')
      setMessage('')
      onCreated?.(result.data)
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not create template.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabsContent value="creator" className="space-y-6 mt-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Variables</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <p className="text-xs text-muted-foreground px-1">
                Insert into the message. Replaced with lead details when sent from campaigns or workflows.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {SMS_VARIABLES.map((variable) => (
                  <button
                    key={variable.name}
                    onClick={() => insertVariable(variable.name)}
                    className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
                    type="button"
                  >
                    <p className="text-xs sm:text-sm font-mono font-medium">{variable.name}</p>
                    <p className="text-xs text-muted-foreground">{variable.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 lg:col-span-5">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Message editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message content</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Type your SMS message…"
                  maxLength={480}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{meta.chars}/480 characters</span>
                  <Badge variant={meta.parts > 1 ? 'warning' : 'info'}>{meta.parts} SMS</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Messages over 160 characters may be split into multiple SMS parts.
                </p>
              </div>

              <div className="p-4 bg-brand/10 border border-brand-light rounded-lg text-sm">
                <p className="font-medium text-brand-dark mb-2">Preview:</p>
                <p className="text-brand-dark whitespace-pre-wrap">{previewMessage(message)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-12 lg:col-span-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Template settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Studio location *</Label>
                <LocationSelector
                  value={locationID}
                  onChange={setLocationID}
                  multiple
                  allowAllBranches
                  showAllOption={false}
                  placeholder="Select studio(s)…"
                />
              </div>

              <div className="space-y-2">
                <Label>Template name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Class Reminder" />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                {loadingCats ? (
                  <div className="py-2">
                    <LoadingSpinner size="sm" text="Loading categories…" />
                  </div>
                ) : (
                  <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Select category</option>
                    {locationScopedCategories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <Button variant="gradient" className="w-full" onClick={createTemplate} disabled={saving || !canSave}>
                <Send className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save template'}
              </Button>

              {!canSave && (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Required:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {!(locationID === ALL_BRANCHES_VALUE || (Array.isArray(locationID) && locationID.length > 0)) && (
                      <li>Studio location</li>
                    )}
                    {!name.trim() && <li>Template name</li>}
                    {!categoryId && <li>Category</li>}
                    {!message.trim() && <li>Message</li>}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>
  )
}
