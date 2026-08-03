 'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Missing reset token. Please use the link from your email.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setMessage(data.message || 'Password reset successful. Redirecting to login...')
        setTimeout(() => router.push('/auth/login'), 1800)
      } else {
        setError(data.error || data.message || 'Reset failed. Please try again.')
      }
    } catch (err) {
      console.error('Reset error', err)
      setError('Network error. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background py-12 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto h-10 w-10 rounded-lg bg-[var(--studio-primary)] flex items-center justify-center mb-3">
            <span className="text-white font-medium">DA</span>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Reset password</h2>
          <p className="text-sm text-muted-foreground mt-1">Set a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="newPassword" className="text-sm text-foreground block mb-1">New password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm text-foreground block mb-1">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? 'Saving...' : 'Set new password'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Remembered your password?{' '}
            <a href="/auth/login" className="text-[var(--studio-primary)] font-semibold hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}


