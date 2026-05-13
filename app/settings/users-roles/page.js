import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'

export default function UsersRolesPage() {
  return (
    <MainLayout title="Users & Roles" subtitle="Manage users and role permissions">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/settings/users-roles/users"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors"
        >
          <h3 className="text-sm font-semibold text-foreground">Users</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create and manage team members.</p>
        </Link>
        <Link
          href="/settings/users-roles/roles"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors"
        >
          <h3 className="text-sm font-semibold text-foreground">Roles & Permissions</h3>
          <p className="mt-1 text-xs text-muted-foreground">Configure role-based access controls.</p>
        </Link>
        <Link
          href="/settings/users-roles/teachers"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors"
        >
          <h3 className="text-sm font-semibold text-foreground">Teachers</h3>
          <p className="mt-1 text-xs text-muted-foreground">Manage instructors and their specialties.</p>
        </Link>
        <Link
          href="/settings/users-roles/customers"
          className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors"
        >
          <h3 className="text-sm font-semibold text-foreground">Customers</h3>
          <p className="mt-1 text-xs text-muted-foreground">Manage your studio's students and clients.</p>
        </Link>
      </div>
    </MainLayout>
  )
}
