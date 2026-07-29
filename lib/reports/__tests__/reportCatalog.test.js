import { describe, it, expect } from 'vitest'
import {
  REPORT_CATALOG,
  getReportBySlug,
  filterCatalog,
  partitionCatalogByFavorites,
  CATEGORIES,
} from '../reportCatalog'

describe('reportCatalog', () => {
  it('includes all 19 required slugs', () => {
    const slugs = REPORT_CATALOG.map((r) => r.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([
        'sales-cash',
        'teacher-performance',
        'teacher-lesson-count',
        'revenue-by-teacher',
        'lead-conversion',
        'intro-conversion',
        'program-progression',
        'purchase-progression',
        'lead-source-performance',
        'active-inactive-students',
        'student-retention',
        'revenue-by-program',
        'payment-plan',
        'outstanding-balance',
        'package-utilization',
        'reason-for-dancing',
        'growth',
        'studio-comparison',
        'group-attendance',
      ])
    )
    expect(REPORT_CATALOG).toHaveLength(19)
  })

  it('exposes expected categories', () => {
    expect(CATEGORIES).toContain('Sales')
    expect(CATEGORIES).toContain('Teachers')
    expect(REPORT_CATALOG.every((r) => CATEGORIES.includes(r.category))).toBe(true)
  })

  it('filters by search and category', () => {
    expect(filterCatalog({ search: 'cash' }).map((r) => r.slug)).toContain('sales-cash')
    expect(filterCatalog({ category: 'Teachers' }).every((r) => r.category === 'Teachers')).toBe(true)
  })

  it('getReportBySlug returns undefined for unknown', () => {
    expect(getReportBySlug('nope')).toBeUndefined()
    expect(getReportBySlug('sales-cash')?.title).toMatch(/Sales and Cash/)
  })

  it('partitions favorites at top in preference order', () => {
    const { favorites, all } = partitionCatalogByFavorites(['group-attendance', 'sales-cash'])
    expect(favorites.map((r) => r.slug)).toEqual(['group-attendance', 'sales-cash'])
    expect(all).toHaveLength(19)
  })
})
