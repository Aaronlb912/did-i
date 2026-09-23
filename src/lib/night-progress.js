function isComplete(row) {
  const status = row?.answer?.status
  return status === 'yes' || status === 'late'
}

export function nightProgress(due = []) {
  const total = Array.isArray(due) ? due.length : 0
  const answered = total ? due.filter(isComplete).length : 0
  const ratio = total ? answered / total : 0
  return { total, answered, ratio }
}
