'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react'
import api from '@/lib/api'
import { cn, getInitials, formatDate } from '@/lib/utils'
import { summarizeConditions, formatReasonLabel } from '@/lib/dynamic-list-normalize'
import { buildCustomerQueryParams } from '@/lib/customer-filter-fields'
import { extractLeadReasonsList } from '@/lib/workflow-normalize'
import {
  customerLifecycleColor,
  customerLifecycleLabel,
} from '@/lib/customer-lifecycle'
import { useCustomerLifecycleStatuses } from '@/lib/use-customer-lifecycle'
import { toast } from '@/components/ui/toast'
import ConfirmReEvaluateDialog from '@/components/dynamic-list/ConfirmReEvaluateDialog'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusColorBadge from '@/components/shared/StatusColorBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function locationName(raw, locations) {
  const ids = Array.isArray(raw)
    ? raw.map((l) => String(l?._id ?? l)).filter(Boolean)
    : raw
      ? [String(raw?._id ?? raw)]
      : []
  if (!ids.length) return '—'
  const names = ids.map((id) => locations.find((l) => String(l._id) === id)?.name).filter(Boolean)
  if (!names.length) return '—'
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

export default function DynamicListCustomerMembersClient({ listId }) {
  const router = useRouter()
  const { statuses: lifecycleStatuses } = useCustomerLifecycleStatuses()
  const [list, setList] = useState(null)
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [leadReasons, setLeadReasons] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reEvaluateOpen, setReEvaluateOpen] = useState(false)
  const [reEvaluating, setReEvaluating] = useState(false)
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

  useEffect(() => {
    api.get('/api/location?limit=200').then((res) => {
      if (res?.success) setLocations(res.data || [])
    })
    api.get('/api/lead-reasons').then((res) => {
      if (res?.success) setLeadReasons(extractLeadReasonsList(res))
    })
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const confirmReEvaluate = async () => {
    if (!listId || reEvaluating) return
    setReEvaluating(true)
    const res = await api.post(`/api/dynamic-list/${listId}/re-evaluate`)
    if (res?.success) {
      const queued = res?.data?.customersQueued ?? res?.data?.leadsQueued
      toast.success('Re-evaluation queued', {
        description: queued
          ? `${queued} customers queued`
          : 'Customers will be re-evaluated shortly',
      })
      setReEvaluateOpen(false)
      await loadList()
      await loadMembers()
    } else {
      setError(res?.error || 'Failed to re-evaluate dynamic list.')
      toast.error(res?.error || 'Failed to re-evaluate dynamic list.')
    }
    setReEvaluating(false)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/settings/users-roles/customers?view=lists"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted/40"
            title="Back to saved lists"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {list?.name || 'Customer list'}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {list
                ? summarizeConditions(list, { leadReasons, locations }, 'customer')
                : 'Loading conditions…'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReEvaluateOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] font-medium hover:bg-muted/40"
          >
            <RotateCcw className="h-4 w-4" />
            Re-evaluate
          </button>
          <button
            type="button"
            onClick={() => {
              loadList()
              loadMembers()
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] font-medium hover:bg-muted/40"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[12px] font-semibold">Customer</TableHead>
              <TableHead className="text-[12px] font-semibold">Status</TableHead>
              <TableHead className="text-[12px] font-semibold">Reason</TableHead>
              <TableHead className="text-[12px] font-semibold">Contact</TableHead>
              <TableHead className="text-[12px] font-semibold">Location</TableHead>
              <TableHead className="text-[12px] font-semibold">Credits</TableHead>
              <TableHead className="text-[12px] font-semibold">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center text-[13px] text-muted-foreground">
                  No customers match this list.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer._id}
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => router.push(`/settings/users-roles/customers/${customer._id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[13px] font-medium text-foreground">
                        {customer.name || '—'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusColorBadge
                      color={customerLifecycleColor(customer.lifecycleStatus, lifecycleStatuses)}
                      className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    >
                      {customerLifecycleLabel(customer.lifecycleStatus, lifecycleStatuses)}
                    </StatusColorBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-foreground">
                    {customer.reason ? formatReasonLabel(customer.reason, leadReasons) : '—'}
                  </TableCell>
                  <TableCell>
                    <p className="text-[12px] text-foreground">{customer.email || '—'}</p>
                    {customer.phoneNumber ? (
                      <p className="text-[11px] text-muted-foreground">{customer.phoneNumber}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {locationName(customer.locationID, locations)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      ${Number(customer.prepaidBalance ?? customer.credits ?? 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(total > 0 || totalPages > 1) && (
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">
            {total} customer{total !== 1 ? 's' : ''}
            {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
          </span>
          {totalPages > 1 ? (
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
          ) : null}
        </div>
      )}

      <ConfirmReEvaluateDialog
        open={reEvaluateOpen}
        busy={reEvaluating}
        listName={list?.name}
        entityLabel="customers"
        onClose={() => {
          if (reEvaluating) return
          setReEvaluateOpen(false)
        }}
        onConfirm={confirmReEvaluate}
      />
    </div>
  )
}
