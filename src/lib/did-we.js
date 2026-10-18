import { useCallback, useEffect, useState } from 'react'
import { cloud, cloudSetUp } from './cloud.js'
import { onSocialLive } from './social-live.js'
import { readShelf } from './board-shelf.js'
import { mergePurses } from './purse.js'
import { t } from './i18n.js'
import { boardDate, isoDate } from './recurrence.js'
import { saveWeLine, saveWeOpen, saveWePings } from './we-widget.js'
import { refreshWeNights } from './we-nights.js'
import { weDueOn, weNextDue, weNextLabel } from './we-next.js'

// Did we: one question two or more people answer together. The server
// (supabase/did-we.sql) decides what counts as done and what each person may
// see; this file only calls it and does the date math for streaks.

export const WE_MODES = ['all', 'any', 'most', 'turns']
export const WE_SHOWS = ['waiting', 'all', 'count']
export const WE_GOALS = [7, 14, 30, 60, 100]
export const WE_MILESTONES = [7, 30, 100, 365]

function bad(error) {
  const text = error?.message || ''
  if (/friends or family/i.test(text)) return { miss: 'we.missWho' }
  if (/too many shared/i.test(text)) return { miss: 'we.missMany' }
  if (/too many people/i.test(text)) return { miss: 'we.missPeople' }
  if (/already nudged/i.test(text)) return { miss: 'we.missNudged' }
  if (/say did first/i.test(text)) return { miss: 'we.missDidFirst' }
  if (/said no lately/i.test(text)) return { miss: 'we.missSaidNo' }
  if (/too many new today/i.test(text)) return { miss: 'we.missNewToday' }
  if (/enough nudges tonight/i.test(text)) return { miss: 'we.missNudgeCap' }
  if (/too many reports/i.test(text)) return { miss: 'we.missReports' }
  if (/night is closed/i.test(text)) return { miss: 'we.missClosed' }
  if (/ask has closed/i.test(text)) return { miss: 'we.askClosed' }
  if (/only the person who made/i.test(text)) return { miss: 'we.missOwner' }
  if (/schema cache|PGRST202/i.test(text) || error?.code === 'PGRST202') return { miss: 'we.missNotReady' }
  return { miss: 'people.reach' }
}

function tonightIso() {
  return boardDate()
}

export async function weTonight(night = tonightIso()) {
  const db = cloud()
  if (!db) return { cards: [], miss: 'off' }
  const { data, error } = await db.rpc('we_tonight', { on_night: night })
  if (error) return { cards: [], ...bad(error) }
  const cards = Array.isArray(data) ? data : []
  const counted = cards.filter((card) => card.shows === 'count').map((card) => card.id)
  if (counted.length) {
    const { data: rows } = await db.rpc('we_counts', { cards: counted })
    const totals = new Map((rows || []).map((row) => [row.card_id, row.total]))
    for (const card of cards) if (totals.has(card.id)) card.total = totals.get(card.id)
  }
  for (const card of cards) {
    // A paused card is not asked tonight: no pill, no swipe card, no reminder.
    if (card.paused) card.due = false
    // Older cards were saved without the "?"; show every one as a question.
    card.question = weQuestion(card.question)
    if (card.total == null) card.total = (card.people || []).filter((p) => p.state === 'in').length
  }
  return { cards, miss: '' }
}

// The time it comes up, the reminder switch, and the note.
async function saveExtras(db, card, { askAfter, remind, note }) {
  const { error } = await db.rpc('we_set_extras', {
    card,
    want_ask_after: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(askAfter || '')) ? askAfter : null,
    want_remind: remind !== false,
    want_note: String(note || '').trim().slice(0, 300),
  })
  return error ? bad(error) : { miss: '' }
}

// alone: make it with nobody asked yet, to share as a link.
// A Did we reads as a question, like Did I: add the "?" if it is missing.
export function weQuestion(raw) {
  const text = String(raw || '').trim()
  if (!text || /[?？]$/.test(text)) return text
  return `${text.slice(0, 199)}?`
}

