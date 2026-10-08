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
