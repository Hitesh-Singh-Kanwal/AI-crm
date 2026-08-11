import { getApiBaseUrl } from '@/lib/api'

function formsBaseUrl(apiBase) {
  return `${String(apiBase || getApiBaseUrl() || '').replace(/\/$/, '')}/public/forms`
}

/**
 * CSS customization guide included with every embed snippet.
 * Kept as an HTML comment so it copies with the code and does not affect the page.
 * Do NOT put real <style>…</style> tags inside this comment — some preview tools
 * incorrectly apply them. Show example rules as plain text only.
 */
export const FORM_EMBED_CSS_GUIDE = `<!--
  Cadance form — CSS customization (reference only — this comment does nothing)
  Root class: .cadance-form

  Selectors you can target:
  - .cadance-form                      → outer embed wrapper
  - .cadance-form .form-container      → form card / panel
  - .cadance-form label                → field labels
  - .cadance-form input                → text / email / date inputs
  - .cadance-form textarea             → multi-line fields
  - .cadance-form select               → dropdowns
  - .cadance-form .crm-phone-shell     → full phone control background
  - .cadance-form .crm-phone-flag-btn  → country flag button
  - .cadance-form .crm-phone-dial      → dial code (+1)
  - .cadance-form .crm-phone-local     → phone number input
  - .cadance-form .crm-phone-label     → phone floating label
  - .cadance-form .crm-captcha         → captcha block
  - .cadance-form .submit-btn          → submit button
  - .cadance-form h1, h2, h3, h4       → heading blocks

  CSS variables (theme phone + inputs together):
  - --cadance-input-bg
  - --cadance-input-text
  - --cadance-input-border
  - --cadance-muted-text

  Tip: use !important when a field still has inline styles.

  To customize, ADD a real <style> block BELOW the scripts (outside this comment), e.g.:

    .cadance-form {
      --cadance-input-bg: #111;
      --cadance-input-text: #fff;
      --cadance-input-border: #555;
      --cadance-muted-text: #aaa;
    }
    .cadance-form .form-container { background: #000 !important; box-shadow: none !important; }
    .cadance-form label { color: #fff !important; }
    .cadance-form input,
    .cadance-form textarea,
    .cadance-form select {
      background: #111 !important;
      color: #fff !important;
      border-color: #555 !important;
    }
    .cadance-form .submit-btn {
      background: #fff !important;
      color: #000 !important;
    }
-->`

/**
 * HubSpot-style embed code.
 *
 * Forms render as raw HTML on the host page (not an iframe), so the website
 * can override styles with normal CSS targeting `.cadance-form`.
 */
export function buildFormEmbedCode(formId, { apiBase } = {}) {
  const id = String(formId || '').trim()
  if (!id) return ''
  const base = formsBaseUrl(apiBase)
  return `${FORM_EMBED_CSS_GUIDE}
<script charset="utf-8" type="text/javascript" src="${base}/embed.js"></script>
<script>
  CadanceForms.create({
    formId: ${JSON.stringify(id)}
  });
</script>`
}

/** Public share link for the hosted form page. */
export function buildFormShareLink(formId, { apiBase } = {}) {
  const id = String(formId || '').trim()
  if (!id) return ''
  return `${formsBaseUrl(apiBase)}/${encodeURIComponent(id)}`
}
