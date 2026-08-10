import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StudentHealthOverviewWidget from '../StudentHealthOverviewWidget'

// DetailsButton (rendered by this widget) calls useRouter() — not under test
// here, just needs a router context to mount.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('StudentHealthOverviewWidget — New Active MTD/YTD trend badge', () => {
  it('shows a real percentage when there is a nonzero prior-period baseline', () => {
    render(
      <StudentHealthOverviewWidget
        studentHealth={{
          totals: { active: 28, booked: 0, notBooked: 28, bookedPct: 0 },
          newActiveTrend: {
            momGrowth: { value: 5, trendPct: 25, trendType: 'up' },
            ytdGrowth: { value: 20, trendPct: 10, trendType: 'down' },
          },
        }}
        rangeDays={30}
      />
    )

    expect(screen.getByText('25.0%')).toBeInTheDocument()
    expect(screen.getByText('10.0%')).toBeInTheDocument()
  })

  it('shows "New" instead of a fabricated 100% when there is no prior-period baseline, regardless of the actual count', () => {
    render(
      <StudentHealthOverviewWidget
        studentHealth={{
          totals: { active: 28, booked: 0, notBooked: 28, bookedPct: 0 },
          newActiveTrend: {
            momGrowth: { value: 1, trendPct: 0, trendType: 'up', noBaseline: true },
            ytdGrowth: { value: 11, trendPct: 0, trendType: 'up', noBaseline: true },
          },
        }}
        rangeDays={30}
      />
    )

    // Both badges say "New", not two identical (and misleading) "100.0%"s.
    expect(screen.getAllByText('New')).toHaveLength(2)
    expect(screen.queryByText('100.0%')).not.toBeInTheDocument()
  })

  it('omits the badge entirely when there is no baseline and no current value either (nothing to report)', () => {
    render(
      <StudentHealthOverviewWidget
        studentHealth={{
          totals: { active: 0, booked: 0, notBooked: 0, bookedPct: 0 },
          newActiveTrend: {
            momGrowth: { value: 0, trendPct: 0, trendType: 'down', noBaseline: true },
            ytdGrowth: { value: 0, trendPct: 0, trendType: 'down', noBaseline: true },
          },
        }}
        rangeDays={30}
      />
    )

    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.queryByText('100.0%')).not.toBeInTheDocument()
  })
})
