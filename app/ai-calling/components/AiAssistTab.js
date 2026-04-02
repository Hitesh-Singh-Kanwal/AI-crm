'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import GlobalLoader from '@/components/shared/GlobalLoader'
import api from '@/lib/api'

const ASSISTANTS_PAGE_SIZE = 9
const DEFAULT_ASSISTANT_OPTIONS = {
  firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
  firstMessage: 'Hello.',
  voiceMessage: 'Hey, I tried calling you!',
  backgroundSound: 'office',
  endCallMessage: 'Goodbye.',
}

// Returns the first non-empty file ID from whichever field the backend sent.
function normalizeFileId(fileID, fileIDies) {
  if (Array.isArray(fileIDies) && fileIDies.length && fileIDies[0]) return String(fileIDies[0])
  if (Array.isArray(fileID) && fileID.length && fileID[0]) return String(fileID[0])
  if (fileIDies && !Array.isArray(fileIDies)) return String(fileIDies)
  if (fileID && !Array.isArray(fileID)) return String(fileID)
  return ''
}

function extractAssistantsPayload(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.data)
    ? payload.data.data
    : Array.isArray(payload)
    ? payload
    : []
  const pagination = payload?.pagination || payload?.data?.pagination || result?.pagination
  return {
    list: Array.isArray(list) ? list : [],
    total: pagination?.total ?? (Array.isArray(list) ? list.length : 0),
  }
}

