'use client'

import { Code2, Eye, Layout } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const MODES = [
  {
    value: 'visual',
    label: 'Design',
    title: 'Drag blocks or tweak HTML visually',
    icon: Layout,
  },
  {
    value: 'html',
    label: 'HTML',
    title: 'Paste or edit source code',
    icon: Code2,
  },
  {
    value: 'preview',
    label: 'Preview',
    title: 'Inbox-ready view',
    icon: Eye,
  },
]

export default function EmailCanvasModeTabs({
  value,
  onChange,
  className,
}) {
  return (
    <Tabs value={value} onValueChange={onChange} className={cn('w-auto', className)}>
      <TabsList className="h-9 p-0.5 grid grid-cols-3 gap-0.5 bg-slate-100/90 rounded-lg">
        {MODES.map(({ value: mode, label, title, icon: Icon }) => (
          <TabsTrigger
            key={mode}
            value={mode}
            title={title}
            className={cn(
              'h-8 px-3 rounded-md text-slate-600 gap-1.5',
              'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-semibold">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
