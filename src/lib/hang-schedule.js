import { addDaysIso } from './recurrence.js'

export const CADENCE_OPTIONS = [
  { value: 'daily', labelKey: 'hang.daily' },
  { value: 'weekly', labelKey: 'hang.weekly' },
  { value: 'monthly', labelKey: 'hang.monthly' },
  { value: 'every_n', labelKey: 'hang.everyN' },
  { value: 'once', labelKey: 'hang.once' },
]

export function schedulePick(draft) {
  if (draft?.cadence === 'once' && draft.onceWhen === 'by') return 'deadline'
  if (draft?.cadence === 'once') return 'once_on'
  return draft?.cadence || 'daily'
}

export function isDeadlineMode(draft) {
  return schedulePick(draft) === 'deadline'
}

export function cadenceDropdownValue(draft) {
  if (isDeadlineMode(draft)) return 'daily'
  if (draft?.cadence === 'once') return 'once'
  return draft?.cadence || 'daily'
}

export function applySchedulePick(draft, pick, today) {
  const next = { ...draft }
  if (pick === 'deadline') {
    next.cadence = 'once'
    next.onceWhen = 'by'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(next.dueBy || ''))) {
      next.dueBy = addDaysIso(today, 7)
    }
    return next
  }
  if (pick === 'once' || pick === 'once_on') {
    next.cadence = 'once'
    next.onceWhen = 'on'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(next.onceOn || ''))) {
      next.onceOn = today
    }
    return next
  }
  next.cadence = pick
  // Every few days starts at the number the field shows, so it is never blank.
  if (pick === 'every_n' && !(Number(next.everyN) >= 2)) next.everyN = 3
  if (pick === 'every_n' && !/^\d{4}-\d{2}-\d{2}$/.test(String(next.everyNAnchor || ''))) next.everyNAnchor = today
  next.onceWhen = 'on'
  next.onceOn = ''
  next.dueBy = ''
  return next
}
