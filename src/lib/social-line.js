// The one social line Home may show. A Did we where someone else answered
// and you have not comes first; then, once you are done for tonight, one
// friend who is not done yet. Never more than one.
//
// weCards: from useWeTonight. people: rows from buildTogetherWidgetProps.
export function pickSocialLine({ weCards = [], people = [], nightDone = false }) {
  for (const card of weCards) {
    if (!card?.due || card.myState !== 'in' || card.done) continue
    const all = card.people || []
    const mine = all.find((p) => p.me)
    if (!mine || mine.status) continue
    if (card.mode === 'turns' && card.turn && card.turn !== mine.id) continue
    const first = all.find((p) => !p.me && p.state === 'in' && p.status)
    if (first) return { kind: 'we', id: card.id, name: first.name || '' }
  }
  if (!nightDone) return null
  const waiting = people.find((p) => p.shared !== false && !p.done && p.id)
  return waiting ? { kind: 'cheer', id: waiting.id, name: waiting.name || '' } : null
}
