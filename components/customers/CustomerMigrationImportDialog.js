'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, Download, FileSpreadsheet, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import * as XLSX from 'xlsx'
import api from '@/lib/api'
import { toCSVValue, triggerDownload, parseCSVText } from '@/lib/csv-utils'
import {
  SERVICE_COLUMNS,
  UNIVERSAL_COLUMNS,
  parseFileForMapping,
  splitUniversalRows,
  parseCsvFile,
  parseCsvFileForMapping,
  applyColumnMapping,
  MAPPING_CONFIDENT_THRESHOLD,
  suggestTrialCustomers,
  filterRowsByCustomerIDs,
  rowCustomerKey,
  preflightCheck,
  computeSheetTotals,
  downloadSampleCsv,
  downloadUniversalSampleCsv,
  downloadSampleXlsx,
} from '@/lib/customer-migration-import'

// Services is the one sheet kept separate from the single combined upload —
// it's the shared booking catalog (not one row per customer), and per the
// doc "most studios already have their Services set up" so this is rarely
// even needed.
const CSV_SHEETS = {
  services: { label: 'Services (optional)', columns: SERVICE_COLUMNS, sampleFile: 'sample_services.csv' },
}

const STEPS = { UPLOAD: 'upload', MAPPING: 'mapping', PREVIEW: 'preview', TRIAL_REVIEW: 'trial_review', DONE: 'done' }
const MODES = { MIGRATION: 'migration', QUICK: 'quick', EXPORT: 'export' }

/**
 * Single entry point for all customer CSV/Excel workflows: the full
 * migration import (Customers + Enrollments sheets, with dedup/validation/
 * reconciliation), a "Quick Add" single-sheet CSV for adding a handful of
 * customers without enrollments, and exporting the current customer list.
 * Folds in what used to be the separate plain Import CSV / Export CSV
 * buttons so there's one place for customer CSV work instead of three.
 *
 * @param {Object} props
 * @param {Array}  props.quickImportFields - [{key, header, sample}] for the "Quick Add" CSV shape
 * @param {Function} props.onQuickImportRows - async (rows) => { successCount, errorCount, errorMessage }
 * @param {Function} props.getExportRows - async () => rows (current customer list, in quickImportFields shape)
 * @param {Boolean} props.disabled
 * @param {String} props.disabledReason
 */
