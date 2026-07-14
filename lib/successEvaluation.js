/**
 * Parse Vapi `call.analysis.successEvaluation` text into structured data for UI.
 * Vapi returns plain strings whose shape depends on the rubric (Checklist, PassFail, etc.).
 */

const PASS_VALUES = new Set(['pass', 'true', 'yes', 'successful', 'success'])
const FAIL_VALUES = new Set(['fail', 'false', 'no', 'unsuccessful', 'failure'])

const DESCRIPTIVE_LEVELS = [
  { match: /^excellent$/i, label: 'Excellent', tone: 'success', index: 4 },
  { match: /^good$|^very good$/i, label: 'Good', tone: 'success', index: 3 },
  { match: /^fair$|^average$|^neutral$/i, label: 'Fair', tone: 'warning', index: 2 },
  { match: /^poor$|^bad$|^weak$/i, label: 'Poor', tone: 'error', index: 1 },
]

const DESCRIPTIVE_SCALE = ['Poor', 'Fair', 'Good', 'Excellent']

const LIKERT_LEVELS = [
  { match: /strongly disagree/i, label: 'Strongly disagree', tone: 'error', index: 0 },
  { match: /strongly agree/i, label: 'Strongly agree', tone: 'success', index: 4 },
  { match: /^disagree$/i, label: 'Disagree', tone: 'error', index: 1 },
  { match: /^agree$/i, label: 'Agree', tone: 'success', index: 3 },
  { match: /neutral|neither/i, label: 'Neutral', tone: 'warning', index: 2 },
]

const LIKERT_SCALE = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree',
]

const MATRIX_LEVELS = [
  { match: /^excellent$/i, label: 'Excellent', tone: 'success' },
  { match: /^good$/i, label: 'Good', tone: 'success' },
  { match: /^fair$/i, label: 'Fair', tone: 'warning' },
  { match: /^poor$/i, label: 'Poor', tone: 'error' },
]

const RUBRIC_META_KEYS = [
  'Overall score',
  'Highest stage reached',
  'Main blocker',
  'Recommendation',
  'Overall result',
  'Stage reached',
  'Overall',
  'Result',
  'Score',
  'Rating',
  'Verdict',
]

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function trimMetaValue(key, rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return value

  const analysisStart = value.match(/^(.+?)\s+(The |This |A |An |It |They |We |In |After |Continue )/i)
  if (analysisStart && analysisStart[1].split(/\s+/).length <= 8) {
    return analysisStart[1].trim()
  }

  const sentenceSplit = value.match(/^(.+?)\.\s+(The |This |A |An |It |They |We )/i)
  if (sentenceSplit) return sentenceSplit[1].trim()

  if (/blocker|stage|verdict|result|rating|score|recommendation/i.test(key)) {
    const words = value.split(/\s+/)
    if (words.length > 8) {
      const limit = /recommendation/i.test(key) ? 12 : /blocker/i.test(key) ? 4 : 4
      return words.slice(0, limit).join(' ')
    }
  }

  return value
}

function extractMetaAndSummary(remainder, metaKeys = RUBRIC_META_KEYS) {
  const meta = []
  let working = String(remainder || '').trim()
  if (!working) return { meta, summary: '' }

  const keyPattern = new RegExp(
    `(?:^|\\s)(${metaKeys.map(escapeRegex).join('|')}):\\s*`,
    'gi'
  )

  const hits = []
  let m
  while ((m = keyPattern.exec(working)) !== null) {
    hits.push({ key: m[1], valueStart: m.index + m[0].length, matchStart: m.index })
  }

  if (!hits.length) {
    return { meta: [], summary: working }
  }

  const summaryParts = []
  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i]
    const nextStart = hits[i + 1]?.matchStart ?? working.length
    const rawValue = working.slice(hit.valueStart, nextStart).trim()
    const value = trimMetaValue(hit.key, rawValue)
    meta.push({ key: hit.key, value })

    if (rawValue.length > value.length) {
      const extra = rawValue.slice(value.length).trim()
      if (extra) summaryParts.push(extra)
    }
  }

  let summary = summaryParts.join(' ').replace(/\s+/g, ' ').trim()
  return { meta, summary }
}

function stripMetaFromText(text, metaKeys = RUBRIC_META_KEYS) {
  let working = String(text || '').trim()
  const keyPattern = new RegExp(
    `(?:^|\\s)(${metaKeys.map(escapeRegex).join('|')}):\\s*`,
    'gi'
  )
  const hits = []
  let m
  while ((m = keyPattern.exec(working)) !== null) {
    hits.push({ matchStart: m.index, nextStart: null })
  }
  for (let i = 0; i < hits.length; i += 1) {
    hits[i].nextStart = hits[i + 1]?.matchStart ?? working.length
    const segment = working.slice(hits[i].matchStart, hits[i].nextStart).trim()
    working = working.replace(segment, ' ')
  }
  return working.replace(/\s+/g, ' ').trim()
}

