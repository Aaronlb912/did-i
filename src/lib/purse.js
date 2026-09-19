import { allClearTonight, boardDate } from './recurrence.js'

export const CHEERS = [
  { id: 'lime', name: 'Lime', line: 'Rings bloom from the tap.', gems: 0 },
  { id: 'tape', name: 'Tape', line: 'Strips whip in from the sides.', gems: 2 },
  { id: 'paper', name: 'Paper', line: 'A plane folds and flies.', gems: 3 },
  { id: 'boom', name: 'Boom', line: 'A mortar and colored rings.', gems: 4 },
  { id: 'night', name: 'Night', line: 'Moon up. Stars stay put.', gems: 5 },
  { id: 'dance', name: 'Dance', line: 'Little people hop.', gems: 6 },
  { id: 'stamp', name: 'Stamp', line: 'A DID stamp slams.', gems: 7 },
  { id: 'rain', name: 'Rain', line: 'Drops fall. A puddle stays a beat.', gems: 8 },
  { id: 'check', name: 'Check', line: 'A tick draws itself.', gems: 9 },
  { id: 'bubble', name: 'Bubble', line: 'Bubbles rise and pop.', gems: 10 },
]

export const LOOKS = [
  { id: 'lime', name: 'Lime', line: 'The one you start with.', coins: 0 },
  { id: 'ink', name: 'Ink', line: 'Quieter green.', coins: 8 },
  { id: 'brass', name: 'Brass', line: 'Warm pips.', coins: 16 },
  { id: 'night', name: 'Night', line: 'Darker plate.', coins: 24 },
]

export const CHEER_STAGE_MAX = 5
export const CHEER_STAGE_USES = [0, 0, 5, 10, 15, 20]
export const CHEER_STAGE_GEMS = [0, 0, 1, 2, 3, 4]

const CHEER_IDS = new Set(CHEERS.map((item) => item.id))
const LOOK_IDS = new Set(LOOKS.map((item) => item.id))

function asCount(value) {
  const n = Math.floor(Number(value) || 0)
  return n > 0 ? n : 0
}

function asCheerStages(book, owned) {
  const raw = book?.cheerStages && typeof book.cheerStages === 'object' ? book.cheerStages : {}
  const fallback = Math.min(CHEER_STAGE_MAX, Math.max(1, Math.floor(Number(book?.cheerStage) || 0) || 1))
  const out = {}
  for (const id of owned) {
    const n = Math.min(CHEER_STAGE_MAX, Math.max(1, Math.floor(Number(raw[id]) || 0) || fallback))
    out[id] = n
  }
  return out
}

export function normalizePurse(book) {
  const cheers = Array.isArray(book?.cheers)
    ? book.cheers.map((id) => String(id)).filter((id) => CHEER_IDS.has(id))
    : []
  const owned = cheers.includes('lime') ? cheers : ['lime', ...cheers]
  const cheerOn = CHEER_IDS.has(book?.cheerOn) && owned.includes(book.cheerOn) ? book.cheerOn : 'lime'
  const looks = Array.isArray(book?.looks)
    ? book.looks.map((id) => String(id)).filter((id) => LOOK_IDS.has(id))
    : []
  const lookOwned = looks.includes('lime') ? looks : ['lime', ...looks]
  const lookOn = LOOK_IDS.has(book?.lookOn) && lookOwned.includes(book.lookOn) ? book.lookOn : 'lime'
  const cheerUses = asCount(book?.cheerUses)
  const cheerStages = asCheerStages(book, owned)
  const cheerStage = Math.max(cheerStages[cheerOn] || 1, stageFromUses(cheerUses))
  return {
    coins: asCount(book?.coins),
    gems: asCount(book?.gems),
    cheers: owned,
    cheerOn,
    looks: lookOwned,
    lookOn,
    cheerUses,
    cheerStage,
    cheerStages: { ...cheerStages, [cheerOn]: cheerStage },
  }
}

