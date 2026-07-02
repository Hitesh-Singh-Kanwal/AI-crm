import { redirect } from 'next/navigation'

export default async function DynamicListMembersRedirectPage({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (id) {
    redirect(`/ai-automation/dynamic-lists/${id}/members`)
  }
  redirect('/ai-automation/dynamic-lists')
}
