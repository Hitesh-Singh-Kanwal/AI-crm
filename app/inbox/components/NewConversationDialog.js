'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, MessageSquare, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { getInitials } from '@/lib/utils'
import api from '@/lib/api'

export default function NewConversationDialog({ open, onClose, onStart }) {
  const [search, setSearch] = useState('')
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [channel, setChannel] = useState('SMS')

  const searchLeads = useCallback(async (q) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (q.trim()) params.set('search', q.trim())
      const result = await api.get(`/api/lead?${params.toString()}`)
      const list = Array.isArray(result.data) ? result.data : result.data?.leads ?? []
      setLeads(list)
    } catch (e) {
      console.error(e)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setLeads([])
      setSelectedLead(null)
      setChannel('SMS')
      return
    }
    searchLeads('')
  }, [open, searchLeads])

  useEffect(() => {
    const t = setTimeout(() => searchLeads(search), 300)
    return () => clearTimeout(t)
  }, [search, searchLeads])

  const handleStart = () => {
    if (!selectedLead) return
    onStart?.({ lead: selectedLead, channel })
    onClose?.()
  }

  const canStart = !!selectedLead && (
    channel === 'SMS' ? !!selectedLead.phoneNumber : !!selectedLead.email
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lead list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="sm" text="Searching…" />
              </div>
            ) : leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No leads found.</p>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead._id}
                  type="button"
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedLead?._id === lead._id
                      ? 'bg-[color:var(--studio-primary-light)] border border-[color:var(--studio-primary)]'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-[color:var(--studio-primary)] text-white text-xs font-semibold">
                      {getInitials(lead.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.phoneNumber && <span>{lead.phoneNumber}</span>}
                      {lead.phoneNumber && lead.email && <span className="mx-1">·</span>}
                      {lead.email && <span>{lead.email}</span>}
                    </p>
                  </div>
                  {selectedLead?._id === lead._id && (
                    <Badge variant="outline" className="text-[color:var(--studio-primary)] border-[color:var(--studio-primary)] flex-shrink-0">
                      Selected
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Channel selector */}
          {selectedLead && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Channel</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  disabled={!selectedLead.phoneNumber}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    channel === 'SMS'
                      ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-slate-50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <MessageSquare className="h-4 w-4" />
                  SMS
                  {!selectedLead.phoneNumber && <span className="text-xs">(no phone)</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('Email')}
                  disabled={!selectedLead.email}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    channel === 'Email'
                      ? 'bg-[color:var(--studio-primary-light)] border-[color:var(--studio-primary)] text-[color:var(--studio-primary)]'
                      : 'border-border text-muted-foreground hover:bg-slate-50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                  {!selectedLead.email && <span className="text-xs">(no email)</span>}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="gradient" onClick={handleStart} disabled={!canStart}>
              Start conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
