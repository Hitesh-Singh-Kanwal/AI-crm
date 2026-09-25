'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { hasPermission } from '@/lib/permissions'
import { useToast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'

const DOCUMENT_TYPES = [
  { value: 'enrollment_agreement_template', label: 'Enrollment Agreement', alwaysDynamic: true },
  { value: 'payment_authorization', label: 'Payment Authorization' },
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'waiver', label: 'Participation Waiver' },
]

const DEFAULT_BODIES = {
  enrollment_agreement_template: `<h1>Student Enrollment Agreement</h1>
<h2>{{enrollment_name}}</h2>

<h3>Customer Information</h3>
<p>Student: {{customer_name}} | Enrollment date: {{enrollment_date}}</p>
<p>Email: {{customer_email}} | Phone: {{customer_phone}} | Studio: {{studio_location}}</p>

<h3>What You're Purchasing</h3>
<table>
<tr><th>Service / Item</th><th>Qty</th><th>Unit Value</th><th>Discount</th><th>Line Total</th></tr>
{{#each lineItems}}<tr><td>{{line_item_name}}</td><td>{{quantity}}</td><td>{{unit_value}}</td><td>{{line_discount}}</td><td>{{line_total}}</td></tr>
{{/each}}
</table>

<h3>Your Pricing</h3>
<p>Total program value: {{gross_total}}</p>
<p>Discounts: {{discount_total}}</p>
<p><strong>Final enrollment price: {{final_total}}</strong></p>
<p>Amount paid today: {{amount_paid_today}}</p>
<p>Remaining balance: {{remaining_balance}}</p>

<h3>Payment Details</h3>
<p>{{payment_type}} — {{payment_summary}}</p>
<table>
<tr><th>Scheduled Payment</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
{{#each scheduledPayments}}<tr><td>{{scheduled_payment}}</td><td>{{scheduled_amount}}</td><td>{{scheduled_due_date}}</td><td>{{scheduled_status}}</td></tr>
{{/each}}
</table>`,
  payment_authorization: `<h1>Payment Authorization</h1>
<p>Included with your enrollment when scheduled payments apply.</p>

<h3>Customer &amp; Enrollment</h3>
<table>
<tr><th>Customer Name</th><th>Enrollment Number</th><th>Studio Location</th></tr>
<tr><td>{{customer_name}}</td><td>{{enrollment_number}}</td><td>{{studio_location}}</td></tr>
</table>

<h3>Authorized Payment Schedule</h3>
<table>
<tr><th>Charge Description</th><th>Amount / Formula</th><th>First Charge Date</th><th>Frequency / End Date</th></tr>
<tr><td>{{payment_description}}</td><td>{{amount_or_formula}}</td><td>{{first_charge_date}}</td><td>{{frequency_and_end_date}}</td></tr>
</table>

<h3>Payment Method</h3>
<table>
<tr><th>Payment Method on File</th><th>Last Four Digits</th><th>Billing Zip</th></tr>
<tr><td>{{card_brand_or_method}}</td><td>{{last_four}}</td><td>{{billing_zip}}</td></tr>
</table>

<h3>Authorization, Notices &amp; Revocation</h3>
<p>I authorize the Studio to charge the payment method identified above for the payment schedule shown in this document.</p>`,
  terms: `<h1>Terms &amp; Conditions</h1>
<p>Paste your studio's Terms &amp; Conditions text here. This document is usually static and rarely needs merge fields.</p>`,
  waiver: `<h1>Participation Waiver</h1>
<p>{{customer_name}} — {{studio_location}}</p>
<p>Paste your studio's waiver text here.</p>`,
}

