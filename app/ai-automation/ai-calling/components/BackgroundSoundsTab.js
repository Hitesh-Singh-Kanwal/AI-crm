'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Music2, Pause, Pencil, Play, Search, Trash2, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import api, { getApiBaseUrl } from '@/lib/api'
import {
  clampBackgroundSoundVolume,
  formatBackgroundSoundVolumeLabel,
  resolveBackgroundSoundPlayUrl,
} from '@/lib/backgroundSound'
import { useToast } from '@/components/ui/toast'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import BackgroundSoundUploadDialog from './BackgroundSoundUploadDialog'
import { locationBadgeLabel } from './locationScope'

const PAGE_SIZE = 12

function extractSoundsPayload(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.sounds)
    ? payload.sounds
    : Array.isArray(payload)
    ? payload
    : []
  const pagination = payload?.pagination || result?.pagination
  return {
    list: Array.isArray(list) ? list : [],
    total: pagination?.total ?? (Array.isArray(list) ? list.length : 0),
    totalPages: pagination?.totalPages ?? Math.max(1, Math.ceil((list?.length || 0) / PAGE_SIZE)),
  }
}

function formatUploadedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function BackgroundSoundsTab() {
  const toast = useToast()
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingVolume, setEditingVolume] = useState(0.4)
  const [savingId, setSavingId] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [loadingPlayId, setLoadingPlayId] = useState(null)
  const audioRef = useRef(null)
  const playSessionRef = useRef(0)

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const stopPreview = useCallback(() => {
    playSessionRef.current += 1
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
    setPlayingId(null)
    setLoadingPlayId(null)
  }, [])

  useEffect(() => () => stopPreview(), [stopPreview])

  const fetchSounds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (debouncedSearch) params.set('search', debouncedSearch)

      const result = await api.get(`/api/ai-background-sound/paginated?${params.toString()}`)
      if (!result.success) {
        setError(result.error || 'Failed to fetch background sounds')
        return
      }

      const { list, total, totalPages: pagesFromApi } = extractSoundsPayload(result)
      const nextTotalPages = Math.max(1, pagesFromApi ?? Math.ceil((total || 0) / PAGE_SIZE))
      if (page > nextTotalPages) {
        setPage(nextTotalPages)
        return
      }

      setSounds(list)
      setTotalCount(total)
      setTotalPages(nextTotalPages)
    } catch (e) {
      console.error(e)
      setError('Failed to fetch background sounds')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchSounds()
  }, [fetchSounds])

  const startEdit = (sound) => {
    setEditingId(sound._id)
    setEditingName(sound.name || '')
    setEditingDescription(sound.description || '')
    setEditingVolume(clampBackgroundSoundVolume(sound.volume))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingDescription('')
    setEditingVolume(0.4)
  }

  const handleSaveEdit = async (sound) => {
    const name = editingName.trim()
    const description = editingDescription.trim()
    const volume = clampBackgroundSoundVolume(editingVolume)
    if (!sound?._id || !name) return

    const nameUnchanged = name === String(sound.name || '').trim()
    const descriptionUnchanged = description === String(sound.description || '').trim()
    const volumeUnchanged = volume === clampBackgroundSoundVolume(sound.volume)
    if (nameUnchanged && descriptionUnchanged && volumeUnchanged) {
      cancelEdit()
      return
    }

    setSavingId(sound._id)
    try {
      const result = await api.patch(`/api/ai-background-sound/${sound._id}`, { name, description, volume })
      if (!result.success) {
        toast.error({ title: 'Update failed', message: result.error || 'Could not update sound.' })
        return
      }

      setSounds((prev) =>
        prev.map((s) => (s._id === sound._id ? { ...s, ...result.data, name, description, volume } : s))
      )
      toast.success({ title: 'Updated', message: 'Background sound saved.' })
      cancelEdit()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not update sound.' })
    } finally {
      setSavingId(null)
    }
  }

  const togglePreview = async (sound) => {
    const playUrl = resolveBackgroundSoundPlayUrl(sound, getApiBaseUrl())
    if (!playUrl) return

    if (playingId === sound._id || loadingPlayId === sound._id) {
      stopPreview()
      return
    }

    stopPreview()
    const session = playSessionRef.current
    setLoadingPlayId(sound._id)

    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    audio.onended = () => {
      if (playSessionRef.current !== session) return
      setPlayingId(null)
      setLoadingPlayId(null)
      audioRef.current = null
    }
    audio.onerror = () => {
      if (playSessionRef.current !== session) return
      setPlayingId(null)
      setLoadingPlayId(null)
      audioRef.current = null
      toast.error({ title: 'Preview failed', message: 'Could not play this audio file.' })
    }

    try {
      audio.src = playUrl
      // Wait until enough data is buffered so play doesn't feel "stuck".
      await new Promise((resolve, reject) => {
        const onReady = () => {
          cleanup()
          resolve()
        }
        const onFail = () => {
          cleanup()
          reject(new Error('Could not load audio'))
        }
        const cleanup = () => {
          audio.removeEventListener('canplay', onReady)
          audio.removeEventListener('error', onFail)
        }
        audio.addEventListener('canplay', onReady, { once: true })
        audio.addEventListener('error', onFail, { once: true })
        audio.load()
      })

      if (playSessionRef.current !== session) return
      await audio.play()
      if (playSessionRef.current !== session) return
      setLoadingPlayId(null)
      setPlayingId(sound._id)
    } catch (e) {
      if (playSessionRef.current !== session) return
      if (e?.name === 'AbortError') return
      console.error(e)
      setPlayingId(null)
      setLoadingPlayId(null)
      audioRef.current = null
      toast.error({ title: 'Preview failed', message: 'Could not play this audio file.' })
    }
  }

  const handleDelete = async (sound) => {
    if (!sound?._id) return
    if (!confirm(`Delete "${sound.name}"? Assistants using this sound will fall back to no background audio.`)) {
      return
    }

    setDeletingId(sound._id)
    try {
      const result = await api.delete(`/api/ai-background-sound/${sound._id}`)
      if (!result.success) {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete sound.' })
        return
      }

      if (playingId === sound._id) stopPreview()
      toast.success({ title: 'Deleted', message: 'Background sound removed.' })
      if (sounds.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1))
      else fetchSounds()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete sound.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <TabsContent value="background-sounds" className="mt-6 flex-1 min-h-0 flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Upload ambient loops for calls. Select them when creating assistants in AI Assist.
          </p>
        </div>
        <Button variant="gradient" size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />
          Upload sound
        </Button>
      </div>

      <BackgroundSoundUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => fetchSounds()}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sounds…"
          className="pl-9 h-9"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading background sounds…" />
        </div>
      )}

      {!loading && error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>
      )}

      {!loading && !error && sounds.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Music2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No background sounds yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload your first ambient track to use in assistants.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && sounds.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sounds.map((sound) => {
              const isPlaying = playingId === sound._id
              const isLoadingPlay = loadingPlayId === sound._id
              const isEditing = editingId === sound._id
              const isSaving = savingId === sound._id
              const locLabel = locationBadgeLabel(sound)
              return (
                <Card key={sound._id} className="rounded-xl border-border/80 hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              placeholder="Name"
                              disabled={isSaving}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              placeholder="Description (optional)"
                              disabled={isSaving}
                              rows={2}
                              className="text-sm resize-none"
                            />
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium text-foreground">
                                Volume ({formatBackgroundSoundVolumeLabel(editingVolume)})
                              </p>
                              <input
                                type="range"
                                min={0.05}
                                max={1}
                                step={0.05}
                                value={editingVolume}
                                onChange={(e) =>
                                  setEditingVolume(clampBackgroundSoundVolume(Number(e.target.value)))
                                }
                                disabled={isSaving}
                                className="w-full"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="gradient"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSaveEdit(sound)}
                                disabled={isSaving || !editingName.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={cancelEdit}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-foreground truncate">{sound.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Uploaded {formatUploadedAt(sound.uploadedAt || sound.createdAt)}
                            </p>
                            {locLabel && (
                              <Badge variant="secondary" className="mt-1.5 text-[10px] font-normal">
                                {locLabel}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => togglePreview(sound)}
                          disabled={!!loadingPlayId && !isLoadingPlay}
                          title={
                            isLoadingPlay
                              ? 'Loading preview…'
                              : isPlaying
                                ? 'Stop preview'
                                : 'Preview sound'
                          }
                        >
                          {isLoadingPlay ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isPlaying ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>

                    {!isEditing && isLoadingPlay ? (
                      <p className="text-[11px] text-muted-foreground">Loading preview…</p>
                    ) : null}

                    {!isEditing && (
                      sound.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{sound.description}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No description</p>
                      )
                    )}

                    {!isEditing && (
                      <p className="text-[11px] text-muted-foreground">
                        Saved volume: {formatBackgroundSoundVolumeLabel(sound.volume)}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[55%]">
                        {sound.mimeType || 'audio'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {!isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(sound)}
                            disabled={!!editingId || deletingId === sound._id}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(sound)}
                          disabled={deletingId === sound._id || isEditing}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    disabled={loading || n === page}
                    className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 ${
                      n === page
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
            </div>
          )}
        </>
      )}
    </TabsContent>
  )
}
