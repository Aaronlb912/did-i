// How a Did we card reads at a glance: the face row with a dot each, the one
// status line, and the plain "how it counts" words. Pure, so web, native and
// scripts/check.mjs share it. Only uses what the card already shows the group.

export const WE_FACES_MAX = 5

const RULES = ['all', 'any', 'most', 'turns']

// did: filled dot. notYet: a ring (they said Not yet). none: no answer yet.
// A card that hides nopes already sends them as no status, so they read as none.
export function weDot(person) {
  if (person?.status === 'did') return 'did'
  if (person?.status === 'nope') return 'notYet'
  return 'none'
}

// The first `max` people on the card, each with a dot, then how many more.
export function weFaceRow(card, max = WE_FACES_MAX) {
  const people = (card?.people || []).filter((p) => p.state === 'in')
  const shown = people.slice(0, max).map((person) => ({ person, dot: weDot(person) }))
  const total = Math.max(card?.total || 0, people.length)
  return { shown, more: Math.max(0, total - shown.length) }
}

export function weRule(mode) {
  return RULES.includes(mode) ? mode : 'all'
}

// The i18n key for "How it counts".
export function weRuleKey(mode) {
  return `we.rule.${weRule(mode)}`
}

// The one status line: { key, vars } for t(). Done reads per rule; take turns
// names whose turn it is; anything else is "2 of 3 did it tonight".
export function weStatus(card) {
  if (card?.done) return { key: weRule(card.mode) === 'all' ? 'we.doneAll' : 'we.doneTogether', vars: {} }
  if (card?.mode === 'turns') {
    const whose = (card.people || []).find((p) => p.id === card.turn)
    if (whose?.me) return { key: 'we.yourTurnShort', vars: {} }
    if (whose) return { key: 'we.theirTurn', vars: { name: whose.name } }
  }
  return { key: 'we.ofDid', vars: { n: card?.dids || 0, total: card?.total || 0 } }
}

// The last 7 nights ending `night` (oldest first), each with whether it was
// done together and your own answer when known (a Map of night -> status).
export function weWeekDots(card, night, mine = new Map()) {
  const done = new Set(card?.doneNights || [])
  const out = []
  const base = new Date(`${night}T12:00:00Z`)
  for (let back = 6; back >= 0; back -= 1) {
    const day = new Date(base.getTime() - back * 86400000).toISOString().slice(0, 10)
    out.push({ night: day, together: done.has(day), mine: weDot({ status: mine.get(day) }) })
  }
  return out
}
