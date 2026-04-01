'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Send, Sparkles } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { SMS_VARIABLES, previewMessage } from './constants'

export default function SmsCreatorTab({ initialTemplate, onCreated, dataVersion = 0 }) {
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)

  const [name, setName] = useState(initialTemplate?.name || '')
  const [subCategory, setSubCategory] = useState(initialTemplate?.subCategory || '')
  const [categoryId, setCategoryId] = useState(initialTemplate?.categoryID?._id || '')
  const [message, setMessage] = useState(initialTemplate?.message || '')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initialTemplate) return
    setName(initialTemplate.name || '')
    setSubCategory(initialTemplate.subCategory || '')
    setCategoryId(initialTemplate.categoryID?._id || '')
    setMessage(initialTemplate.message || '')
  }, [initialTemplate])

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const result = await api.get('/api/smsBuilder/categories')
      const list = result.data?.categories ?? result.data
      if (result.success && Array.isArray(list)) setCategories(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingCats(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories, dataVersion])

  const meta = useMemo(() => {
    const chars = String(message || '').length
    const parts = Math.max(1, Math.ceil(chars / 160))
    return { chars, parts }
  }, [message])

  const insertVariable = (v) => setMessage((m) => `${m}${m ? ' ' : ''}${v}`)

  const canSave = !!name.trim() && !!message.trim() && !!categoryId && !!subCategory.trim()

  const createTemplate = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      // Backend create route wasn't provided explicitly in prompt, but follows REST pattern.
      // We send all template fields used by GET responses.
      const payload = {
        name: name.trim(),
        subCategory: subCategory.trim(),
        categoryID: categoryId,
        message: String(message || ''),
      }
      const result = await api.post('/api/smsBuilder', payload)
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create template.' })
        return
      }
      toast.success({ title: 'Created', message: 'Template created successfully.' })
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Variables */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Variables</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
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
              <Button variant="outline" size="sm" className="w-full mt-4 text-xs sm:text-sm" disabled>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate (soon)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
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

        {/* Settings */}
        <div className="md:col-span-12 lg:col-span-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Template settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sub-category</Label>
                <Input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g. Welcome" />
              </div>

              <Button variant="gradient" className="w-full" onClick={createTemplate} disabled={saving || !canSave}>
                <Send className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save template'}
              </Button>

              {!canSave && (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Required:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {!name.trim() && <li>Template name</li>}
                    {!categoryId && <li>Category</li>}
                    {!subCategory.trim() && <li>Sub-category</li>}
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

