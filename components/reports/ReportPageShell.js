'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { BackToReportsLink } from '@/components/reports/BackToReportsLink'
import { ReportFilterPanel } from '@/components/reports/ReportFilterPanel'
import { ReportFiltersButton } from '@/components/reports/ReportFiltersButton'
import { ReportDrillPanel } from '@/components/reports/ReportDrillPanel'
import { ReportFavoriteStar } from '@/components/reports/ReportFavoriteStar'
import { ReportSavedViews } from '@/components/reports/ReportSavedViews'
import { useReportData } from '@/lib/hooks/useReportData'
import { useReportPreferences } from '@/lib/hooks/useReportPreferences'
import { useReportFilterOptions } from '@/lib/hooks/useReportFilterOptions'
import { parseReportFiltersFromSearchParams, buildReportQuery } from '@/lib/reports/reportFilters'
import { countActiveReportFilters } from '@/lib/reports/buildReportQueryParams'
import { exportCurrentPageToCsv } from '@/lib/reports/exportCsv'
import { exportCurrentPageToPdf } from '@/lib/reports/exportPdf'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { Button } from '@/components/ui/button'
import ReportPageSuspense from '@/components/reports/ReportPageSuspense'

function ReportPageShellContent({
  slug,
  title,
  subtitle,
  columns,
  showLeadSource = true,
  showComparison = false,
  showActiveWindow = false,
  showGroupBy = false,
  defaultActiveWindowDays = 30,
  TableComponent,
  SummaryComponent,
  renderDrill,
  drillTitle = 'Detail',
  summaryKeys = [],
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = parseReportFiltersFromSearchParams(searchParams)
  const [page, setPage] = useState(1)
  const [drillId, setDrillId] = useState(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  const { favorites, toggleFavorite, savedViews, saveView, deleteView } = useReportPreferences()
  const {
    studios,
    teachers,
    programs,
    defaultActiveWindowDays: optionsDefaultWindow,
  } = useReportFilterOptions()
  const favorited = favorites.includes(slug)

  const { rows, summary, totalCount, pageSize, isLoading, isValidating, error, mutate } = useReportData(
    slug,
    filters,
    { page }
  )

  function handleFiltersChange(nextFilters) {
    setPage(1)
    router.push(`/reports/${slug}?${buildReportQuery(nextFilters, { page: 1, pageSize: 50 })}`)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackToReportsLink />
        <ReportFavoriteStar
          favorited={favorited}
          onToggle={() => toggleFavorite(slug).catch(() => {})}
          label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <ReportFiltersButton activeCount={countActiveReportFilters(filters)} onClick={() => setFilterPanelOpen(true)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCurrentPageToCsv(rows, columns, `${slug}.csv`)}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCurrentPageToPdf(rows, columns, title, `${slug}.pdf`)}>
            Export PDF
          </Button>
        </div>
      </div>

      <ReportFilterPanel
        open={filterPanelOpen}
        appliedFilters={filters}
        onClose={() => setFilterPanelOpen(false)}
        onApply={(next) => {
          handleFiltersChange(next)
          setFilterPanelOpen(false)
        }}
        studios={studios}
        teachers={teachers}
        programs={programs}
        catalogKey={slug}
        defaultDateRangeDays={defaultActiveWindowDays || optionsDefaultWindow}
        savedViewsSlot={
          <ReportSavedViews
            compact
            reportSlug={slug}
            savedViews={savedViews}
            currentFilters={filters}
            onApply={(next) => {
              handleFiltersChange(next)
              setFilterPanelOpen(false)
            }}
            onResetFilters={() => handleFiltersChange({})}
            onSave={(view) => saveView(view).catch(() => {})}
            onDelete={(id) => deleteView(id).catch(() => {})}
          />
        }
      />

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Couldn&apos;t load report. <span className="text-muted-foreground">{error.message}</span>
          </p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      {summaryKeys.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {summaryKeys.map(({ key, label }) => (
            <span key={key}>
              {label}: {summary[key] ?? 0}
            </span>
          ))}
          {isValidating && !isLoading && <span>Updating…</span>}
        </div>
      )}

      {SummaryComponent && !isLoading && (
        <div className="mt-4">
          <SummaryComponent summary={summary} rows={rows} />
        </div>
      )}

      <div className="mt-2">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <TableComponent rows={rows} onRowClick={(row) => setDrillId(row.id)} />
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <ReportDrillPanel
        open={Boolean(drillId)}
        onClose={() => setDrillId(null)}
        reportSlug={slug}
        recordId={drillId}
        title={drillTitle}
        renderDetail={(detail) =>
          renderDrill ? (
            renderDrill(detail)
          ) : (
            <div className="space-y-2 p-4 text-sm">
              {columns.map((col) => (
                <p key={col.key}>
                  <strong>{col.label}:</strong> {formatReportCellValue(detail?.[col.key], col)}
                </p>
              ))}
            </div>
          )
        }
      />
    </MainLayout>
  )
}

export default function ReportPageShell(props) {
  return (
    <ReportPageSuspense title={props.title} subtitle={props.subtitle}>
      <ReportPageShellContent {...props} />
    </ReportPageSuspense>
  )
}
