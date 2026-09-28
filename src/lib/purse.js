import { accountSessionOn } from './session-id.js'
import { allClearTonight, boardDate } from './recurrence.js'

// One price for every cheer while the economy is still being tuned.
export const CHEER_GEMS = 2
export const CHEER_STAGE_COIN = 15
export const LOOK_GEM_PRICE = 2
export const BUDDY_GEMS = 5
// ~4 coins/night cap (2 paid taps × 2). About a week of that buys a look.
export const LOOK_COIN_PRICE = 30
// Shop drops (docs/shop-drops.md): an item with `from: 'YYYY-MM-DD'` stays out of
// the shop until that day, so a finished batch can ship early and appear on
// its date. Items without `from` are always in.
export function isLive(item, today = boardDate(new Date())) {
  return !item?.from || item.from <= today
}

const ALL_CHEERS = [
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
  { id: 'confetti', gems: CHEER_GEMS, from: '2026-10-09' },
  { id: 'heart', gems: CHEER_GEMS, from: '2026-10-09' },
  { id: 'medal', gems: CHEER_GEMS, from: '2026-10-23' },
  { id: 'sun', gems: CHEER_GEMS, from: '2026-10-23' },
]

export const FREE_BUDDY = 'ant'

const ALL_BUDDIES = [
  { id: 'ant', gems: 0 },
  { id: 'cat', gems: BUDDY_GEMS },
  { id: 'dog', gems: BUDDY_GEMS },
  { id: 'rabbit', gems: BUDDY_GEMS },
  { id: 'owl', gems: BUDDY_GEMS },
  { id: 'possum', gems: BUDDY_GEMS },
  { id: 'frog', gems: BUDDY_GEMS, from: '2026-10-09' },
  { id: 'penguin', gems: BUDDY_GEMS, from: '2026-10-23' },
]

const ALL_LOOKS = [
  { id: 'lime', coins: 0, gems: 0 },
  { id: 'ink', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'brass', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'night', coins: LOOK_COIN_PRICE, gems: 0 },
  { id: 'moss', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'plum', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'rose', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'steel', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'wine', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'glow', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'ember', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'frost', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'pulse', coins: 0, gems: LOOK_GEM_PRICE },
  { id: 'jade', coins: 0, gems: LOOK_GEM_PRICE, from: '2026-10-09' },
  { id: 'indigo', coins: 0, gems: LOOK_GEM_PRICE, from: '2026-10-09' },
  { id: 'clay', coins: LOOK_COIN_PRICE, gems: 0, from: '2026-10-09' },
  { id: 'sky', coins: 0, gems: LOOK_GEM_PRICE, from: '2026-10-23' },
  { id: 'orchid', coins: 0, gems: LOOK_GEM_PRICE, from: '2026-10-23' },
  { id: 'chalk', coins: LOOK_COIN_PRICE, gems: 0, from: '2026-10-23' },
]

export const CHEERS = ALL_CHEERS.filter((item) => isLive(item))
export const BUDDIES = ALL_BUDDIES.filter((item) => isLive(item))
export const LOOKS = ALL_LOOKS.filter((item) => isLive(item))

// A drop shows as "Coming" for the week before its day, then goes on sale.
// Anything further out stays hidden.
export const TEASE_DAYS = 7

function daysBefore(iso, days) {
  const at = new Date(`${iso}T12:00:00Z`)
  at.setUTCDate(at.getUTCDate() - days)
  return at.toISOString().slice(0, 10)
}

export function isTeased(item, today = boardDate(new Date())) {
  if (!item?.from || item.from <= today) return false
  return daysBefore(item.from, TEASE_DAYS) <= today
}

// The next drop inside its teaser week, or null.
export function comingDrop(today = boardDate(new Date())) {
  const pick = (list) => list.filter((item) => isTeased(item, today))
  const all = [...pick(ALL_LOOKS), ...pick(ALL_CHEERS), ...pick(ALL_BUDDIES)]
  if (!all.length) return null
  const date = all.reduce((low, item) => (item.from < low ? item.from : low), all[0].from)
  const on = (list) => pick(list).filter((item) => item.from === date)
  return { date, looks: on(ALL_LOOKS), cheers: on(ALL_CHEERS), buddies: on(ALL_BUDDIES) }
}

// Slides for the shop's drop carousel, first to last: the Coming drop (if in
// its week), then released drops newest first. Before any dated drop exists,
// one "new in the shop" slide of the newest items keeps the carousel full.
export const DROP_SLIDES_MAX = 4

function daysUntil(iso, today) {
  const ms = Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)
  return Math.round(ms / 86400000)
}

function slideItems(date) {
  const at = (list, type) => list.filter((item) => item.from === date).map((item) => ({ type, item }))
  return [...at(ALL_LOOKS, 'look'), ...at(ALL_CHEERS, 'cheer'), ...at(ALL_BUDDIES, 'buddy')]
}

