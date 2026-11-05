import { PAUSES_MAX, normalizeBook, normalizeGone } from './board-json.js'
import { normalizeShelf } from './board-shelf.js'
import { mergeAnswer } from './board-ops.js'
import { capSkips } from './travel.js'
import { CHEER_STAGE_MAX, mergeLater, normalizePurse } from './purse.js'
import { overCap } from './question-cap.js'

// Two phones can both be right. Questions and answers always combine.
// Names and switches come from whichever phone saved last.

function byId(list) {
  const map = new Map()
  for (const item of list || []) {
    if (item && item.id) map.set(item.id, item)
  }
  return map
}

function answerKey(answer) {
  return `${answer.lampId}:${answer.periodKey}`
}

// A note saved later wins too (noteAt), without moving the tap time.
// Whichever wins, a night that was once a Did on either phone stays counted
// toward its paid taps (paid), so Did, Not yet elsewhere, Did never pays twice.
function laterAnswer(a, b) {
  const won = mergeAnswer(a, b)
  return !onceDid(won) && (onceDid(a) || onceDid(b)) ? { ...won, paid: true } : won
}

function onceDid(answer) {
  return answer?.paid === true || answer?.status === 'yes' || answer?.status === 'late'
}

function unionList(a, b) {
  return [...new Set([...(a || []), ...(b || [])])]
}

function maxStages(a, b) {
  const out = {}
  for (const id of unionList(Object.keys(a || {}), Object.keys(b || {}))) {
    const n = Math.max(Number(a?.[id]) || 1, Number(b?.[id]) || 1)
    out[id] = Math.min(CHEER_STAGE_MAX, Math.max(1, n))
  }
  return out
}

// Nobody loses a cheer or a coin by signing in on a second phone.
function foldPurse(winner, loser) {
  const win = normalizePurse(winner)
  const lose = normalizePurse(loser)
  const cheerStages = maxStages(win.cheerStages, lose.cheerStages)
  return {
    coins: Math.max(win.coins, lose.coins),
    gems: Math.max(win.gems, lose.gems),
    cheers: unionList(win.cheers, lose.cheers),
    looks: unionList(win.looks, lose.looks),
    accessories: unionList(win.accessories, lose.accessories),
    worn: win.worn,
    buddies: unionList(win.buddies, lose.buddies),
    later: mergeLater([win.later, lose.later]),
    buddyOn: win.buddyOn,
    frames: unionList(win.frames, lose.frames),
    frame: win.frame,
    cheerOn: win.cheerOn,
    lookOn: win.lookOn,
    cheerUses: Math.max(win.cheerUses, lose.cheerUses),
    cheerStages,
    cheerStage: Math.max(win.cheerStage, lose.cheerStage),
    cheerPlayStages: maxStages(win.cheerPlayStages, lose.cheerPlayStages),
  }
}

// The copy edited later wins; a missing stamp counts as never, a tie keeps the winner.
function atMs(item) {
  const ms = Date.parse(item?.at || '')
  return Number.isFinite(ms) ? ms : 0
}

// Same stamp: the same edit, saved by two builds. An older build drops the
// fields it doesn't know, so they come from the other copy. Only these: other
// fields can be taken off without a new stamp (a removed friend's link).
const NEWER_FIELDS = ['askFrom', 'askAfter2', 'endsOn']

function fillNewer(lamp, other) {
  const out = { ...lamp }
  for (const key of NEWER_FIELDS) {
    if (out[key] === undefined && other[key] !== undefined) out[key] = other[key]
  }
  return out
}

