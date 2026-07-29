import { makeCatalogApi } from '@/lib/reports/report-filter-catalog-api'

const DATE_KEY_RE = /(date|at|time|created|due|from|to)$/i
const NUMBER_KEY_RE = /(amount|total|count|pct|percent|rate|balance|spend|revenue|sales|cash|lessons|paid|remaining|days|change|avg|utilization|price|cost|minutes)/i
const BOOL_KEY_RE = /^(showed|sold|attended|converted|retained|active)$/i

function inferInputType(key, col = {}) {
  if (col.inputType) return col.inputType
  if (BOOL_KEY_RE.test(key)) return 'boolean'
  if (DATE_KEY_RE.test(key)) return 'date'
  if (NUMBER_KEY_RE.test(key)) return 'number'
  return 'text'
}

function fieldFromColumn(col) {
  const key = col.key || col.value
  const label = col.label || key
  const inputType = inferInputType(key, col)
  if (inputType === 'boolean') {
    return {
      value: key,
      label,
      inputType: 'select',
      operators: ['eq'],
      staticOptions: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ],
      optionsKey: null,
    }
  }
  if (inputType === 'date') {
    return { value: key, label, inputType: 'date', operators: ['eq', 'gt', 'lt', 'between'], staticOptions: null, optionsKey: null }
  }
  if (inputType === 'number') {
    return { value: key, label, inputType: 'number', operators: ['eq', 'gt', 'lt', 'between'], staticOptions: null, optionsKey: null }
  }
  if (col.staticOptions) {
    return { value: key, label, inputType: 'select', operators: ['eq'], staticOptions: col.staticOptions, optionsKey: null }
  }
  return { value: key, label, inputType: 'text', operators: ['contains', 'eq'], staticOptions: null, optionsKey: null }
}

export function buildCatalogFromColumns(columns = [], groupId = 'columns') {
  const fields = (columns || [])
    .filter((c) => c?.key || c?.value)
    .map(fieldFromColumn)
  if (!fields.length) return null
  return makeCatalogApi([{ id: groupId, label: 'Columns', fields }])
}