export function stampPurse(book, purse) {
  const next = normalizePurse(purse)
  return { ...book, ...next }
}

export function mergePurses(boards) {
  const list = boards || []
  if (!list.length) return normalizePurse(null)
  const purses = list.map(normalizePurse)
  const coinsSame = purses.every((item) => item.coins === purses[0].coins)
  const gemsSame = purses.every((item) => item.gems === purses[0].gems)
  return {
    coins: coinsSame ? purses[0].coins : purses.reduce((n, item) => n + item.coins, 0),
    gems: gemsSame ? purses[0].gems : purses.reduce((n, item) => n + item.gems, 0),
    cheers: [...new Set(purses.flatMap((item) => item.cheers))],
    cheerOn: purses.find((item) => item.cheerOn !== 'lime')?.cheerOn || purses[0].cheerOn,
    looks: [...new Set(purses.flatMap((item) => item.looks))],
    lookOn: purses.find((item) => item.lookOn !== 'lime')?.lookOn || purses[0].lookOn,
    cheerUses: Math.max(...purses.map((item) => item.cheerUses)),
    cheerStage: Math.max(...purses.map((item) => item.cheerStage)),
    cheerStages: Object.fromEntries(
      [...new Set(purses.flatMap((item) => Object.keys(item.cheerStages || {})))].map((id) => [
        id,
        Math.max(...purses.map((item) => item.cheerStages?.[id] || 1)),
      ]),
    ),
  }
}

export function alignShelfPurse(shelf) {
  if (!shelf?.boards?.length) return shelf
  const purse = mergePurses(shelf.boards)
  return {
    ...shelf,
    ...purse,
    boards: shelf.boards.map((book) => stampPurse(book, purse)),
  }
}

export function spreadPurseFrom(shelf, book) {
  if (!shelf?.boards?.length) return shelf
  const from = normalizePurse(book || shelf.boards[0])
  const merged = mergePurses(shelf.boards)
  const purse = {
    ...merged,
    coins: from.coins,
    gems: from.gems,
    cheerUses: from.cheerUses,
    cheerStage: from.cheerStage,
    cheerStages: from.cheerStages,
    lookOn: from.lookOn,
    cheerOn: from.cheerOn,
    looks: [...new Set([...merged.looks, ...from.looks])],
    cheers: [...new Set([...merged.cheers, ...from.cheers])],
  }
  return {
    ...shelf,
    ...purse,
    boards: shelf.boards.map((item) => stampPurse(item, purse)),
  }
}

export function stageFromUses(uses) {
  let stage = 1
  for (let next = 2; next <= CHEER_STAGE_MAX; next += 1) {
    if (uses >= CHEER_STAGE_USES[next]) stage = next
  }
  return stage
}

export function nextCheerStage(stage) {
  const n = Math.min(CHEER_STAGE_MAX, Math.max(1, Math.floor(Number(stage) || 1)))
  return n < CHEER_STAGE_MAX ? n + 1 : 0
}

export function coinsFor(status, book, row, clock = new Date()) {
  if (status !== 'yes' && status !== 'late') return 0
  const today = boardDate(clock, book.dayFoldHour)
  const born = row?.lamp?.createdOn || ''
  if (born && born >= today) return 0
  if (tapsPaidTonight(book, clock) >= 2) return 0
  return status === 'yes' ? 2 : 1
}

function tapsPaidTonight(book, clock) {
  const today = boardDate(clock, book.dayFoldHour)
  const lamps = book.lamps || []
  return (book.answers || []).filter((answer) => {
    if (answer.status !== 'yes' && answer.status !== 'late') return false
    const lamp = lamps.find((item) => item.id === answer.lampId)
    if (lamp?.createdOn && lamp.createdOn >= today) return false
    const period = String(answer.periodKey || '')
    const at = String(answer.answeredAt || '')
    return period === today || period.startsWith(today) || at.startsWith(today)
  }).length
}

