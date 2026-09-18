function pad(value) {
  return String(value).padStart(2, '0')
}

export function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseIsoDate(value) {
  const raw = String(value == null ? '' : value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export function boardDate(now = new Date(), foldHour = 4) {
  const hour = Number(foldHour)
  const fold = Number.isFinite(hour) ? hour : 4
  const local = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  )
  if (local.getHours() < fold) {
    local.setDate(local.getDate() - 1)
  }
  return isoDate(new Date(local.getFullYear(), local.getMonth(), local.getDate()))
}

export function addDaysIso(iso, days) {
  const date = parseIsoDate(iso)
  if (!date) return ''
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

export function daysBetween(fromIso, toIso) {
  const from = parseIsoDate(fromIso)
  const to = parseIsoDate(toIso)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

export function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function periodKeyFor(lamp, dateIso) {
  const date = parseIsoDate(dateIso)
  if (!date) return ''
  if (lamp.cadence === 'monthly') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
  }
  if (lamp.cadence === 'once') return `once:${lamp.id}`
  return dateIso
}

export function isDueOn(lamp, dateIso) {
  if (!lamp || lamp.archived) return false
  const date = parseIsoDate(dateIso)
  if (!date) return false
  switch (lamp.cadence) {
    case 'daily':
      return true
    case 'weekly': {
      const days = Array.isArray(lamp.weekdays) ? lamp.weekdays : []
      return days.includes(date.getDay())
    }
    case 'monthly': {
      const last = lastDayOfMonth(date.getFullYear(), date.getMonth())
      let day = lamp.monthDay === 'last' ? last : Number(lamp.monthDay)
      if (!Number.isFinite(day) || day < 1) return false
      if (day > last) day = last
      return date.getDate() === day
    }
    case 'once':
      return true
    case 'every_n': {
      const n = Number(lamp.everyN)
      if (!Number.isInteger(n) || n < 2) return false
      if (!parseIsoDate(lamp.everyNAnchor)) return false
      const diff = daysBetween(lamp.everyNAnchor, dateIso)
      if (diff == null || diff < 0) return false
      return diff % n === 0
    }
    default:
      return false
  }
}

function isOnceClosed(book, lampId) {
  return (book.answers || []).some(
    (answer) =>
      answer.lampId === lampId &&
      (answer.status === 'yes' || answer.status === 'skip' || answer.status === 'late'),
  )
}

export function answerFor(book, lampId, periodKey) {
  return (book.answers || []).find(
    (answer) => answer.lampId === lampId && answer.periodKey === periodKey,
  )
}

export function dueTonight(book, now = new Date()) {
  const dateIso = boardDate(now, book.dayFoldHour)
  const lamps = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived) continue
    if (lamp.cadence === 'once' && isOnceClosed(book, lamp.id)) continue
    if (!isDueOn(lamp, dateIso)) continue
    const periodKey = periodKeyFor(lamp, dateIso)
    lamps.push({
      lamp,
      dateIso,
      periodKey,
      answer: answerFor(book, lamp.id, periodKey) || null,
    })
  }
  return lamps
}

export function askAfterPassed(lamp, now = new Date(), foldHour = 4) {
  const after = String(lamp?.askAfter || '').trim()
  if (!after) return true
  const match = after.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return true
  if (now.getHours() < foldHour) return true
  const minutes = now.getHours() * 60 + now.getMinutes()
  const target = Number(match[1]) * 60 + Number(match[2])
  return minutes >= target
}

export function previousDueDate(lamp, dateIso) {
  if (!lamp || lamp.cadence === 'once') return ''
  for (let i = 1; i <= 62; i += 1) {
    const iso = addDaysIso(dateIso, -i)
    if (isDueOn(lamp, iso)) return iso
  }
  return ''
}

export function catchUpRows(book, now = new Date()) {
  const dateIso = boardDate(now, book.dayFoldHour)
  const rows = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived || lamp.cadence === 'once') continue
    const prevIso = previousDueDate(lamp, dateIso)
    if (!prevIso) continue
    const periodKey = periodKeyFor(lamp, prevIso)
    if (answerFor(book, lamp.id, periodKey)) continue
    rows.push({
      lamp,
      dateIso: prevIso,
      periodKey,
      answer: null,
    })
  }
  return rows
}

export function unansweredTonight(book, now = new Date()) {
  return dueTonight(book, now).filter((row) => !row.answer)
}

export function faceReadyTonight(book, now = new Date()) {
  return unansweredTonight(book, now).filter((row) =>
    askAfterPassed(row.lamp, now, book.dayFoldHour),
  )
}

export function waitingTonight(book, now = new Date()) {
  return unansweredTonight(book, now).filter(
    (row) => !askAfterPassed(row.lamp, now, book.dayFoldHour),
  )
}

export function allClearTonight(book, now = new Date()) {
  const due = dueTonight(book, now)
  return due.length > 0 && due.every((row) => row.answer)
}

export function formatBoardDate(iso) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function recentPeriodKeys(lamp, dateIso, count = 7) {
  if (lamp.cadence === 'once') return [`once:${lamp.id}`]
  if (lamp.cadence === 'monthly') {
    const date = parseIsoDate(dateIso)
    if (!date) return []
    const keys = []
    for (let i = count - 1; i >= 0; i -= 1) {
      const next = new Date(date.getFullYear(), date.getMonth() - i, 1)
      keys.push(`${next.getFullYear()}-${pad(next.getMonth() + 1)}`)
    }
    return keys
  }
  const keys = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const iso = addDaysIso(dateIso, -i)
    if (isDueOn(lamp, iso)) keys.push(periodKeyFor(lamp, iso))
  }
  return keys
}