export function mergeBooks(winner, loser) {
  const win = normalizeBook(winner)
  const lose = normalizeBook(loser)
  const loseById = byId(lose.lamps)
  win.lamps = win.lamps.map((lamp) => {
    const other = loseById.get(lamp.id)
    const keep = !other ? lamp : atMs(other) > atMs(lamp) ? other : atMs(lamp) && atMs(other) === atMs(lamp) ? fillNewer(lamp, other) : lamp
    // A pause resumed on the other phone stays, or its days read as misses.
    const both = [...(lamp.pauses || []), ...(other?.pauses || [])]
    if (!other || !both.length) return keep
    const pauses = [...new Map(both.map((pair) => [pair.join('|'), pair])).values()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(-PAUSES_MAX)
    return { ...keep, pauses }
  })
  if (atMs(lose) > atMs(win)) {
    win.title = lose.title
    win.archived = lose.archived
    // An older app drops order; keep ours rather than reset it.
    if (lose.order !== undefined) win.order = lose.order
    win.at = lose.at
  }

  // A question taken off on either phone stays off, unless it was put back
  // later than that. Without this, the older phone's copy brings it back.
  const gone = normalizeGone([...win.gone, ...lose.gone])
  const dead = new Set(gone.filter((item) => !item.back).map((item) => item.id))

  const lampsWin = byId(win.lamps)
  const lamps = win.lamps.filter((lamp) => !dead.has(lamp.id))
  // The same kept Did you saved on two phones under two ids is one question.
  // Its answers move to the copy that stays.
  const sendsWin = new Map(win.lamps.filter((lamp) => lamp.sendId).map((lamp) => [lamp.sendId, lamp.id]))
  const renamed = new Map()
  for (const lamp of lose.lamps) {
    const same = lamp.sendId ? sendsWin.get(lamp.sendId) : undefined
    if (same !== undefined) {
      if (same !== lamp.id) renamed.set(lamp.id, same)
      continue
    }
    if (!lampsWin.has(lamp.id) && !dead.has(lamp.id)) lamps.push(lamp)
  }

  const answers = new Map()
  for (const old of lose.answers) {
    const answer = renamed.has(old.lampId) ? { ...old, lampId: renamed.get(old.lampId) } : old
    const key = answerKey(answer)
    const prev = answers.get(key)
    answers.set(key, prev ? laterAnswer(prev, answer) : answer)
  }
  for (const answer of win.answers) {
    const key = answerKey(answer)
    const prev = answers.get(key)
    answers.set(key, prev ? laterAnswer(prev, answer) : answer)
  }

  return normalizeBook({
    ...win,
    lamps,
    answers: [...answers.values()].filter((answer) => !dead.has(answer.lampId)),
    gone,
    unlocked: unionList(win.unlocked, lose.unlocked),
    opens: unionList(win.opens, lose.opens).sort(),
    travelSkips: capSkips([...win.travelSkips, ...lose.travelSkips]),
    ...foldPurse(win, lose),
  })
}

// A backup file loaded on this phone: its answers and new questions come in,
// but this phone's question settings win, and coins, gems and shop items
// stay as they are here, so a copy cannot bring back what was spent.
export function mergeBackup(local, backup) {
  const PURSE = ['coins', 'gems', 'cheers', 'looks', 'accessories', 'buddies', 'frames', 'later', 'cheerStages', 'buddyOn', 'cheerOn', 'worn', 'frame', 'wish']
  const boards = (backup?.boards || []).map((book) => {
    const out = { ...book }
    for (const key of PURSE) delete out[key]
    return out
  })
  return mergeShelves(local, { ...backup, boards }, '', '')
}

// What loading a backup file would do, before anything is saved. The file can
// be the account export, a whole shelf, or one folder. miss: 'file' (not a
// Did I copy) or 'cap' (it would pass the question limit).
export function planBackupLoad(local, parsed) {
  const shelf = parsed?.shelf?.boards ? parsed.shelf : parsed?.boards ? parsed : null
  const one = !shelf && parsed?.lamps ? { currentId: parsed.id, boards: [parsed] } : null
  const coming = shelf || one
  if (!coming || !Array.isArray(coming.boards)) return { miss: 'file' }
  const merged = mergeBackup(local, coming)
  if (overCap(local.boards, merged.boards)) return { miss: 'cap' }
  const count = (target, key) => target.boards.reduce((n, book) => n + (book[key] || []).length, 0)
  return {
    merged,
    q: Math.max(0, count(merged, 'lamps') - count(local, 'lamps')),
    a: Math.max(0, count(merged, 'answers') - count(local, 'answers')),
  }
}

export function mergeShelves(local, remote, localSavedAt = '', remoteSavedAt = '') {
  if (!remote || !Array.isArray(remote.boards) || !remote.boards.length) {
    return normalizeShelf(local)
  }
  if (!local || !Array.isArray(local.boards) || !local.boards.length) {
    return normalizeShelf(remote)
  }
  const localWins = !remoteSavedAt || String(localSavedAt) >= String(remoteSavedAt)
  const winner = normalizeShelf(localWins ? local : remote)
  const loser = normalizeShelf(localWins ? remote : local)

  // Same rule for tags: deleted on either phone stays deleted.
  const goneTags = normalizeGone([...(winner.goneTags || []), ...(loser.goneTags || [])])
  const deadTags = new Set(goneTags.filter((item) => !item.back).map((item) => item.id))

  const loserById = byId(loser.boards)
  const boards = winner.boards
    .filter((book) => !deadTags.has(book.id))
    .map((book) => (loserById.has(book.id) ? mergeBooks(book, loserById.get(book.id)) : book))
  const winnerIds = new Set(winner.boards.map((book) => book.id))
  for (const book of loser.boards) {
    if (!winnerIds.has(book.id) && !deadTags.has(book.id)) boards.push(book)
  }

  // normalizeShelf folds tags that ended up with the same name on both phones.
  return normalizeShelf({ ...winner, currentId: winner.currentId, boards: followMovedAnswers(boards, [...winner.boards, ...loser.boards]), goneTags })
}

// A question moved to another folder on one phone is gone from the old
// folder there. Its answers, wherever either phone kept them, go with it.
function followMovedAnswers(boards, sources) {
  // Moved to two different folders on two phones: the newest move wins, so it
  // is asked once.
  const newest = new Map()
  boards.forEach((book, index) => {
    for (const lamp of book.lamps || []) {
      const was = newest.get(lamp.id)
      if (!was || atMs(lamp) > was.ms) newest.set(lamp.id, { index, ms: atMs(lamp) })
    }
  })
  boards = boards.map((book, index) => {
    const lamps = (book.lamps || []).filter((lamp) => newest.get(lamp.id).index === index)
    return lamps.length === (book.lamps || []).length ? book : { ...book, lamps }
  })
  const homeOf = new Map()
  boards.forEach((book, index) => {
    for (const lamp of book.lamps || []) homeOf.set(lamp.id, index)
  })
  const moved = new Map()
  sources.forEach((book) => {
    for (const answer of book.answers || []) {
      const home = homeOf.get(answer.lampId)
      if (home === undefined || boards[home].id === book.id) continue
      if (!moved.has(home)) moved.set(home, [])
      moved.get(home).push(answer)
    }
  })
  if (!moved.size) return boards
  return boards.map((book, index) => {
    if (!moved.has(index)) return book
    const answers = new Map()
    for (const answer of book.answers || []) answers.set(answerKey(answer), answer)
    for (const answer of moved.get(index)) {
      const key = answerKey(answer)
      const prev = answers.get(key)
      answers.set(key, prev ? laterAnswer(prev, answer) : answer)
    }
    return { ...book, answers: [...answers.values()] }
  })
}