export default function AiAssistTab() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [assistants, setAssistants] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // --- editor state ---
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAssistant, setEditingAssistant] = useState(null)
  const [editorLoading, setEditorLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [personas, setPersonas] = useState([])
  const [scripts, setScripts] = useState([])
  const [knowledgeFiles, setKnowledgeFiles] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const [name, setName] = useState('')
  const [selectedPersonaId, setSelectedPersonaId] = useState('')
  const [selectedScriptId, setSelectedScriptId] = useState('')
  const [selectedKnowledgeFileId, setSelectedKnowledgeFileId] = useState('')
  const [firstMessageMode, setFirstMessageMode] = useState(DEFAULT_ASSISTANT_OPTIONS.firstMessageMode)
  const [firstMessage, setFirstMessage] = useState(DEFAULT_ASSISTANT_OPTIONS.firstMessage)
  const [voiceMessage, setVoiceMessage] = useState(DEFAULT_ASSISTANT_OPTIONS.voiceMessage)
  const [backgroundSound, setBackgroundSound] = useState(DEFAULT_ASSISTANT_OPTIONS.backgroundSound)
  const [endCallMessage, setEndCallMessage] = useState(DEFAULT_ASSISTANT_OPTIONS.endCallMessage)

  // --- preview state ---
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewKnowledgeNames, setPreviewKnowledgeNames] = useState([])

  // ── search debounce ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => { setPage(1) }, [debouncedSearch])

  // ── derived selected items ──
  const selectedPersona = useMemo(
    () => personas.find((p) => p._id === selectedPersonaId) || null,
    [personas, selectedPersonaId]
  )
  const selectedScript = useMemo(
    () => scripts.find((s) => s._id === selectedScriptId) || null,
    [scripts, selectedScriptId]
  )
  const selectedKnowledgeFile = useMemo(
    () =>
      knowledgeFiles.find(
        (f) => String(f.fileID || '') === selectedKnowledgeFileId || f._id === selectedKnowledgeFileId
      ) || null,
    [knowledgeFiles, selectedKnowledgeFileId]
  )

  const canSave = !!name.trim() && !!selectedPersona && !!selectedScript

  // ── fetch assistants list ──
  const fetchAssistants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ASSISTANTS_PAGE_SIZE),
      })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())

      const result = await api.get(`/api/ai-assistant/paginated?${params.toString()}`)
      if (!result.success) {
        setError(result.error || 'Failed to fetch assistants')
        return
      }
      const { list, total } = extractAssistantsPayload(result)
      setAssistants(list)
      setTotalCount(total)
      setTotalPages(Math.max(1, Math.ceil((total || 0) / ASSISTANTS_PAGE_SIZE)))
    } catch (e) {
      console.error(e)
      setError('Failed to fetch assistants')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { fetchAssistants() }, [fetchAssistants])

  // ── fetch form options — returns fetched lists so callers can use them immediately ──
  const fetchFormOptions = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const [personaRes, scriptRes, fileRes] = await Promise.all([
        api.get('/api/ai-persona?page=1&limit=100'),
        api.get('/api/ai-script/'),
        api.get('/api/ai-script/file/'),
      ])

      const personaList = Array.isArray(personaRes?.data)
        ? personaRes.data
        : personaRes?.data?.personas || []
      const scriptList = scriptRes?.data?.Scripts || []
      const fileList = fileRes?.data?.files || []

      const p = Array.isArray(personaList) ? personaList : []
      const s = Array.isArray(scriptList) ? scriptList : []
      const f = Array.isArray(fileList) ? fileList : []

      setPersonas(p)
      setScripts(s)
      setKnowledgeFiles(f)

      return { personas: p, scripts: s, knowledgeFiles: f }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not load persona/script/knowledge data.' })
      return { personas: [], scripts: [], knowledgeFiles: [] }
    } finally {
      setOptionsLoading(false)
    }
  }, [toast])

  // ── reset editor form ──
  const resetEditorState = () => {
    setEditingAssistant(null)
    setName('')
    setSelectedPersonaId('')
    setSelectedScriptId('')
    setSelectedKnowledgeFileId('')
    setFirstMessageMode(DEFAULT_ASSISTANT_OPTIONS.firstMessageMode)
    setFirstMessage(DEFAULT_ASSISTANT_OPTIONS.firstMessage)
    setVoiceMessage(DEFAULT_ASSISTANT_OPTIONS.voiceMessage)
    setBackgroundSound(DEFAULT_ASSISTANT_OPTIONS.backgroundSound)
    setEndCallMessage(DEFAULT_ASSISTANT_OPTIONS.endCallMessage)
  }

  // ── open create dialog ──
  const openCreate = async () => {
    resetEditorState()
    setEditorOpen(true)
    await fetchFormOptions()
  }

  // ── open edit dialog — fetch full data AND options, then prefill ──
  const openEdit = async (assistant) => {
    resetEditorState()
    setEditorOpen(true)
    setEditorLoading(true)
    try {
      // Fetch both in parallel
      const [{ personas: pList, scripts: sList, knowledgeFiles: fList }, detailResult] =
        await Promise.all([
          fetchFormOptions(),
          api.get(`/api/ai-assistant/${assistant._id}`),
        ])

      if (!detailResult.success) {
        toast.error({ title: 'Error', message: detailResult.error || 'Could not load assistant details.' })
        setEditorOpen(false)
        return
      }

      const full = detailResult.data || assistant
      setEditingAssistant(full)
      setName(full.name || '')

      // Match persona: try by provider+voiceId since assistants don't embed persona _id
      const matchedPersona =
        pList.find((p) => p._id === full.persona?._id) ||
        pList.find(
          (p) =>
            p.voiceId === full.persona?.voiceId && p.provider === full.persona?.provider
        )
      setSelectedPersonaId(matchedPersona?._id || '')

      // Match script: try by _id first, then by exact script content
      const matchedScript =
        sList.find((s) => s._id === full.scriptData?._id) ||
        sList.find((s) => String(s.script || '').trim() === String(full.scriptData?.script || '').trim())
      setSelectedScriptId(matchedScript?._id || '')

      // Match knowledge file: normalise the stored fileID/fileIDies to a single string,
      // then match against file.fileID (which is what the select option values use)
      const fileId = normalizeFileId(full.fileID, full.fileIDies)
      const matchedFile =
        fList.find((f) => String(f.fileID || '') === fileId) ||
        fList.find((f) => f._id === fileId)
      setSelectedKnowledgeFileId(matchedFile ? String(matchedFile.fileID || matchedFile._id) : fileId)

      // Message settings
      setFirstMessageMode(full.firstMessageMode || DEFAULT_ASSISTANT_OPTIONS.firstMessageMode)
      setFirstMessage(full.firstMessage || DEFAULT_ASSISTANT_OPTIONS.firstMessage)
      setVoiceMessage(full.voiceMessage || DEFAULT_ASSISTANT_OPTIONS.voiceMessage)
      setBackgroundSound(full.backgroundSound || DEFAULT_ASSISTANT_OPTIONS.backgroundSound)
      setEndCallMessage(full.endCallMessage || DEFAULT_ASSISTANT_OPTIONS.endCallMessage)
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not load assistant details.' })
      setEditorOpen(false)
    } finally {
      setEditorLoading(false)
    }
  }

  // ── open preview — fetch full assistant via API ──
  const openPreview = async (assistant) => {
    setPreviewData(null)
    setPreviewKnowledgeNames([])
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const result = await api.get(`/api/ai-assistant/${assistant._id}`)
      if (!result.success) {
        toast.error({ title: 'Error', message: result.error || 'Could not load assistant.' })
        setPreviewOpen(false)
        return
      }
      const full = result.data || assistant
      setPreviewData(full)

      const ids = [
        ...(Array.isArray(full?.fileIDies) ? full.fileIDies : []),
        ...(Array.isArray(full?.fileID) ? full.fileID : []),
      ].filter(Boolean)

      if (ids.length > 0) {
        const kbNames = await Promise.all(
          ids.map(async (id) => {
            const cached = knowledgeFiles.find(
              (f) => String(f.fileID || '') === String(id) || String(f._id || '') === String(id)
            )
            if (cached?.name) return cached.name

            const kbResult = await api.get(`/api/ai-script/file/${id}`)
            if (kbResult.success && kbResult.data?.name) return kbResult.data.name

            return String(id)
          })
        )
        setPreviewKnowledgeNames(kbNames.filter(Boolean))
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not load assistant.' })
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── save (create or update) ──
  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        backgroundSound: String(backgroundSound || ''),
        endCallMessage: String(endCallMessage || ''),
        firstMessageMode: String(firstMessageMode || ''),
        fileID: String(selectedKnowledgeFile?.fileID || selectedKnowledgeFileId || ''),
        firstMessage: String(firstMessage || ''),
        persona: {
          provider: selectedPersona.provider,
          similarityBoost: Number(selectedPersona.similarityBoost ?? 0.45),
          stability: Number(selectedPersona.stability ?? 0.2),
          voiceId: selectedPersona.voiceId,
        },
        scriptData: { script: String(selectedScript.script || '') },
        voiceMessage: String(voiceMessage || ''),
      }

      const isEditing = !!editingAssistant
      const updateId = editingAssistant?.assistantID
      const result =
        isEditing && updateId
          ? await api.patch(`/api/ai-assistant/${updateId}`, payload)
          : await api.post('/api/ai-assistant/', payload)

      if (!result.success) {
        toast.error({ title: 'Save failed', message: result.error || 'Could not save assistant.' })
        return
      }

      toast.success({
        title: isEditing ? 'Updated' : 'Created',
        message: `Assistant ${isEditing ? 'updated' : 'created'} successfully.`,
      })
      setEditorOpen(false)
      resetEditorState()
      fetchAssistants()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not save assistant.' })
    } finally {
      setSaving(false)
    }
  }

  // ── delete ──
  const handleDelete = async (assistant) => {
    if (!assistant?._id) return
    if (!confirm(`Delete assistant "${assistant.name}"? This cannot be undone.`)) return
    setDeletingId(assistant._id)
    try {
      const result = await api.delete(`/api/ai-assistant/${assistant._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Assistant deleted successfully.' })
        if (assistants.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1))
        else fetchAssistants()
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete assistant.' })
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete assistant.' })
    } finally {
      setDeletingId(null)
    }
  }

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  return (
    <TabsContent value="assistants" className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Build reusable assistants by combining persona, script, and optional knowledge base.
        </p>
        <Button variant="gradient" className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create assistant
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assistants…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading assistants…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && assistants.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bot className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No AI assistants yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create one to reuse setup in make-calls.</p>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {!loading && !error && assistants.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assistants.map((assistant) => (
              <Card key={assistant._id} className="rounded-xl border-border/80 hover:shadow-md transition-all flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base line-clamp-1">{assistant.name || 'Unnamed assistant'}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Voice: <span className="font-medium">{assistant.persona?.voiceId || '—'}</span>
                        {' · '}
                        Provider: <span className="font-medium">{assistant.persona?.provider || '—'}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {assistant.backgroundSound || 'none'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 flex-1">
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap flex-1">
                    {assistant.scriptData?.script || 'No script attached'}
                  </p>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => openPreview(assistant)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => openEdit(assistant)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(assistant)}
                      disabled={deletingId === assistant._id}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      title="Delete"
                    >
                      {deletingId === assistant._id
                        ? <GlobalLoader variant="inline" size="xs" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  disabled={loading || n === page}
                  className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    n === page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted/40'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── EDITOR DIALOG ── */}
      <Dialog
        open={editorOpen}
        onClose={() => {
          if (saving || editorLoading) return
          setEditorOpen(false)
          resetEditorState()
        }}
        maxWidth="3xl"
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={() => {
          if (saving || editorLoading) return
          setEditorOpen(false)
          resetEditorState()
        }}>
          <DialogHeader>
            <DialogTitle>{editingAssistant ? 'Edit assistant' : 'Create assistant'}</DialogTitle>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            {(editorLoading || optionsLoading) && (
              <div className="flex items-center gap-2 py-2">
                <GlobalLoader variant="inline" size="sm" />
                <span className="text-xs text-muted-foreground">
                  {editorLoading ? 'Loading assistant details…' : 'Loading options…'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <p className="text-sm font-medium">Assistant name</p>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dance Studio America"
                  disabled={editorLoading}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Persona <span className="text-destructive">*</span></p>
                <Select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)} disabled={editorLoading}>
                  <option value="">Select persona</option>
                  {personas.map((persona) => (
                    <option key={persona._id} value={persona._id}>
                      {persona.voice || persona.voiceId || 'Unnamed persona'}
                    </option>
                  ))}
                </Select>
                {editingAssistant && !selectedPersonaId && !editorLoading && (
                  <p className="text-[11px] text-amber-600">
                    No matching persona found for voice "{editingAssistant.persona?.voiceId}" — please select one.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Script <span className="text-destructive">*</span></p>
                <Select value={selectedScriptId} onChange={(e) => setSelectedScriptId(e.target.value)} disabled={editorLoading}>
                  <option value="">Select script</option>
                  {scripts.map((script) => (
                    <option key={script._id} value={script._id}>
                      {script.name || 'Untitled script'}
                    </option>
                  ))}
                </Select>
                {editingAssistant && !selectedScriptId && !editorLoading && (
                  <p className="text-[11px] text-amber-600">
                    Script not found in library — please select one.
                  </p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <p className="text-sm font-medium">Knowledge base file <span className="text-muted-foreground text-xs font-normal">(optional)</span></p>
                <Select
                  value={selectedKnowledgeFileId}
                  onChange={(e) => setSelectedKnowledgeFileId(e.target.value)}
                  disabled={editorLoading}
                >
                  <option value="">No file</option>
                  {knowledgeFiles.map((file) => (
                    <option key={file._id} value={file.fileID || file._id}>
                      {file.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">First message mode</p>
                <Select value={firstMessageMode} onChange={(e) => setFirstMessageMode(e.target.value)} disabled={editorLoading}>
                  <option value="assistant-waits-for-user">assistant-waits-for-user</option>
                  <option value="assistant-speaks-first-with-model-generated-message">
                    assistant-speaks-first-with-model-generated-message
                  </option>
                  <option value="assistant-speaks-first">assistant-speaks-first</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Voice message</p>
                <Input value={voiceMessage} onChange={(e) => setVoiceMessage(e.target.value)} disabled={editorLoading} />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Background sound</p>
                <Select
                  value={backgroundSound || 'none'}
                  onChange={(e) => setBackgroundSound(e.target.value)}
                  disabled={editorLoading}
                >
                  <option value="none">none</option>
                  <option value="office">office background</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">End call message</p>
                <Input value={endCallMessage} onChange={(e) => setEndCallMessage(e.target.value)} disabled={editorLoading} />
              </div>

              {firstMessageMode !== 'assistant-speaks-first-with-model-generated-message' && (
                <div className="space-y-1.5 md:col-span-2">
                  <p className="text-sm font-medium">First message</p>
                  <Textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} disabled={editorLoading} />
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditorOpen(false)
                  resetEditorState()
                }}
                disabled={saving || editorLoading}
              >
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleSave} disabled={saving || editorLoading || !canSave}>
                {saving ? 'Saving…' : editingAssistant ? 'Update assistant' : 'Create assistant'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PREVIEW DIALOG ── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="3xl">
        <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={() => setPreviewOpen(false)}>
          <DialogHeader>
            <DialogTitle>Assistant preview</DialogTitle>
          </DialogHeader>

          {previewLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" text="Loading assistant…" />
            </div>
          )}

          {!previewLoading && previewData && (
            <div className="mt-4 space-y-4">
              {/* Identity */}
              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">{previewData.name || 'Unnamed assistant'}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <Badge variant="outline" className="text-xs">
                      {previewData.persona?.provider || 'unknown provider'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Voice: {previewData.persona?.voiceId || '—'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {previewData.backgroundSound || 'no background sound'}
                    </Badge>
                  </div>
                </div>
              </div>

             

              {/* Message settings */}
              <div className="rounded-lg border border-border p-3 space-y-1.5 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Message settings</p>
                {[
                  ['First message mode', previewData.firstMessageMode || '—'],
                  ['First message', previewData.firstMessage || '—'],
                  ['Voice message', previewData.voiceMessage || '—'],
                  ['End call message', previewData.endCallMessage || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-foreground text-right">{val}</span>
                  </div>
                ))}
              </div>

              {/* Knowledge files */}
              {(() => {
                const ids = [
                  ...(Array.isArray(previewData.fileIDies) ? previewData.fileIDies : []),
                  ...(Array.isArray(previewData.fileID) ? previewData.fileID : []),
                ].filter(Boolean)
                return ids.length > 0 ? (
                  <div className="rounded-lg border border-border p-3 text-xs">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Knowledge base</p>
                    {(previewKnowledgeNames.length ? previewKnowledgeNames : ids).map((name) => (
                      <p key={name} className="text-muted-foreground truncate">{name}</p>
                    ))}
                  </div>
                ) : null
              })()}

              {/* Script */}
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Script</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {previewData.scriptData?.script || 'No script'}
                </pre>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  )
}
