'use client'

import React from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Plus, Eye, Target, Rocket, Trash2 } from 'lucide-react'

const stats = [
    { id: 1, title: 'TOTAL SEQUENCES', value: '53', color: 'text-slate-900' },
    { id: 2, title: 'ACTIVE', value: '0', color: 'text-green-500' },
    { id: 3, title: 'TOTAL CONTACTS', value: '675', color: 'text-slate-900' },
    { id: 4, title: 'AVG STEPS', value: '0', color: 'text-red-500' },
]

const dummyCampaigns = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    title: 'Website Visitors (Clicks)...',
    status: 'Available',
    description: 'No description provided',
    contacts: 10,
}))

export default function CampaignsPage() {
    return (
        <MainLayout title="Marketing Campaign" subtitle="Manage your multi-channel campaigns">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex items-center justify-end">
                    <button className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        Create Campaign
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <div key={stat.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-start gap-3">
                            <h3 className="text-xs font-bold text-brand tracking-wider uppercase">{stat.title}</h3>
                            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Campaigns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dummyCampaigns.map((campaign) => (
                        <div key={campaign.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 text-[15px] leading-snug truncate" title={campaign.title}>
                                            {campaign.title}
                                        </h3>
                                        <Eye className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                    </div>
                                    <p className="text-[13px] text-slate-400 font-normal">{campaign.description}</p>
                                </div>
                                <div className="bg-[#E0F2FE] text-[#0EA5E9] px-3 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase flex-shrink-0">
                                    {campaign.status}
                                </div>
                            </div>

                            {/* Contacts info */}
                            <div className="flex items-center gap-2 text-slate-600 mt-2">
                                <Target className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                                <span className="text-sm font-bold">{campaign.contacts} contacts</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-transparent">
                                <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                                    <Rocket className="w-4 h-4 text-slate-400" />
                                    Launch
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </MainLayout>
    )
}
