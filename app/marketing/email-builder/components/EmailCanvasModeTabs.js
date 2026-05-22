'use client'

import { Code2, Eye, Layout } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const MODES = [
  { value: 'visual', label: 'Visual', icon: Layout },
  { value: 'html', label: 'HTML', icon: Code2 },
  { value: 'preview', label: 'Preview', icon: Eye },
]

export default function EmailCanvasModeTabs({ value, onChange, className }) {
  return (
    <Tabs value={value} onValueChange={onChange} className={cn('w-full', className)}>
      <TabsList className="w-full h-10 p-1 grid grid-cols-3 gap-1 bg-slate-100/80">
        {MODES.map(({ value: mode, label, icon: Icon }) => (
          <TabsTrigger
            key={mode}
            value={mode}
            className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
