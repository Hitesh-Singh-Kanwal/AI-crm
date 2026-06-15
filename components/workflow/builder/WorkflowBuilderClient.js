'use client'

import WorkflowBuilderCanvas from '@/components/workflow/builder/WorkflowBuilderCanvas'
import WorkflowBuilderHeader from '@/components/workflow/builder/WorkflowBuilderHeader'
import WorkflowBuilderPropertiesPanel from '@/components/workflow/builder/WorkflowBuilderPropertiesPanel'
import WorkflowBuilderSidebar from '@/components/workflow/builder/WorkflowBuilderSidebar'

export default function WorkflowBuilderClient() {
  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-border dark:bg-background md:h-[calc(100vh-6rem)]">
      <WorkflowBuilderHeader />

      <div className="flex min-h-0 flex-1">
        <WorkflowBuilderSidebar />
        <WorkflowBuilderCanvas />
        <WorkflowBuilderPropertiesPanel />
      </div>
    </div>
  )
}
