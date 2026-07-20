'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { extractLeadReasonsList } from '../emailBuilderApi'
import { LEAD_STAGE_VALUES, formatLeadStageLabel } from '@/lib/lead-stages'

export default function EmailCreatorTab({ onCreated }) {
  const toast = useToast()

  const [to, setTo] = useState('')
  const [leadStage, setLeadStage] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [reasons, setReasons] = useState([])

  const canSave = !!subject.trim() && !!leadStage.trim() && !!reasonCode.trim() && (!!body.trim() || !!htmlBody.trim())

  const fetchReasons = useCallback(async () => {
    const result = await api.get('/api/lead-reasons')
    if (result.success) {
      setReasons(extractLeadReasonsList(result))
    }
  }, [])

  useEffect(() => {
    fetchReasons()
  }, [fetchReasons])

  const previewHtml = useMemo(() => {
    const html = String(htmlBody || '').trim()
    if (html) return html
    const text = String(body || '').trim()
    return text ? `<pre style=\"white-space:pre-wrap;font-family:ui-sans-serif;\">${text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>` : ''
  }, [body, htmlBody])

  const create = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        to: String(to || '').trim(), // backend example includes `to`
        leadStage: String(leadStage || '').trim(),
        reason: String(reasonCode || '').trim(),
        subject: subject.trim(),
        body: String(body || ''),
        htmlBody: String(htmlBody || ''),
      }
      const result = await api.post('/api/email/builder/', payload)
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create email.' })
        return
      }
      toast.success({ title: 'Created', message: 'Email template created successfully.' })
      onCreated?.(result.data)
      setTo('')
      setLeadStage('')
      setReasonCode('')
      setSubject('')
      setBody('')
      setHtmlBody('')
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not create email.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabsContent value="builder" className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Email creator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>To (optional for templates)</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Lead stage</Label>
              <select
                value={leadStage}
                onChange={(e) => setLeadStage(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select lead stage…</option>
                {LEAD_STAGE_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {formatLeadStageLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select reason…</option>
                {reasons.map((r) => (
                  <option key={r._id || r.reasonCode || r.name} value={r.reasonCode}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Welcome to Dance Studio" />
            </div>
            <div className="space-y-2">
              <Label>Body (plain text)</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
            </div>
            <div className="space-y-2">
              <Label>HTML body (optional)</Label>
              <Textarea value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} rows={6} placeholder="<h1>Welcome</h1>…" />
            </div>

            <Button variant="gradient" className="w-full" onClick={create} disabled={saving || !canSave}>
              <Send className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save template'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewHtml ? (
              <div
                className="prose prose-sm max-w-none bg-background rounded-md border border-border p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Start typing to preview your email.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}

