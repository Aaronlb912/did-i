import { hallHeat, shelfStreak } from './hall-feel.js'
import { readShelf } from './board-shelf.js'
import { hasLocaleKey, t } from './i18n.js'
import { questionStreak } from './lamp-record.js'
import { SHOP_BUDDIES, CHEERS, FREE_BUDDY, LOOKS, mergePurses } from './purse.js'
import {
  addDaysIso,
  allClearTonight,
  boardDate,
  countedTonightRows,
  dueTonight,
  parseIsoDate,
} from './recurrence.js'

// The first fourteen, each with its own words (mark.<id>.name / line / how).
export const MARK_IDS = [
  'first-open',
  'first-did',
  'honest-skip',
  'late-ok',
  'hall-on',
  'heat-3',
  'heat-5',
  'showed-3',
  'showed-7',
  'come-back',
  'seven-door',
  'hung-five',
  'month-bill',
  'quiet-week',
]

const START_SECTION = {
  'first-open': 'start',
  'first-did': 'start',
  'honest-skip': 'honest',
  'late-ok': 'honest',
  'hall-on': 'start',
  'heat-3': 'streak',
  'heat-5': 'streak',
  'showed-3': 'nights',
  'showed-7': 'nights',
  'come-back': 'nights',
  'seven-door': 'questions',
  'hung-five': 'questions',
  'month-bill': 'questions',
  'quiet-week': 'streak',
}

// Tiers. Each is its own achievement, id "<group>-<n>", sharing one set of
// words with {n} (ach.<group>.name / line / how). The steps widen fast so
// they stay rare: most take weeks, the last ones years.
const TIERS = [
  { group: 'dids', section: 'start', stat: 'dids', at: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000] },
  { group: 'streak', section: 'streak', stat: 'streak', at: [7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365, 500, 730, 1000] },
  { group: 'opens', section: 'nights', stat: 'opens', at: [14, 30, 60, 100, 200, 365, 730] },
  { group: 'nopes', section: 'honest', stat: 'nopes', at: [10, 50, 100] },
  { group: 'lates', section: 'honest', stat: 'lates', at: [10, 50] },
  { group: 'questions', section: 'questions', stat: 'questions', at: [10, 25, 50] },
  { group: 'tags', section: 'questions', stat: 'tags', at: [2, 5] },
  { group: 'oneq', section: 'questions', stat: 'oneq', at: [10, 30, 100, 365] },
  { group: 'monthly', section: 'questions', stat: 'monthly', at: [3, 12] },
  { group: 'weekly', section: 'questions', stat: 'weekly', at: [25, 100] },
  { group: 'once', section: 'questions', stat: 'once', at: [5, 25] },
  { group: 'deadline', section: 'questions', stat: 'deadline', at: [1, 10] },
  { group: 'timed', section: 'questions', stat: 'timed', at: [10, 100] },
  { group: 'high', section: 'questions', stat: 'high', at: [10, 100] },
  { group: 'owl', section: 'nights', stat: 'owl', at: [25] },
  { group: 'early', section: 'nights', stat: 'early', at: [25] },
  { group: 'looks', section: 'shop', stat: 'looks', at: [1, 3, 6] },
  { group: 'cheers', section: 'shop', stat: 'cheers', at: [1, 3] },
  { group: 'buddies', section: 'shop', stat: 'buddies', at: [1, 3] },
  { group: 'plays', section: 'shop', stat: 'plays', at: [50, 250] },
  { group: 'coins', section: 'shop', stat: 'coins', at: [100, 500, 1000] },
  { group: 'wejoin', section: 'we', stat: 'weCards', at: [1, 3, 10] },
  { group: 'wedone', section: 'we', stat: 'weDone', at: [1, 10, 50, 100] },
  { group: 'westreak', section: 'we', stat: 'weStreak', at: [7, 30, 100, 365] },
]

// One-offs with their own words (ach.<id>.name / line / how).
const SINGLES = [
  { id: 'looks-all', section: 'shop', icon: 'star', test: (s) => s.looksAll },
  { id: 'cheers-all', section: 'shop', icon: 'star', test: (s) => s.cheersAll },
  { id: 'buddies-all', section: 'shop', icon: 'star', test: (s) => s.buddiesAll },
  { id: 'we-turns', section: 'we', icon: 'together', test: (s) => s.weTurns },
  { id: 'we-big', section: 'we', icon: 'together', test: (s) => s.weBig },
]

