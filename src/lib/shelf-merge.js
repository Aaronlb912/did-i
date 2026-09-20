import { normalizeBook } from './board-json.js'
import { normalizeShelf } from './board-shelf.js'
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

function laterAnswer(a, b) {
  const left = String(a?.answeredAt || '')
  const right = String(b?.answeredAt || '')
  if (left && right) return right > left ? b : a
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

  const lampsWin = byId(win.lamps)
  const lamps = [...win.lamps]
  for (const lamp of lose.lamps) {
    if (!lampsWin.has(lamp.id)) lamps.push(lamp)
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
    answers: [...answers.values()],
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

  const loserById = byId(loser.boards)
  const boards = winner.boards.map((book) =>
    loserById.has(book.id) ? mergeBooks(book, loserById.get(book.id)) : book,
  )
  const winnerIds = new Set(winner.boards.map((book) => book.id))
  for (const book of loser.boards) {
    if (!winnerIds.has(book.id)) boards.push(book)
  }

  // normalizeShelf folds tags that ended up with the same name on both phones.
  return normalizeShelf({ currentId: winner.currentId, boards })
}