export default function CustomerMigrationImportDialog({
  quickImportFields,
  onQuickImportRows,
  getExportRows,
  disabled,
  disabledReason,
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(MODES.MIGRATION)
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [parsed, setParsed] = useState(null) // { customers, enrollments, fileNames }
  const [preview, setPreview] = useState(null) // validate() result
  const [commitResult, setCommitResult] = useState(null)
  const [reconcile, setReconcile] = useState(null)
  const [quickCsvText, setQuickCsvText] = useState('')
  const [quickResult, setQuickResult] = useState(null)
  // Phase 3 — the pre-commit "Check" gate (rule 5: "the totals must match
  // before go-live ... if a number does not match, we do not continue").
  // The operator types in what the OLD system reports for the same five
  // numbers; we diff against preview.totals.overall (computed by the
  // backend from validated rows, before anything is written) and refuse to
  // enable Import until every number matches or the operator explicitly
  // overrides with a reason (audited, not a silent bypass).
  const [oldSystemTotals, setOldSystemTotals] = useState({ customers: '', cashCollected: '', balanceDue: '', credits: '', sessionsRemaining: '' })
  const [mismatchOverrideReason, setMismatchOverrideReason] = useState('')
  // Phase 5 — the "we export whatever the old CRM produces, the app maps the
  // columns" step. Only wired up for the Customers CSV (the one sheet every
  // studio's old-CRM export realistically has, usually as one flat table) —
  // Enrollments/Services/etc. still expect the template's own column names,
  // same as before this phase.
  const [mappingReview, setMappingReview] = useState(null) // { file, rawRows, headerRowIndex, headerRow, mapping: {key: sourceIndex|null}, savedMappingFound }
  // Phase 4 — "Import 10 real customers first ... Open all 10 profiles and
  // check every number by hand. All 10 perfect, or engineering fixes and we
  // repeat." trialMode gates whether Import commits everyone at once or
  // stages a 10-customer batch first; trialSelectedIDs is the checkbox
  // selection (auto-suggested, operator-editable); trialResult holds the
  // trial commit's response (including customersDetail links to review).
  const [trialMode, setTrialMode] = useState(true)
  const [trialSelectedIDs, setTrialSelectedIDs] = useState([])
  const [trialResult, setTrialResult] = useState(null)
  const toast = useToast()

  const reset = () => {
    setMode(MODES.MIGRATION)
    setStep(STEPS.UPLOAD)
    setBusy(false)
    setParsed(null)
    setPreview(null)
    setCommitResult(null)
    setReconcile(null)
    setQuickCsvText('')
    setQuickResult(null)
    setOldSystemTotals({ customers: '', cashCollected: '', balanceDue: '', credits: '', sessionsRemaining: '' })
    setMismatchOverrideReason('')
    setMappingReview(null)
    setTrialMode(true)
    setTrialSelectedIDs([])
    setTrialResult(null)
  }

  const close = () => {
    if (busy) return
    setOpen(false)
    reset()
  }

  // The single combined upload (CSV or XLSX, one sheet) — "everything in a
  // single sheet, not different ones." Goes through the same mapping-review
  // step as Services below, just against UNIVERSAL_COLUMNS; confirming it
  // splits the mapped rows into customers/enrollments/lessons/payments/
  // memberships via splitUniversalRows (see confirmMapping).
  const handleUniversalUpload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    await openMappingReview('universal', UNIVERSAL_COLUMNS, file)
  }

  const mergeParsedRows = (which, rows, fileName) => {
    setParsed((prev) => {
      const next = {
        customers: prev?.customers || [],
        services: prev?.services || [],
        enrollments: prev?.enrollments || [],
        memberships: prev?.memberships || [],
        lessons: prev?.lessons || [],
        payments: prev?.payments || [],
        fileNames: prev?.fileNames || [],
      }
      next[which] = rows
      next.fileNames = [...next.fileNames.filter((n) => !n.startsWith(`${which}:`)), `${which}:${fileName}`]
      return next
    })
  }

  // Shared by the universal single-sheet upload and the (CSV-only) Services
  // upload: parse the file, look up a previously-confirmed mapping for this
  // exact header set, fall back to the fuzzy suggestion, and open the
  // mapping-review step. "we export whatever the old CRM produces, the app
  // maps the columns" — no file has to already use our exact column names.
  const openMappingReview = async (which, columns, file) => {
    setBusy(true)
    try {
      const parseFn = which === 'services' ? parseCsvFileForMapping : parseFileForMapping
      const { rawRows, headerRowIndex, headerRow, suggestedMapping } = await parseFn(file, columns)
      let savedMapping = null
      try {
        const res = await api.post('/api/customer/import/mapping/find', { headers: headerRow, sheetType: which })
        if (res.success && res.data?.found) savedMapping = res.data.mapping
      } catch {
        // Non-fatal — falls back to the fuzzy suggestion below.
      }
      // Mapping shape from either source is { key: sourceHeader } — resolve
      // to a column INDEX against this file's actual header row (a saved
      // mapping's remembered header text might not be at the same index this
      // time if the export reordered columns).
      const initialMapping = {}
      columns.forEach(({ key }) => {
        const savedHeader = savedMapping?.[key]
        const savedIdx = savedHeader ? headerRow.findIndex((h) => String(h).trim() === String(savedHeader).trim()) : -1
        if (savedIdx !== -1) {
          initialMapping[key] = savedIdx
        } else if (suggestedMapping[key] && suggestedMapping[key].confidence >= MAPPING_CONFIDENT_THRESHOLD) {
          initialMapping[key] = suggestedMapping[key].sourceIndex
        } else {
          initialMapping[key] = null
        }
      })
      setMappingReview({ which, columns, file, rawRows, headerRowIndex, headerRow, mapping: initialMapping, suggestedMapping, savedMappingFound: !!savedMapping })
      setStep(STEPS.MAPPING)
    } catch (err) {
      toast.error({ title: 'Could not parse file', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const handleCsvUpload = async (which, e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    await openMappingReview(which, CSV_SHEETS[which].columns, file)
  }

  const confirmMapping = async (remember) => {
    if (!mappingReview) return
    const { which, columns, file, rawRows, headerRowIndex, headerRow, mapping } = mappingReview
    const rows = applyColumnMapping(rawRows, headerRowIndex, columns, mapping)
    if (which === 'universal') {
      const split = splitUniversalRows(rows)
      setParsed((prev) => ({
        customers: split.customers,
        services: prev?.services || [],
        enrollments: split.enrollments,
        memberships: split.memberships,
        lessons: split.lessons,
        payments: split.payments,
        fileNames: [...(prev?.fileNames || []).filter((n) => !n.startsWith('universal:')), `universal:${file.name}`],
      }))
      toast.success({
        title: 'File mapped',
        message: `${split.customers.length} customer row(s), ${split.enrollments.length} enrollment row(s)${
          split.lessons.length || split.payments.length || split.memberships.length
            ? `, ${[split.lessons.length && `${split.lessons.length} lesson(s)`, split.payments.length && `${split.payments.length} payment(s)`, split.memberships.length && `${split.memberships.length} membership(s)`].filter(Boolean).join(', ')}`
            : ''
        }`,
      })
    } else {
      mergeParsedRows(which, rows, file.name)
      toast.success({ title: `${CSV_SHEETS[which].label} mapped`, message: `${rows.length} row(s)` })
    }
    if (remember) {
      try {
        const mappingByHeaderText = {}
        Object.entries(mapping).forEach(([key, idx]) => {
          if (idx !== null && idx !== undefined && headerRow[idx] !== undefined) mappingByHeaderText[key] = headerRow[idx]
        })
        await api.post('/api/customer/import/mapping', { headers: headerRow, sheetType: which, mapping: mappingByHeaderText })
      } catch {
        // Non-fatal — the import itself already went through either way.
      }
    }
    setMappingReview(null)
    setStep(STEPS.UPLOAD)
  }

  const runValidate = async () => {
    if (!parsed?.customers?.length) {
      toast.error({ title: 'Nothing to validate', message: 'Upload the Customers data first' })
      return
    }
    const preflightErrors = preflightCheck(
      parsed.customers,
      parsed.enrollments || [],
      parsed.lessons || [],
      parsed.payments || [],
      parsed.memberships || [],
      parsed.services || [],
    )
    setBusy(true)
    try {
      const res = await api.post('/api/customer/import/validate', {
        customers: parsed.customers,
        services: parsed.services || [],
        enrollments: parsed.enrollments || [],
        memberships: parsed.memberships || [],
        lessons: parsed.lessons || [],
        payments: parsed.payments || [],
      })
      if (!res.success) {
        toast.error({ title: 'Validation failed', message: res.error || 'Unable to reach the server' })
        return
      }
      const results = res.data
      // The backend re-checks everything preflightCheck does (and more), so a
      // bad row commonly gets flagged by both — dedupe per (sheet, rowIndex),
      // preferring the backend's message since it's authoritative, so "3 rows
      // with errors" means 3 distinct rows, not 3 messages for fewer rows.
      const backendRows = new Set((results.rowErrors || []).map((e) => `${e.sheet}:${e.rowIndex}`))
      const uniquePreflightErrors = preflightErrors.filter((e) => !backendRows.has(`${e.sheet}:${e.rowIndex}`))
      setPreview({ ...results, rowErrors: [...uniquePreflightErrors, ...(results.rowErrors || [])] })
      setTrialSelectedIDs(suggestTrialCustomers(parsed.customers || [], parsed.enrollments || [], parsed.payments || [], 10))
      setStep(STEPS.PREVIEW)
    } catch (err) {
      toast.error({ title: 'Validation failed', message: err.message || 'Unable to reach the server' })
    } finally {
      setBusy(false)
    }
  }

  // `subsetLegacyIDs`: null commits everything in `parsed`; an array commits
  // only those customers (+ their enrollments/lessons/payments/memberships)
  // — the trial batch, or "import the rest" after the trial's been reviewed.
  const runCommit = async (subsetLegacyIDs = null) => {
    // Guard against calling commit with a subset that resolves to zero
    // customers (e.g. "import the rest" when the trial batch already
    // covered the whole file) — the backend correctly 400s on an empty
    // customers array, but the caller should never get that far.
    if (Array.isArray(subsetLegacyIDs) && subsetLegacyIDs.length === 0) {
      toast.error({ title: 'Nothing to import', message: 'There are no remaining customers outside the test batch.' })
      return
    }
    setBusy(true)
    try {
      const isTrial = Array.isArray(subsetLegacyIDs)
      const payload = isTrial ? filterRowsByCustomerIDs(parsed, subsetLegacyIDs) : parsed

      // Reconciliation must compare against rows that will actually import —
      // a row already flagged invalid in the preview (e.g. Balance Due doesn't
      // reconcile) never gets created, so including its numbers on the
      // "sheet total" side would always mismatch the real CRM total. Row
      // indices in `preview.rowErrors` are against the FULL file, so this
      // only applies cleanly to a non-trial (full) commit — a trial batch's
      // own totals are compared to the old system's later, at go-live.
      const invalidEnrollmentRows = new Set(
        (preview?.rowErrors || []).filter((e) => e.sheet === 'enrollments').map((e) => e.rowIndex),
      )
      const enrollmentsForTotals = isTrial
        ? payload.enrollments
        : (parsed.enrollments || []).filter((_, i) => !invalidEnrollmentRows.has(i))
      const invalidPaymentRows = new Set(
        (preview?.rowErrors || []).filter((e) => e.sheet === 'payments' && e.severity !== 'warning').map((e) => e.rowIndex),
      )
      const paymentsForTotals = isTrial
        ? payload.payments
        : (parsed.payments || []).filter((_, i) => !invalidPaymentRows.has(i))
      const sheetTotals = computeSheetTotals(enrollmentsForTotals, payload.customers || [], paymentsForTotals)
      const res = await api.post('/api/customer/import/commit', {
        customers: payload.customers,
        services: payload.services || [],
        enrollments: payload.enrollments || [],
        memberships: payload.memberships || [],
        lessons: payload.lessons || [],
        payments: payload.payments || [],
        sourceFileNames: isTrial ? [...(parsed.fileNames || []), '(test-10 batch)'] : parsed.fileNames,
        sheetTotals,
        // Rule 5's override path is audited, not silent — recorded on the
        // ImportBatch whenever the operator proceeded past a totals mismatch.
        // Only meaningful for the full commit — the trial batch is reviewed
        // by hand, not against the totals gate.
        ...(!isTrial && totalsEntered && !totalsMatch
          ? { totalsOverride: { oldSystemTotals, computedTotals: overallTotals, reason: mismatchOverrideReason.trim() } }
          : {}),
      })
      if (!res.success) {
        toast.error({ title: 'Import failed', message: res.error || 'Unable to reach the server' })
        return
      }
      const result = res.data

      if (isTrial) {
        setTrialResult(result)
        setStep(STEPS.TRIAL_REVIEW)
        toast.success({ title: 'Test batch imported', message: `${result.customersDetail?.length ?? result.customersCreated} customer(s) — open each profile and check the numbers.` })
        return
      }

      setCommitResult(result)
      setStep(STEPS.DONE)
      toast.success({
        title: 'Import committed',
        message: `${result.customersCreated} new, ${result.customersMatched} matched customer(s); ${result.enrollmentsCreated} enrollment(s) created`,
      })

      try {
        const reconcileRes = await api.get(
          `/api/customer/import/${result.batchID}/reconcile?sheetTotals=${encodeURIComponent(JSON.stringify(sheetTotals))}`,
        )
        if (reconcileRes.success) setReconcile(reconcileRes.data)
      } catch {
        // Non-fatal — reconciliation can be viewed later via the batch id.
      }
    } catch (err) {
      toast.error({ title: 'Import failed', message: err.message || 'Unable to reach the server' })
    } finally {
      setBusy(false)
    }
  }

  const handleQuickFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setQuickCsvText(event.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  const downloadQuickSampleCSV = () => {
    const headers = quickImportFields.map((f) => f.header)
    const sampleRow = quickImportFields.map((f) => f.sample ?? '')
    const csv = [headers.join(','), sampleRow.map(toCSVValue).join(',')].join('\n')
    triggerDownload(csv, 'sample_customers.csv')
  }

  const runQuickImport = async () => {
    if (!quickCsvText.trim()) {
      toast.error({ title: 'Error', message: 'Please paste CSV data or upload a file' })
      return
    }
    setBusy(true)
    try {
      const rows = parseCSVText(quickCsvText, quickImportFields)
      if (rows.length === 0) {
        toast.error({ title: 'Error', message: 'No valid customers found in CSV' })
        return
      }
      const result = await onQuickImportRows(rows)
      setQuickResult(result)
      setStep(STEPS.DONE)
      const successCount = result?.successCount ?? rows.length
      const errorCount = result?.errorCount ?? 0
      if (successCount > 0) {
        toast.success({ title: 'Import complete', message: `${successCount} customer(s) imported${errorCount ? `, ${errorCount} failed` : ''}` })
      } else {
        toast.error({ title: 'Import failed', message: result?.errorMessage || 'No customers were imported' })
      }
    } catch (err) {
      toast.error({ title: 'Error', message: err.message || 'Failed to parse CSV' })
    } finally {
      setBusy(false)
    }
  }

  const handleExportCsv = async () => {
    if (disabled) return
    setExporting(true)
    try {
      const rows = await getExportRows()
      const headers = quickImportFields.map((f) => f.header)
      const lines = [headers.join(',')]
      for (const row of rows) {
        lines.push(quickImportFields.map((f) => toCSVValue(row[f.key])).join(','))
      }
      triggerDownload(lines.join('\n'), 'customers_export.csv')
      toast.success({ title: 'Exported', message: `${rows.length} customer(s) exported as CSV` })
    } catch (e) {
      toast.error({ title: 'Error', message: 'Failed to export CSV' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    if (disabled) return
    setExporting(true)
    try {
      const rows = await getExportRows()
      const headers = quickImportFields.map((f) => f.header)
      const aoa = [headers, ...rows.map((row) => quickImportFields.map((f) => row[f.key] ?? ''))]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), 'Customers')
      XLSX.writeFile(workbook, 'customers_export.xlsx')
      toast.success({ title: 'Exported', message: `${rows.length} customer(s) exported as Excel` })
    } catch (e) {
      toast.error({ title: 'Error', message: 'Failed to export Excel' })
    } finally {
      setExporting(false)
    }
  }

  const canValidate = !!parsed?.customers?.length
  const blockingErrorCount = (preview?.rowErrors || []).filter((e) => e.severity !== 'warning').length
  const warningCount = (preview?.rowErrors || []).filter((e) => e.severity === 'warning').length

  // TOTALS_FIELDS drives both the input row and the match table below —
  // one place to add a metric instead of two lists that can drift apart.
  const TOTALS_FIELDS = [
    { key: 'customers', label: 'Customers' },
    { key: 'cashCollected', label: 'Money Collected', money: true },
    { key: 'balanceDue', label: 'Money Owed', money: true },
    { key: 'credits', label: 'Credits', money: true },
    { key: 'sessionsRemaining', label: 'Lessons Remaining' },
  ]
  const overallTotals = preview?.totals?.overall || null
  const totalsEntered = TOTALS_FIELDS.every((f) => oldSystemTotals[f.key] !== '')
  const totalsMismatches = overallTotals
    ? TOTALS_FIELDS.filter((f) => {
        if (oldSystemTotals[f.key] === '') return false
        const entered = Number(oldSystemTotals[f.key])
        return !Number.isNaN(entered) && Math.abs(entered - overallTotals[f.key]) > 0.005
      })
    : []
  const totalsMatch = overallTotals && totalsEntered && totalsMismatches.length === 0
  // Rule 5, verbatim: "if a number does not match, we do not continue" — the
  // default is a hard block. The only way past a mismatch is an explicit,
  // typed acknowledgment, which lands in commitResult/ImportBatch for audit
  // (see the "why" note included in the commit call below), not a silent skip.
  const totalsGateBlocked =
    !!overallTotals && totalsEntered && !totalsMatch && mismatchOverrideReason.trim().length < 10

  // Phase 4 (test-10): when the file has fewer customers than the trial
  // target (10), the trial batch can end up covering everyone — "import the
  // rest" would otherwise call commit with an empty customers array, which
  // the backend correctly rejects (400: "must include a non-empty
  // customers array"). Compute the actual remainder once so the button can
  // reflect reality instead of erroring.
  const remainingCustomerKeys = (parsed?.customers || [])
    .map((c) => rowCustomerKey(c))
    .filter((id) => !trialSelectedIDs.includes(id))

  return (
    <>
      <div title={disabled ? disabledReason : undefined}>
        <Button
          variant="outline"
          className="h-9 px-3 rounded-lg text-sm font-medium gap-2"
          onClick={() => setOpen(true)}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Import / Export Customers
        </Button>
      </div>

      <Dialog open={open} onClose={close} maxWidth="4xl">
        <DialogContent onClose={close} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Customers
            </DialogTitle>
            <DialogDescription>
              Full migration — one file, one sheet, everything together — or a quick single-sheet CSV add.
            </DialogDescription>
          </DialogHeader>

          {step === STEPS.UPLOAD && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Button variant={mode === MODES.MIGRATION ? 'gradient' : 'outline'} size="sm" onClick={() => setMode(MODES.MIGRATION)}>
                  Migration Import (Customers + Enrollments)
                </Button>
                <Button variant={mode === MODES.QUICK ? 'gradient' : 'outline'} size="sm" onClick={() => setMode(MODES.QUICK)}>
                  Quick Add (CSV)
                </Button>
                <Button
                  variant={mode === MODES.EXPORT ? 'gradient' : 'outline'}
                  size="sm"
                  onClick={() => setMode(MODES.EXPORT)}
                  disabled={disabled}
                  title={disabled ? disabledReason : undefined}
                >
                  Export
                </Button>
              </div>

              {mode === MODES.EXPORT ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Export your current customer list (subject to your active filters/branch selection).
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportCsv} disabled={exporting} className="gap-2">
                      <Download className="h-4 w-4" />
                      {exporting ? 'Exporting...' : 'Export as CSV'}
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} disabled={exporting} className="gap-2">
                      <Download className="h-4 w-4" />
                      {exporting ? 'Exporting...' : 'Export as Excel'}
                    </Button>
                  </div>
                </div>
              ) : mode === MODES.MIGRATION ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload your file (CSV or Excel) — one sheet with everything: customers, packages, lessons, payments, memberships
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Whatever your old system exports is fine — the app maps the columns on the next screen. A customer's row and their package/lesson/payment rows can share one file; we match them by email/phone and Program Name, not an ID you have to invent.
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40 w-fit">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Choose File (.csv, .xlsx)</span>
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUniversalUpload} className="hidden" disabled={busy} />
                      </label>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadSampleXlsx()}>
                        <FileText className="h-4 w-4" />
                        Sample .xlsx
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadUniversalSampleCsv()}>
                        <FileText className="h-4 w-4" />
                        Sample .csv
                      </Button>
                    </div>
                    {parsed && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {parsed.customers.length} customer row(s), {parsed.enrollments.length} enrollment row(s)
                        {parsed.memberships?.length ? `, ${parsed.memberships.length} membership row(s)` : ''}
                        {parsed.lessons?.length ? `, ${parsed.lessons.length} lesson row(s)` : ''}
                        {parsed.payments?.length ? `, ${parsed.payments.length} payment row(s)` : ''} mapped
                      </p>
                    )}
                  </div>

                  {Object.entries(CSV_SHEETS).map(([which, { label, columns, sampleFile }]) => (
                    <div key={which}>
                      <label className="block text-sm font-medium mb-2">{label}</label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Kept separate — this is your shared booking catalog, not one row per customer. Skip it if your Services already exist in the app.
                      </p>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40 w-fit">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">Choose File</span>
                          <input type="file" accept=".csv" onChange={(e) => handleCsvUpload(which, e)} className="hidden" disabled={busy} />
                        </label>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadSampleCsv(columns, sampleFile)}>
                          <FileText className="h-4 w-4" />
                          Sample
                        </Button>
                      </div>
                      {parsed?.[which]?.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">{parsed[which].length} row(s)</p>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    For adding a few customers by hand — no Legacy ID, studio, enrollments, or consent flags required.
                    For bulk onboarding with packages/payments, use Migration Import instead.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Choose File</span>
                      <input type="file" accept=".csv,.txt" onChange={handleQuickFileUpload} className="hidden" />
                    </label>
                    <span className="text-sm text-muted-foreground">or paste CSV below</span>
                    <Button variant="outline" size="sm" onClick={downloadQuickSampleCSV} className="ml-auto flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Sample CSV
                    </Button>
                  </div>
                  <textarea
                    value={quickCsvText}
                    onChange={(e) => setQuickCsvText(e.target.value)}
                    placeholder="Paste CSV data here or upload a file..."
                    className="w-full h-56 px-3 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-info"
                  />
                  {quickCsvText && (
                    <div className="text-xs text-muted-foreground">
                      {Math.max(quickCsvText.trim().split(/\r?\n/).length - 1, 0)} row(s) detected (excluding header)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === STEPS.MAPPING && mappingReview && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium">
                  Map columns — {mappingReview.which === 'universal' ? 'Your file' : CSV_SHEETS[mappingReview.which]?.label}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {mappingReview.savedMappingFound
                    ? "We recognized these headers from a mapping you confirmed before — review and continue."
                    : "We guessed which column is which. Confirm or correct any that are wrong, then continue — we'll remember this for next time."}
                </p>
              </div>
              <div className="border border-border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Field</th>
                      <th className="text-left px-3 py-2">Source column</th>
                      <th className="text-left px-3 py-2">Sample value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingReview.columns.map(({ key, headers }) => {
                      const idx = mappingReview.mapping[key]
                      const sampleRow = mappingReview.rawRows[mappingReview.headerRowIndex + 1] || []
                      const sample = idx !== null && idx !== undefined ? sampleRow[idx] : ''
                      const confidence = mappingReview.suggestedMapping[key]?.confidence
                      return (
                        <tr key={key} className="border-t border-border">
                          <td className="px-3 py-1.5 font-medium">{headers[0] || key}</td>
                          <td className="px-3 py-1.5">
                            <select
                              className="w-full bg-transparent border border-border rounded px-1.5 py-0.5 text-foreground"
                              value={idx === null || idx === undefined ? '' : idx}
                              onChange={(e) =>
                                setMappingReview((prev) => ({
                                  ...prev,
                                  mapping: { ...prev.mapping, [key]: e.target.value === '' ? null : Number(e.target.value) },
                                }))
                              }
                            >
                              {/* Native <option> popups ignore the page's dark theme in most
                                  browsers, so color/background are set explicitly here rather
                                  than inherited — otherwise the list renders near-invisible
                                  light-gray-on-white. */}
                              <option value="" className="bg-white text-gray-900">— not in this file —</option>
                              {mappingReview.headerRow.map((h, i) => (
                                <option key={i} value={i} className="bg-white text-gray-900">{h}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[160px]" title={sample}>
                            {sample || '—'}
                            {idx !== null && idx !== undefined && confidence !== undefined && confidence < MAPPING_CONFIDENT_THRESHOLD && (
                              <span className="text-warning ml-1" title="Low-confidence guess — please check this one">⚠️</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Fields left as "not in this file" import blank — fine for optional fields, but a required field left blank will show up as a row error on the Validate screen.
              </p>
            </div>
          )}

          {step === STEPS.PREVIEW && preview && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="New customers" value={preview.customersCreated} />
                <Stat label="Matched existing" value={preview.customersMatched} />
                <Stat label="Enrollments to create" value={preview.enrollmentsCreated} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="New packages" value={preview.packagesCreated} />
                <Stat label="New services" value={preview.servicesCreated} />
                <Stat label="Rows with errors" value={blockingErrorCount} warn={blockingErrorCount > 0} />
              </div>
              {(parsed?.services?.length > 0 || parsed?.memberships?.length > 0 || parsed?.lessons?.length > 0 || parsed?.payments?.length > 0) && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Service rows" value={parsed?.services?.length || 0} />
                  <Stat label="Membership rows" value={parsed?.memberships?.length || 0} />
                  <Stat label="Lesson + Payment rows" value={(parsed?.lessons?.length || 0) + (parsed?.payments?.length || 0)} />
                </div>
              )}
              {warningCount > 0 && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Data mismatch warnings" value={warningCount} warn />
                </div>
              )}

              {(preview.rowErrors || []).length > 0 && (
                <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">Sheet</th>
                        <th className="text-left px-3 py-2">Row</th>
                        <th className="text-left px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rowErrors.map((err, i) => (
                        <tr key={i} className={`border-t border-border ${err.severity === 'warning' ? 'text-warning' : ''}`}>
                          <td className="px-3 py-1.5 capitalize">{err.sheet}</td>
                          <td className="px-3 py-1.5">{err.rowIndex + 2}</td>
                          <td className="px-3 py-1.5">{err.severity === 'warning' ? '⚠️ ' : ''}{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Rows with errors are skipped automatically — only valid rows will be imported. Warnings (⚠️) don't block import.
              </p>

              <div className="border border-border rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={trialMode} onChange={(e) => setTrialMode(e.target.checked)} />
                  Test on 10 first
                </label>
                <p className="text-xs text-muted-foreground">
                  Import a small batch, open every profile, and check the numbers by hand before importing everyone. We picked customers covering a couple, a payment plan, a refund, a free package, and someone inactive where the file has them.
                </p>
                {trialMode && (
                  <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {(parsed?.customers || []).map((c, i) => {
                          const key = rowCustomerKey(c)
                          return (
                            <tr key={key || i} className="border-t border-border first:border-t-0">
                              <td className="px-3 py-1">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={trialSelectedIDs.includes(key)}
                                    onChange={(e) =>
                                      setTrialSelectedIDs((prev) =>
                                        e.target.checked
                                          ? [...prev, key]
                                          : prev.filter((id) => id !== key),
                                      )
                                    }
                                  />
                                  <span>{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.phone}</span>
                                  <span className="text-muted-foreground">({c.email || c.phone})</span>
                                </label>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {trialMode && (
                  <p className="text-xs text-muted-foreground">{trialSelectedIDs.length} selected for the test batch.</p>
                )}
              </div>

              {overallTotals && (
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">Check — compare against the old system</h4>
                    <p className="text-xs text-muted-foreground">
                      Type in what the old CRM reports for these five numbers. If anything doesn't match, we don't continue — that one check catches almost every possible mistake.
                    </p>
                  </div>
                  <div className="border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-2">Metric</th>
                          <th className="text-right px-3 py-2">This import</th>
                          <th className="text-right px-3 py-2">Old system says</th>
                          <th className="text-center px-3 py-2">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TOTALS_FIELDS.map((f) => {
                          const entered = oldSystemTotals[f.key]
                          const isMismatch = totalsMismatches.some((m) => m.key === f.key)
                          return (
                            <tr key={f.key} className="border-t border-border">
                              <td className="px-3 py-1.5">{f.label}</td>
                              <td className="px-3 py-1.5 text-right">{f.money ? `$${overallTotals[f.key].toFixed(2)}` : overallTotals[f.key]}</td>
                              <td className="px-3 py-1.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-28 text-right bg-transparent border border-border rounded px-1.5 py-0.5"
                                  value={entered}
                                  onChange={(e) => setOldSystemTotals((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  placeholder={f.money ? '0.00' : '0'}
                                />
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {entered === '' ? '—' : isMismatch ? '❌' : '✅'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalsEntered && totalsMismatches.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-danger font-medium">
                        {totalsMismatches.length} number{totalsMismatches.length > 1 ? 's' : ''} don't match. Fix the rows above, or type a reason to override (audited):
                      </p>
                      <input
                        type="text"
                        className="w-full text-xs bg-transparent border border-border rounded px-2 py-1"
                        value={mismatchOverrideReason}
                        onChange={(e) => setMismatchOverrideReason(e.target.value)}
                        placeholder="Why are you continuing despite the mismatch? (min 10 characters)"
                      />
                    </div>
                  )}
                  {totalsEntered && totalsMatch && (
                    <p className="text-xs text-success">✅ All totals match — safe to import.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === STEPS.TRIAL_REVIEW && trialResult && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Test batch imported — open each profile and check every number by hand
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="New customers" value={trialResult.customersCreated} />
                <Stat label="Matched existing" value={trialResult.customersMatched} />
                <Stat label="Enrollments created" value={trialResult.enrollmentsCreated} />
              </div>
              {(trialResult.rowErrors || []).length > 0 && (
                <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">Sheet</th>
                        <th className="text-left px-3 py-2">Row</th>
                        <th className="text-left px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialResult.rowErrors.map((err, i) => (
                        <tr key={i} className={`border-t border-border ${err.severity === 'warning' ? 'text-warning' : ''}`}>
                          <td className="px-3 py-1.5 capitalize">{err.sheet}</td>
                          <td className="px-3 py-1.5">{err.rowIndex + 2}</td>
                          <td className="px-3 py-1.5">{err.severity === 'warning' ? '⚠️ ' : ''}{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium mb-2">Open each profile and verify</h4>
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {(trialResult.customersDetail || []).map((c) => (
                    // legacyCustomerID (the auto-computed email/phone key),
                    // not customerID — a merged couple shares one customerID
                    // (two rows, one account), so customerID alone isn't a
                    // unique React key here.
                    <a
                      key={c.legacyCustomerID}
                      href={`/settings/users-roles/customers/${c.customerID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/40"
                    >
                      <span>{c.name || c.legacyCustomerID}</span>
                      <span className="text-muted-foreground">{c.legacyCustomerID} — open profile ↗</span>
                    </a>
                  ))}
                  {!trialResult.customersDetail?.length && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No customers were created in the test batch — check the row errors above.</p>
                  )}
                </div>
              </div>
              {remainingCustomerKeys.length === 0 ? (
                <p className="text-xs text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  This file only has {trialResult.customersDetail?.length ?? 0} customer(s) — the test batch already covered everyone. Nothing left to import.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  If anything looks wrong, close this and fix the source file — the test batch stays in place and re-uploading the same file won't duplicate it. Only continue to "import the rest" once all 10 are perfect.
                </p>
              )}
            </div>
          )}

          {step === STEPS.DONE && commitResult && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Import completed
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="New customers" value={commitResult.customersCreated} />
                <Stat label="Matched existing" value={commitResult.customersMatched} />
                <Stat label="Enrollments created" value={commitResult.enrollmentsCreated} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Enrollments skipped (already imported)" value={commitResult.enrollmentsSkipped} />
                <Stat label="New packages" value={commitResult.packagesCreated} />
                <Stat label="New services" value={commitResult.servicesCreated} />
              </div>
              {(commitResult.membershipsCreated > 0 || commitResult.catalogServicesCreated > 0) && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Catalog services created" value={commitResult.catalogServicesCreated} />
                  <Stat label="Memberships created" value={commitResult.membershipsCreated} />
                </div>
              )}
              {(commitResult.walletCreditsCreated > 0 || commitResult.walletCreditsSkipped > 0) && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Wallet balances credited" value={commitResult.walletCreditsCreated} />
                  <Stat label="Wallet credits skipped (already imported)" value={commitResult.walletCreditsSkipped} />
                </div>
              )}

              {reconcile && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Reconciliation — CRM totals vs. spreadsheet totals</h4>
                  <div className="border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-2">Studio</th>
                          <th className="text-right px-3 py-2">Sessions Remaining</th>
                          <th className="text-right px-3 py-2">Contracted Value</th>
                          <th className="text-right px-3 py-2">Cash Collected</th>
                          <th className="text-right px-3 py-2">Balance Due</th>
                          <th className="text-center px-3 py-2">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reconcile.crmTotals || []).map((crm, i) => {
                          const sheet = (reconcile.sheetTotals || []).find((s) => s.locationName === crm.locationName)
                          const isMatch =
                            sheet &&
                            crm.sessionsRemaining === sheet.sessionsRemaining &&
                            crm.contractedValue === sheet.contractedValue &&
                            crm.cashCollected === sheet.cashCollected &&
                            crm.balanceDue === sheet.balanceDue
                          return (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-1.5">{crm.locationName}</td>
                              <td className="px-3 py-1.5 text-right">{crm.sessionsRemaining}</td>
                              <td className="px-3 py-1.5 text-right">${crm.contractedValue.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-right">${crm.cashCollected.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-right">${crm.balanceDue.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-center">{isMatch ? '✅' : '❌'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === STEPS.DONE && quickResult && !commitResult && (
            <div className="space-y-2 py-4">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                {quickResult.successCount ?? 0} customer(s) imported
                {quickResult.errorCount ? `, ${quickResult.errorCount} failed` : ''}
              </div>
              {quickResult.errorMessage && (
                <p className="text-xs text-muted-foreground">First error: {quickResult.errorMessage}</p>
              )}
            </div>
          )}

          <DialogFooter>
            {step === STEPS.UPLOAD && mode === MODES.MIGRATION && (
              <>
                <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
                <Button onClick={runValidate} disabled={busy || !canValidate} variant="gradient">
                  {busy ? 'Parsing...' : 'Validate'}
                </Button>
              </>
            )}
            {step === STEPS.MAPPING && (
              <>
                <Button variant="outline" onClick={() => { setMappingReview(null); setStep(STEPS.UPLOAD) }} disabled={busy}>Cancel</Button>
                <Button variant="outline" onClick={() => confirmMapping(false)} disabled={busy}>Use once</Button>
                <Button onClick={() => confirmMapping(true)} disabled={busy} variant="gradient">
                  Confirm &amp; remember for next time
                </Button>
              </>
            )}
            {step === STEPS.UPLOAD && mode === MODES.QUICK && (
              <>
                <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
                <Button onClick={runQuickImport} disabled={busy || !quickCsvText.trim()} variant="gradient">
                  {busy ? 'Importing...' : 'Import'}
                </Button>
              </>
            )}
            {step === STEPS.UPLOAD && mode === MODES.EXPORT && (
              <Button variant="outline" onClick={close}>Close</Button>
            )}
            {step === STEPS.PREVIEW && (
              <>
                <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)} disabled={busy}>Back</Button>
                {trialMode ? (
                  <Button onClick={() => runCommit(trialSelectedIDs)} disabled={busy || !trialSelectedIDs.length} variant="gradient">
                    {busy ? 'Importing...' : `Import test batch (${trialSelectedIDs.length})`}
                  </Button>
                ) : (
                  <Button
                    onClick={() => runCommit(null)}
                    disabled={busy || totalsGateBlocked}
                    variant="gradient"
                    title={totalsGateBlocked ? "Totals don't match the old system — fix the mismatch or type an override reason above" : undefined}
                  >
                    {busy ? 'Importing...' : 'Import'}
                  </Button>
                )}
              </>
            )}
            {step === STEPS.TRIAL_REVIEW && (
              <>
                <Button variant="outline" onClick={close} disabled={busy}>
                  {remainingCustomerKeys.length === 0 ? 'Done' : 'Close (review later)'}
                </Button>
                {remainingCustomerKeys.length > 0 && (
                  <Button
                    onClick={() => runCommit(remainingCustomerKeys)}
                    disabled={busy || totalsGateBlocked}
                    variant="gradient"
                    title={totalsGateBlocked ? "Totals don't match the old system — fix the mismatch or type an override reason above" : undefined}
                  >
                    {busy ? 'Importing...' : `All 10 look good — import the remaining ${remainingCustomerKeys.length}`}
                  </Button>
                )}
              </>
            )}
            {step === STEPS.DONE && (
              <Button onClick={close} variant="gradient">Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Stat({ label, value, warn }) {
  return (
    <div className={`border rounded-lg p-3 ${warn && value > 0 ? 'border-warning bg-warning/10' : 'border-border'}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
