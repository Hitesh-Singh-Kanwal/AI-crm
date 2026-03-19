'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'

export default function ScriptPreviewDialog({ open, onClose, scriptId }) {
  const [script, setScript] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !scriptId) {
      setScript(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    api
      .get(`/api/ai-script/${scriptId}`)
      .then((result) => {
        if (result.success && result.data) {
          setScript(result.data)
        } else {
          setError(result.error || 'Failed to load script')
        }
      })
      .catch((e) => {
        console.error(e)
        setError('Failed to load script')
      })
      .finally(() => setLoading(false))
  }, [open, scriptId])

  // Some API responses can be nested (e.g. result.data.script holds full object).
  // Normalize fields so we never render an object directly as a React child.
  const normalizedScript = (() => {
    if (!script) return null
    const base = typeof script === 'object' ? script : {}
    const nested = typeof base.script === 'object' && base.script !== null ? base.script : null
    return {
      name: base.name || nested?.name || 'Untitled Script',
      categoryName: base.categoryID?.name || nested?.categoryID?.name || 'Uncategorized',
      subCategory: base.subCategory || nested?.subCategory || null,
      type: base.type || nested?.type || 'call',
      content:
        typeof base.script === 'string'
          ? base.script
          : typeof nested?.script === 'string'
          ? nested.script
          : '',
    }
  })()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="3xl">
      <DialogContent onClose={onClose} className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Script preview</DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" text="Loading script…" />
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive py-4">{error}</p>
        )}
        {normalizedScript && !loading && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{normalizedScript.name}</h3>
              <Badge variant="outline">{normalizedScript.categoryName}</Badge>
              {normalizedScript.subCategory && <Badge variant="secondary">{normalizedScript.subCategory}</Badge>}
              <Badge variant="outline">{normalizedScript.type}</Badge>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Script content</p>
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                {normalizedScript.content || '—'}
              </pre>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
