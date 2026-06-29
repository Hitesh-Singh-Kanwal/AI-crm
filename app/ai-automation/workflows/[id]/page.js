import { redirect } from 'next/navigation'

export default async function WorkflowDetailPage({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (id) {
    redirect(`/ai-automation/workflows/builder?id=${id}`)
  }
  redirect('/ai-automation/workflows')
}