/** Parses "Criterion: 9/10 — reason" blocks (Automatic rubric prompt format). */
function extractScoredCriteria(text) {
  const working = stripMetaFromText(text)
  if (!working) return []

  const pattern =
    /(?:^|(?<=\.\s))(.+?):\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)\s*[—–-]\s*(.+?)(?=(?:\.\s+(?=[A-Za-z(])|$))/gs

  const criteria = []
  let match
  while ((match = pattern.exec(working)) !== null) {
    criteria.push({
      label: match[1].trim(),
      score: Number(match[2]),
      max: Number(match[3]),
      reason: match[4].trim().replace(/\.\s*$/, ''),
      pct: Number(match[3]) > 0 ? Math.round((Number(match[2]) / Number(match[3])) * 100) : 0,
    })
  }

  return criteria
}

function getDefaultMaxForRubric(rubric) {
  if (rubric === 'PercentageScale') return 100
  return 10
}

function parseAutomaticRubric(text, rubricHint = null) {
  const criteria = extractScoredCriteria(text)
  if (!criteria.length) return null

  const { meta, summary } = extractMetaAndSummary(text)
  const overallMeta = meta.find((m) => /overall score/i.test(m.key))
  let overallScore = null
  let overallMax = getDefaultMaxForRubric(rubricHint)

  if (overallMeta?.value) {
    const overallMatch = overallMeta.value.match(/(\d+(?:\.\d+)?)(?:\s*(?:\/|out of)\s*(\d+(?:\.\d+)?))?\s*%?/i)
    if (overallMatch) {
      overallScore = Number(overallMatch[1])
      overallMax = Number(overallMatch[2] || getDefaultMaxForRubric(rubricHint))
    }
  }

  if (overallScore === null) {
    const total = criteria.reduce((sum, c) => sum + c.score, 0)
    overallMax = criteria[0]?.max || 10
    overallScore = Math.round((total / criteria.length) * 10) / 10
  }

  return {
    type: 'automaticRubric',
    raw: text,
    criteria,
    meta,
    summary,
    overallScore,
    overallMax,
  }
}

function extractChecklistItems(text) {
  const pattern = /(\d+)\.\s*([^:]+?):\s*(true|false)/gi
  const items = []
  let match

  while ((match = pattern.exec(text)) !== null) {
    items.push({
      number: Number(match[1]),
      label: match[2].trim(),
      passed: match[3].toLowerCase() === 'true',
    })
  }

  return items
}

function stripChecklistItems(text) {
  return text.replace(/(\d+)\.\s*([^:]+?):\s*(true|false)\s*/gi, ' ').replace(/\s+/g, ' ').trim()
}

function extractMatrixCriteria(text) {
  const working = stripMetaFromText(text)
  const lines = working.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const items = []

  const sources = lines.length > 1 ? lines : [working]
  for (const chunk of sources) {
    const parts = chunk.split(/\.\s+(?=[A-Za-z])/ ).filter(Boolean)
    for (const part of parts) {
      const kv = part.match(/^([^:]{2,80}):\s*(.+)$/)
      if (!kv) continue
      const label = kv[1].trim()
      const value = kv[2].trim()
      const scoreMatch = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)\s*[—–-]?\s*(.*)$/)
      if (scoreMatch) {
        items.push({
          label,
          score: Number(scoreMatch[1]),
          max: Number(scoreMatch[2]),
          reason: scoreMatch[3]?.trim() || '',
          level: null,
        })
        continue
      }
      const level = MATRIX_LEVELS.find((l) => l.match.test(value.split(/[—–-]/)[0].trim()))
      items.push({
        label,
        level: level?.label || value.split(/[—–-]/)[0].trim(),
        tone: level?.tone || 'neutral',
        reason: value.includes('—') || value.includes('-') ? value.split(/[—–-]/).slice(1).join('-').trim() : '',
        score: null,
        max: null,
      })
    }
  }

  return items
}

function parseMatrixRubric(text) {
  const criteria = extractMatrixCriteria(text)
  if (!criteria.length) return null
  const { meta, summary } = extractMetaAndSummary(text)
  return { type: 'matrix', raw: text, criteria, meta, summary }
}

function matchLevel(text, levels) {
  const trimmed = String(text || '').trim()
  for (const level of levels) {
    if (level.match.test(trimmed)) return level
  }
  for (const level of levels) {
    if (level.match.test(trimmed.split(/\s+/).slice(0, 3).join(' '))) return level
  }
  return null
}