export function dropSlides(today = boardDate(new Date())) {
  const slides = []
  const coming = comingDrop(today)
  if (coming) {
    slides.push({ kind: 'coming', date: coming.date, days: daysUntil(coming.date, today), items: slideItems(coming.date) })
  }
  const dates = [...new Set([...LOOKS, ...CHEERS, ...BUDDIES].map((item) => item.from).filter(Boolean))]
    .filter((date) => date <= today)
    .sort()
    .reverse()
  for (const date of dates.slice(0, DROP_SLIDES_MAX)) {
    slides.push({ kind: 'drop', date, items: slideItems(date) })
  }
  if (!dates.length) {
    slides.push({
      kind: 'fresh',
      date: '',
      items: [
        ...recentLooks(2).map((item) => ({ type: 'look', item })),
        ...recentCheers(2).map((item) => ({ type: 'cheer', item })),
        ...recentBuddies(2).map((item) => ({ type: 'buddy', item })),
      ],
    })
  }
  return slides
}

// What a tile says under its name: owned, or its price.
export function shopTag(purse, type, item) {
  const owned =
    (type === 'look' && purse.looks.includes(item.id)) ||
    (type === 'cheer' && purse.cheers.includes(item.id)) ||
    (type === 'buddy' && purse.buddies.includes(item.id))
  if (owned) return { owned: true, gems: 0, coins: 0 }
  return { owned: false, gems: Number(item.gems) || 0, coins: Number(item.coins) || 0 }
}

// Everything, released or not, for checks and the drop calendar.
export const SHOP_CALENDAR = { cheers: ALL_CHEERS, buddies: ALL_BUDDIES, looks: ALL_LOOKS }

// The newest drop that is out: every item sharing the latest `from` date.
function newestDrop(list) {
  const dated = list.filter((item) => item.from)
  if (!dated.length) return []
  const latest = dated.reduce((top, item) => (item.from > top ? item.from : top), '')
  return dated.filter((item) => item.from === latest)
}

export function cheerText(id, field) {
  return `cheer.${id}.${field}`
}

export function lookText(id, field) {
  return `look.${id}.${field}`
}

export function buddyText(id, field) {
  return `buddy.${id}.${field}`
}

export const GEM_LOOK_IDS = [
  'glow',
  'ember',
  'frost',
  'pulse',
  'moss',
  'plum',
  'rose',
  'steel',
  'wine',
  'jade',
  'indigo',
  'sky',
  'orchid',
]

export function isGemLook(id) {
  return GEM_LOOK_IDS.includes(id)
}

export function recentLooks(count = 2) {
  const drop = newestDrop(LOOKS)
  if (drop.length) return drop
  const n = Math.max(1, Math.floor(Number(count) || 2))
  const gem = LOOKS.filter((item) => item.gems > 0)
  if (gem.length) return gem.slice(0, Math.min(n, gem.length))
  return LOOKS.slice(-n)
}

export function recentCheers(count = 2) {
  const drop = newestDrop(CHEERS)
  if (drop.length) return drop
  const n = Math.max(1, Math.floor(Number(count) || 2))
  return CHEERS.slice(-n)
}

export function recentBuddies(count = 2) {
  const drop = newestDrop(BUDDIES)
  if (drop.length) return drop
  const n = Math.max(1, Math.floor(Number(count) || 2))
  return BUDDIES.slice(-n)
}

export const FRIEND_CHEER_GEMS = 1
export const FRIEND_CHEERS_PER_GEM = 5
export const FRIEND_CHEER_CAP = 20

export const CHEER_STAGE_MAX = 5
export const CHEER_STAGE_USES = [0, 0, 5, 10, 15, 20]
export const CHEER_STAGE_COINS = [0, 0, CHEER_STAGE_COIN, CHEER_STAGE_COIN, CHEER_STAGE_COIN, CHEER_STAGE_COIN]

const CHEER_IDS = new Set(CHEERS.map((item) => item.id))
const LOOK_IDS = new Set(LOOKS.map((item) => item.id))
const BUDDY_IDS = new Set(BUDDIES.map((item) => item.id))

function asCount(value) {
  const n = Math.floor(Number(value) || 0)
  return n > 0 ? n : 0
}

