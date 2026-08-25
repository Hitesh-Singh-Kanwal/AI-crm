'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { BackToReportsLink } from '@/components/reports/BackToReportsLink'
import { ReportFilterPanel } from '@/components/reports/ReportFilterPanel'
import { ReportActiveFiltersBar } from '@/components/reports/ReportActiveFiltersBar'
import { ReportSearchInput } from '@/components/reports/ReportSearchInput'
import { ReportExportMenu } from '@/components/reports/ReportExportMenu'
import { ReportDrillPanel } from '@/components/reports/ReportDrillPanel'
import { ReportFavoriteStar } from '@/components/reports/ReportFavoriteStar'
import { ReportSavedViews } from '@/components/reports/ReportSavedViews'
import { useReportData } from '@/lib/hooks/useReportData'
import { useReportPreferences } from '@/lib/hooks/useReportPreferences'
import { useReportFilterOptions } from '@/lib/hooks/useReportFilterOptions'
import { parseReportFiltersFromSearchParams, buildReportQuery } from '@/lib/reports/reportFilters'
import { groupReportRowsByStudio } from '@/lib/reports/groupRowsByLocation'
import { countActiveReportFilters } from '@/lib/reports/buildReportQueryParams'
import { getActiveReportFilterChips, removeReportFilterChip } from '@/lib/reports/reportActiveFilterChips'
import { exportCurrentPageToCsv } from '@/lib/reports/exportCsv'
import { exportCurrentPageToPdf } from '@/lib/reports/exportPdf'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { ReportTimezoneProvider } from '@/lib/reports/ReportTimezoneContext'
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
    timezone: activeLocationTimezone,
  } = useReportFilterOptions()
  const favorited = favorites.includes(slug)

  const reportTimezone =
    (filters.studioId && studios.find((s) => s.id === filters.studioId)?.timezone) ||
    activeLocationTimezone ||
    'America/New_York'

  const { rows, summary, totalCount, pageSize, isLoading, isValidating, error, mutate } = useReportData(
    slug,
    filters,
    { page }
  )

  function handleFiltersChange(nextFilters) {
    setPage(1)
    router.push(`/reports/${slug}?${buildReportQuery(nextFilters, { page: 1, pageSize: 50 })}`)
  }

  function handleSearchChange(search) {
    handleFiltersChange({ ...filters, search })
  }

  const activeFilterCount = countActiveReportFilters(filters)
  const activeFilterChips = getActiveReportFilterChips(filters, {
    studios,
    teachers,
    programs,
    catalogKey: slug,
    columns,
    includeSearch: false,
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  // studio-comparison's rows already *are* one per studio by design — grouping
  // it again would just wrap each row in its own redundant single-row section.
  //
  // teacher-performance and teacher-lesson-count are one row per *teacher*,
  // and their `studioName` is that teacher's own home studio (see
  // studioNameForTeacher on the backend) — not the location the row's lesson
  // data came from. A teacher based at another studio who also teaches at the
  // one actually selected shows a "foreign" studioName on an otherwise
  // correctly-scoped row, which isn't a second location's worth of data to
  // segregate; grouping on it just fabricates a bogus extra section.
  const NO_LOCATION_GROUPING_SLUGS = new Set(['studio-comparison', 'teacher-performance', 'teacher-lesson-count'])
  const locationGroups = NO_LOCATION_GROUPING_SLUGS.has(slug) ? null : groupReportRowsByStudio(rows)

  return (
    <ReportTimezoneProvider timeZone={reportTimezone}>
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
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <ReportSearchInput value={filters.search || ''} onChange={handleSearchChange} />
          <ReportActiveFiltersBar
            activeCount={activeFilterCount}
            chips={activeFilterChips}
            onOpenFilters={() => setFilterPanelOpen(true)}
            onRemoveChip={(chip) => handleFiltersChange(removeReportFilterChip(filters, chip))}
            onReset={() => handleFiltersChange({})}
          />
        </div>
        <ReportExportMenu
          onExportCsv={() => exportCurrentPageToCsv(rows, columns, `${slug}.csv`, reportTimezone)}
          onExportPdf={() => exportCurrentPageToPdf(rows, columns, title, `${slug}.pdf`, reportTimezone)}
        />
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
        columns={columns}
        timeZone={reportTimezone}
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
        ) : locationGroups ? (
          <div className="space-y-6">
            {locationGroups.map((group) => (
              <div key={group.studioName}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{group.studioName}</h3>
                {/* `summary` is the org-wide total for the whole response, not this
                    one studio's slice — passing it into every section would show
                    the same blended number under each heading. Table components
                    that show a summary card (e.g. TeacherLessonsTaughtReport)
                    already degrade cleanly with it omitted. */}
                <TableComponent rows={group.rows} onRowClick={(row) => setDrillId(row.id)} />
              </div>
            ))}
          </div>
        ) : (
          <TableComponent rows={rows} summary={summary} onRowClick={(row) => setDrillId(row.id)} />
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
        filters={filters}
        renderDetail={(detail) =>
          renderDrill ? (
            renderDrill(detail, reportTimezone)
          ) : (
            <div className="space-y-2 p-4 text-sm">
              {columns.map((col) => (
                <p key={col.key}>
                  <strong>{col.label}:</strong> {formatReportCellValue(detail?.[col.key], col, reportTimezone)}
                </p>
              ))}
              {Array.isArray(detail?.lessonsByType) && detail.lessonsByType.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  <p className="font-semibold">Lessons taught</p>
                  {detail.lessonsByType.map((group) => (
                    <div key={group.serviceType}>
                      <p className="text-muted-foreground">
                        {group.label}: {group.lessonsTaught ?? 0} taught · {group.customersServed ?? 0} customers
                      </p>
                      {group.sessions?.length ? (
                        <ul className="mt-1 list-disc pl-5">
                          {group.sessions.map((session, idx) => (
                            <li key={`${session.customerID}-${idx}`}>
                              {session.date
                                ? formatReportCellValue(session.date, {}, reportTimezone)
                                : '—'}{' '}
                              {session.customerName} ({session.lessons || 1} lesson
                              {(session.lessons || 1) === 1 ? '' : 's'})
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(detail?.attendanceByServiceType) && detail.attendanceByServiceType.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  <p className="font-semibold">Students attended</p>
                  {detail.attendanceByServiceType.map((group) => (
                    <div key={group.serviceType}>
                      <p className="text-muted-foreground">
                        {group.label} ({group.studentCount})
                      </p>
                      <ul className="mt-1 list-disc pl-5">
                        {group.students.map((student) => (
                          <li key={student.id}>
                            {student.studentName} · {student.lessonsAttended} lesson
                            {student.lessonsAttended === 1 ? '' : 's'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
      />
    </MainLayout>
    </ReportTimezoneProvider>
  )
}

export default function ReportPageShell(props) {
  return (
    <ReportPageSuspense title={props.title} subtitle={props.subtitle}>
      <ReportPageShellContent {...props} />
    </ReportPageSuspense>
  )
}
