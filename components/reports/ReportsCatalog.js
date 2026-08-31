'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import SearchInput from '@/components/ui/search-input'
import { Select } from '@/components/ui/select'
import { CATEGORIES, partitionCatalogByFavorites } from '@/lib/reports/reportCatalog'
import { ReportFavoriteStar } from '@/components/reports/ReportFavoriteStar'

function ReportRow({ report, favorited, onToggleFavorite }) {
  return (
    <div className="flex items-stretch gap-2 border-b border-border last:border-b-0">
      <ReportFavoriteStar
        favorited={favorited}
        onToggle={() => onToggleFavorite(report.slug)}
        label={favorited ? `Unfavorite ${report.title}` : `Favorite ${report.title}`}
      />
      <Link
        href={report.href}
        className="flex min-w-0 flex-1 items-start justify-between gap-4 py-3 pr-3 transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{report.description}</p>
        </div>
        <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {report.category}
        </span>
      </Link>
    </div>
  )
}

function ReportSection({ title, reports, favoriteSet, onToggleFavorite, emptyLabel }) {
  if (!reports.length) {
    return (
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      </section>
    )
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {reports.map((report) => (
          <ReportRow
            key={report.slug}
            report={report}
            favorited={favoriteSet.has(report.slug)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  )
}

export default function ReportsCatalog({
  favoriteSlugs = [],
  onToggleFavorite,
  isLoadingPreferences = false,
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { favorites, all } = useMemo(
    () => partitionCatalogByFavorites(favoriteSlugs, { search, category }),
    [favoriteSlugs, search, category]
  )

  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label htmlFor="report-search" className="text-xs text-muted-foreground">
            Search
          </label>
          <SearchInput
            id="report-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports…"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="report-category" className="text-xs text-muted-foreground">
            Category
          </label>
          <Select
            id="report-category"
            className="h-9 w-44"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoadingPreferences && (
        <p className="mb-3 text-xs text-muted-foreground">Loading favorites…</p>
      )}

      <ReportSection
        title="Favorites"
        reports={favorites}
        favoriteSet={favoriteSet}
        onToggleFavorite={onToggleFavorite}
        emptyLabel={
          search || category
            ? 'No favorite reports match your filters.'
            : 'Star a report to pin it here.'
        }
      />

      <ReportSection
        title="All Reports"
        reports={all}
        favoriteSet={favoriteSet}
        onToggleFavorite={onToggleFavorite}
        emptyLabel="No reports match your filters."
      />
    </div>
  )
}
