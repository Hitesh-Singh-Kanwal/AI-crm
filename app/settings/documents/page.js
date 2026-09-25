'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, MoreHorizontal, RefreshCw, Archive, Trash2, Download } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { hasPermission } from '@/lib/permissions'
import { useToast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'
import AgreementTemplateBuilder from '@/components/documents/AgreementTemplateBuilder'
import AgreementSettingsPanel from '@/components/documents/AgreementSettingsPanel'

const DOCUMENT_TYPES = [
  { value: 'waiver', label: 'Participation Waiver' },
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'payment_authorization', label: 'Payment Authorization' },
]

const EMPTY_FORM = { name: '', type: 'waiver', effectiveDate: '', file: null }

function UploadDialog({ open, onClose, onSaved, replaceTarget, templatedTypes }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()
  const isReplace = Boolean(replaceTarget)

  useEffect(() => {
    if (open) {
      setForm(replaceTarget
        ? { name: replaceTarget.name, type: replaceTarget.type, effectiveDate: '', file: null }
        : EMPTY_FORM)
      setError(null)
    }
  }, [open, replaceTarget])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required.')
    if (!form.file) return setError('A file is required.')

    setSaving(true)
    setError(null)

    const body = new FormData()
    body.append('name', form.name.trim())
    body.append('type', form.type)
    if (form.effectiveDate) body.append('effectiveDate', form.effectiveDate)
    body.append('file', form.file)

    const path = isReplace ? `/api/document/${replaceTarget._id}/replace` : '/api/document'
    const result = await api.request(path, { method: 'POST', body })

    if (result.success) {
      toast.success(isReplace ? 'Document replaced.' : 'Document uploaded.')
      onSaved()
      onClose()
    } else {
      setError(result.error || 'Something went wrong.')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm">
      <DialogContent onClose={saving ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>{isReplace ? `Replace ${replaceTarget?.name}` : 'Upload Document'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">
              Name<span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. General Participation Waiver"
              className="h-9 text-[13px]"
            />
          </div>
          {!isReplace && (
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-muted-foreground">Document type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {templatedTypes?.has(form.type) && (
                <p className="text-[11px] text-warning">
                  A fill-in template is already active for this type (Enrollment Agreement Template tab) — it takes
                  priority, so this upload won't actually be sent. Retire the template first if you want to switch back
                  to a static PDF.
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">Effective date</label>
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-muted-foreground">
              File (PDF or Word)<span className="text-destructive ml-0.5">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              className="block w-full text-[13px]"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function DocumentLibraryPage() {
  const canWrite = hasPermission('settings', 'documents', 'write')
  const canDelete = hasPermission('settings', 'documents', 'delete')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('documents')
  const toast = useToast()

  const [templatedTypes, setTemplatedTypes] = useState(new Set())

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    const [docsResult, termsTemplate, paymentAuthTemplate] = await Promise.all([
      api.get('/api/document?status=active'),
      api.get('/api/agreement-template/active?type=terms'),
      api.get('/api/agreement-template/active?type=payment_authorization'),
    ])
    if (docsResult.success) setDocuments(docsResult.data || [])
    else toast.error(docsResult.error || 'Failed to load documents.')

    const shadowed = new Set()
    if (termsTemplate.success && termsTemplate.data) shadowed.add('terms')
    if (paymentAuthTemplate.success && paymentAuthTemplate.data) shadowed.add('payment_authorization')
    setTemplatedTypes(shadowed)

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (activeTab === 'documents') loadDocuments() }, [activeTab, loadDocuments])

  const handleDownload = async (doc) => {
    const result = await api.get(`/api/document/${doc._id}/download-url`)
    if (result.success) window.open(result.data.url, '_blank')
    else toast.error(result.error || 'Failed to open document.')
  }

  const handleRetire = async (doc) => {
    const result = await api.post(`/api/document/${doc._id}/retire`, {})
    if (result.success) {
      toast.success('Document retired.')
      loadDocuments()
    } else {
      toast.error(result.error || 'Failed to retire document.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await api.delete(`/api/document/${deleteTarget._id}`)
    if (result.success) {
      toast.success('Document deleted.')
      setDeleteTarget(null)
      loadDocuments()
    } else {
      toast.error(result.error || 'Failed to delete document.')
    }
    setDeleting(false)
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold">Document Library</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Upload and manage waivers, Terms &amp; Conditions, and payment authorization forms. Sent to students exactly as uploaded.
            </p>
          </div>
          {canWrite && activeTab === 'documents' && (
            <Button onClick={() => { setReplaceTarget(null); setDialogOpen(true) }}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload Document
            </Button>
          )}
        </div>

        <div className="flex gap-1 border-b mb-5">
          {[
            { key: 'documents', label: 'Waivers, Terms & Payment Auth' },
            { key: 'template', label: 'Enrollment Agreement Template' },
            { key: 'settings', label: 'Agreement Settings' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${
                activeTab === tab.key ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'template' && <AgreementTemplateBuilder />}
        {activeTab === 'settings' && <AgreementSettingsPanel />}

        {activeTab === 'documents' && (loading ? (
          <GlobalLoader />
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-[13px] text-muted-foreground">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium">{doc.name}</p>
                    {templatedTypes.has(doc.type) && (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                        Not sent — a fill-in template is active for this type
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type} · v{doc.version} ·
                    {' '}Effective {new Date(doc.effectiveDate).toLocaleDateString()}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4 mr-2" /> Preview / Download
                    </DropdownMenuItem>
                    {canWrite && (
                      <DropdownMenuItem onClick={() => { setReplaceTarget(doc); setDialogOpen(true) }}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Replace (new version)
                      </DropdownMenuItem>
                    )}
                    {canWrite && (
                      <DropdownMenuItem onClick={() => handleRetire(doc)}>
                        <Archive className="h-4 w-4 mr-2" /> Retire
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem onClick={() => setDeleteTarget(doc)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ))}
      </div>

      <UploadDialog
        templatedTypes={templatedTypes}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadDocuments}
        replaceTarget={replaceTarget}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={deleting ? undefined : () => setDeleteTarget(null)} maxWidth="sm">
        <DialogContent onClose={deleting ? undefined : () => setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-2">
            This permanently removes the document and its file. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
