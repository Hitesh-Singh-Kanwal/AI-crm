'use client'

import MainLayout from '@/components/layout/MainLayout'

export default function SettingsPage() {
  return (
    <MainLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="max-w-2xl">
        <p className="text-muted-foreground">Settings page. Configure your preferences here.</p>
      </div>
    </MainLayout>
  )
}
