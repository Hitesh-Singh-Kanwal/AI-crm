// Clover Hosted Checkout opens on Clover's own site in a new tab. To avoid the
// browser blocking that tab as a non-user-initiated popup, callers open a blank
// tab synchronously inside the click handler (openCheckoutTab), then navigate it
// to the real checkout URL once the backend responds (navigateCheckoutTab), or
// close it if the request failed (closeCheckoutTab).

export const CHECKOUT_TOAST =
  'Payment link opened in a new tab — this will be marked paid once the customer completes payment.'

export function openCheckoutTab() {
  if (typeof window === 'undefined') return null
  return window.open('about:blank', '_blank')
}

export function navigateCheckoutTab(tab, url) {
  if (!url) return
  if (tab && !tab.closed) {
    tab.opener = null
    tab.location.replace(url)
  } else if (typeof window !== 'undefined') {
    // Pre-opened tab was blocked or closed — fall back to a direct open.
    window.open(url, '_blank', 'noopener')
  }
}

export function closeCheckoutTab(tab) {
  if (tab && !tab.closed) tab.close()
}
