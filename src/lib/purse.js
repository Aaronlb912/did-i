import { allClearTonight, boardDate } from './recurrence.js'

// One price for every cheer while the economy is still being tuned.
export const CHEER_GEMS = 5
// About fifteen dollars at the one-dollar gem list price.
export const BUDDY_GEMS = 15
// ~4 coins/night cap (2 paid taps × 2). About a week of that buys a look.
export const LOOK_COIN_PRICE = 30

export const CHEERS = [
  { id: 'lime', gems: 0 },
  { id: 'tape', gems: CHEER_GEMS },
  { id: 'paper', gems: CHEER_GEMS },
  { id: 'boom', gems: CHEER_GEMS },
  { id: 'night', gems: CHEER_GEMS },
  { id: 'dance', gems: CHEER_GEMS },
  { id: 'stamp', gems: CHEER_GEMS },
  { id: 'rain', gems: CHEER_GEMS },
  { id: 'check', gems: CHEER_GEMS },
  { id: 'bubble', gems: CHEER_GEMS },
  { id: 'spark', gems: CHEER_GEMS },
  { id: 'flip', gems: CHEER_GEMS },
]

export const BUDDIES = [
  { id: 'cat', gems: BUDDY_GEMS },
  { id: 'dog', gems: BUDDY_GEMS },
]

export const LOOKS = [
  { id: 'lime', coins: 0, gems: 0 },
  { id: 'ink', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'brass', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'night', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'moss', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'plum', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'rose', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'steel', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'wine', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'glow', coins: 0, gems: 4 },
  { id: 'ember', coins: 0, gems: 4 },
  { id: 'frost', coins: 0, gems: 4 },
  { id: 'pulse', coins: 0, gems: 4 },
]

export function cheerText(id, field) {
  return `cheer.${id}.${field}`
}

export function lookText(id, field) {
  return `look.${id}.${field}`
}

export function buddyText(id, field) {
  return `buddy.${id}.${field}`
}

export function recentLooks(count = 2) {
  const n = Math.max(1, Math.floor(Number(count) || 2))
  return LOOKS.slice(-n)
}

export function recentCheers(count = 2) {
  const n = Math.max(1, Math.floor(Number(count) || 2))
  return CHEERS.slice(-n)
}

export const FRIEND_CHEER_GEMS = 1
export const FAMILY_CHEER_GEMS = 1

export const CHEER_STAGE_MAX = 5
export const CHEER_STAGE_USES = [0, 0, 5, 10, 15, 20]
export const CHEER_STAGE_GEMS = [0, 0, 1, 2, 3, 4]

const CHEER_IDS = new Set(CHEERS.map((item) => item.id))
const LOOK_IDS = new Set(LOOKS.map((item) => item.id))
const BUDDY_IDS = new Set(BUDDIES.map((item) => item.id))

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

