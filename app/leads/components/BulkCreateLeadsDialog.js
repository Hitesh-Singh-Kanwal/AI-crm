'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, X, FileText, Download } from 'lucide-react'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'

export default function BulkCreateLeadsDialog({ open, onClose, onRefresh }) {
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvText(event.target.result)
    }
    reader.readAsText(file)
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['name', 'email', 'phonenumber', 'location']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
    }

    const leads = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has incorrect number of columns`)
      }

      const lead = {}
      headers.forEach((header, index) => {
        const value = values[index]
        if (header === 'name') lead.name = value
        else if (header === 'email') lead.email = value
        else if (header === 'phonenumber' || header === 'phone') lead.phoneNumber = value
        else if (header === 'location') lead.location = value
        else if (header === 'stage') lead.stage = value || 'new'
        else if (header === 'bookingstatus' || header === 'booking status') lead.bookingStatus = value || 'Not Booked'
        else if (header === 'assignedhumanagent' || header === 'assigned human agent') lead.assignedHumanAgent = value || ''
        else if (header === 'assignedaiagent' || header === 'assigned ai agent') lead.assignedAiAgent = value || ''
        else if (header === 'isescalated' || header === 'is escalated') lead.isEscalated = value?.toLowerCase() === 'true'
      })

      if (!lead.name || !lead.email || !lead.phoneNumber || !lead.location) {
        throw new Error(`Row ${i + 1} is missing required fields`)
      }

      leads.push(lead)
    }

    return leads
  }

  const handleBulkCreate = async () => {
    if (!csvText.trim()) {
      toast.error({ title: 'Error', message: 'Please paste CSV data or upload a file' })
      return
    }

    setLoading(true)
    try {
      const leads = parseCSV(csvText)
      
      if (leads.length === 0) {
        toast.error({ title: 'Error', message: 'No valid leads found in CSV' })
        setLoading(false)
        return
      }

      const result = await api.post('/api/lead/bulk', leads)
      
      if (result.success) {
        toast.success({ 
          title: 'Success', 
          message: `${result.data?.length || leads.length} lead(s) created successfully` 
        })
        setCsvText('')
        onRefresh && onRefresh()
        onClose()
      } else {
        toast.error({ title: 'Error', message: result.error || 'Failed to create leads' })
      }
    } catch (error) {
      console.error('Bulk create error:', error)
      toast.error({ 
        title: 'Error', 
        message: error.message || 'Failed to parse CSV or create leads' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCsvText('')
    onClose()
  }

  const downloadSampleCSV = () => {
    const sampleCSV = `name,email,phonenumber,location,stage,bookingstatus,assignedhumanagent,assignedaiagent,isescalated
John Doe,john.doe@example.com,+1234567890,New York,new,Not Booked,agent1@studio.com,ai-agent-001,false
Jane Smith,jane.smith@example.com,+1987654321,Los Angeles,engaged,Not Booked,agent2@studio.com,ai-agent-002,false
Bob Johnson,bob.johnson@example.com,+1555555555,Chicago,qualified,Booked,agent1@studio.com,,true
Alice Williams,alice.williams@example.com,+1444444444,Miami,bookingInProgress,Not Booked,,ai-agent-003,false
Charlie Brown,charlie.brown@example.com,+1333333333,Seattle,cold,Not Booked,agent3@studio.com,ai-agent-001,false`

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'sample_leads.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="3xl">
      <DialogContent onClose={handleClose} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Create Leads
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to create multiple leads at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-2">CSV Format</label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono">
              <div className="text-slate-600 mb-2">Required columns: name, email, phonenumber, location</div>
              <div className="text-slate-500">Optional columns: stage, bookingstatus, assignedhumanagent, assignedaiagent, isescalated</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Example CSV</label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
{`name,email,phonenumber,location,stage,bookingstatus
John Doe,john@example.com,+1234567890,New York,new,Not Booked
Jane Smith,jane@example.com,+1987654321,Los Angeles,engaged,Booked`}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Upload CSV File
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Choose File</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-muted-foreground">or paste CSV below</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">CSV Data</label>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCSV}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Sample CSV</span>
              </Button>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV data here or upload a file..."
              className="w-full h-64 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {csvText && (
              <div className="mt-2 text-xs text-muted-foreground">
                {csvText.split('\n').length - 1} row(s) detected (excluding header)
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleBulkCreate} disabled={loading || !csvText.trim()} variant="gradient">
            {loading ? 'Creating...' : `Create ${csvText ? csvText.split('\n').length - 1 : 0} Lead(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
