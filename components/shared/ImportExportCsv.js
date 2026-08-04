'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, Download, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function toCSVValue(value) {
  const str = value === undefined || value === null ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function parseCSVLine(line) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      result.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result.map((v) => v.trim())
}

function triggerDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generic Import/Export CSV control.
 * `fields`: [{ key, header, sample }] — defines the fixed CSV column set for the entity.
 */
export default function ImportExportCsv({
  entityLabel,
  fields,
  getExportRows,
  onImportRows,
  disabled,
  disabledReason,
}) {
  const [importOpen, setImportOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const headers = fields.map((f) => f.header)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setCsvText(event.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  const downloadSampleCSV = () => {
    const sampleRow = fields.map((f) => f.sample ?? '')
    const csv = [headers.join(','), sampleRow.map(toCSVValue).join(',')].join('\n')
    triggerDownload(csv, `sample_${entityLabel.toLowerCase()}s.csv`)
  }

  const handleExport = async () => {
    if (disabled) return
    setExporting(true)
    try {
      const rows = await getExportRows()
      const lines = [headers.join(',')]
      for (const row of rows) {
        lines.push(fields.map((f) => toCSVValue(row[f.key])).join(','))
      }
      triggerDownload(lines.join('\n'), `${entityLabel.toLowerCase()}s_export.csv`)
      toast.success({ title: 'Exported', message: `${rows.length} ${entityLabel.toLowerCase()}(s) exported` })
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Failed to export CSV' })
    } finally {
      setExporting(false)
    }
  }

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0)
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }
    const fileHeaders = parseCSVLine(lines[0]).map(normalizeHeader)

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row = {}
      fields.forEach((f) => {
        const idx = fileHeaders.indexOf(normalizeHeader(f.header))
        row[f.key] = values[idx] !== undefined ? values[idx] : ''
      })
      rows.push(row)
    }
    return rows
  }

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error({ title: 'Error', message: 'Please paste CSV data or upload a file' })
      return
    }
    setImporting(true)
    try {
      const rows = parseCSV(csvText)
      if (rows.length === 0) {
        toast.error({ title: 'Error', message: `No valid ${entityLabel.toLowerCase()}s found in CSV` })
        return
      }
      const result = await onImportRows(rows)
      const successCount = result?.successCount ?? rows.length
      const errorCount = result?.errorCount ?? 0
      if (successCount > 0) {
        toast.success({
          title: 'Import complete',
          message: `${successCount} ${entityLabel.toLowerCase()}(s) imported${errorCount ? `, ${errorCount} failed` : ''}`,
        })
        setCsvText('')
        setImportOpen(false)
      } else {
        toast.error({
          title: 'Import failed',
          message: result?.errorMessage || `No ${entityLabel.toLowerCase()}s were imported`,
        })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: e.message || 'Failed to parse CSV' })
    } finally {
      setImporting(false)
    }
  }

  const closeImport = () => {
    if (importing) return
    setCsvText('')
    setImportOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-2" title={disabled ? disabledReason : undefined}>
        <Button
          variant="outline"
          className="h-9 px-3 rounded-lg text-sm font-medium gap-2"
          onClick={() => setImportOpen(true)}
          disabled={disabled}
        >
          <Download className="h-4 w-4" />
          Import CSV
        </Button>
        <Button
          variant="outline"
          className="h-9 px-3 rounded-lg text-sm font-medium gap-2"
          onClick={handleExport}
          disabled={disabled || exporting}
        >
          <Upload className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      <Dialog open={importOpen} onClose={closeImport} maxWidth="3xl">
        <DialogContent onClose={closeImport} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import {entityLabel}s
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file or paste CSV data to import {entityLabel.toLowerCase()}s
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">CSV Format</label>
              <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs font-mono">
                <div className="text-muted-foreground">Columns: {headers.join(', ')}</div>
              </div>
            </div>

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
                <Button variant="outline" size="sm" onClick={downloadSampleCSV} className="flex items-center gap-2">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeImport} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing || !csvText.trim()} variant="gradient">
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
