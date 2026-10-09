import { countedTonightRows, rowDoneTonight } from './recurrence.js'

// Same rows the deck uses to call the night clear (countedTonightRows), so
// the bar never says "1 of 2" while the card says the night is done. An
// optional or every so often question counts once you say did.
export function nightProgress(due = [], we = null) {
  const rows = Array.isArray(due) ? countedTonightRows(due.filter((row) => row?.lamp && row?.dateIso)) : []
  const total = rows.length + (we?.due || 0)
  const answered = total ? rows.filter(rowDoneTonight).length + (we?.done || 0) : 0
  const ratio = total ? answered / total : 0
  return { total, answered, ratio }
}
