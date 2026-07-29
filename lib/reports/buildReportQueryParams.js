function getValidReportConditions(conditions = []) {
  return conditions.filter((c) => {
    if (!c?.field) return false
    if (typeof c.value === 'object' && c.value && !Array.isArray(c.value)) {
      return String(c.value.from ?? '').trim() !== '' && String(c.value.to ?? '').trim() !== ''
    }
    if (Array.isArray(c.value)) return c.value.length > 0
    return String(c.value ?? '').trim() !== ''
  })
}

export function buildReportQueryParams(filters = {}, { page, pageSize } = {}) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))

  const validConditions = getValidReportConditions(filters.conditions)
  if (validConditions.length > 0) {
    params.set('conditions', JSON.stringify(validConditions))
    params.set('conditionLogic', filters.conditionLogic === 'OR' ? 'OR' : 'AND')
  }

  const trimmedSearch = String(filters.search ?? '').trim()
  if (trimmedSearch) params.set('search', trimmedSearch)

  return params
}

export function countActiveReportFilters(filters = {}) {
  const validConditions = getValidReportConditions(filters.conditions)
  const searchActive = String(filters.search ?? '').trim() ? 1 : 0
  const scopeActive = ['studioId', 'teacherId', 'programId'].filter((k) => String(filters[k] ?? '').trim()).length
  return validConditions.length + searchActive + scopeActive
}