export async function weMake({ question, mode, shows, cadence, weekdays, goal, ask, askAfter, remind, note, folder, topics, alone = false }) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const text = weQuestion(question)
  if (!text) return { miss: 'we.missBlank' }
  if (!ask?.length && !alone) return { miss: 'we.missNobody' }
  const { data, error } = await db.rpc('we_make', {
    want_question: text.slice(0, 200),
    want_mode: WE_MODES.includes(mode) ? mode : 'all',
    want_shows: WE_SHOWS.includes(shows) ? shows : 'waiting',
    want_cadence: cadence === 'weekly' ? 'weekly' : 'daily',
    want_weekdays: cadence === 'weekly' ? weekdays || [] : [],
    want_goal: goal || null,
    ask: ask || [],
    want_starts: tonightIso(),
  })
  if (error) return bad(error)
  const extras = await saveExtras(db, data, { askAfter, remind, note })
  const filed = folder || topics ? await weFile(data, folder, topics) : { miss: '' }
  return { miss: extras.miss || filed.miss, id: data }
}

export async function weEdit(card, { question, mode, shows, cadence, weekdays, goal, askAfter, remind, note }) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const text = weQuestion(question)
  if (!text) return { miss: 'we.missBlank' }
  if (cadence === 'weekly' && !(weekdays || []).length) return { miss: 'we.missDays' }
  const { error } = await db.rpc('we_edit', {
    card,
    want_question: text.slice(0, 200),
    want_mode: mode,
    want_shows: shows,
    want_cadence: cadence === 'weekly' ? 'weekly' : 'daily',
    want_weekdays: cadence === 'weekly' ? weekdays || [] : [],
    want_goal: goal || null,
  })
  if (error) return bad(error)
  return saveExtras(db, card, { askAfter, remind, note })
}

// Where you file a card for yourself: a folder and topics, like your own questions.
export async function weFile(card, folder, topics) {
  const out = await call('we_file', {
    card,
    want_folder: String(folder || '').trim().slice(0, 60),
    want_topics: String(topics || '').trim().slice(0, 200),
  })
  return { miss: out.miss }
}

// Tonight's folder and topic filters apply to Did we cards too. titles: the
// folder names picked, or empty for all. A card with no folder shows only
// under All.
export function weInFilter(card, titles = [], topics = []) {
  if (titles.length) {
    const folder = String(card.folder || '').trim().toLowerCase()
    if (!titles.some((title) => String(title || '').trim().toLowerCase() === folder)) return false
  }
  if (topics.length) {
    const mine = String(card.topics || '')
      .split(',')
      .map((topic) => topic.trim().toLowerCase())
      .filter(Boolean)
    if (!topics.some((topic) => mine.includes(String(topic).trim().toLowerCase()))) return false
  }
  return true
}

// A card with a time waits until then, like your own timed questions.
export function weTimeReady(card, now = new Date()) {
  const match = String(card.askAfter || '').match(/^(\d{2}):(\d{2})$/)
  if (!match) return true
  return now.getHours() * 60 + now.getMinutes() >= Number(match[1]) * 60 + Number(match[2])
}

// What each phone needs to set Did we reminders: cards you are on with a time
// and the reminder on. Tonight's is left out once you have answered or it is done.
export function weReminders(cards, night = tonightIso()) {
  return (cards || [])
    .filter((card) => card.myState === 'in' && !card.paused && card.remind !== false && card.askAfter)
    .map((card) => ({
      id: card.id,
      question: card.question,
      askAfter: card.askAfter,
      cadence: card.cadence,
      weekdays: card.weekdays || [],
      startsOn: card.startsOn,
      skipNight: card.done || weMine(card)?.status ? night : '',
    }))
}

export function saveWeReminders(cards) {
  return saveWePings(weReminders(cards))
}

async function call(name, args) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { data, error } = await db.rpc(name, args)
  return error ? bad(error) : { miss: '', data }
}

