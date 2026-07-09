'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { summarizeConditions } from '@/lib/dynamic-list-normalize'
import { buildCustomerQueryParams } from '@/lib/customer-filter-fields'
import { toast } from '@/components/ui/toast'

export default function DynamicListCustomerMembersClient({ listId }) {
  const [list, setList] = useState(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const loadList = useCallback(async () => {
    const res = await api.get(`/api/dynamic-list/${listId}`)
    if (res?.success) setList(res.data)
  }, [listId])

  const loadMembers = useCallback(async () => {
    if (!list) return
    setLoading(true)
    const filters = {
      conditionLogic: list.conditionLogic,
      conditions: list.conditions || [],
      groupLogics: list.groupLogics || {},
    }
    const params = buildCustomerQueryParams({ page, limit, filters })
    const res = await api.get(`/api/customer?${params}`)
    if (res?.success) {
      setCustomers(res.data || [])
      setTotal(res.pagination?.total ?? res.total ?? 0)
    } else {
      setCustomers([])
      setTotal(0)
      toast.error(res?.error || 'Failed to load customers.')
    }
    setLoading(false)
  }, [list, page])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/ai-automation/dynamic-lists"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted/40"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{list?.name || 'Customer list'}</h1>
            <p className="text-[13px] text-muted-foreground">
              {list ? summarizeConditions(list, {}, 'customer') : 'Loading conditions…'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadMembers}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] font-medium hover:bg-muted/40"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                  Loading customers…
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                  No customers match this list.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer._id} className="border-b border-border/70">
                  <td className="px-4 py-3 font-medium text-foreground">{customer.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.phoneNumber || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} · {total} customers
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
