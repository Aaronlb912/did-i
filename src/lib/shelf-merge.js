import { normalizeBook, normalizeGone } from './board-json.js'
import { normalizeShelf } from './board-shelf.js'
import { answerStamp } from './board-ops.js'
import { stampMs } from './recurrence.js'
import { CHEER_STAGE_MAX, normalizePurse } from './purse.js'

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
function laterAnswer(a, b) {
  const left = answerStamp(a)
  const right = answerStamp(b)
  if (left && right) return stampMs(right) > stampMs(left) ? b : a
  return right && !left ? b : a
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
    buddyOn: win.buddyOn || lose.buddyOn,
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

export function mergeBooks(winner, loser) {
  const win = normalizeBook(winner)
  const lose = normalizeBook(loser)

  // A question taken off on either phone stays off, unless it was put back
  // later than that. Without this, the older phone's copy brings it back.
  const gone = normalizeGone([...win.gone, ...lose.gone])
  const dead = new Set(gone.filter((item) => !item.back).map((item) => item.id))

  const lampsWin = byId(win.lamps)
  const lamps = win.lamps.filter((lamp) => !dead.has(lamp.id))
  for (const lamp of lose.lamps) {
    if (!lampsWin.has(lamp.id) && !dead.has(lamp.id)) lamps.push(lamp)
  }

  const answers = new Map()
  for (const answer of lose.answers) answers.set(answerKey(answer), answer)
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
    ...foldPurse(win, lose),
  })
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