function asFriendCheers(value) {
  const n = Math.floor(Number(value) || 0)
  if (n < 0) return 0
  return Math.min(FRIEND_CHEER_CAP, n)
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
  const rawCheerOn = book?.cheerOn
  const cheerOn =
    rawCheerOn === ''
      ? ''
      : CHEER_IDS.has(rawCheerOn) && owned.includes(rawCheerOn)
        ? rawCheerOn
        : 'lime'
  const looks = Array.isArray(book?.looks)
    ? book.looks.map((id) => String(id)).filter((id) => LOOK_IDS.has(id))
    : []
  const lookOwned = looks.includes('lime') ? looks : ['lime', ...looks]
  const lookOn = LOOK_IDS.has(book?.lookOn) && lookOwned.includes(book.lookOn) ? book.lookOn : 'lime'
  const buddyList = Array.isArray(book?.buddies)
    ? book.buddies.map((id) => String(id)).filter((id) => BUDDY_IDS.has(id))
    : []
  // Everyone has the ant, like the lime look and cheer.
  const buddies = buddyList.includes(FREE_BUDDY) ? buddyList : [FREE_BUDDY, ...buddyList]
  const buddyOn =
    BUDDY_IDS.has(book?.buddyOn) && buddies.includes(book.buddyOn) ? book.buddyOn : ''
  const cheerUses = asCount(book?.cheerUses)
  const cheerStages = asCheerStages(book, owned)
  const cheerStage = cheerOn
    ? Math.max(cheerStages[cheerOn] || 1, stageFromUses(cheerUses))
    : 1
  const stages = cheerOn ? { ...cheerStages, [cheerOn]: cheerStage } : cheerStages
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
    friendCheers: asFriendCheers(book?.friendCheers),
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
    friendCheers: Math.max(...purses.map((item) => item.friendCheers)),
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
    friendCheers: from.friendCheers,
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
export function weeklyGemBump(shelf, prevShelf, clock = new Date(), opts = {}) {
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

  if (opts.accountSync) {
    return { ...shelf, gemWeek: week }
  }

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
  if (!paid && !accountSessionOn()) coins += coinsFor(status, before, row, clock)
  return { ...after, ...purse, coins }
}

export function noteCheer(book) {
  const purse = normalizePurse(book)
  const id = purse.cheerOn
  if (!id) return book
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

export function fireCheer(kind, stage = 1, look, theme, preview = false) {
  if (typeof window === 'undefined' || !kind) return
  const n = Math.min(CHEER_STAGE_MAX, Math.max(1, Math.floor(Number(stage) || 1)))
  const detail = { kind: kind || 'lime', stage: n, preview: Boolean(preview) }
  if (look) detail.look = look
  if (theme) detail.theme = theme
  if (typeof window.__didIEmit === 'function') {
    window.__didIEmit('did-i-cheer', detail)
    return
  }
  let event = null
  try {
    event = new CustomEvent('did-i-cheer', { detail })
  } catch {
    event = null
  }
  if (!event || event.detail == null) {
    window.dispatchEvent({ type: 'did-i-cheer', detail })
    return
  }
  window.dispatchEvent(event)
}

// A reward, not a purchase. Invites pay scaling gems and the odd look.
export function giveCoins(book, coins, looks = []) {
  const purse = normalizePurse(book)
  const won = looks.filter((id) => LOOK_IDS.has(id) && !purse.looks.includes(id))
  const paid = accountSessionOn() ? 0 : Math.max(0, Math.floor(Number(coins) || 0))
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

export function applyInvitePayout(book, won) {
  const coins = Math.max(0, Math.floor(Number(won?.coins) || 0))
  const looks = Array.isArray(won?.looks) ? won.looks : []
  if (!coins && !looks.length) return book
  return giveCoins(book, coins, looks)
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
/** One gem adds five cheers. They sit in the balance until a cheer spends one. */
export function buyFriendCheers(book) {
  const purse = normalizePurse(book)
  if (purse.gems < FRIEND_CHEER_GEMS) return { book: stampPurse(book, purse), miss: 'gems' }
  if (purse.friendCheers + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP) {
    return { book: stampPurse(book, purse), miss: 'cap' }
  }
  return {
    book: stampPurse(book, {
      ...purse,
      gems: purse.gems - FRIEND_CHEER_GEMS,
      friendCheers: purse.friendCheers + FRIEND_CHEERS_PER_GEM,
    }),
    miss: '',
  }
}

export function takeFriendCheer(book) {
  const purse = normalizePurse(book)
  if (purse.friendCheers < 1) return { book: stampPurse(book, purse), miss: 'cheers' }
  return {
    book: stampPurse(book, { ...purse, friendCheers: purse.friendCheers - 1 }),
    miss: '',
  }
}

export function friendCheerMissKey(miss) {
  if (miss === 'gems') return { key: 'friends.needGems', vars: { n: FRIEND_CHEER_GEMS } }
  if (miss === 'cap') return { key: 'friends.cheerCap', vars: { n: FRIEND_CHEER_CAP } }
  if (miss === 'cheers') return { key: 'friends.cheerNeed', vars: {} }
  return null
}

export function applyFriendCheerStock(book, gems, cheers) {
  const purse = normalizePurse(book)
  return stampPurse(book, {
    ...purse,
    gems: asCount(gems),
    friendCheers: cheers == null ? purse.friendCheers : asFriendCheers(cheers),
  })
}

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
  const cost = CHEER_STAGE_COINS[next]
  if (purse.coins < cost) return { book, miss: 'shop.miss.needCoins', missN: cost }
  const cheerStages = { ...purse.cheerStages, [cheerId]: next }
  return {
    book: {
      ...book,
      ...purse,
      coins: purse.coins - cost,
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

// An empty id is the off slot, not a bad id. Cheers stay quiet until picked.
export function wearCheer(book, id) {
  const purse = normalizePurse(book)
  if (!id) return { book: { ...book, ...purse, cheerOn: '' }, miss: '' }
  if (!purse.cheers.includes(id)) return buyCheer(book, id)
  return { book: { ...book, ...purse, cheerOn: id }, miss: '' }
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