function parseScaleRubric(text, rubric) {
  const trimmed = text.trim()
  const levels = rubric === 'LikertScale' ? LIKERT_LEVELS : DESCRIPTIVE_LEVELS
  const scale = rubric === 'LikertScale' ? LIKERT_SCALE : DESCRIPTIVE_SCALE
  const matched = matchLevel(trimmed, levels)
  if (!matched && rubric !== 'DescriptiveScale' && rubric !== 'LikertScale') return null

  return {
    type: rubric === 'LikertScale' ? 'likert' : 'descriptive',
    raw: text,
    label: matched?.label || trimmed,
    tone: matched?.tone || 'neutral',
    activeIndex: matched?.index ?? null,
    scale,
  }
}

function extractKeyValueLines(text) {
  const lines = String(text || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)

  const pairs = []
  for (const line of lines) {
    const kv = line.match(/^([^:]{2,60}):\s*(.+)$/)
    if (kv) pairs.push({ key: kv[1].trim(), value: kv[2].trim() })
  }
  return pairs
}

function getPrimaryRubricValue(text) {
  const pairs = extractKeyValueLines(text)
  const preferred = pairs.find(({ key }) =>
    /overall score|overall result|overall|result|score|rating|verdict/i.test(key)
  )
  if (preferred?.value) return preferred.value.trim()

  const metaMatch = extractMetaAndSummary(text).meta.find(({ key }) =>
    /overall score|overall result|overall|result|score|rating|verdict/i.test(key)
  )
  if (metaMatch?.value) return metaMatch.value.trim()

  return String(text || '').trim()
}

/**
 * @param {string} raw
 * @param {string} [rubricHint] - e.g. Checklist, PassFail from assistant config
 */
export function parseSuccessEvaluation(raw, rubricHint) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return { type: 'empty', raw: '' }

  const lower = text.toLowerCase()
  const rubric = rubricHint || null
  const primaryValue = getPrimaryRubricValue(text)
  const primaryLower = primaryValue.toLowerCase()

  if (primaryValue.length < 32 && (PASS_VALUES.has(primaryLower) || FAIL_VALUES.has(primaryLower))) {
    return {
      type: 'passFail',
      raw: text,
      passed: PASS_VALUES.has(primaryLower),
      label: PASS_VALUES.has(primaryLower) ? 'Pass' : 'Fail',
    }
  }

  // Rubric-aware parsers first (avoid misclassifying rich text as a single number).
  if (rubric === 'AutomaticRubric' || (rubric !== 'Matrix' && /\/\s*10\s*[—–-]/i.test(text))) {
    const automatic = parseAutomaticRubric(text, rubric)
    if (automatic) return automatic
  }

  if (rubric === 'Checklist' || /\d+\.\s*[^:]+:\s*(true|false)/i.test(text)) {
    const checklistItems = extractChecklistItems(text)
    if (checklistItems.length >= 1) {
      const remainder = stripChecklistItems(text)
      const { meta, summary } = extractMetaAndSummary(remainder)
      const passedCount = checklistItems.filter((i) => i.passed).length
      return {
        type: 'checklist',
        raw: text,
        items: checklistItems,
        meta,
        summary,
        passedCount,
        totalCount: checklistItems.length,
        passed: passedCount === checklistItems.length,
      }
    }
  }

  if (rubric === 'Matrix') {
    const matrix = parseMatrixRubric(text)
    if (matrix) return matrix
  }

  const pctOnly = text.match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (pctOnly) {
    return { type: 'percentage', raw: text, value: Number(pctOnly[1]), max: 100 }
  }

  if (rubric === 'PercentageScale') {
    const percentOutOfHundred = primaryValue.match(/^(\d+(?:\.\d+)?)(?:\s*(?:\/|out of)\s*100)?\s*%?$/i)
    if (percentOutOfHundred) {
      return {
        type: 'percentage',
        raw: text,
        value: Number(percentOutOfHundred[1]),
        max: 100,
      }
    }
    const pctInline = primaryValue.match(/(\d+(?:\.\d+)?)\s*%/)
    if (pctInline) {
      return { type: 'percentage', raw: text, value: Number(pctInline[1]), max: 100 }
    }
  }

  if (rubric === 'NumericScale') {
    const numericOnly = primaryValue.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?$/)
    if (numericOnly) {
      return {
        type: 'numeric',
        raw: text,
        value: Number(numericOnly[1]),
        max: Number(numericOnly[2] || 10),
      }
    }
  } else {
    const numericOnly = text.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*10)?$/)
    if (numericOnly && text.length < 8) {
      return {
        type: 'numeric',
        raw: text,
        value: Number(numericOnly[1]),
        max: 10,
      }
    }
  }

  if (rubric === 'DescriptiveScale' || rubric === 'LikertScale') {
    const scale = parseScaleRubric(primaryValue, rubric)
    if (scale) return scale
  }

  const descriptive = rubric === 'Matrix' ? null : matchLevel(text, DESCRIPTIVE_LEVELS)
  if (descriptive) {
    return {
      type: 'descriptive',
      raw: text,
      label: descriptive.label,
      tone: descriptive.tone,
      activeIndex: descriptive.index,
      scale: DESCRIPTIVE_SCALE,
    }
  }

  const likert = matchLevel(text, LIKERT_LEVELS)
  if (likert) {
    return {
      type: 'likert',
      raw: text,
      label: likert.label,
      tone: likert.tone,
      activeIndex: likert.index,
      scale: LIKERT_SCALE,
    }
  }

  const automaticFallback = parseAutomaticRubric(text, rubric)
  if (automaticFallback) return automaticFallback

  const matrixFallback = parseMatrixRubric(text)
  if (matrixFallback) return matrixFallback

  const pairs = extractKeyValueLines(text)
  if (pairs.length >= 2) {
    return { type: 'structured', raw: text, pairs }
  }

  if (/\b(pass(ed)?|fail(ed)?)\b/i.test(text) && text.length < 120) {
    const passed = /\bpass(ed)?\b/i.test(text) && !/\bfail(ed)?\b/i.test(text)
    return { type: 'passFail', raw: text, passed, label: passed ? 'Pass' : 'Fail' }
  }

  return { type: 'text', raw: text }
}