function asCheerPlayStages(book, owned, cheerStages) {
  const raw = book?.cheerPlayStages && typeof book.cheerPlayStages === 'object' ? book.cheerPlayStages : {}
  const out = {}
  for (const id of owned) {
    const cap = cheerStages[id] || 1
    const n = Math.min(cap, Math.max(1, Math.floor(Number(raw[id]) || 0) || cap))
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
  const buddies = Array.isArray(book?.buddies)
    ? book.buddies.map((id) => String(id)).filter((id) => BUDDY_IDS.has(id))
    : []
  const buddyOn =
    BUDDY_IDS.has(book?.buddyOn) && buddies.includes(book.buddyOn) ? book.buddyOn : ''
  const cheerUses = asCount(book?.cheerUses)
  const cheerStages = asCheerStages(book, owned)
  const cheerStage = Math.max(cheerStages[cheerOn] || 1, stageFromUses(cheerUses))
  const stages = { ...cheerStages, [cheerOn]: cheerStage }
  const cheerPlayStages = asCheerPlayStages(book, owned, stages)
  return {
    coins: asCount(book?.coins),
    gems: asCount(book?.gems),
    cheers: owned,
    cheerOn,
    looks: lookOwned,
    lookOn,
    buddies,
    buddyOn,
    cheerUses,
    cheerStage,
    cheerStages: stages,
    cheerPlayStages,
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
    buddies: [...new Set(purses.flatMap((item) => item.buddies))],
    buddyOn: purses.find((item) => item.buddyOn)?.buddyOn || '',
    cheerUses: Math.max(...purses.map((item) => item.cheerUses)),
    cheerStage: Math.max(...purses.map((item) => item.cheerStage)),
    cheerStages: Object.fromEntries(
      [...new Set(purses.flatMap((item) => Object.keys(item.cheerStages || {})))].map((id) => [
        id,
        Math.max(...purses.map((item) => item.cheerStages?.[id] || 1)),
      ]),
    ),
    cheerPlayStages: Object.fromEntries(
      [...new Set(purses.flatMap((item) => Object.keys(item.cheerPlayStages || {})))].map((id) => [
        id,
        Math.max(...purses.map((item) => item.cheerPlayStages?.[id] || 1)),
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
    cheerPlayStages: from.cheerPlayStages,
    lookOn: from.lookOn,
    cheerOn: from.cheerOn,
    buddyOn: from.buddyOn,
    looks: [...new Set([...merged.looks, ...from.looks])],
    cheers: [...new Set([...merged.cheers, ...from.cheers])],
    buddies: [...new Set([...merged.buddies, ...from.buddies])],
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

export function gemWeekKey(clock = new Date(), dayFoldHour = 0) {
  const date = boardDate(clock, dayFoldHour)
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// One gem per week, the first night you clear. shelf.gemWeek remembers.
export function weeklyGemBump(shelf, prevShelf, clock = new Date()) {
  if (!shelf?.boards?.length) return shelf
  const fold = shelf.boards.find((b) => b.id === shelf.currentId)?.dayFoldHour ?? 0
  const week = gemWeekKey(clock, fold)
  if ((shelf.gemWeek || prevShelf?.gemWeek || '') === week) return shelf

  const prevMap = new Map((prevShelf?.boards || []).map((b) => [b.id, b]))
  let hit = false
  for (const book of shelf.boards) {
    const before = prevMap.get(book.id) || book
    if (!allClearTonight(before, clock) && allClearTonight(book, clock)) {
      hit = true
      break
    }
  }
  if (!hit) return shelf

  const boards = shelf.boards.map((book) => {
    if (book.id !== shelf.currentId) return book
    const purse = normalizePurse(book)
    return { ...book, gems: purse.gems + 1 }
  })
  return { ...shelf, gemWeek: week, boards }
}

export function payTap(before, after, row, status, clock = new Date()) {
  const purse = normalizePurse(after)
  const prev = (before.answers || []).find(
    (item) => item.lampId === row?.lamp?.id && item.periodKey === row?.periodKey,
  )
  const paid = prev && (prev.status === 'yes' || prev.status === 'late')
  let coins = purse.coins
  if (!paid) coins += coinsFor(status, before, row, clock)
  return { ...after, ...purse, coins }
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

export function cheerPlayOf(book, id) {
  const purse = normalizePurse(book)
  const kind = CHEER_IDS.has(id) ? id : purse.cheerOn
  const owned = purse.cheerStages[kind] || 1
  const play = Math.floor(Number(purse.cheerPlayStages?.[kind]) || owned)
  return Math.min(owned, Math.max(1, play))
}

export function wearCheerStage(book, id, stage) {
  const purse = normalizePurse(book)
  if (!purse.cheers.includes(id)) return { book, miss: 'shop.miss.buyCheerFirst' }
  const owned = purse.cheerStages[id] || 1
  const n = Math.min(owned, Math.max(1, Math.floor(Number(stage) || 1)))
  return {
    book: {
      ...book,
      ...purse,
      cheerOn: id,
      cheerPlayStages: { ...purse.cheerPlayStages, [id]: n },
    },
    miss: '',
  }
}

export function fireCheer(kind, stage = 1, look, theme) {
  if (typeof window === 'undefined') return
  const n = Math.min(CHEER_STAGE_MAX, Math.max(1, Math.floor(Number(stage) || 1)))
  const detail = { kind: kind || 'lime', stage: n }
  if (look) detail.look = look
  if (theme) detail.theme = theme
  window.dispatchEvent(new CustomEvent('did-i-cheer', { detail }))
}

// A reward, not a purchase. Invites pay coins and the odd look. Gems are
// still only for a finished night.
export function giveCoins(book, coins, looks = []) {
  const purse = normalizePurse(book)
  const won = looks.filter((id) => LOOK_IDS.has(id) && !purse.looks.includes(id))
  const paid = Math.max(0, Math.floor(Number(coins) || 0))
  if (!paid && !won.length) return book
  return {
    ...book,
    ...purse,
    coins: purse.coins + paid,
    looks: [...purse.looks, ...won],
  }
}

export function addGems(book, gems) {
  const purse = normalizePurse(book)
  const paid = Math.max(0, Math.floor(Number(gems) || 0))
  if (!paid) return book
  return { ...book, ...purse, gems: purse.gems + paid }
}

export function addGemsShelf(shelf, gems) {
  if (!shelf?.boards?.length) return shelf
  const paid = Math.max(0, Math.floor(Number(gems) || 0))
  if (!paid) return shelf
  const boards = shelf.boards.map((book) => addGems(book, paid))
  return alignShelfPurse({ ...shelf, boards })
}

// Cheering somebody on Did I tonight. Gems come from finished nights, so
// a cheer costs something you had to earn.
export function spendGems(book, gems) {
  const purse = normalizePurse(book)
  const cost = Math.max(0, Math.floor(Number(gems) || 0))
  if (purse.gems < cost) return { book, miss: 'gems' }
  return { book: { ...book, ...purse, gems: purse.gems - cost }, miss: '' }
}

export function buyLook(book, id) {
  const look = LOOKS.find((item) => item.id === id)
  const purse = normalizePurse(book)
  if (!look) return { book, miss: 'shop.miss.lookGone' }
  if (purse.looks.includes(id)) {
    return { book: { ...book, ...purse, lookOn: id }, miss: '' }
  }
  const costGems = Math.max(0, Math.floor(Number(look.gems) || 0))
  const costCoins = Math.max(0, Math.floor(Number(look.coins) || 0))
  if (costGems && purse.gems < costGems) {
    return { book, miss: 'shop.miss.needGems', missN: costGems }
  }
  if (costCoins && purse.coins < costCoins) {
    return { book, miss: 'shop.miss.needCoins', missN: costCoins }
  }
  return {
    book: {
      ...book,
      ...purse,
      coins: purse.coins - costCoins,
      gems: purse.gems - costGems,
      looks: [...purse.looks, id],
      lookOn: id,
    },
    miss: '',
  }
}

export function mergeGiftCheers(book, ids) {
  const purse = normalizePurse(book)
  const won = (ids || []).filter((id) => CHEER_IDS.has(id) && !purse.cheers.includes(id))
  if (!won.length) return book
  const cheers = [...purse.cheers, ...won]
  const cheerStages = { ...purse.cheerStages }
  const cheerPlayStages = { ...purse.cheerPlayStages }
  for (const id of won) {
    cheerStages[id] = cheerStages[id] || 1
    cheerPlayStages[id] = cheerPlayStages[id] || 1
  }
  return { ...book, ...purse, cheers, cheerStages, cheerPlayStages }
}

export function buyCheerStage(book, id) {
  const purse = normalizePurse(book)
  const cheerId = CHEER_IDS.has(id) ? id : purse.cheerOn
  if (!purse.cheers.includes(cheerId)) return { book, miss: 'shop.miss.buyCheerFirst' }
  const next = nextCheerStage(purse.cheerStages[cheerId] || 1)
  if (!next) return { book: { ...book, ...purse }, miss: 'shop.miss.stageFull' }
  const cost = CHEER_STAGE_GEMS[next]
  if (purse.gems < cost) return { book, miss: 'shop.miss.needGems', missN: cost }
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

export function buyBuddy(book, id) {
  const buddy = BUDDIES.find((item) => item.id === id)
  const purse = normalizePurse(book)
  if (!buddy) return { book, miss: 'shop.miss.buddyGone' }
  if (purse.buddies.includes(id)) {
    return { book: { ...book, ...purse, buddyOn: id }, miss: '' }
  }
  if (buddy.gems > purse.gems) return { book, miss: 'shop.miss.needGems', missN: buddy.gems }
  return {
    book: {
      ...book,
      ...purse,
      gems: purse.gems - buddy.gems,
      buddies: [...purse.buddies, id],
      buddyOn: id,
    },
    miss: '',
  }
}

export function wearBuddy(book, id) {
  const purse = normalizePurse(book)
  if (!id) return { book: { ...book, ...purse, buddyOn: '' }, miss: '' }
  if (!purse.buddies.includes(id)) return { book, miss: 'shop.miss.buyBuddyFirst' }
  return { book: { ...book, ...purse, buddyOn: id }, miss: '' }
}

export function buyCheer(book, id) {
  const cheer = CHEERS.find((item) => item.id === id)
  const purse = normalizePurse(book)
  if (!cheer) return { book, miss: 'shop.miss.cheerGone' }
  if (purse.cheers.includes(id)) {
    return { book: { ...book, ...purse, cheerOn: id }, miss: '' }
  }
  if (cheer.gems > purse.gems) return { book, miss: 'shop.miss.needGems', missN: cheer.gems }
  return {
    book: {
      ...book,
      ...purse,
      gems: purse.gems - cheer.gems,
      cheers: [...purse.cheers, id],
      cheerOn: id,
      cheerStages: { ...purse.cheerStages, [id]: purse.cheerStages[id] || 1 },
      cheerPlayStages: { ...purse.cheerPlayStages, [id]: purse.cheerPlayStages[id] || 1 },
    },
    miss: '',
  }
}
