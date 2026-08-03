import { getApiBaseUrl } from '@/lib/api'

function formsBaseUrl(apiBase) {
  return `${String(apiBase || getApiBaseUrl() || '').replace(/\/$/, '')}/public/forms`
}

/**
 * HubSpot-style embed code:
 *   <script src="…/embed.js"></script>
 *   <script>CadanceForms.create({ formId: "…" });</script>
 */
export function buildFormEmbedCode(formId, { apiBase } = {}) {
  const id = String(formId || '').trim()
  if (!id) return ''
  const base = formsBaseUrl(apiBase)
  return `<script charset="utf-8" type="text/javascript" src="${base}/embed.js"></script>
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
