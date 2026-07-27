'use client'

import { Suspense } from 'react'
import MainLayout from '@/components/layout/MainLayout'

/** Wraps report pages that read URL search params (Next.js requires Suspense). */
export default function ReportPageSuspense({ title, subtitle, children }) {
  return (
    <Suspense
      fallback={
        <MainLayout title={title} subtitle={subtitle}>
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        </MainLayout>
      }
    >
      {children}
    </Suspense>
  )
}
