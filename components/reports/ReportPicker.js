'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const REPORTS = [
  { slug: 'overview', label: 'Overview', href: '/reports' },
  { slug: 'sales-cash', label: 'Sales and Cash', href: '/reports/sales-cash' },
  { slug: 'outstanding-balance', label: 'Outstanding Balance', href: '/reports/outstanding-balance' },
  { slug: 'payment-plan', label: 'Payment Plan', href: '/reports/payment-plan' },
  { slug: 'revenue-by-teacher', label: 'Revenue by Teacher', href: '/reports/revenue-by-teacher' },
  { slug: 'lead-conversion', label: 'Lead Conversion', href: '/reports/lead-conversion' },
  { slug: 'active-inactive-students', label: 'Active and Inactive Students', href: '/reports/active-inactive-students' },
]

export function ReportPicker({ activeSlug }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
      {REPORTS.map((r) => (
        <Link
          key={r.slug}
          href={r.href}
          aria-current={r.slug === activeSlug ? 'page' : undefined}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm',
            r.slug === activeSlug ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  )
}
