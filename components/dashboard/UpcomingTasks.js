'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckSquare, PhoneCall, Headphones } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useUpcomingTasks } from '@/lib/hooks/useUpcomingTasks'

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
  const { tasks, loading } = useUpcomingTasks({ days: 7, limit: 20 })

  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm animate-fade-in">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold text-foreground">Upcoming Tasks</CardTitle>
        {!loading && tasks.length > 0 && (
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading && (
          <p className="text-sm text-muted-foreground px-1 py-2">Loading…</p>
        )}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground px-1 py-2">Nothing scheduled for the next 7 days.</p>
        )}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {tasks.map((task, index) => {
            const Icon = KIND_ICON[task.kind] || Calendar
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer animate-slide-up"
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
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