const GROUP_ICON = {
  dids: 'check',
  streak: 'flame',
  opens: 'calendar',
  nopes: 'eye',
  lates: 'clock',
  questions: 'plus',
  tags: 'folder',
  oneq: 'target',
  monthly: 'note',
  weekly: 'calendar',
  once: 'check',
  deadline: 'flag',
  timed: 'clock',
  high: 'flag',
  owl: 'moon',
  early: 'sun',
  looks: 'star',
  cheers: 'star',
  buddies: 'star',
  plays: 'star',
  coins: 'coin',
  wejoin: 'together',
  wedone: 'together',
  westreak: 'flame',
}

export const MARK_SECTIONS = ['start', 'streak', 'nights', 'honest', 'questions', 'shop', 'we']

// Every achievement, in section order, easiest first within a section.
export const ACHIEVEMENTS = [
  ...MARK_IDS.map((id) => ({ id, section: START_SECTION[id], own: true })),
  ...TIERS.flatMap((tier) =>
    tier.at.map((n) => ({
      id: `${tier.group}-${n}`,
      section: tier.section,
      group: tier.group,
      n,
      icon: GROUP_ICON[tier.group],
      test: (s) => (s[tier.stat] || 0) >= n,
    })),
  ),
  ...SINGLES,
].sort((a, b) => MARK_SECTIONS.indexOf(a.section) - MARK_SECTIONS.indexOf(b.section))

const BY_ID = new Map(ACHIEVEMENTS.map((item) => [item.id, item]))

export function markInfo(id) {
  return BY_ID.get(id) || null
}

// The words for one achievement: name, line (what you did) or how (how to get it).
export function markLabel(id, field) {
  const item = BY_ID.get(id)
  if (!item) return ''
  if (item.own) return t(`mark.${id}.${field}`)
  if (item.group) {
    // A tier of 1 uses its own words when the plural would read wrong ("1 nights").
    const one = `ach.${item.group}.${field}One`
    if (item.n === 1 && hasLocaleKey(one)) return t(one)
    return t(`ach.${item.group}.${field}`, { n: item.n.toLocaleString() })
  }
  return t(`ach.${id}.${field}`)
}

// Kept for older callers: the key of one of the first fourteen.
export function markText(id, field) {
  return `mark.${id}.${field}`
}

// Achievements unlock per tag; the page shows every one you have in any tag.
export function shelfMarks(boards) {
  return new Set((boards || []).flatMap((book) => book?.unlocked || []))
}

export function nextMark(book) {
  const have = new Set(book.unlocked || [])
  return ACHIEVEMENTS.find((item) => !have.has(item.id)) || null
}

export function streakLength(book, lamp, now) {
  if (!lamp) return 0
  return questionStreak(book, lamp, boardDate(now, book.dayFoldHour))
}

function cameBackAfterHole(book, now = new Date()) {
  const today = boardDate(now, book.dayFoldHour)
  const yesterday = addDaysIso(today, -1)
  const at = parseIsoDate(yesterday)
  if (!at) return false
  at.setHours(12, 0, 0, 0)
  const due = dueTonight(book, at).filter(
    (row) => !row.lamp.createdOn || row.lamp.createdOn <= yesterday,
  )
  if (!due.length) return false
  if (due.every((row) => row.answer)) return false
  return (book.opens || []).includes(today)
}

function quietWeek(book, now) {
  const today = boardDate(now, book.dayFoldHour)
  let anyDue = false
  for (let i = 0; i < 7; i += 1) {
    const iso = addDaysIso(today, -i)
    const date = parseIsoDate(iso)
    if (!date) return false
    date.setHours(12, 0, 0, 0)
    const due = dueTonight(book, date)
    if (due.length) anyDue = true
    if (due.some((row) => !row.answer)) return false
  }
  return anyDue
}

const isDid = (answer) => answer.status === 'yes' || answer.status === 'late'

