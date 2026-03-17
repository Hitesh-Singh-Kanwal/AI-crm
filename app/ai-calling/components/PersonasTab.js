'use client'

import { Check, Mic, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'

export default function PersonasTab({
  personas,
  personasLoading,
  personasError,
  deletingId,
  onDeletePersona,
}) {
  return (
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
                      onDeletePersona(persona._id)
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
  )
}

