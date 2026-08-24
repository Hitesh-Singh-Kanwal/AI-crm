'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MailX, RefreshCw, Search, RotateCcw } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

function formatWhen(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function UnsubscribedEmailsPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [recoveringId, setRecoveringId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page || 1),
        limit: String(pagination.limit || 50),
      })
      if (query.trim()) params.set('search', query.trim())
      const result = await api.get(`/api/email-unsubscribe?${params.toString()}`)
      if (!result.success) {
        toast.error({ title: 'Could not load list', message: result.error || 'Try again.' })
        setItems([])
        return
      }
      setItems(Array.isArray(result.data?.items) ? result.data.items : [])
      if (result.data?.pagination) {
        setPagination((prev) => ({ ...prev, ...result.data.pagination }))
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Could not load list', message: 'Something went wrong.' })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable enough; avoid reload loops
  }, [pagination.page, pagination.limit, query])

  useEffect(() => {
    load()
  }, [load])

  const onSearch = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    setQuery(search)
  }

  const recover = async (id, email) => {
    if (!id || recoveringId) return
    setRecoveringId(id)
    try {
      const result = await api.post(`/api/email-unsubscribe/${id}/resubscribe`, {
        note: 'Recovered from Unsubscribed emails admin',
      })
      if (!result.success) {
        toast.error({ title: 'Recover failed', message: result.error || 'Try again.' })
        return
      }
      toast.success({
        title: 'Resubscribed',
        message: `${email} can receive emails again.`,
      })
      await load()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Recover failed', message: 'Something went wrong.' })
    } finally {
      setRecoveringId('')
    }
  }

  return (
    <MainLayout
      title="Unsubscribed emails"
      subtitle="People who opted out of marketing email — recover anytime"
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="pl-9 h-9"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9">
            Search
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {pagination.total} unsubscribed
          </span>
        </form>

        <div className="rounded-xl border border-border bg-card overflow-hidden flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Unsubscribed</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                    Loading…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    <MailX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No unsubscribed emails yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium text-foreground">{row.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatWhen(row.unsubscribedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {row.source || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        disabled={recoveringId === row._id}
                        onClick={() => recover(row._id, row.email)}
                      >
                        {recoveringId === row._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Recover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.pages > 1 ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </MainLayout>
  )
}
