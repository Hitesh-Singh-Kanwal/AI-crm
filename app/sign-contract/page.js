'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, FileText, AlertTriangle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function SignContractContent() {
  const searchParams = useSearchParams()
  const contractId = searchParams.get('id')
  const token = searchParams.get('token')

  const [step, setStep] = useState('loading') // loading | preview | signing | success | error
  const [contract, setContract] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [signedByName, setSignedByName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const baseUrl = ((typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || 'http://localhost:8080').replace(/\/$/, '')

  useEffect(() => {
    if (!contractId || !token) {
      setErrorMsg('Invalid signing link. Please use the link from your email.')
      setStep('error')
      return
    }
    fetch(`${baseUrl}/api/contract/${contractId}/sign?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setContract(data.data)
          setStep('preview')
        } else {
          setErrorMsg(data.message || 'This signing link is invalid or has expired.')
          setStep('error')
        }
      })
      .catch(() => {
        setErrorMsg('Unable to load the contract. Please try again.')
        setStep('error')
      })
  }, [contractId, token, baseUrl])

  async function submitSignature() {
    if (!signedByName.trim()) return
    if (!agreed) return
    setSubmitting(true)
    try {
      const res = await fetch(`${baseUrl}/api/contract/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signedByName: signedByName.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setStep('success')
      } else {
        setErrorMsg(data.message || 'Unable to submit signature. Please try again.')
        setStep('error')
      }
    } catch (e) {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStep('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-brand flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">CADANCE AI</p>
            <p className="text-sm font-semibold text-foreground">Contract Signing</p>
          </div>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-sm text-muted-foreground">Loading contract…</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-card rounded-2xl border border-destructive/20 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Unable to load contract</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && contract && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="bg-brand/10 border-b border-brand/20 px-6 py-4">
              <p className="text-xs text-brand font-medium uppercase tracking-wide mb-1">Please review and sign</p>
              <h1 className="text-xl font-bold text-foreground">{contract.title}</h1>
            </div>

            <div className="px-6 py-5 max-h-[400px] overflow-y-auto border-b border-border">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{contract.content}</pre>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">Sign this contract</p>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Your full name *</label>
                <Input
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Type your full name exactly as it appears"
                  className="bg-card border-border"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                <span className="text-sm text-muted-foreground">
                  I have read and understood the contract above, and I agree to its terms. I understand that typing my name constitutes my digital signature.
                </span>
              </label>

              <Button
                onClick={submitSignature}
                disabled={!signedByName.trim() || !agreed || submitting}
                className="w-full h-11 bg-brand hover:bg-brand text-white font-medium rounded-xl"
              >
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</span>
                ) : (
                  'Sign Contract'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By clicking "Sign Contract", your signature, IP address, and timestamp will be recorded.
              </p>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="bg-card rounded-2xl border border-success/20 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-success" />
            <div>
              <p className="text-lg font-bold text-foreground mb-1">Contract Signed!</p>
              <p className="text-sm text-muted-foreground">
                Thank you, <strong>{signedByName}</strong>. Your signature has been recorded and a confirmation email has been sent to you.
              </p>
            </div>
            <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
              Signed on {new Date().toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignContractPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <SignContractContent />
    </Suspense>
  )
}
