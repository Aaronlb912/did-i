function asString(value) {
  return String(value == null ? '' : value)
}

export function isOnceBy(lamp) {
  return lamp?.cadence === 'once' && lamp.onceWhen === 'by'
}

/** Active deadline window for a once-by lamp on this night. */
export function activeDeadline(lamp, dateIso) {
  if (!isOnceBy(lamp)) return ''
  const dueBy = asString(lamp.dueBy).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) return ''
  const start = asString(lamp.createdOn).trim() || dateIso
  if (dateIso < start || dateIso > dueBy) return ''
  return dueBy
}

/** Deadline questions only join the Tonight swipe stack on the due night. */
export function mustSwipeDeadline(lamp, dateIso) {
  if (!isOnceBy(lamp)) return true
  const dueBy = asString(lamp.dueBy).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) return true
  return dateIso >= dueBy
}
