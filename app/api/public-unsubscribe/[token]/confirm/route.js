import { NextResponse } from 'next/server'

function apiBase() {
  const base = (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://backend.cadance.ai'
  )
    .trim()
    .replace(/\/$/, '')
  return base || 'https://backend.cadance.ai'
}

function htmlPage({ ok, email, message }) {
  const title = ok ? 'Unsubscribed' : 'Link unavailable'
  const heading = ok ? "You're unsubscribed" : 'Link unavailable'
  const body = ok
    ? `${email ? `<strong>${email}</strong> will` : 'You will'} no longer receive marketing emails from this studio.`
    : message || 'This unsubscribe link is invalid. Links do not expire — ask the studio to resend if needed.'
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;margin:0;padding:40px 16px;color:#111}
  .card{max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}
  h1{font-size:20px;margin:0 0 10px} p{font-size:14px;color:#52525b;line-height:1.5;margin:0}
  .ok{color:#059669}
</style></head><body><div class="card">
  <h1 class="${ok ? 'ok' : ''}">${heading}</h1>
  <p>${body}</p>
</div></body></html>`
}

/** Same-origin HTML confirm — never depends on backend /confirm being reachable in the browser. */
export async function GET(_request, { params }) {
  const token = String((await params)?.token || '').trim()
  if (!token) {
    return new NextResponse(
      htmlPage({ ok: false, message: 'This unsubscribe link is missing a token.' }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  try {
    const resp = await fetch(
      `${apiBase()}/api/email-unsubscribe/public/${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      },
    )
    const data = await resp.json().catch(() => ({}))
    const ok = resp.ok && data?.success
    return new NextResponse(
      htmlPage({
        ok,
        email: data?.data?.email || '',
        message: data?.message || 'This unsubscribe link is invalid.',
      }),
      {
        status: ok ? 200 : resp.status || 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  } catch (error) {
    console.error('[unsubscribe confirm proxy]', error)
    return new NextResponse(
      htmlPage({
        ok: false,
        message: 'Unable to unsubscribe right now. Please try again in a moment.',
      }),
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}
