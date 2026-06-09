/**
 * Normalizers for /api/smsBuilder responses.
 */

export function extractSmsTemplatesPayload(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.smsList)
    ? payload.smsList
    : Array.isArray(payload?.data?.smsList)
      ? payload.data.smsList
      : Array.isArray(payload)
        ? payload
        : []
  const pagination = payload?.pagination ?? payload?.data?.pagination ?? result?.pagination
  return {
    list: Array.isArray(list) ? list : [],
    total: pagination?.total ?? (Array.isArray(list) ? list.length : 0),
    totalPages: pagination?.totalPages ?? pagination?.pages,
  }
}

export function extractSmsTemplateDetail(result) {
  const tpl = result?.data?.sms ?? result?.data
  return tpl && typeof tpl === 'object' ? tpl : null
}

export function getSmsTemplateCategoryName(template) {
  if (!template?.categoryID) return null
  if (typeof template.categoryID === 'object') return template.categoryID.name || null
  return null
}
