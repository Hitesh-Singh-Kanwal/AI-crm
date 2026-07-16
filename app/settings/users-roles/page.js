import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import { Users, Shield, ChevronRight } from 'lucide-react'

const cards = [
  {
    href: '/settings/users-roles/roles',
    title: 'Roles & Permissions',
    description:
      'Define what each role can access and which roles appear on the calendar before inviting team members.',
    icon: Shield,
  },
  {
    href: '/settings/users-roles/users',
    title: 'Users',
    description: 'Invite team members, assign them a role, and manage locations.',
    icon: Users,
  },
]

export default function UsersRolesPage() {
  return (
    <MainLayout title="Users & Roles" subtitle="Manage users and role permissions">
      <div className="w-full space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Users & Roles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who can access the studio and what they can do.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand/30 hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
