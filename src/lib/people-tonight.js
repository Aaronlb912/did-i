import { t } from './i18n.js'

// Cards from other people that ride the Tonight swipe after your own:
// open family questions, then Did you asks due tonight. They never count
// toward your own streak or night.
export function peopleTonightItems({ familyRows = [], asks = [], night, gone = [] }) {
  const out = []
  for (const row of familyRows) {
    if (row.answer) continue
    out.push({ key: `fam:${row.family.id}:${row.lamp.id}:${row.night}`, kind: 'family', title: row.lamp.question, row })
  }
  for (const row of asks) {
    if (row.appSend || row.kind !== 'todo' || row.state !== 'sent') continue
    if (row.due_on && night && row.due_on > night) continue
    out.push({ key: `ask:${row.id}`, kind: 'ask', title: row.question, row })
  }
  const skip = new Set(gone)
  return out.filter((item) => !skip.has(item.key))
}

// The small chip next to your own count: what other people put on tonight,
// still waiting. It never adds to your own done and left.
export function peopleWaitingLine(items = []) {
  const family = items.filter((item) => item.kind === 'family').length
  const asks = items.filter((item) => item.kind === 'ask').length
  return [
    family ? t('tonight.meterFamily', { n: family }) : '',
    asks ? t('tonight.meterAsks', { n: asks }) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
