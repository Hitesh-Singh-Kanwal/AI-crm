'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

// Clover issues a hosted-checkout signing secret per merchant, generated in their own
// dashboard, and offers no API to register the webhook or fetch the secret. So each
// studio has to paste their URL in and copy their secret back — these steps are the
// shortest path Clover permits.
export default function CloverWebhookSetup({
  webhookUrl,
  webhookSecretSaved,
  webhookLastReceivedAt,
  webhookLastError,
  saveWebhookSecret,
  canWrite,
}) {
  const [secret, setSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  async function handleCopy() {
    if (!webhookUrl) return
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    const result = await saveWebhookSecret(secret)
    setSaving(false)
    if (result.success) {
      setSecret('')
      toast.success({ title: 'Signing secret saved', message: 'Card payments are now enabled for this location.' })
    } else {
      toast.error({ title: 'Could not save', message: result.error || 'Unable to save the signing secret.' })
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-5">
      <h4 className="text-sm font-semibold text-foreground">Confirm payments</h4>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Clover tells us when a customer has paid. Until this is set up, card payments stay disabled.
      </p>

      <ol className="mt-4 space-y-4 text-[13px] text-foreground">
        <li>
          <span className="font-medium">1.</span> Copy this location&apos;s webhook URL:
          <div className="mt-1.5 flex gap-2">
            <input
              readOnly
              value={webhookUrl || 'Set PUBLIC_API_URL on the server to generate this.'}
              className="h-9 flex-1 rounded-lg border border-border bg-muted/30 px-2.5 text-[11px] text-muted-foreground"
            />
            <Button type="button" size="sm" variant="outline" className="h-9 shrink-0" onClick={handleCopy} disabled={!webhookUrl}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </li>
        <li>
          <span className="font-medium">2.</span> In your Clover dashboard, open{' '}
          <span className="font-medium">Settings → Ecommerce → Hosted Checkout</span> and paste it into{' '}
          <span className="italic">Webhook URL</span>.
        </li>
        <li>
          <span className="font-medium">3.</span> Click <span className="italic">Generate</span> to create a signing
          secret, then copy it.
        </li>
        <li>
          <span className="font-medium">4.</span> Paste the signing secret here:
          <form className="mt-1.5 flex gap-2" onSubmit={handleSave}>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={webhookSecretSaved ? '•••••••••  (saved — paste a new one to replace it)' : 'Signing secret'}
              className="h-9 flex-1 text-[12px]"
              disabled={!canWrite}
            />
            <Button type="submit" size="sm" className="h-9 shrink-0" disabled={!canWrite || saving || !secret.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </li>
      </ol>

      <div className="mt-4 border-t border-border/60 pt-3 text-[12px]">
        {!webhookSecretSaved ? (
          <span className="text-red-500">Card payments are disabled until you save your signing secret.</span>
        ) : webhookLastError ? (
          <span className="text-red-500">
            {webhookLastError === 'signature rejected'
              ? 'Signature rejected — the signing secret here does not match the one in Clover.'
              : webhookLastError}
          </span>
        ) : webhookLastReceivedAt ? (
          <span className="text-emerald-600">
            Working — last confirmation received {new Date(webhookLastReceivedAt).toLocaleString()}.
          </span>
        ) : (
          <span className="text-amber-600">
            Waiting for your first card payment to confirm this works.
          </span>
        )}
      </div>
    </div>
  )
}
