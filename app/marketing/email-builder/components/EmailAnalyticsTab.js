'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Mail, MousePointerClick, AlertCircle, Send } from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/lib/api'
import { aggregateEmailHistoryStats, extractEmailHistoryList } from '../emailBuilderApi'

const STAT_CONFIG = [
  { key: 'sent', label: 'Sent', icon: Send, iconClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  { key: 'opened', label: 'Opened', icon: Mail, iconClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  { key: 'clicked', label: 'Clicked', icon: MousePointerClick, iconClass: 'text-violet-600', bgClass: 'bg-violet-50' },
  { key: 'bounced', label: 'Bounced', icon: AlertCircle, iconClass: 'text-amber-600', bgClass: 'bg-amber-50' },
]

const HISTORY_LIMIT = 500

export default function EmailAnalyticsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [records, setRecords] = useState([])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/emailHistory?limit=${HISTORY_LIMIT}`)
      if (!result.success) {
        setError(result.error || 'Failed to load email analytics')
        return
      }
      const { list } = extractEmailHistoryList(result)
      setRecords(list)
    } catch (e) {
      console.error(e)
      setError('Failed to load email analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const { stats, byTemplate } = useMemo(() => aggregateEmailHistoryStats(records), [records])

  return (
    <TabsContent value="analytics" className="space-y-6 mt-6">
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Loading send history…" />
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchAnalytics}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Stats from your last {records.length} sent emails (email history).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CONFIG.map(({ key, label, icon: Icon, iconClass, bgClass }) => (
              <Card key={key} className="rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bgClass}`}>
                      <Icon className={`h-5 w-5 ${iconClass}`} />
                    </div>
                    <span className="text-2xl font-bold">{stats[key]}</span>
                  </div>
                  <p className="text-sm font-medium mt-4">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Performance by subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byTemplate.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No sent emails in history yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-4 py-2.5 font-medium">Subject</th>
                        <th className="px-4 py-2.5 font-medium text-right">Sent</th>
                        <th className="px-4 py-2.5 font-medium text-right">Opened</th>
                        <th className="px-4 py-2.5 font-medium text-right">Clicked</th>
                        <th className="px-4 py-2.5 font-medium text-right">Bounced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byTemplate.map((row) => (
                        <tr key={row.subject} className="border-b last:border-0">
                          <td className="px-4 py-2.5 max-w-[240px] truncate">{row.subject}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{row.sent}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{row.opened}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{row.clicked}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{row.bounced}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </TabsContent>
  )
}
