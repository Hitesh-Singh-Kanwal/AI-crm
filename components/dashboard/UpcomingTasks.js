'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckSquare, PhoneCall, Headphones } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useUpcomingTasks } from '@/lib/hooks/useUpcomingTasks'
import CreateTaskDialog from '@/components/dashboard/CreateTaskDialog'

const PREVIEW_COUNT = 3
const UPCOMING_TASKS_PAGE = '/dashboard/upcoming-tasks'

const KIND_ICON = {
  todo: CheckSquare,
  'lead-callback': PhoneCall,
  'customer-callback': PhoneCall,
  'human-intervention': Headphones,
}

const KIND_LABEL = {
  lesson: 'Lesson',
  service: 'Appointment',
  membership: 'Membership',
  todo: 'To-do',
  'lead-callback': 'Lead Follow-up',
  'customer-callback': 'Callback',
  'human-intervention': 'Needs Human',
}

export default function UpcomingTasks() {
  // Fetched wider than the preview shows, so the count badge and "View all"
  // link reflect the real total, not just what's visible on the dashboard.
  const { tasks, loading, refresh } = useUpcomingTasks({ days: 7, limit: 20 })
  const previewTasks = tasks.slice(0, PREVIEW_COUNT)

  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm animate-fade-in">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <Link href={UPCOMING_TASKS_PAGE} className="group flex items-center gap-2">
          <CardTitle className="text-base font-semibold text-foreground group-hover:text-brand transition-colors">
            Upcoming Tasks
          </CardTitle>
        </Link>
        <div className="flex items-center gap-2">
          {!loading && tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">{tasks.length}</span>
          )}
          <Link
            href={UPCOMING_TASKS_PAGE}
            className="text-xs font-medium text-brand hover:underline"
          >
            View all
          </Link>
          <CreateTaskDialog compact onCreated={() => refresh()} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && (
          <p className="text-sm text-muted-foreground px-1 py-2">Loading…</p>
        )}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground px-1 py-2">Nothing scheduled for the next 7 days.</p>
        )}
        <div className="space-y-2 pr-1">
          {previewTasks.map((task, index) => {
            const Icon = KIND_ICON[task.kind] || Calendar
            return (
              <Link
                key={task.id}
                href={UPCOMING_TASKS_PAGE}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:shadow-sm transition-all animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    <Badge variant={task.isOverdue ? 'error' : 'info'} className="shrink-0 text-xs">
                      {task.isOverdue ? 'Overdue' : KIND_LABEL[task.kind] || task.kind}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDate(task.dueDate)}
                  </p>
                  {(task.assignee || task.relatedName) && (
                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                      {task.assignee && `Assigned to: ${task.assignee}`}
                      {task.assignee && task.relatedName && ' · '}
                      {task.relatedName}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
