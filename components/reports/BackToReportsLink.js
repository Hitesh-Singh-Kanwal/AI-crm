'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function BackToReportsLink() {
  return (
    <Link
      href="/reports"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Reports
    </Link>
  )
}
