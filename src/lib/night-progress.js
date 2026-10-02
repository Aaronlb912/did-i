import { mustSwipeDeadline } from './lamp-deadline.js'

function isComplete(row) {
  const status = row?.answer?.status
  return status === 'yes' || status === 'late'
}

// An optional question (put on your tonight for you) counts once you say did.
function countsTonight(row) {
  if (row?.lamp?.fromDidI) return false
  if (row?.lamp?.optional && !isComplete(row)) return false
  return row?.lamp && row?.dateIso && mustSwipeDeadline(row.lamp, row.dateIso)
}

export function nightProgress(due = []) {
  const rows = Array.isArray(due) ? due.filter(countsTonight) : []
  const total = rows.length
  const answered = total ? rows.filter(isComplete).length : 0
  const ratio = total ? answered / total : 0
  return { total, answered, ratio }
}
