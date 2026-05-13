import WorkflowDetailsClient from '@/components/workflow/WorkflowDetailsClient'

export default async function WorkflowDetailsPage({ params }) {
  const resolvedParams = await params
  return <WorkflowDetailsClient id={resolvedParams?.id} />
}

