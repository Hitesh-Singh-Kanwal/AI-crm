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
  const isIpad = searchParams.get('device') === 'ipad'

  const [step, setStep] = useState('loading') // loading | preview | signing | success | error
  const [contract, setContract] = useState(null)
  const [documents, setDocuments] = useState([])
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
        if (!data.success) {
          setErrorMsg(data.message || 'This signing link is invalid or has expired.')
          setStep('error')
          return
        }
        setContract(data.data)
        if (data.data.completed) {
          // Locked by the other device already (or reopened after completion) —
          // show the receipt, not the sign form. Spec: completed links must
          // show the final result rather than expiring.
          setSignedByName(data.data.signedByName || '')
          setStep('success')
          return
        }
        setStep('preview')
        if (data.data.documentsIncluded?.length) {
          fetch(`${baseUrl}/api/contract/${contractId}/documents?token=${encodeURIComponent(token)}`)
            .then((r) => r.json())
            .then((docsData) => { if (docsData.success) setDocuments(docsData.data || []) })
            .catch(() => {})
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
      <div className="w-full max-w-4xl">
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
              <p className="text-xs text-brand font-medium uppercase tracking-wide mb-1">
                {isIpad ? 'Please review and accept on this iPad' : 'Please review and accept'}
              </p>
              <h1 className="text-xl font-bold text-foreground">{contract.title}</h1>
            </div>

            <div className="px-6 py-5 max-h-[400px] overflow-y-auto border-b border-border">
              <div
                className="agreement-doc"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />
              {documents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Also included in this agreement</p>
                  {documents.map((doc) => (
                    <a
                      key={doc.documentID}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-brand hover:underline"
                    >
                      {doc.name}
                    </a>
                  ))}
                </div>
              )}
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
                  I have read and agree to the document(s) above.
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
                  'Accept and Continue to Payment'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By accepting, your name, IP address, and timestamp will be recorded as your electronic acceptance.
              </p>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="bg-card rounded-2xl border border-success/20 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-success" />
            <div>
              <p className="text-lg font-bold text-foreground mb-1">Agreement Accepted</p>
              <p className="text-sm text-muted-foreground">
                Thank you, <strong>{signedByName}</strong>. Your acceptance has been recorded.
              </p>
            </div>
            <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
              Accepted on {contract?.signedAt ? new Date(contract.signedAt).toLocaleString() : new Date().toLocaleString()}
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