export default function AgreementTemplateBuilder() {
  const canWrite = hasPermission('settings', 'documents', 'write')
  const [docType, setDocType] = useState('enrollment_agreement_template')
  const [name, setName] = useState('Student Enrollment Agreement')
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_BODIES.enrollment_agreement_template)
  const [mergeFields, setMergeFields] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [version, setVersion] = useState(null)
  const textareaRef = useRef(null)
  const toast = useToast()

  const load = useCallback(async (type) => {
    setLoading(true)
    setPreview('')
    const [fieldsRes, activeRes] = await Promise.all([
      api.get(`/api/agreement-template/merge-fields?type=${type}`),
      api.get(`/api/agreement-template/active?type=${type}`),
    ])
    if (fieldsRes.success) setMergeFields(fieldsRes.data)
    if (activeRes.success && activeRes.data) {
      setName(activeRes.data.name)
      setBodyHtml(activeRes.data.bodyHtml)
      setVersion(activeRes.data.version)
    } else {
      setName(DOCUMENT_TYPES.find((t) => t.value === type)?.label || '')
      setBodyHtml(DEFAULT_BODIES[type] || '')
      setVersion(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(docType) }, [load, docType])

  const insertToken = (token) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? bodyHtml.length
    const end = el.selectionEnd ?? bodyHtml.length
    const next = bodyHtml.slice(0, start) + token + bodyHtml.slice(end)
    setBodyHtml(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + token.length
    })
  }

  const handlePreview = async () => {
    setPreviewing(true)
    const result = await api.post('/api/agreement-template/preview', { bodyHtml })
    if (result.success) setPreview(result.data.rendered)
    else toast.error(result.error || 'Failed to render preview.')
    setPreviewing(false)
  }

  const handleSave = async () => {
    if (!name.trim() || !bodyHtml.trim()) {
      toast.error('Name and template body are required.')
      return
    }
    setSaving(true)
    const result = await api.post('/api/agreement-template', { type: docType, name: name.trim(), bodyHtml })
    if (result.success) {
      toast.success('Template saved as a new version.')
      setVersion(result.data.version)
    } else {
      toast.error(result.error || 'Failed to save template.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        The Enrollment Agreement always needs live data filled in. Waiver, Terms, and Payment Authorization are usually
        static uploads (see the other tab) — but if your document has its own blanks to fill (like the client's Payment
        Authorization example), build a fill-in template for it here instead.
      </p>

      <div className="flex gap-1 flex-wrap">
        {DOCUMENT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setDocType(t.value)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium border ${
              docType === t.value ? 'bg-brand text-brand-foreground border-brand' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <GlobalLoader />
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">Template name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-[13px] max-w-sm" />
            {version ? (
              <p className="text-[11px] text-muted-foreground">Currently active: v{version}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">No active template yet for this document — saving creates v1.</p>
            )}
          </div>

          {mergeFields && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-muted-foreground">Insert field</p>
              <div className="flex flex-wrap gap-1.5">
                {mergeFields.scalar.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => insertToken(`{{${f}}}`)}
                    className="rounded-md border px-2 py-1 text-[11px] hover:bg-muted"
                  >
                    {f}
                  </button>
                ))}
              </div>
              {mergeFields.lineItemRepeater && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => insertToken(`{{#each lineItems}}...{{/each}}`)}
                    className="rounded-md border border-dashed px-2 py-1 text-[11px] hover:bg-muted"
                  >
                    + Repeating line-item row ({mergeFields.lineItemRepeater.fields.join(', ')})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertToken(`{{#each scheduledPayments}}...{{/each}}`)}
                    className="rounded-md border border-dashed px-2 py-1 text-[11px] hover:bg-muted"
                  >
                    + Repeating payment row ({mergeFields.scheduledPaymentRepeater.fields.join(', ')})
                  </button>
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="w-full h-80 rounded-lg border font-mono text-[12px] p-3"
            spellCheck={false}
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={previewing}>
              <Eye className="h-4 w-4 mr-1.5" /> {previewing ? 'Rendering…' : 'Preview with sample data'}
            </Button>
            {canWrite && (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving…' : 'Save as new version'}
              </Button>
            )}
          </div>

          {preview && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Preview</p>
              <div className="agreement-doc bg-card rounded-lg border p-5" dangerouslySetInnerHTML={{ __html: preview }} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
