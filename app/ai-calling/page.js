'use client'

import { useEffect, useState } from 'react'
import { Phone, Plus, Play, Copy, Trash2, User, FileText, Upload, Check, Mic } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { aiScripts, knowledgeBaseDocuments } from '@/data/dummyData'
import api from '@/lib/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const fileTypeIcons = {
  pdf: '📄',
  docx: '📝',
  txt: '📃',
  mp3: '🎵',
}

export default function AICallingPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('view') || 'scripts'
  const [dragOver, setDragOver] = useState(false)
  const [personas, setPersonas] = useState([])
  const [personasLoading, setPersonasLoading] = useState(false)
  const [personasError, setPersonasError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const toast = useToast()

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        setPersonasLoading(true)
        setPersonasError(null)

        const result = await api.get('/api/ai-persona')
        if (result.success && Array.isArray(result.data)) {
          setPersonas(result.data)
        } else {
          setPersonasError(result.error || 'Failed to fetch AI personas')
        }
      } catch (error) {
        setPersonasError(error.message || 'Something went wrong while fetching personas')
      } finally {
        setPersonasLoading(false)
      }
    }

    fetchPersonas()
  }, [])

  const handleDeletePersona = async (id) => {
    try {
      setDeletingId(id)
      const result = await api.delete(`/api/ai-persona/${id}`)
      if (result.success) {
        setPersonas((prev) => prev.filter((persona) => persona._id !== id))
        toast.success({ title: 'Persona removed', message: 'AI persona has been deleted.' })
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete persona.' })
      }
    } catch (error) {
      console.error(error)
      toast.error({ title: 'Error', message: 'Something went wrong.' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <MainLayout title="AI Calling" subtitle="Manage AI-powered calling scripts and personas">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Manage AI calling scripts and track performance.</p>
            <Button variant="gradient" className="w-full sm:w-auto shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Create Script
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiScripts.map((script, index) => (
              <Card
                key={script.id}
                className="group overflow-hidden border-border/80 hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer animate-fade-in rounded-xl"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
                      <Phone className="h-5 w-5" />
                    </div>
                    <Badge variant={script.status === 'Active' ? 'success' : 'warning'} className="shrink-0">
                      {script.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{script.name}</CardTitle>
                  <Badge variant="outline" className="mt-2 w-fit text-xs">
                    {script.type}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Total Calls</span>
                      <span className="font-medium tabular-nums">{script.calls}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Conversions</span>
                      <span className="font-medium text-green-600 tabular-nums">{script.conversions}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Rate</span>
                      <span className="font-medium tabular-nums">
                        {((script.conversions / script.calls) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 col-span-2">
                      <span className="text-muted-foreground truncate">Last Used</span>
                      <span className="font-medium text-muted-foreground">{script.lastUsed}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="gradient" size="sm" className="flex-1">
                      <Play className="h-3 w-3 mr-1.5" />
                      Test Call
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Personas Tab */}
        <TabsContent value="personas" className="space-y-6 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Voice personas used for AI calls. Remove any you no longer need.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {personas.map((persona, index) => (
                <Card
                  key={persona._id}
                  className={cn(
                    'group overflow-hidden border-border/80 hover:border-primary/30 hover:shadow-lg transition-all duration-200 rounded-xl animate-fade-in',
                    persona.visible && 'ring-2 ring-primary/20 border-primary/50'
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                        <User className="h-6 w-6" />
                      </div>
                      {persona.visible && (
                        <Badge variant="success" className="flex items-center gap-1 shrink-0">
                          <Check className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-4 text-lg leading-tight">{persona.voice || 'Unnamed Persona'}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {persona.gender || 'Voice'}
                      </Badge>
                      {persona.provider && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {persona.provider}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {Array.isArray(persona.description)
                          ? persona.description.join(' · ')
                          : persona.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1 border-t border-border/50">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium font-mono text-xs">{persona.model || '—'}</span>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePersona(persona._id)
                        }}
                        disabled={deletingId === persona._id}
                      >
                        {deletingId === persona._id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            Removing…
                          </span>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Upload documents for AI training. Supported: PDF, DOCX, TXT, MP3 (max 10MB).</p>
          </div>

          {/* Upload Area */}
          <Card
            className={cn(
              'border-2 border-dashed rounded-xl transition-all duration-200',
              dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              // Handle file drop
            }}
          >
            <CardContent className="p-8 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Upload documents</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Drag and drop here or click to browse
              </p>
              <Button variant="gradient" size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Choose files
              </Button>
            </CardContent>
          </Card>

          {/* Documents List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Uploaded documents</h3>
            <div className="grid grid-cols-1 gap-3">
              {knowledgeBaseDocuments.map((doc, index) => (
                <Card
                  key={doc.id}
                  className="hover:shadow-md hover:border-border transition-all duration-200 rounded-xl animate-fade-in"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                        {fileTypeIcons[doc.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                          <span>{doc.size}</span>
                          <span>·</span>
                          <span>Uploaded {doc.uploadedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={doc.status === 'Processed' ? 'success' : 'warning'}>
                          {doc.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-xl border-border/80">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total documents</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{knowledgeBaseDocuments.length}</p>
                  </div>
                  <FileText className="h-10 w-10 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/80">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processed</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums text-green-600">
                      {knowledgeBaseDocuments.filter((d) => d.status === 'Processed').length}
                    </p>
                  </div>
                  <Check className="h-10 w-10 text-green-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/80">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total size</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">6.6 MB</p>
                  </div>
                  <Upload className="h-10 w-10 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  )
}