// Asks waiting on you, for the inbox and the People badge. An ask older
// than 14 days is gone, the same as one that was turned down.
export const WE_ASK_DAYS = 14

export async function weAskCount() {
  const db = cloud()
  if (!db) return 0
  const { data } = await db.auth.getSession()
  const user = data?.session?.user
  if (!user) return 0
  const since = new Date(Date.now() - WE_ASK_DAYS * 86400000).toISOString()
  const { count } = await db
    .from('we_members')
    .select('card_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('state', 'asked')
    .gt('asked_at', since)
  return count || 0
}

// The last few people you asked from this device, newest first, so they
// sit at the front of Who. Only this device keeps it.
const RECENT_KEY = 'did-i-we-recent'
const RECENT_MAX = 3

export function recentAsked() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function noteAsked(ids) {
  const next = [...new Set([...[].concat(ids), ...recentAsked()])].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // A convenience only.
  }
}

// Friends and family, the only people a card can ask. The ones you asked
// lately come first (recent: true), the rest by name.
export async function weKnownPeople() {
  const db = cloud()
  if (!db) return []
  const { data } = await db.rpc('known_people')
  const recent = recentAsked()
  const rank = (row) => (recent.includes(row.id) ? recent.indexOf(row.id) : RECENT_MAX)
  return (data || [])
    .map((row) => ({
      id: row.user_id,
      name: String(row.display_name || '').trim() || (row.handle ? `@${row.handle}` : ''),
    }))
    .filter((row) => row.name)
    .map((row) => ({ ...row, recent: recent.includes(row.id) }))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

export const weAsk = (card, other) => call('we_ask', { card, other })
export const weReply = (card, yes) => call('we_reply', { card, yes })
export const weLeave = (card) => call('we_leave', { card })
// Only the maker can close it; the server checks.
export const weClose = (card) => call('we_close', { card })
// A paused card (nobody answered 3 nights) asks again from tonight.
export const weRestart = (card) => call('we_restart', { card, want_night: tonightIso() })

// Paused cards you are on, for the line with a restart button.
export function wePausedCards(cards) {
  return (cards || []).filter((card) => card.myState === 'in' && card.paused)
}
// Filed in reports with the question; nothing is sent to anyone.
export const reportWe = (card, why = '') => call('report_we', { card, why })
export const weNudge = (card, other, night = tonightIso()) => call('we_nudge', { card, other, on_night: night })

// status: 'did', 'nope', or null to take an answer back. Comes back with
// done: whether the card is now done together, and finished: whether this
// answer is the one that made it done (the server says 2).
export async function weAnswer(card, status, night = tonightIso()) {
  const out = await call('we_answer', { card, on_night: night, want_status: status })
  return { miss: out.miss, done: Number(out.data) > 0, finished: Number(out.data) === 2 }
}

export async function weClaim(card, night = tonightIso()) {
  const out = await call('we_claim', { card, on_night: night })
  return { miss: out.miss, coins: Number(out.data) || 0 }
}

// Date math ----------------------------------------------------------

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

// The card's next asked night after tonight, within a week, for answering
// early ("done it already"). Same window as we_answer on the server.
export function weNextNight(card, night = tonightIso()) {
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = addDays(night, ahead)
    if (weDueOn(card, day)) return day
  }
  return ''
}

export { weDueOn }

// "Not due tonight · Next: Sat, Oct 10", or just "Not due tonight".
export function weNotTonightLine(card, locale, night = tonightIso()) {
  const next = weNextLabel(weNextDue(card, night), locale)
  return next ? t('we.notTonightNext', { day: next }) : t('we.notTonight')
}

// The run of due nights done together, ending tonight, or last night while
// tonight is still open. Same rule as we_claim on the server.
export function weStreak(card, night = tonightIso()) {
  const done = new Set(card.doneNights || [])
  let day = done.has(night) ? night : addDays(night, -1)
  let run = 0
  for (let i = 0; i < 400 && day >= String(card.startsOn || ''); i += 1) {
    if (weDueOn(card, day)) {
      if (!done.has(day)) break
      run += 1
    }
    day = addDays(day, -1)
  }
  return run
}

