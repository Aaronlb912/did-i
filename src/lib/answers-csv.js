import { periodNight, stampDay } from './recurrence.js'

// Every answer as CSV, one row per tap, for a spreadsheet.
const WORDS = { yes: 'did', late: 'late', skip: 'not yet' }

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
      ])
    }
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]))
  const head = ['date', 'question', 'short name', 'answer', 'note', 'amount', 'unit', 'folder']
  return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
