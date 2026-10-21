'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api, { getApiBaseUrl } from '@/lib/api'
import { toast } from '@/components/ui/toast'

/** Copy-paste snippet that shows this studio's live published class schedule on its own website. */
export default function WebsiteEmbedDialog({ open, onClose }) {
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [tag, setTag] = useState('')

  useEffect(() => {
    if (!open || locations.length) return
    api.get('/api/location?limit=50').then((res) => {
      if (!res.success || !Array.isArray(res.data)) return
      setLocations(res.data)
      setLocationId((prev) => prev || res.data[0]?._id || '')
    })
  }, [open, locations.length])

  const base = `${getApiBaseUrl()}/public/classes`
  const snippet = locationId
    ? `<div id="cadance-classes"></div>
<script src="${base}/embed.js"></script>
<script>
  CadanceClasses.create({
    locationId: "${locationId}",
    target: "#cadance-classes"${tag.trim() ? `,\n    tag: ${JSON.stringify(tag.trim())}` : ''}
  });
</script>`
    : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      toast.success('Embed code copied')
    } catch {
      toast.error('Could not copy — select the code and copy it manually')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl">
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Show classes on your website</DialogTitle>
          <DialogDescription>
            Paste this where you want the schedule to appear. It always shows your published, active classes and updates
            by itself — cancellations and full classes included.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="we-location">Location</Label>
              <select
                id="we-location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="we-tag">Only classes tagged <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="we-tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Latin" />
            </div>
          </div>
          <pre
            aria-label="Embed code"
            className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground"
          >{snippet || 'Loading…'}</pre>
          <p className="text-[11px] text-muted-foreground">
            Style it with your site's CSS: everything sits inside <code>.cadance-classes</code> (rows use <code>.cadance-classes__item</code>).
          </p>
          <div className="flex justify-end">
            <Button onClick={copy} disabled={!snippet} className="bg-brand text-brand-foreground hover:bg-brand-dark">Copy code</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
