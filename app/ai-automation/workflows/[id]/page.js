import WorkflowDetailsClient from '@/components/workflow/WorkflowDetailsClient'

export default async function WorkflowDetailPage({ params }) {
  const resolvedParams = await params
  return <WorkflowDetailsClient id={resolvedParams?.id} listHref="/ai-automation/workflows" />
}
