import { isPerWeek, periodNight, stampDay } from './recurrence.js'

// Every answer as CSV, one row per tap, for a spreadsheet.
const WORDS = { yes: 'did', late: 'late', skip: 'not yet' }

export const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// A question's schedule in a few characters: daily, weekly:mon,wed,
// perweek:3, everyn:3, monthly:15 (or monthly:last), often:14, once:2026-11-01.
// csv-import.js reads the same words back.
export function repeatsText(lamp) {
  if (!lamp) return ''
  if (isPerWeek(lamp)) return `perweek:${Number(lamp.perWeek)}`
  switch (lamp.cadence) {
    case 'weekly': {
      const days = [...new Set((lamp.weekdays || []).map(Number))].filter((day) => day >= 0 && day <= 6).sort()
      return days.length ? `weekly:${days.map((day) => DAY_NAMES[day]).join(',')}` : 'weekly'
    }
    case 'monthly':
      return lamp.monthDay ? `monthly:${lamp.monthDay}` : 'monthly'
    case 'every_n':
      return lamp.everyN ? `everyn:${lamp.everyN}` : 'daily'
    case 'every':
      return `often:${lamp.everyDays || 7}`
    case 'once':
      return lamp.onceWhen === 'by' && lamp.dueBy ? `once:by:${lamp.dueBy}` : lamp.onceOn ? `once:${lamp.onceOn}` : 'once'
    default:
      return 'daily'
  }
}

export function csvCell(value) {
  const text = String(value ?? '')
  // A leading = + - @ makes a spreadsheet run the cell as a formula.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function answersCsv(shelf) {
  const rows = []
  for (const book of shelf?.boards || []) {
    const lamps = new Map((book.lamps || []).map((lamp) => [lamp.id, lamp]))
    const seen = new Set()
    for (const answer of book.answers || []) {
      const dupe = `${answer.lampId}|${answer.periodKey}`
      if (answer.periodKey && seen.has(dupe)) continue
      seen.add(dupe)
      const lamp = lamps.get(answer.lampId)
      rows.push([
        // A once question's key is its id, not a date: write its day.
        String((String(answer.periodKey || '').startsWith('once:') && periodNight(lamp, answer.periodKey)) || answer.periodKey || stampDay(answer.answeredAt)),
        lamp?.question || '',
        lamp?.short || '',
        WORDS[answer.status] || String(answer.status || ''),
        answer.note || '',
        typeof answer.amount === 'number' ? answer.amount : '',
        typeof answer.amount === 'number' ? String(lamp?.amountUnit || '') : '',
        book.title || '',
        repeatsText(lamp),
        lamp?.createdOn || '',
      ])
    }
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]))
  const head = ['date', 'question', 'short name', 'answer', 'note', 'amount', 'unit', 'folder', 'repeats', 'started']
  return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
