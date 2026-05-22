'use client'

import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EmailTemplateThumbnail({ html, className }) {
  const hasHtml = !!String(html || '').trim()

  if (!hasHtml) {
    return (
      <div
        className={cn(
          'h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1.5',
          className
        )}
      >
        <Mail className="h-5 w-5 text-slate-300" />
        <span className="text-[10px] text-slate-400">No preview</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-28 rounded-lg border border-slate-200 bg-white overflow-hidden relative isolate',
        className
      )}
    >
      <div
        className="absolute left-0 top-0 w-[400%] origin-top-left scale-[0.25] pointer-events-none select-none p-6 prose prose-sm max-w-none text-slate-800"
        dangerouslySetInnerHTML={{ __html: html }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/95 to-transparent" />
    </div>
  )
}