export function weBest(card) {
  const nights = [...(card.doneNights || [])].sort()
  let best = 0
  let run = 0
  let last = ''
  for (const night of nights) {
    let gap = false
    if (last) {
      for (let day = addDays(last, 1); day < night; day = addDays(day, 1)) {
        if (weDueOn(card, day)) {
          gap = true
          break
        }
      }
    }
    run = !last || gap ? 1 : run + 1
    best = Math.max(best, run)
    last = night
  }
  return best
}

// Done-together nights in a month, and how many nights it was due.
export function weMonth(card, monthIso = tonightIso().slice(0, 7), today = tonightIso()) {
  const done = (card.doneNights || []).filter((night) => night.startsWith(monthIso)).length
  let due = 0
  for (let day = `${monthIso}-01`; day.startsWith(monthIso) && day <= today; day = addDays(day, 1)) {
    if (weDueOn(card, day)) due += 1
  }
  return { done, due }
}

// A challenge is finished once it has been done together goal nights.
export function weGoal(card) {
  if (!card.goal) return null
  const done = (card.doneNights || []).filter((night) => night >= String(card.startsOn || '')).length
  return { done: Math.min(done, card.goal), goal: card.goal, finished: done >= card.goal }
}

export function weNextMilestone(streak) {
  return WE_MILESTONES.find((at) => at > streak) || null
}

// Who the card is waiting on tonight, by name, as far as the card shows.
export function weWaiting(card) {
  if (card.shows === 'count') return []
  const people = (card.people || []).filter((p) => p.state === 'in' && !p.me)
  if (card.mode === 'turns') return people.filter((p) => p.id === card.turn && p.status !== 'did')
  return people.filter((p) => p.status !== 'did')
}

export function weMine(card) {
  return (card.people || []).find((p) => p.me) || null
}

// One line for the home screen widget.
export function weWidgetLine(cards) {
  const live = (cards || []).filter((card) => card.myState === 'in' && card.due)
  if (!live.length) return ''
  const mineOpen = live.find((card) => !card.done && weMine(card)?.status !== 'did')
  if (mineOpen) return t('we.widgetMine', { question: mineOpen.question })
  const waiting = live.find((card) => !card.done)
  if (waiting) {
    const names = weWaiting(waiting).map((p) => p.name)
    return names.length
      ? t('we.widgetWaiting', { names: names.join(', ') })
      : t('we.widgetCount', { n: waiting.dids, total: waiting.total })
  }
  return t('we.widgetDone')
}

// Returns true when the saved line changed, so the caller can redraw the widget.
export function saveWeWidgetLine(cards, night = tonightIso()) {
  const due = (cards || [])
    .filter((card) => card.myState === 'in' && card.due)
    .map((card) => ({ id: card.id, question: String(card.question || '') }))
  const openChanged = saveWeOpen(due, night)
  return saveWeLine(weWidgetLine(cards), night) || openChanged
}

// One load shared by every screen that shows Did we (the menu badge, Tonight,
// the Did we page), so opening the app is one call, not one per place.
const EMPTY = { cards: [], miss: '' }
let shared = EMPTY
let inflight = null
// The account the load in flight is for.
let inflightFor = ''
let loadedAt = 0
const watchers = new Set()

let sharedFor = ''

// The last cards are stored per account and day, so a cold start shows them
// while the fresh load runs. Another day's cards are stale (due changes).
const CARDS_KEY = 'did-i-we-cards:'

function storedCards(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(CARDS_KEY + userId) || 'null')
    if (raw?.day === new Date().toDateString() && Array.isArray(raw.cards)) return { cards: raw.cards, miss: '' }
  } catch {
    // Loads fresh.
  }
  return EMPTY
}