// The streak walks up to three years of nights. The run up to last night
// only changes when an older night is answered late, so it is worked out once
// per night (and again after a late mark); tonight is added on top.
let streakMemo = { key: '', value: 0 }
function streakNow(boards, now, olderAnswers) {
  const night = boardDate(now)
  const key = `${night}|${olderAnswers}|${boards.length}`
  if (streakMemo.key !== key) {
    const lastNight = parseIsoDate(addDaysIso(night, -1))
    lastNight.setHours(12, 0, 0, 0)
    streakMemo = { key, value: shelfStreak(boards, lastNight) }
  }
  const counted = boards.some((book) => countedTonightRows(dueTonight(book, now)).length > 0)
  if (!counted) return streakMemo.value
  const clear = boards.every(
    (book) => !countedTonightRows(dueTonight(book, now)).length || allClearTonight(book, now),
  )
  return clear ? streakMemo.value + 1 : streakMemo.value
}

// Everything the tiers count, across every tag. Answers are read once.
export function shelfStats(boards, now = new Date()) {
  const s = {
    dids: 0,
    nopes: 0,
    lates: 0,
    questions: 0,
    // An empty tag (a fresh install has one) does not count.
    tags: boards.filter((book) => (book.lamps || []).length > 0).length,
    oneq: 0,
    monthly: 0,
    weekly: 0,
    once: 0,
    deadline: 0,
    timed: 0,
    high: 0,
    owl: 0,
    early: 0,
    opens: 0,
  }
  const opens = new Set()
  const today = boardDate(now)
  let olderAnswers = 0
  for (const book of boards) {
    for (const night of book.opens || []) opens.add(night)
    const lamps = new Map((book.lamps || []).map((lamp) => [lamp.id, lamp]))
    s.questions += lamps.size
    const perLamp = new Map()
    const onceDone = new Set()
    for (const answer of book.answers || []) {
      if (String(answer.answeredAt || '').slice(0, 10) !== today) olderAnswers += 1
      if (answer.status === 'skip') s.nopes += 1
      if (answer.status === 'late') s.lates += 1
      if (!isDid(answer)) continue
      s.dids += 1
      perLamp.set(answer.lampId, (perLamp.get(answer.lampId) || 0) + 1)
      const lamp = lamps.get(answer.lampId)
      if (lamp) {
        if (lamp.cadence === 'monthly') s.monthly += 1
        if (lamp.cadence === 'weekly') s.weekly += 1
        if (lamp.cadence === 'once') onceDone.add(lamp.id)
        if (lamp.cadence === 'once' && lamp.onceWhen === 'by') s.deadline += 1
        if (lamp.askAfter) s.timed += 1
        if (lamp.priority === 'high') s.high += 1
      }
      const at = answer.answeredAt ? new Date(answer.answeredAt) : null
      if (at && !Number.isNaN(at.getTime())) {
        const hour = at.getHours()
        if (hour < 4) s.owl += 1
        if (hour >= 5 && hour < 9) s.early += 1
      }
    }
    s.once += onceDone.size
    for (const n of perLamp.values()) s.oneq = Math.max(s.oneq, n)
  }
  s.opens = opens.size
  s.streak = streakNow(boards, now, olderAnswers)
  const purse = mergePurses(boards)
  // What you bought or were given; the free ones everyone starts with do not count.
  s.looks = purse.looks.filter((id) => id !== 'lime').length
  // Every one in the shop now, not just as many as there are.
  s.looksAll = LOOKS.every((item) => purse.looks.includes(item.id))
  s.cheers = purse.cheers.filter((id) => id !== 'lime').length
  s.cheersAll = CHEERS.every((item) => purse.cheers.includes(item.id))
  s.buddies = purse.buddies.filter((id) => id !== FREE_BUDDY).length
  s.buddiesAll = SHOP_BUDDIES.every((item) => purse.buddies.includes(item.id))
  s.plays = purse.cheerUses
  s.coins = purse.coins
  return s
}

// The rest of the shelf, with this book as it is about to be saved.
function shelfWith(book) {
  try {
    const boards = readShelf().boards || []
    const others = boards.filter((item) => item.id !== book.id)
    return [book, ...others]
  } catch {
    return [book]
  }
}