/** Compact label for list cards and header badges */
export function getEvaluationSummary(parsed, fallbackRaw) {
  if (!parsed || parsed.type === 'empty') {
    return fallbackRaw ? String(fallbackRaw).slice(0, 48) : null
  }

  switch (parsed.type) {
    case 'passFail':
      return parsed.label
    case 'checklist':
      if (parsed.meta?.find((m) => /stage/i.test(m.key))) {
        const stage = parsed.meta.find((m) => /stage/i.test(m.key))
        return `${parsed.passedCount}/${parsed.totalCount} · ${stage.value}`
      }
      return `${parsed.passedCount}/${parsed.totalCount} passed`
    case 'automaticRubric':
      if (parsed.meta?.find((m) => /stage/i.test(m.key))) {
        const stage = parsed.meta.find((m) => /stage/i.test(m.key))
        return `${parsed.overallScore}/${parsed.overallMax} · ${stage.value}`
      }
      return `${parsed.overallScore}/${parsed.overallMax}`
    case 'matrix':
      return `${parsed.criteria.length} criteria`
    case 'numeric':
      return `${parsed.value}/${parsed.max}`
    case 'percentage':
      return `${parsed.value}%`
    case 'descriptive':
    case 'likert':
      return parsed.label
    case 'structured':
      return `${parsed.pairs.length} criteria`
    default:
      return String(parsed.raw || fallbackRaw || '').slice(0, 56)
  }
}

export function getEvaluationTone(parsed) {
  if (!parsed || parsed.type === 'empty') return 'neutral'

  switch (parsed.type) {
    case 'passFail':
      return parsed.passed ? 'success' : 'error'
    case 'checklist': {
      const ratio = parsed.totalCount ? parsed.passedCount / parsed.totalCount : 0
      if (ratio >= 0.8) return 'success'
      if (ratio >= 0.5) return 'warning'
      return 'error'
    }
    case 'automaticRubric':
    case 'numeric': {
      const value = parsed.overallScore ?? parsed.value
      const max = parsed.overallMax ?? parsed.max ?? 10
      const ratio = max ? value / max : 0
      if (ratio >= 0.8) return 'success'
      if (ratio >= 0.5) return 'warning'
      return 'error'
    }
    case 'percentage': {
      if (parsed.value >= 70) return 'success'
      if (parsed.value >= 40) return 'warning'
      return 'error'
    }
    case 'descriptive':
    case 'likert':
      return parsed.tone || 'neutral'
    case 'matrix':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function getScoreTone(score, max = 10) {
  const ratio = max > 0 ? score / max : 0
  if (ratio >= 0.8) return 'success'
  if (ratio >= 0.5) return 'warning'
  return 'error'
}

export function getRubricLabel(rubric) {
  const map = {
    PassFail: 'Pass / Fail',
    NumericScale: 'Numeric scale',
    PercentageScale: 'Percentage',
    DescriptiveScale: 'Descriptive',
    LikertScale: 'Likert',
    Checklist: 'Checklist',
    Matrix: 'Matrix',
    AutomaticRubric: 'Automatic rubric',
  }
  return map[rubric] || rubric || 'Evaluation'
}
