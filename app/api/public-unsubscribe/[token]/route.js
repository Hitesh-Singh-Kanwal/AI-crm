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

function backendUrl(token, suffix = '') {
  const t = encodeURIComponent(String(token || '').trim())
  return `${apiBase()}/api/email-unsubscribe/public/${t}${suffix}`
}

export async function GET(_request, { params }) {
  try {
    const token = String((await params)?.token || '').trim()
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'This unsubscribe link is missing a token.' },
        { status: 400 },
      )
    }

    const resp = await fetch(backendUrl(token), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('[unsubscribe proxy GET]', error)
    return NextResponse.json(
      { success: false, message: 'Unable to load unsubscribe details. Please try again.' },
      { status: 502 },
    )
  }
}

export async function POST(_request, { params }) {
  try {
    const token = String((await params)?.token || '').trim()
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'This unsubscribe link is missing a token.' },
        { status: 400 },
      )
    }

    const resp = await fetch(backendUrl(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    })
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('[unsubscribe proxy POST]', error)
    return NextResponse.json(
      { success: false, message: 'Unable to unsubscribe right now. Please try again.' },
      { status: 502 },
    )
  }
}
