'use client'

import MainLayout from '@/components/layout/MainLayout'
import ReportsCatalog from '@/components/reports/ReportsCatalog'
import { useReportPreferences } from '@/lib/hooks/useReportPreferences'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  const { favorites, toggleFavorite, isLoading, error, mutate } = useReportPreferences()

  return (
    <MainLayout title="Reports" subtitle="Choose a report, mark favorites, and drill into performance">
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Couldn&apos;t load favorites.{' '}
            <span className="text-muted-foreground">{error.message || 'Please try again.'}</span>
          </p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      <ReportsCatalog
        favoriteSlugs={favorites}
        onToggleFavorite={(slug) => {
          toggleFavorite(slug).catch(() => {})
        }}
        isLoadingPreferences={isLoading}
      />
    </MainLayout>
  )
}
