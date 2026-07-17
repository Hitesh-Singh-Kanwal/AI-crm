'use client'

import { ChevronRight } from 'lucide-react'
import { Card, SectionLabel } from './shared'

export default function HumanInterventionRequiredWidget({ humanInterventionRequired = 0 }) {
  return (
    <Card className="p-5">
      <SectionLabel>Human Intervention Required</SectionLabel>
      <p className="text-[46px] font-bold mt-1 text-foreground">{humanInterventionRequired}</p>
      <button className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors text-[var(--studio-primary)] hover:opacity-90">
        Click to view details <ChevronRight size={12} />
      </button>
    </Card>
  )
}
