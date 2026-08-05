'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { toCSVValue, triggerDownload, parseCSVText } from '@/lib/csv-utils'
import { parseXlsxRows, downloadXlsxSample, downloadXlsxExport } from '@/lib/xlsx-utils'

const MODES = { IMPORT: 'import', EXPORT: 'export' }
const FORMATS = { CSV: 'csv', EXCEL: 'excel' }

/**
 * Generic Import/Export control — a single button opening a dialog with
 * Import and Export tabs, each supporting CSV and Excel.
 * `fields`: [{ key, header, sample }] — defines the fixed column set for the entity.
 */
export default function ImportExportCsv({
  entityLabel,
  fields,
  getExportRows,
  onImportRows,
  disabled,
  disabledReason,
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(MODES.IMPORT)
  const [format, setFormat] = useState(FORMATS.CSV)
  const [csvText, setCsvText] = useState('')
  const [excelRows, setExcelRows] = useState(null) // parsed rows from an uploaded .xlsx
  const [excelFileName, setExcelFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const headers = fields.map((f) => f.header)
  const entityLower = entityLabel.toLowerCase()

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setCsvText(event.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const rows = await parseXlsxRows(file, fields)
      setExcelRows(rows)
      setExcelFileName(file.name)
      toast.success({ title: 'File parsed', message: `${rows.length} row(s) detected` })
    } catch (err) {
      setExcelRows(null)
      setExcelFileName('')
      toast.error({ title: 'Could not parse workbook', message: err.message })
    }
  }

  const downloadSample = () => {
    if (format === FORMATS.EXCEL) {
      downloadXlsxSample(fields, `sample_${entityLower}s.xlsx`, `${entityLabel}s`)
      return
    }
    const sampleRow = fields.map((f) => f.sample ?? '')
    const csv = [headers.join(','), sampleRow.map(toCSVValue).join(',')].join('\n')
    triggerDownload(csv, `sample_${entityLower}s.csv`)
  }

  const handleExport = async (exportFormat) => {
    if (disabled) return
    setExporting(true)
    try {
      const rows = await getExportRows()
      if (exportFormat === FORMATS.EXCEL) {
        downloadXlsxExport(fields, rows, `${entityLower}s_export.xlsx`, `${entityLabel}s`)
      } else {
        const lines = [headers.join(',')]
        for (const row of rows) {
          lines.push(fields.map((f) => toCSVValue(row[f.key])).join(','))
        }
        triggerDownload(lines.join('\n'), `${entityLower}s_export.csv`)
      }
      toast.success({ title: 'Exported', message: `${rows.length} ${entityLower}(s) exported` })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: `Failed to export ${exportFormat === FORMATS.EXCEL ? 'Excel' : 'CSV'}` })
    } finally {
      setExporting(false)
    }
  }

  const parseCSV = (text) => parseCSVText(text, fields)

  const handleImport = async () => {
    let rows
    try {
      if (format === FORMATS.EXCEL) {
        if (!excelRows) {
          toast.error({ title: 'Error', message: 'Please upload an Excel file' })
          return
        }
        rows = excelRows
      } else {
        if (!csvText.trim()) {
          toast.error({ title: 'Error', message: 'Please paste CSV data or upload a file' })
          return
        }
        rows = parseCSV(csvText)
      }
    } catch (e) {
      toast.error({ title: 'Error', message: e.message || 'Failed to parse file' })
      return
    }

    if (rows.length === 0) {
      toast.error({ title: 'Error', message: `No valid ${entityLower}s found` })
      return
    }

    setImporting(true)
    try {
      const result = await onImportRows(rows)
      const successCount = result?.successCount ?? rows.length
      const errorCount = result?.errorCount ?? 0
      if (successCount > 0) {
        toast.success({
          title: 'Import complete',
          message: `${successCount} ${entityLower}(s) imported${errorCount ? `, ${errorCount} failed` : ''}`,
        })
        close()
      } else {
        toast.error({
          title: 'Import failed',
          message: result?.errorMessage || `No ${entityLower}s were imported`,
        })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: e.message || 'Failed to import' })
    } finally {
      setImporting(false)
    }
  }

  const close = () => {
    if (importing) return
    setOpen(false)
    setMode(MODES.IMPORT)
    setFormat(FORMATS.CSV)
    setCsvText('')
    setExcelRows(null)
    setExcelFileName('')
  }

  const canImport = format === FORMATS.EXCEL ? !!excelRows?.length : !!csvText.trim()

  return (
    <>
      <div title={disabled ? disabledReason : undefined}>
        <Button
          variant="outline"
          className="h-9 px-3 rounded-lg text-sm font-medium gap-2"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Import / Export {entityLabel}s
        </Button>
      </div>

      <Dialog open={open} onClose={close} maxWidth="3xl">
        <DialogContent onClose={close} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import / Export {entityLabel}s
            </DialogTitle>
            <DialogDescription>
              Import {entityLower}s from a CSV or Excel file, or export your current list.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b border-border pb-3 pt-1">
            <Button variant={mode === MODES.IMPORT ? 'gradient' : 'outline'} size="sm" onClick={() => setMode(MODES.IMPORT)}>
              Import
            </Button>
            <Button variant={mode === MODES.EXPORT ? 'gradient' : 'outline'} size="sm" onClick={() => setMode(MODES.EXPORT)}>
              Export
            </Button>
          </div>

          {mode === MODES.IMPORT ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Button variant={format === FORMATS.CSV ? 'gradient' : 'outline'} size="sm" onClick={() => setFormat(FORMATS.CSV)}>
                  CSV
                </Button>
                <Button variant={format === FORMATS.EXCEL ? 'gradient' : 'outline'} size="sm" onClick={() => setFormat(FORMATS.EXCEL)}>
                  Excel (.xlsx)
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Format</label>
                <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs font-mono">
                  <div className="text-muted-foreground">Columns: {headers.join(', ')}</div>
                </div>
              </div>

              {format === FORMATS.EXCEL ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Upload Excel File</label>
                    <Button variant="outline" size="sm" onClick={downloadSample} className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Download Sample</span>
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40 w-fit">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choose .xlsx File</span>
                    <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                  </label>
                  {excelFileName && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {excelFileName} — {excelRows?.length ?? 0} row(s) detected
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload CSV File</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted/40">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Choose File</span>
                        <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                      </label>
                      <span className="text-sm text-muted-foreground">or paste CSV below</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">CSV Data</label>
                      <Button variant="outline" size="sm" onClick={downloadSample} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Download Sample CSV</span>
                      </Button>
                    </div>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="Paste CSV data here or upload a file..."
                      className="w-full h-64 px-3 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-info"
                    />
                    {csvText && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {Math.max(csvText.trim().split(/\r?\n/).length - 1, 0)} row(s) detected (excluding header)
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <p className="text-xs text-muted-foreground">
                Export your current {entityLower} list (subject to your active filters/branch selection).
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleExport(FORMATS.CSV)} disabled={disabled || exporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Export as CSV'}
                </Button>
                <Button variant="outline" onClick={() => handleExport(FORMATS.EXCEL)} disabled={disabled || exporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Export as Excel'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {mode === MODES.IMPORT ? (
              <>
                <Button variant="outline" onClick={close} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing || !canImport} variant="gradient">
                  {importing ? 'Importing...' : 'Import'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={close}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