export function payTap(before, after, row, status, clock = new Date()) {
  const purse = normalizePurse(after)
  const prev = (before.answers || []).find(
    (item) => item.lampId === row?.lamp?.id && item.periodKey === row?.periodKey,
  )
  const paid = prev && (prev.status === 'yes' || prev.status === 'late')
  let coins = purse.coins
  let gems = purse.gems
  if (!paid) coins += coinsFor(status, before, row, clock)
  if (!allClearTonight(before, clock) && allClearTonight(after, clock)) gems += 1
  return { ...after, ...purse, coins, gems }
}

export function noteCheer(book) {
  const purse = normalizePurse(book)
  const id = purse.cheerOn
  const cheerUses = purse.cheerUses + 1
  const fromUse = stageFromUses(cheerUses)
  const cheerStages = {
    ...purse.cheerStages,
    [id]: Math.max(purse.cheerStages[id] || 1, fromUse),
  }
  return {
    ...book,
    ...purse,
    cheerUses,
    cheerStages,
    cheerStage: cheerStages[id],
  }
}

export function cheerStageOf(book, id) {
  const purse = normalizePurse(book)
  if (!purse.cheers.includes(id)) return 1
  return purse.cheerStages[id] || 1
}

export function fireCheer(kind, stage = 1) {
  if (typeof window === 'undefined') return
  const n = Math.min(CHEER_STAGE_MAX, Math.max(1, Math.floor(Number(stage) || 1)))
  window.dispatchEvent(new CustomEvent('did-i-cheer', { detail: { kind: kind || 'lime', stage: n } }))
}

export function buyLook(book, id) {
  const look = LOOKS.find((item) => item.id === id)
  const purse = normalizePurse(book)
  if (!look) return { book, miss: 'That look is gone.' }
  if (purse.looks.includes(id)) {
    return { book: { ...book, ...purse, lookOn: id }, miss: '' }
  }
  if (look.coins > purse.coins) return { book, miss: `Need ${look.coins} coins.` }
  return {
    book: {
      ...book,
      ...purse,
      coins: purse.coins - look.coins,
      looks: [...purse.looks, id],
      lookOn: id,
    },
    miss: '',
  }
}

export function buyCheerStage(book, id) {
  const purse = normalizePurse(book)
  const cheerId = CHEER_IDS.has(id) ? id : purse.cheerOn
  if (!purse.cheers.includes(cheerId)) return { book, miss: 'Buy that cheer first.' }
  const next = nextCheerStage(purse.cheerStages[cheerId] || 1)
  if (!next) return { book: { ...book, ...purse }, miss: 'Stage is full.' }
  const cost = CHEER_STAGE_GEMS[next]
  if (purse.gems < cost) return { book, miss: `Need ${cost} ${cost === 1 ? 'gem' : 'gems'}.` }
  const cheerStages = { ...purse.cheerStages, [cheerId]: next }
  return {
    book: {
      ...book,
      ...purse,
      gems: purse.gems - cost,
      cheerStages,
      cheerStage: cheerId === purse.cheerOn ? next : purse.cheerStage,
      cheerUses: Math.max(purse.cheerUses, CHEER_STAGE_USES[next]),
    },
    miss: '',
  }
}

export function buyCheer(book, id) {
  const cheer = CHEERS.find((item) => item.id === id)
  const purse = normalizePurse(book)
  if (!cheer) return { book, miss: 'That cheer is gone.' }
  if (purse.cheers.includes(id)) {
    return { book: { ...book, ...purse, cheerOn: id }, miss: '' }
  }
  if (cheer.gems > purse.gems) return { book, miss: `Need ${cheer.gems} gems.` }
  return {
    book: {
      ...book,
      ...purse,
      gems: purse.gems - cheer.gems,
      cheers: [...purse.cheers, id],
      cheerOn: id,
      cheerStages: { ...purse.cheerStages, [id]: purse.cheerStages[id] || 1 },
    },
    miss: '',
  }
}