function storeCards(userId, cards) {
  try {
    const raw = JSON.stringify({ day: new Date().toDateString(), cards })
    if (raw.length < 200_000) localStorage.setItem(CARDS_KEY + userId, raw)
  } catch {
    // Memory still has them.
  }
}

// Kept per account: after a sign-out and in, the last person's cards never show.
function sharedFor_(userId) {
  if (sharedFor !== userId) {
    sharedFor = userId
    shared = storedCards(userId)
    loadedAt = 0
  }
  return shared
}

// Your buddy and cheer show on the Did we cards you share (your cheer plays
// for the others when your did finishes a card). When the cards come back
// with older ones, save what you wear now. Writes only on a change, and only
// when you have a card to show them on.
function shareMyBuddy(cards) {
  const mine = (cards || []).flatMap((card) => card.people || []).find((p) => p.me)
  if (!mine) return
  const purse = mergePurses(readShelf().boards)
  const buddy = purse.buddyOn || ''
  const cheer = purse.cheerOn || ''
  if ((mine.buddy || '') === buddy && (mine.cheer || '') === cheer) return
  for (const card of cards) {
    for (const p of card.people || []) {
      if (p.me) Object.assign(p, { buddy, cheer })
    }
  }
  // Loaded late: cloud-sync imports people.js, which imports this file.
  import('./cloud-sync.js')
    .then(({ saveProfile }) => saveProfile({ buddy_on: buddy, badge_cheer: cheer }))
    .catch(() => {})
}

// A shared streak that just reached 7, 30, 100 or 365 plays a bigger cheer.
export function weCheerStage(card, base = 1) {
  return WE_MILESTONES.includes(weStreak(card)) ? Math.max(base, 4) : base
}

// The same, for the did that is finishing the card right now (tonight is
// not in doneNights yet).
export function weCheerStageIfDone(card, base = 2) {
  const night = tonightIso()
  const done = (card.doneNights || []).includes(night) ? card.doneNights : [night, ...(card.doneNights || [])]
  return weCheerStage({ ...card, doneNights: done }, base)
}

// Cards someone else finished tonight that this device has not cheered yet.
// Each is shown once: the key is kept here, per card and night.
const FINISH_KEY = 'did-i-we-finish-seen'

export function takeWeFinishes(cards, night = tonightIso()) {
  let seen = []
  try {
    seen = JSON.parse(localStorage.getItem(FINISH_KEY) || '[]')
  } catch {
    seen = []
  }
  if (!Array.isArray(seen)) seen = []
  const fresh = (cards || []).filter((card) => {
    const by = card.finish?.by
    if (!card.done || !by || seen.includes(`${card.id}:${night}`)) return false
    return !(card.people || []).some((p) => p.me && p.id === by)
  })
  if (!fresh.length) return []
  const next = [...fresh.map((card) => `${card.id}:${night}`), ...seen].slice(0, 60)
  try {
    localStorage.setItem(FINISH_KEY, JSON.stringify(next))
  } catch {
    // Without storage it may show again; better than never.
  }
  return fresh.map((card) => ({
    card,
    name: (card.people || []).find((p) => p.id === card.finish.by)?.name || '',
    cheer: card.finish.cheer || 'lime',
    stage: weCheerStage(card),
  }))
}

// "You both did it": a card done tonight where you and someone else both
// said did. Shown once a night on this device, for the first such card.
const BOTH_KEY = 'did-i-we-both-seen'

export function weBothDid(card) {
  if (!card?.done) return false
  const people = (card.people || []).filter((p) => p.state === 'in')
  return people.some((p) => p.me && p.status === 'did') && people.some((p) => !p.me && p.status === 'did')
}

export function takeWeBoth(cards, night = tonightIso()) {
  let seen = ''
  try {
    seen = localStorage.getItem(BOTH_KEY) || ''
  } catch {
    seen = ''
  }
  if (seen === night) return null
  const card = (cards || []).find((item) => item.myState === 'in' && weBothDid(item))
  if (!card) return null
  try {
    localStorage.setItem(BOTH_KEY, night)
  } catch {
    // Without storage it may show again; better than never.
  }
  return card
}

