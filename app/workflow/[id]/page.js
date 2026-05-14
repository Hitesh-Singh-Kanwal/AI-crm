import { redirect } from 'next/navigation'

export default async function WorkflowDetailRedirect({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (id) {
    redirect(`/ai-automation/workflows/${id}`)
  }
  redirect('/ai-automation/workflows')
}
