const NUMBER_OPERATOR_LABELS = {
  gt: '>',
  lt: '<',
  eq: '=',
  between: 'between',
}

const DATE_OPERATOR_LABELS = {
  before: 'before',
  after: 'after',
  between: 'between',
  lastNDays: 'in last',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function describeOneFilter({ type, config = {} }, locations) {
  switch (type) {
    case 'visits':
    case 'age': {
      const label = type === 'visits' ? 'Visits' : 'Age'
      const op = NUMBER_OPERATOR_LABELS[config.operator] || config.operator
      return config.operator === 'between'
        ? `${label} ${op} ${config.value}-${config.value2}`
        : `${label} ${op} ${config.value}`
    }
    case 'futureBookings':
      return config.operator === 'none' ? 'No upcoming bookings' : 'Has upcoming bookings'
    case 'joinDate':
    case 'lastContacted': {
      const label = type === 'joinDate' ? 'Joined' : 'Last contacted'
      const op = DATE_OPERATOR_LABELS[config.operator] || config.operator
      if (config.operator === 'lastNDays') return `${label} in last ${config.value}d`
      if (config.operator === 'between') return `${label} ${op} ${config.value}–${config.value2}`
      return `${label} ${op} ${config.value}`
    }
    case 'location': {
      const loc = locations?.find((l) => String(l._id) === String(config.value))
      return `Location: ${loc?.name || config.value}`
    }
    case 'membership': {
      const parts = []
      if (config.name) parts.push(config.name)
      if (config.status) parts.push(config.status)
      return `Membership: ${parts.join(', ')}`
    }
    case 'birthday':
      return `Birthday: ${MONTHS[Number(config.month) - 1] || config.month}`
    case 'tags':
      return `Tags (${config.match}): ${config.value.join(', ')}`
    default:
      return type
  }
}

export function describeFilter(savedFilter, locations) {
  return savedFilter.filters
    .map((f) => describeOneFilter(f, locations))
    .join(savedFilter.mode === 'OR' ? '  or  ' : '  +  ')
}