function loadShared(force, userId) {
  sharedFor_(userId)
  // A load already out started before a write (force) or for another
  // account: wait for it, then read again, so the answer just saved shows.
  if (inflight && (force || inflightFor !== userId)) return inflight.catch(() => {}).then(() => loadShared(force, userId))
  if (inflight) return inflight
  if (!force && Date.now() - loadedAt < 3000) return Promise.resolve(shared)
  inflightFor = userId
  inflight = Promise.all([weTonight(), refreshWeNights().catch(() => {})])
    .then(([got]) => {
      if (sharedFor !== userId) return EMPTY
      // A failed load keeps the cards already on screen and says so (miss).
      const next = got.miss ? { ...got, cards: shared.cards || [] } : got
      shareMyBuddy(next.cards)
      shared = next
      loadedAt = Date.now()
      if (!next.miss) storeCards(userId, next.cards || [])
      watchers.forEach((fn) => fn(next))
      return next
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

// A card from the last load, or undefined, so its page opens on it.
export function weCardKept(id) {
  return (shared.cards || []).find((card) => card.id === id)
}

// The question on a Did we card from the last load, or empty if not loaded.
export function weCardTitle(id) {
  return (shared.cards || []).find((card) => card.id === id)?.question || ''
}

// The card as a short name, like the Home pill: no "Did we", no "?". Lists
// that also hold your own questions' short names use this.
export function weCardShort(id) {
  return weShort(weCardTitle(id))
}

// One name per Did we everywhere (pill, Seven nights, night sheet), the same
// shape as shortLabel for your own: "Did we do X?" reads "Do X".
export function weShort(question) {
  const text = String(question || '').replace(/^did we\s+/i, '').replace(/\?+$/, '').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function useWeTonight(user) {
  const [state, setState] = useState(() => (user?.id ? sharedFor_(user.id) : EMPTY))

  // An answer or a join reloads right away; opening a screen can reuse a
  // load from the last few seconds.
  const look = useCallback(
    async (force = true) => {
      if (!cloudSetUp() || !user) {
        setState(EMPTY)
        return
      }
      setState(await loadShared(force === true, user.id))
    },
    [user],
  )

  useEffect(() => {
    if (!user) return undefined
    watchers.add(setState)
    return () => watchers.delete(setState)
  }, [user])

  // Someone on a card answered, was invited, joined or left while this is open: read again now.
  useEffect(() => onSocialLive((kinds) => {
    if (kinds.has('we') || kinds.has('weMembers')) look()
  }), [look])

  useEffect(() => {
    look(false)
    const hook = globalThis.__didIOnVisible
    if (typeof hook === 'function') return hook(look)
    if (typeof document === 'undefined') return undefined
    function onShow() {
      if (!document.hidden) look()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [look])

  // loaded: false until the first fetch for this user lands (EMPTY is the not-yet value).
  return { ...state, loaded: state !== EMPTY, reload: look }
}

// Words that sound like doing it with someone ("together", "as a family").
// Each language lists its own in lead.togetherWords, comma separated.
export function soundsTogether(words) {
  const text = ` ${String(words || '').toLowerCase()} `
  return t('lead.togetherWords')
    .split(',')
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .some((word) => text.includes(word))
}

// What the Did we achievements count, from the cards you are on now.
export function weStats(cards) {
  const mine = (cards || []).filter((card) => card.myState === 'in')
  const done = (card) => (card.doneNights || []).length
  return {
    weCards: mine.length,
    weDone: mine.reduce((sum, card) => sum + done(card), 0),
    weStreak: mine.reduce((best, card) => Math.max(best, weBest(card)), 0),
    weTurns: mine.some((card) => card.mode === 'turns' && done(card) > 0),
    weBig: mine.some((card) => (card.total || 0) >= 4 && done(card) > 0),
  }
}