// Did we tiers come from the shared cards, which live on the server: the
// app passes them in when they load (weStats in did-we.js).
function unlockTiers(unlocked, stats) {
  const next = [...unlocked]
  for (const item of ACHIEVEMENTS) {
    if (item.own || !item.test || next.includes(item.id)) continue
    if (item.section === 'we') continue
    if (item.test(stats)) next.push(item.id)
  }
  return next
}

export function weMarksFor(have, weStats) {
  return ACHIEVEMENTS.filter((item) => item.section === 'we' && !have.has(item.id) && item.test?.(weStats)).map(
    (item) => item.id,
  )
}

export function unlockAchievements(book, now = new Date()) {
  let unlocked = Array.isArray(book.unlocked) ? [...book.unlocked] : []
  const answers = book.answers || []
  const lamps = (book.lamps || []).filter((lamp) => !lamp.archived)

  function add(id) {
    if (unlocked.includes(id)) return
    unlocked = [...unlocked, id]
  }

  // Held until the first answer so it does not toast on a cold first launch.
  if ((book.opens || []).length && answers.length) add('first-open')
  if ((book.opens || []).length >= 3) add('showed-3')
  if ((book.opens || []).length >= 7) add('showed-7')
  if (answers.some(isDid)) add('first-did')
  if (answers.some((answer) => answer.status === 'skip')) add('honest-skip')
  if (answers.some((answer) => answer.status === 'late')) add('late-ok')
  if (lamps.length >= 5) add('hung-five')
  if (
    answers.some((answer) => {
      const lamp = (book.lamps || []).find((item) => item.id === answer.lampId)
      return lamp && lamp.cadence === 'monthly' && isDid(answer)
    })
  ) {
    add('month-bill')
  }
  if (allClearTonight(book, now)) add('hall-on')
  const heat = hallHeat(book, now)
  if (heat >= 3) add('heat-3')
  if (heat >= 5) add('heat-5')
  if (cameBackAfterHole(book, now)) add('come-back')

  const door =
    lamps.find((lamp) => lamp.kind === 'house' && lamp.slot === 'night') ||
    lamps.find((lamp) => lamp.kind === 'house')
  if (door && streakLength(book, door, now) >= 7) add('seven-door')
  if (quietWeek(book, now)) add('quiet-week')

  // The tiers count the whole shelf. One already earned in another tag is
  // not earned again here.
  const boards = shelfWith(book)
  const elsewhere = shelfMarks(boards.slice(1))
  const tiers = unlockTiers(unlocked, shelfStats(boards, now)).filter(
    (id) => unlocked.includes(id) || !elsewhere.has(id),
  )
  return { ...book, unlocked: tiers }
}

export function commitBook(book, clock = new Date()) {
  return unlockAchievements(book, clock)
}

// What to toast for achievements that just unlocked: one toast for the
// batch (the first, "and N more"), never a stack. The first batch after the
// long list arrived catches up on tiers you already had, so those stay
// quiet; the first fourteen still toast as before.
const CATCH_UP_KEY = 'did-i-ach-caught-up'
// Every achievement already toasted on this device. A sync or a Did we card
// can earn one again after it was dropped from the book; it never toasts twice.
const TOASTED_KEY = 'did-i-ach-toasted'

export function marksToToast(news) {
  let ids = [...(news || [])]
  let caughtUp = true
  try {
    caughtUp = localStorage.getItem(CATCH_UP_KEY) === '1'
    if (!caughtUp) localStorage.setItem(CATCH_UP_KEY, '1')
    const raw = JSON.parse(localStorage.getItem(TOASTED_KEY) || '[]')
    const toasted = new Set(Array.isArray(raw) ? raw : [])
    const fresh = ids.filter((id) => !toasted.has(id))
    for (const id of ids) toasted.add(id)
    localStorage.setItem(TOASTED_KEY, JSON.stringify([...toasted]))
    ids = fresh
  } catch {
    caughtUp = true
  }
  if (!caughtUp) ids = ids.filter((id) => BY_ID.get(id)?.own)
  if (!ids.length) return []
  return [{ id: ids[0], more: ids.length - 1 }]
}
