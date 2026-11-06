export const DEFAULT_TIME = '20:00'

// Where the Another time picker starts: two hours after the first time, else
// 23:55 when that passes midnight, or '' when the first is 23:55 or later. So it
// is never the first time (that picks nothing) and never before it.
export function secondDefault(first) {
  const match = String(first || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return DEFAULT_TIME
  const hour = Number(match[1]) + 2
  if (hour <= 23) return `${String(hour).padStart(2, '0')}:${match[2]}`
  return first >= '23:55' ? '' : '23:55'
}

// The earlier time is the question's own, so its card is on Today before the
// second one rings. A second time before the first swaps with it.
export function orderedTimes(first, second) {
  return first && second && second < first ? { askAfter: second, askAfter2: first } : { askAfter: first, askAfter2: second }
}

const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

export function from24(value) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return { hour: '8', minute: '00', meridiem: 'pm' }
  let hour = Number(match[1])
  const minute = match[2]
  const meridiem = hour >= 12 ? 'pm' : 'am'
  hour %= 12
  if (hour === 0) hour = 12
  return { hour: String(hour), minute, meridiem }
}

export function to24(hour, minute, meridiem) {
  let h = Number(hour)
  if (meridiem === 'am') {
    if (h === 12) h = 0
  } else if (h !== 12) {
    h += 12
  }
  return `${String(h).padStart(2, '0')}:${minute}`
}

export function minuteOptions(minute) {
  const options = MINUTES.map((m) => ({ value: m, label: `:${m}` }))
  if (minute && !MINUTES.includes(minute)) {
    options.push({ value: minute, label: `:${minute}` })
    options.sort((a, b) => a.value.localeCompare(b.value))
  }
  return options
}

export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const v = String(i + 1)
  return { value: v, label: v }
})

export const HOUR_OPTIONS_24 = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0')
  return { value: v, label: v }
})

// The picker's parts, in whichever clock the person set.
export function timeParts(value, h24) {
  const bits = from24(value || DEFAULT_TIME)
  if (!h24) return bits
  const stored = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || '') ? value : DEFAULT_TIME
  return { ...bits, hour: stored.slice(0, 2) }
}

export function joinTime(bits, h24) {
  if (h24) return `${bits.hour}:${bits.minute}`
  return to24(bits.hour, bits.minute, bits.meridiem)
}
