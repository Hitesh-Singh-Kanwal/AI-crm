'use client'

import { useMemo } from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function EmailHtmlPanel({
  htmlBody,
  onHtmlBodyChange,
  onSyncFromVisual,
  showSyncFromVisual = false,
  readOnly = false,
  minRows = 14,
  layout = 'editor-only',
  className,
}) {
  const toast = useToast()
  const previewHtml = useMemo(() => String(htmlBody || '').trim(), [htmlBody])
  const editorOnly = layout === 'editor-only'

  const copyHtml = async () => {
    const text = String(htmlBody || '')
    if (!text.trim()) {
      toast.error({ title: 'Nothing to copy', message: 'Add HTML content first.' })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success({ title: 'Copied', message: 'HTML copied to clipboard.' })
    } catch {
      toast.error({ title: 'Copy failed', message: 'Could not copy to clipboard.' })
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 w-full min-h-0',
        editorOnly ? 'h-full flex-1' : 'min-h-[380px]',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showSyncFromVisual && onSyncFromVisual && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSyncFromVisual}
              className="h-8 text-xs"
              title="Regenerate HTML from visual blocks"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyHtml}
            disabled={!previewHtml}
            className="h-8 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
      </div>

      <div
        className={cn(
          'flex flex-col min-h-0 flex-1 w-full rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm',
          editorOnly && 'min-h-[320px]'
        )}
      >
        <Textarea
          value={htmlBody}
          onChange={(e) => onHtmlBodyChange?.(e.target.value)}
          readOnly={readOnly}
          rows={editorOnly ? 24 : minRows}
          placeholder={'<h1>Welcome!</h1>\n<p>Hi {{name}},</p>'}
          className={cn(
            'flex-1 w-full min-h-0 resize-none rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
            'font-mono text-[13px] leading-relaxed px-4 py-4',
            editorOnly ? 'min-h-[280px] h-full' : 'min-h-[200px]',
            readOnly
              ? 'bg-slate-50 text-slate-700 cursor-default'
              : 'bg-slate-950 text-slate-100 placeholder:text-slate-500'
          )}
          spellCheck={false}
        />
      </div>
    </div>
  )
}
