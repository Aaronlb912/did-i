import { stampDay } from './recurrence.js'

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
    for (const answer of book.answers || []) {
      const lamp = lamps.get(answer.lampId)
      rows.push([
        String(answer.periodKey || stampDay(answer.answeredAt)),
        lamp?.question || '',
        lamp?.short || '',
        WORDS[answer.status] || String(answer.status || ''),
        answer.note || '',
        typeof answer.amount === 'number' ? answer.amount : '',
      ])
    }
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]))
  const head = ['date', 'question', 'short name', 'answer', 'note', 'amount']
  return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
