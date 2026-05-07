'use client'

import React, { useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Eye, Target, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import Link from 'next/link'

function getStepsCount(steps) {
    if (!Array.isArray(steps)) return 0
    // API returns nested arrays of step items
    return steps.reduce((acc, group) => acc + (Array.isArray(group) ? group.length : 0), 0)
}

function formatDateTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d)
}

function statusBadgeClass(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'active')
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    if (s === 'scheduled')
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    if (s === 'paused')
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    return 'bg-muted text-muted-foreground'
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [deletingId, setDeletingId] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(null) // campaign | null

    const loadCampaigns = async () => {
        setLoading(true)
        setError('')
        const res = await api.get('/api/campaign')
        if (res?.success) {
            setCampaigns(Array.isArray(res?.data) ? res.data : [])
        } else {
            setError(res?.error || 'Failed to load campaigns.')
        }
        setLoading(false)
    }

    const deleteCampaign = async (campaign) => {
        const id = campaign?._id || campaign?.id
        if (!id) return
        if (deletingId) return
        setDeletingId(String(id))
        setError('')
        const res = await api.delete(`/api/campaign/${id}`)
        if (res?.success) {
            setConfirmDelete(null)
            await loadCampaigns()
        } else {
            setError(res?.error || 'Failed to delete campaign.')
        }
        setDeletingId('')
    }

    useEffect(() => {
        loadCampaigns()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const stats = useMemo(() => {
        const total = campaigns.length
        const active = campaigns.filter((c) => String(c?.status || '').toLowerCase() === 'active').length
        const totalSteps = campaigns.reduce((acc, c) => acc + getStepsCount(c?.steps), 0)
        const avgSteps = total ? Math.round((totalSteps / total) * 10) / 10 : 0
        return [
            { id: 1, title: 'TOTAL CAMPAIGNS', value: String(total), color: 'text-foreground' },
            { id: 2, title: 'ACTIVE', value: String(active), color: 'text-emerald-600 dark:text-emerald-400' },
            { id: 3, title: 'TOTAL STEPS', value: String(totalSteps), color: 'text-foreground' },
            { id: 4, title: 'AVG STEPS', value: String(avgSteps), color: 'text-foreground' },
        ]
    }, [campaigns])

    return (
        <MainLayout title="Marketing Campaign" subtitle="Manage your multi-channel campaigns">
            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <div key={stat.id} className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col items-start gap-3">
                            <h3 className="text-xs font-bold text-brand tracking-wider uppercase">{stat.title}</h3>
                            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Campaigns Grid */}
                {error && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-[13px] text-destructive">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-[13px] text-muted-foreground">
                            Loading…
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-[13px] text-muted-foreground">
                            No campaigns found.
                        </div>
                    ) : (
                        campaigns.map((campaign) => {
                            const id = campaign?._id || campaign?.id
                            const title = campaign?.name || 'Untitled Campaign'
                            const description = campaign?.description || 'No description provided'
                            const status = campaign?.status || ''
                            const stepsCount = getStepsCount(campaign?.steps)
                            const event = campaign?.event ? String(campaign.event) : ''
                            const created = formatDateTime(campaign?.createdAt)

                            return (
                                <div key={id} className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col gap-4">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1.5 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h3
                                                    className="font-semibold text-foreground text-[15px] leading-snug truncate"
                                                    title={title}
                                                >
                                                    {title}
                                                </h3>
                                            </div>
                                            <p className="text-[13px] text-muted-foreground font-normal line-clamp-2">
                                                {description}
                                            </p>
                                            {(event || created) && (
                                                <div className="mt-1 text-[12px] text-muted-foreground">
                                                    {event && <span className="font-mono">{event}</span>}
                                                    {event && created && <span> • </span>}
                                                    {created && <span>Created {created}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className={`${statusBadgeClass(status)} px-3 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase flex-shrink-0`}
                                        >
                                            {status || 'unknown'}
                                        </div>
                                    </div>

                                    {/* Steps info */}
                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                        <Target className="w-4 h-4 text-muted-foreground" strokeWidth={2.5} />
                                        <span className="text-sm font-bold text-foreground">{stepsCount} steps</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 pt-3 mt-1 border-t border-border">
                                        <Link
                                            href={`/marketing/campaigns/${id}`}
                                            className="flex-1 flex items-center justify-center gap-2 bg-background border border-border text-foreground hover:bg-muted/50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(campaign)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-destructive text-destructive-foreground hover:brightness-95 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
                        <div className="border-b border-border p-5">
                            <div className="text-[16px] font-bold text-foreground">Delete campaign?</div>
                            <div className="mt-1 text-[13px] text-muted-foreground">
                                This will permanently delete{' '}
                                <span className="font-semibold text-foreground">
                                    {confirmDelete?.name || 'this campaign'}
                                </span>
                                .
                            </div>
                        </div>
                        <div className="p-5 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                disabled={!!deletingId}
                                onClick={() => setConfirmDelete(null)}
                                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-[13px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!!deletingId}
                                onClick={() => deleteCampaign(confirmDelete)}
                                className="inline-flex h-10 items-center rounded-lg bg-destructive px-4 text-[13px] font-semibold text-destructive-foreground hover:brightness-95 disabled:opacity-60"
                            >
                                {deletingId ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    )
}
