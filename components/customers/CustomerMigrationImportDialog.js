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
  CUSTOMER_COLUMNS,
  ENROLLMENT_COLUMNS,
  parseCsvFile,
  parseXlsxFile,
  preflightCheck,
  computeSheetTotals,
  downloadSampleCsv,
  downloadSampleXlsx,
} from '@/lib/customer-migration-import'

const STEPS = { UPLOAD: 'upload', PREVIEW: 'preview', DONE: 'done' }
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
  const [format, setFormat] = useState('excel') // 'excel' | 'csv'
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [parsed, setParsed] = useState(null) // { customers, enrollments, fileNames }
  const [preview, setPreview] = useState(null) // validate() result
  const [commitResult, setCommitResult] = useState(null)
  const [reconcile, setReconcile] = useState(null)
  const [quickCsvText, setQuickCsvText] = useState('')
  const [quickResult, setQuickResult] = useState(null)
  const toast = useToast()

  const reset = () => {
    setMode(MODES.MIGRATION)
    setFormat('excel')
    setStep(STEPS.UPLOAD)
    setBusy(false)
    setParsed(null)
    setPreview(null)
    setCommitResult(null)
    setReconcile(null)
    setQuickCsvText('')
    setQuickResult(null)
  }

  const close = () => {
    if (busy) return
    setOpen(false)
    reset()
  }

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { customers, enrollments } = await parseXlsxFile(file)
      setParsed({ customers, enrollments, fileNames: [file.name] })
      toast.success({ title: 'File parsed', message: `${customers.length} customer row(s), ${enrollments.length} enrollment row(s)` })
    } catch (err) {
      toast.error({ title: 'Could not parse workbook', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const handleCsvUpload = async (which, e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const columns = which === 'customers' ? CUSTOMER_COLUMNS : ENROLLMENT_COLUMNS
      const rows = await parseCsvFile(file, columns)
      setParsed((prev) => {
        const next = { customers: prev?.customers || [], enrollments: prev?.enrollments || [], fileNames: prev?.fileNames || [] }
        next[which] = rows
        next.fileNames = [...next.fileNames.filter((n) => !n.startsWith(`${which}:`)), `${which}:${file.name}`]
        return next
      })
      toast.success({ title: `${which === 'customers' ? 'Customers' : 'Enrollments'} CSV parsed`, message: `${rows.length} row(s)` })
    } catch (err) {
      toast.error({ title: 'Could not parse CSV', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const runValidate = async () => {
    if (!parsed?.customers?.length) {
      toast.error({ title: 'Nothing to validate', message: 'Upload the Customers data first' })
      return
    }
    const preflightErrors = preflightCheck(parsed.customers, parsed.enrollments || [])
    setBusy(true)
    try {
      const res = await api.post('/api/customer/import/validate', {
        customers: parsed.customers,
        enrollments: parsed.enrollments || [],
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
      setStep(STEPS.PREVIEW)
    } catch (err) {
      toast.error({ title: 'Validation failed', message: err.message || 'Unable to reach the server' })
    } finally {
      setBusy(false)
    }
  }

  const runCommit = async () => {
    setBusy(true)
    try {
      // Reconciliation must compare against rows that will actually import —
      // a row already flagged invalid in the preview (e.g. Balance Due doesn't
      // reconcile) never gets created, so including its numbers on the
      // "sheet total" side would always mismatch the real CRM total.
      const invalidEnrollmentRows = new Set(
        (preview?.rowErrors || []).filter((e) => e.sheet === 'enrollments').map((e) => e.rowIndex),
      )
      const enrollmentsForTotals = (parsed.enrollments || []).filter((_, i) => !invalidEnrollmentRows.has(i))
      const sheetTotals = computeSheetTotals(enrollmentsForTotals, parsed.customers || [])
      const res = await api.post('/api/customer/import/commit', {
        customers: parsed.customers,
        enrollments: parsed.enrollments || [],
        sourceFileNames: parsed.fileNames,
        sheetTotals,
      })
      if (!res.success) {
        toast.error({ title: 'Import failed', message: res.error || 'Unable to reach the server' })
        return
      }
      const result = res.data
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
  const blockingErrorCount = preview?.rowErrors?.length || 0

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
              Full migration (Customers + Enrollments, CSV or Excel) or a quick single-sheet CSV add.
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
                  <div className="flex items-center gap-2">
                    <Button variant={format === 'excel' ? 'gradient' : 'outline'} size="sm" onClick={() => { setFormat('excel'); setParsed(null) }}>
                      Excel (.xlsx)
                    </Button>
                    <Button variant={format === 'csv' ? 'gradient' : 'outline'} size="sm" onClick={() => { setFormat('csv'); setParsed(null) }}>
                      CSV (two files)
                    </Button>
                  </div>

                  {format === 'excel' ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Workbook with "Customers" and "Enrollments" sheets
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40 w-fit">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">Choose .xlsx File</span>
                          <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" disabled={busy} />
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => downloadSampleXlsx()}
                        >
                          <FileText className="h-4 w-4" />
                          Sample
                        </Button>
                      </div>
                      {parsed && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {parsed.customers.length} customer row(s), {parsed.enrollments.length} enrollment row(s) detected
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
      <div>
                        <label className="block text-sm font-medium mb-2">Customers CSV</label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40 w-fit">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">Choose File</span>
                            <input type="file" accept=".csv" onChange={(e) => handleCsvUpload('customers', e)} className="hidden" disabled={busy} />
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => downloadSampleCsv(CUSTOMER_COLUMNS, 'sample_customers.csv')}
                          >
                            <FileText className="h-4 w-4" />
                            Sample
                          </Button>
                        </div>
                        {parsed?.customers?.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">{parsed.customers.length} row(s)</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Enrollments CSV</label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40 w-fit">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">Choose File</span>
                            <input type="file" accept=".csv" onChange={(e) => handleCsvUpload('enrollments', e)} className="hidden" disabled={busy} />
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => downloadSampleCsv(ENROLLMENT_COLUMNS, 'sample_enrollments.csv')}
                          >
                            <FileText className="h-4 w-4" />
                            Sample
                          </Button>
                        </div>
                        {parsed?.enrollments?.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">{parsed.enrollments.length} row(s)</p>
                        )}
                      </div>
                    </div>
                  )}
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

              {blockingErrorCount > 0 && (
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
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 capitalize">{err.sheet}</td>
                          <td className="px-3 py-1.5">{err.rowIndex + 2}</td>
                          <td className="px-3 py-1.5">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Rows with errors are skipped automatically — only valid rows will be imported.
              </p>
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
                <Button onClick={runCommit} disabled={busy} variant="gradient">
                  {busy ? 'Importing...' : 'Import'}
                </Button>
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
