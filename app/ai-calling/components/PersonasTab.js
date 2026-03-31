'use client'

import { useState } from 'react'
import { Check, Copy, Heart, Mic, Pencil, Search, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import Switch from '@/components/ui/switch'
import api from '@/lib/api'

const GENDER_COLORS = {
  male: 'bg-blue-50 text-blue-700 border-blue-200',
  female: 'bg-pink-50 text-pink-700 border-pink-200',
}

function getNextCopyName(baseName, personas = []) {
  const root = String(baseName || 'Persona').trim() || 'Persona'
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const copyPattern = new RegExp(`^${escaped} copy (\\d+)$`, 'i')

  let maxCopy = 0
  const existing = new Set(
    personas.map((p) => String(p?.voice || '').trim().toLowerCase()).filter(Boolean)
  )

  if (!existing.has(root.toLowerCase())) {
    return root
  }

  for (const persona of personas) {
    const name = String(persona?.voice || '').trim()
    const match = name.match(copyPattern)
    if (match) {
      const n = Number(match[1])
      if (!Number.isNaN(n)) maxCopy = Math.max(maxCopy, n)
    }
  }

  return `${root} copy ${maxCopy + 1}`
}

export default function PersonasTab({
  personas,
  personasLoading,
  personasError,
  deletingId,
  onDeletePersona,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPrevPage,
  onNextPage,
  onPageChange,
  onRefresh,
  searchQuery = '',
  onSearchQueryChange,
}) {
  const toast = useToast()
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  const [togglingIds, setTogglingIds] = useState(new Set())
  const [heartAnimIds, setHeartAnimIds] = useState(new Set())
  // Local overrides for optimistic updates (keyed by persona._id)
  const [overrides, setOverrides] = useState({})

  const toggleFavorite = async (persona) => {
    if (togglingIds.has(persona._id)) return
    const current = { ...persona, ...overrides[persona._id] }
    const next = !current.isFavorite
    setTogglingIds((prev) => new Set(prev).add(persona._id))
    setHeartAnimIds((prev) => new Set(prev).add(persona._id))
    setTimeout(() => setHeartAnimIds((prev) => { const s = new Set(prev); s.delete(persona._id); return s }), 400)
    setOverrides((prev) => ({ ...prev, [persona._id]: { ...prev[persona._id], isFavorite: next } }))
    try {
      const result = await api.put(`/api/ai-persona/${persona._id}`, { isFavorite: next })
      if (!result.success) {
        setOverrides((prev) => ({ ...prev, [persona._id]: { ...prev[persona._id], isFavorite: current.isFavorite } }))
        toast.error({ title: 'Error', message: 'Could not update favorite.' })
      }
    } catch (e) {
      setOverrides((prev) => ({ ...prev, [persona._id]: { ...prev[persona._id], isFavorite: current.isFavorite } }))
      toast.error({ title: 'Error', message: 'Could not update favorite.' })
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(persona._id); return s })
    }
  }

  const toggleStatus = async (persona) => {
    if (togglingIds.has(persona._id) || persona.isDefault) return
    const current = { ...persona, ...overrides[persona._id] }
    const next = current.status === 'active' ? 'inactive' : 'active'
    setTogglingIds((prev) => new Set(prev).add(persona._id))
    setOverrides((prev) => ({ ...prev, [persona._id]: { ...prev[persona._id], status: next } }))
    try {
      const result = await api.put(`/api/ai-persona/${persona._id}`, { status: next })
      if (!result.success) {
        setOverrides((prev) => ({ ...prev, [persona._id]: { ...prev[persona._id], status: current.status } }))
        toast.error({ title: 'Error', message: 'Could not update status.' })
      }
    } catch (e) {
      setOverrides((prev) => ({ ...prev, [persona._id]: { ...prev[persona._id], status: current.status } }))
      toast.error({ title: 'Error', message: 'Could not update status.' })
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(persona._id); return s })
    }
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState(null) // 'duplicate' | 'edit'
  const [targetPersona, setTargetPersona] = useState(null)
  const [voice, setVoice] = useState('')
  const [similarityBoost, setSimilarityBoost] = useState(0.5)
  const [stability, setStability] = useState(0.5)
  const [modalSaving, setModalSaving] = useState(false)

  const openDuplicate = (persona) => {
    setTargetPersona(persona)
    setVoice(getNextCopyName(persona.voice || 'Persona', personas))
    setSimilarityBoost(persona.similarityBoost ?? 0.5)
    setStability(persona.stability ?? 0.5)
    setModalMode('duplicate')
    setModalOpen(true)
  }

  const openEdit = (persona) => {
    setTargetPersona(persona)
    setVoice(persona.voice || '')
    setSimilarityBoost(persona.similarityBoost ?? 0.5)
    setStability(persona.stability ?? 0.5)
    setModalMode('edit')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (modalSaving) return
    setModalOpen(false)
    setTargetPersona(null)
    setModalMode(null)
  }

  const handleModalSave = async () => {
    if (!targetPersona) return
    setModalSaving(true)
    try {
      const payload = {
        voice: voice.trim(),
        similarityBoost: Number(similarityBoost),
        stability: Number(stability),
      }

      let result
      if (modalMode === 'duplicate') {
        result = await api.post(`/api/ai-persona/${targetPersona._id}`, payload)
      } else {
        result = await api.put(`/api/ai-persona/${targetPersona._id}`, payload)
      }

      if (!result.success) {
        toast.error({
          title: modalMode === 'duplicate' ? 'Duplicate failed' : 'Update failed',
          message: result.error || 'Could not save persona.',
        })
        return
      }

      toast.success({
        title: modalMode === 'duplicate' ? 'Persona duplicated' : 'Persona updated',
        message: modalMode === 'duplicate'
          ? `"${result.data?.voice || voice}" created successfully.`
          : 'Persona updated successfully.',
      })
      closeModal()
      onRefresh?.()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not save persona.' })
    } finally {
      setModalSaving(false)
    }
  }

  return (
    <TabsContent value="personas" className="space-y-6 mt-6">
      <p className="text-sm text-muted-foreground">
        Voice personas used for AI calls. Duplicate, edit, or remove as needed.
      </p>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by voice, voiceId, model, provider, gender, description…"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange?.(e.target.value)}
          className="pl-9"
        />
      </div>

      {personasLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading personas…" />
        </div>
      )}

      {personasError && !personasLoading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{personasError}</p>
            <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
          </CardContent>
        </Card>
      )}

      {!personasLoading && !personasError && personas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Mic className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No AI personas yet</p>
            <p className="text-sm text-muted-foreground mt-1">Personas will appear here when added.</p>
          </CardContent>
        </Card>
      )}

      {!personasLoading && !personasError && personas.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {personas.map((persona, index) => {
              const p = { ...persona, ...overrides[persona._id] }
              return (
              <Card
                key={p._id}
                className={cn(
                  'group flex flex-col overflow-hidden border-border/80 hover:border-primary/40 hover:shadow-lg transition-all duration-200 rounded-2xl animate-fade-in',
                  p.visible && 'ring-2 ring-primary/20 border-primary/50',
                  p.status === 'inactive' && 'opacity-60'
                )}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <CardContent className="flex flex-col flex-1 p-5 gap-4">
                  {/* Top row: avatar + name + badges */}
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/30 transition-colors">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm leading-tight truncate">
                          {p.voice || 'Unnamed Persona'}
                        </p>
                        {p.visible && (
                          <Badge variant="success" className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5">
                            <Check className="h-2.5 w-2.5" />
                            Active
                          </Badge>
                        )}
                        {p.isDefault && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            Default
                          </Badge>
                        )}
                      </div>
                      {/* Heart + Status toggles */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {!p.isDefault && (
                          <Switch
                            checked={p.status === 'active'}
                            onChange={() => toggleStatus(p)}
                            disabled={togglingIds.has(p._id)}
                            title={p.status === 'active' ? 'Set inactive' : 'Set active'}
                            className="disabled:opacity-40 scale-75"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(p)}
                          disabled={togglingIds.has(p._id)}
                          title={p.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          className={cn(
                            'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-40',
                            p.isFavorite
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-muted-foreground hover:bg-muted hover:text-red-400'
                          )}
                        >
                          <Heart
                            className={cn(
                              'h-3.5 w-3.5 transition-all duration-200',
                              p.isFavorite && 'fill-current',
                              heartAnimIds.has(p._id) && 'scale-125'
                            )}
                          />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {p.gender && (
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                              GENDER_COLORS[p.gender?.toLowerCase()] || 'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {p.gender}
                          </span>
                        )}
                        {p.provider && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border/60">
                            {p.provider}
                          </span>
                        )}
                        {p.voiceId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                            {p.voiceId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description tags */}
                  {Array.isArray(p.description) && p.description.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.description.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-muted/70 text-muted-foreground border border-border/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats — only for 11labs personas */}
                  {p.provider === '11labs' && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Similarity', value: p.similarityBoost ?? '—' },
                        { label: 'Stability', value: p.stability ?? '—' },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-lg bg-muted/50 border border-border/40 px-3 py-2 text-center"
                        >
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                          <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Model */}
                  {p.model && (
                    <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-mono text-foreground">{p.model}</span>
                    </div>
                  )}

                  {/* Actions
                      Rules:
                      - Duplicate: only for provider === "11labs"
                      - Edit:      only for provider === "11labs" AND isDefault === false
                      - Delete:    only for isDefault === false
                  */}
                  {(p.provider === '11labs' || !p.isDefault) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50 mt-auto">
                      {p.provider === '11labs' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => openDuplicate(p)}
                          disabled={p.status === 'inactive'}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Duplicate
                        </Button>
                      )}
                      {p.provider === '11labs' && !p.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => openEdit(p)}
                          disabled={p.status === 'inactive'}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                      )}
                      {!p.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeletePersona(p._id)
                          }}
                          disabled={deletingId === p._id}
                          title="Delete"
                        >
                          {deletingId === p._id
                            ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange?.(pageNum)}
                  disabled={personasLoading || pageNum === currentPage}
                  className={cn(
                    'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    pageNum === currentPage
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted/40'
                  )}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={currentPage === 1 || personasLoading}
                className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={currentPage === totalPages || personasLoading}
                className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── DUPLICATE / EDIT MODAL ── */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md">
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'duplicate' ? 'Duplicate persona' : 'Edit persona'}
            </DialogTitle>
          </DialogHeader>

          {targetPersona && (
            <div className="mt-1">
              {/* Read-only persona info */}
              <div className="rounded-lg bg-muted/50 border border-border/50 p-3 mb-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {modalMode === 'duplicate' ? `Copy of ${targetPersona.voice || 'persona'}` : targetPersona.voice}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {targetPersona.voiceId} · {targetPersona.provider} · {targetPersona.gender}
                  </p>
                </div>
                {modalMode === 'duplicate' && (
                  <Badge variant="outline" className="ml-auto shrink-0 text-xs">New copy</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Voice name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    placeholder="e.g. My Studio Voice"
                    disabled={modalSaving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Similarity boost</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={similarityBoost}
                      onChange={(e) => setSimilarityBoost(Number(e.target.value))}
                      disabled={modalSaving}
                      className="w-full accent-primary"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>0</span>
                      <span className="font-medium text-foreground">{Number(similarityBoost).toFixed(2)}</span>
                      <span>1</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Stability</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={stability}
                      onChange={(e) => setStability(Number(e.target.value))}
                      disabled={modalSaving}
                      className="w-full accent-primary"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>0</span>
                      <span className="font-medium text-foreground">{Number(stability).toFixed(2)}</span>
                      <span>1</span>
                    </div>
                  </div>
                </div>

                {modalMode === 'duplicate' && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/40">
                    All other settings (voice model, provider, gender, description) will be copied from the original.
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeModal} disabled={modalSaving}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleModalSave}
                  disabled={modalSaving || !voice.trim()}
                >
                  {modalSaving
                    ? modalMode === 'duplicate' ? 'Duplicating…' : 'Saving…'
                    : modalMode === 'duplicate' ? 'Duplicate persona' : 'Save changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  )
}
