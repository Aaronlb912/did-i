import { putAnswer } from './board-ops.js'
import { markWeNight, refreshWeNights, weNight, weNightStatus, weOpenOn } from './we-nights.js'
import { cloud } from './cloud.js'
import { graceRowsFor } from './grace.js'
import { shortLabel } from './board-json.js'
import { findBookHoldingLamp, readShelf, writeShelf } from './board-shelf.js'
import {
  rankWidgetOpen,
  readWidgetSettings,
  tonightRowsForAllBoards,
  waitingRowsForAllBoards,
  widgetColorBook,
  widgetTonightUri,
} from './widget-config.js'
import { t } from './i18n.js'
import { lastTimeLine, perWeekLine } from './every-copy.js'
import { awayOn, gentleOn } from './prefs.js'
import { alignShelfPurse, normalizePurse, spreadPurseFrom } from './purse.js'
import { weOpenPastList } from './did-we.js'
import { readWeLine, readWeOpen, skipWePing } from './we-widget.js'
import {
  answerFor,
  boardDate,
  countedTonightRows,
  didStatusForRow,
  dueClearTonight,
  dueTonight,
  finishStackCount,
  periodPassed,
  openFloorIso,
  graceFirst,
  graceNightIso,
  isDueOn,
  isPerWeek,
  perWeekDueOn,
  isEvery,
} from './recurrence.js'
import { nightEnd } from './daily.js'
import { clockWords } from './hall-pages.js'
import { SHELF_IN } from './cloud-sync.js'
import { pushShelfAfterWidgetAnswer } from './widget-cloud-sync.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from './widget-store.js'
import { settleTapEarnings } from './tap-earnings.js'
import { noteMilestone } from './milestones.js'

export function publishShelf(shelf) {
  try {
    globalThis.window?.dispatchEvent?.(new CustomEvent(SHELF_IN, { detail: shelf }))
  } catch {
    // ok
  }
}

const WIDGET_NAME = 'DidITonight'

export { WIDGET_NAME }

function rowStatus(row) {
  const status = row.answer?.status
  if (status === 'yes' || status === 'late') return 'yes'
  if (status === 'skip') return 'skip'
  return 'open'
}

function mapRow(row) {
  // Every so often: "Last time: 6 days ago"; times a week: "2 of 3 this week".
  const since = row.book ? lastTimeLine(row.book, row.lamp, row.dateIso) || perWeekLine(row.book, row.lamp, row.dateIso) : ''
  return {
    lampId: row.lamp.id,
    periodKey: row.periodKey,
    dateIso: row.dateIso,
    label: shortLabel(row.lamp),
    question: String(row.lamp.question || '').trim() || shortLabel(row.lamp),
    status: rowStatus(row),
    tag: String(row.graceTag || row.book?.title || '').trim(),
    ...(since ? { since } : {}),
  }
}

// The line under the showing question: its own "Last time" line, or ''.
function sinceFor(item) {
  return String(item?.since || '')
}

function applyItemStatus(book, item, status, clock = new Date()) {
  if (!item?.lampId || !status) return book
  const rows = dueTonight(book, clock)
  let row = rows.find((r) => {
    if (r.lamp.id !== item.lampId) return false
    if (item.periodKey) return r.periodKey === item.periodKey
    return true
  })
  // A tap from an earlier night (iOS: widget answered, app not opened before
  // midnight) is no longer due tonight. Keep it on its own night if still unset,
  // or turn the day-turn nope into a did, same as Android's stored tap.
  if (!row && item.periodKey) {
    const stored = rowForStoredNight(book, item.lampId, item.periodKey, clock)
    if (stored && (!stored.answer || (stored.answer.status === 'skip' && status === 'yes'))) row = stored
  }
  if (!row) return book
  if (rowStatus(row) === status) return book
  // Never undo a newer answer from the web or another phone: only a nope turns into a did.
  if (row.answer && !(row.answer.status === 'skip' && status === 'yes')) return book
  if (status === 'yes') return putAnswer(book, row, didStatusForRow(row), tapClock(row, clock))
  if (status === 'skip') return putAnswer(book, row, 'skip', tapClock(row, clock))
  return book
}

// The widget only ever shows the current night, so a tap stored for an
// earlier night was made on that night. It lands there, not as a late edit.
function tapClock(row, clock) {
  if (!row?.dateIso || !periodPassed(row.lamp, row.periodKey, openFloorIso(clock))) return clock
  return nightEnd(row.dateIso)
}

function widgetStackLeft(items) {
  const list = Array.isArray(items) ? items : []
  const open = list.filter((item) => item.status === 'open').length
  if (open) return open
  return list.filter((item) => item.status === 'skip').length
}

// leadNight picks between two cards for one question (last night's grace
// copy and tonight's). Props saved before it existed match on lampId alone.
function widgetLeadFromItems(items, leadLampId = '', leadNight = '') {
  const list = Array.isArray(items) ? items : []
  const hasOpen = list.some((item) => item.status === 'open')
  const id = String(leadLampId || '').trim()
  const night = String(leadNight || '').trim()
  if (id) {
    const hit = list.find(
      (item) =>
        item.lampId === id &&
        (!night || String(item.periodKey || '') === night) &&
        (item.status === 'open' || (!hasOpen && item.status === 'skip')),
    )
    if (hit) return hit
  }
  return list.find((item) => item.status === 'open') || list.find((item) => item.status === 'skip') || null
}

function widgetOpenCount(props) {
  return (props?.items || []).filter((item) => item.status === 'open').length
}

/** Headless Android can rebuild before the shelf is warm; keep the fresher open stack. */
// What the Tonight widget shows, as one string: which questions, which
// night, and how each is answered. Two shelves with the same key draw the
// same card, so a sync that changes nothing tonight skips the redraw.
export function tonightWidgetKey(props) {
  const items = (props?.items || []).map(
    (item) => `${item.lampId}|${item.periodKey}|${item.status}|${item.question || item.label || ''}|${item.tag || ''}`,
  )
  const look = [
    props?.question || '',
    props?.tagTitle || '',
    props?.buddyId || '',
    JSON.stringify(props?.buddyWorn || {}),
    JSON.stringify(props?.colors || {}),
  ]
  return [props?.leadLampId || '', props?.leadNight || '', props?.left ?? '', props?.footer || '', ...look, ...items].join('\n')
}

export function preferStoredTonightProps(built, stored) {
  if (!stored?.items?.length) return built
  // A card saved on an earlier night is never kept past midnight.
  if (stored.updatedAt && built.updatedAt &&
      boardDate(new Date(stored.updatedAt)) !== boardDate(new Date(built.updatedAt))) return built
  // A saved card that still shows a question the shelf has answered is stale
  // (answered in the app, or by an earlier tap). Never bring it back.
  const builtStatus = new Map(
    (built.items || []).map((item) => [`${item.lampId}|${item.periodKey}`, item.status]),
  )
  // So is an open question the shelf no longer offers (deleted, or
  // yesterday's grace ended).
  const stale = stored.items.some((item) => {
    if (item.status !== 'open') return false
    return builtStatus.get(`${item.lampId}|${item.periodKey}`) !== 'open'
  })
  if (stale || widgetOpenCount(stored) <= widgetOpenCount(built)) {
    // Keep the question the person browsed to with Next while it is still open.
    const kept = String(stored.leadLampId || '').trim()
    const keptNight = String(stored.leadNight || '').trim()
    const moved = kept && (kept !== built.leadLampId || (keptNight && keptNight !== built.leadNight))
    const hit = moved
      ? browsableItems(built.items).find(
          (item) => item.lampId === kept && (!keptNight || String(item.periodKey || '') === keptNight),
        )
      : null
    if (!hit) return built
    return {
      ...built,
      leadLampId: hit.lampId,
      leadNight: String(hit.periodKey || ''),
      question: hit.question || hit.label || built.question,
      tagTitle: hit.tag || built.tagTitle,
      sinceLine: sinceFor(hit),
    }
  }
  return {
    ...built,
    items: stored.items,
    leadLampId: stored.leadLampId || built.leadLampId,
    leadNight: stored.leadLampId ? stored.leadNight || '' : built.leadNight,
    question: stored.question || built.question,
    tagTitle: stored.tagTitle || built.tagTitle,
    sinceLine: sinceFor(widgetLeadFromItems(stored.items, stored.leadLampId, stored.leadNight)),
    left: stored.left ?? built.left,
    footer: stored.footer || built.footer,
    openUri: stored.openUri || built.openUri,
    buddyId: stored.buddyId || built.buddyId,
    buddyWorn: built.buddyWorn,
  }
}

export function buildTonightWidgetProps(shelf, now = new Date()) {
  const settings = readWidgetSettings()
  const boards = (shelf?.boards || []).filter((b) => !b.archived)
  const rows = tonightRowsForAllBoards(boards, now, settings.openOnly)
  const openRows = rows.filter((row) => !row.answer)
  const rankedOpen = rankWidgetOpen(openRows, now)
  const doneRows = rows.filter((row) => row.answer)
  // The grace period for the previous night: its open questions, first until
  // 5am and after tonight's until 9am. A tap lands on last night.
  const graceNight = graceNightIso(now)
  const graceOpen = graceNight
    ? graceRowsFor(boards, graceNight).map((row) => ({ ...row, graceTag: t('widget.tonight.lastNight') }))
    : []
  const firstGrace = graceOpen.length > 0 && graceFirst(now)
  const openOrdered = firstGrace ? [...graceOpen, ...rankedOpen] : [...rankedOpen, ...graceOpen]
  const items = [...openOrdered, ...doneRows].map(mapRow)
  // Your own questions done and a Did we still open for you: the widget
  // shows that Did we, so "1 left" has something to point at. A tap opens
  // the app to answer it. It comes before a question you said nope to.
  const tonightIso = boardDate(now)
  const weOpenIds = weOpenOn(tonightIso)
  const wePast = weOpenPastList(tonightIso).filter((card) => !weOpenIds.has(card.id))
  const weCard = openOrdered.length ? null : readWeOpen(tonightIso).find((card) => weOpenIds.has(card.id)) || wePast[0] || null
  const lead = openOrdered[0] || (weCard ? null : rows.find((row) => row.answer?.status === 'skip')) || null
  // The widgets only show a question that has a card in items, so the Did we
  // goes in first. Its Did and Nope answer the Did we (applyWeTap).
  const weItem = weCard
    ? {
        lampId: `${WE_ITEM}${weCard.id}`,
        periodKey: tonightIso,
        dateIso: tonightIso,
        label: weCard.question,
        question: weCard.question,
        status: weNightStatus(tonightIso, weCard.id) === 'nope' ? 'skip' : 'open',
        tag: t('we.title'),
      }
    : null
  if (weItem) items.unshift(weItem)
  const question = lead
    ? String(lead.lamp.question || '').trim() || shortLabel(lead.lamp)
    : weCard
      ? weCard.question
      : ''
  // Count like Tonight's meter: an optional question (put on your tonight
  // for you) stays on the widget to answer, but is not "left" until you did it.
  // A Did we due tonight counts too, until you said did on it in the app.
  const we = weNight(boardDate(now))
  // One hidden for today (Not yet on a monthly card) is off it, as on Today.
  const weLeft = Math.max(0, we.due - we.done - we.hidden) + wePast.length
  const left = finishStackCount(countedTonightRows(rows)) + weLeft + graceOpen.length
  // Same test as Tonight's done card, across every tag, so the widget never
  // says "no questions" while the app says done (the open-only setting hides
  // answered rows).
  const ownClear = dueClearTonight(boards.flatMap((book) => dueTonight(book, now)))
  const allClear = ownClear && weLeft === 0 && graceOpen.length === 0
  let footer = ''
  if (allClear) {
    footer = t('widget.tonight.clear')
  } else if (!rows.length && !left) {
    footer = t('widget.tonight.empty')
  } else if (left === 1) {
    footer = t('widget.tonight.oneLeft')
  } else if (left > 1) {
    footer = t('widget.tonight.left', { n: left })
  } else {
    footer = t('widget.tonight.empty')
  }
  // Nothing to answer yet, but a question comes up later tonight.
  const next = waitingRowsForAllBoards(boards, now)[0]
  const nextLine = next ? t('widget.tonight.nextAt', { time: clockWords(next.lamp.askAfter) }) : ''
  if (nextLine && !openRows.length && !graceOpen.length && !weCard) footer = nextLine
  // Away: questions are paused, so say that instead of "No questions yet".
  const away = awayOn(tonightIso) && !openRows.length && !graceOpen.length && !weCard
  if (away) footer = t('widget.tonight.away')
  // Gentle mode: the widgets show no count of what is left.
  const gentle = gentleOn()
  if (gentle && left > 0 && !away && !nextLine) footer = t('widget.tonight.waiting')
  // Nothing on the list at all: a tap goes to add a question, not to Today.
  const emptyList = !items.length && !nextLine && !away
  const colorBook = widgetColorBook(shelf)
  return {
    tagTitle: weCard && !lead ? t('we.title') : String(lead?.book?.title || '').trim() || t('widget.tonight.tagFallback'),
    question,
    sinceLine: lead?.book ? lastTimeLine(lead.book, lead.lamp, lead.dateIso) : '',
    leadLampId: lead?.lamp.id || weItem?.lampId || '',
    leadNight: String(lead?.periodKey || weItem?.periodKey || ''),
    items,
    left,
    weLeft,
    footer,
    didLabel: t('widget.tonight.did'),
    nopeLabel: t('widget.tonight.nope'),
    nextLabel: t('widget.tonight.next'),
    openLabel: t('widget.tonight.waiting'),
    remindLabel: t('remind.mic'),
    emptyLabel: away ? footer : nextLine || t('widget.tonight.empty'),
    clearLabel: away ? footer : nextLine || t('widget.tonight.clear'),
    openUri: emptyList ? 'didi://open/add' : widgetTonightUri(null, lead?.lamp.id || ''),
    buddyId: colorBook ? normalizePurse(colorBook).buddyOn || '' : '',
    buddyWorn: colorBook ? normalizePurse(colorBook).worn : {},
    weLine: readWeLine(boardDate(now)),
    // Gentle mode: the widgets draw no streak numbers.
    gentle,
    updatedAt: now.getTime(),
  }
}

// What Next steps through: open questions, or once none are open, the ones
// marked did not (the Tonight stack asks those again too).
export function browsableItems(items) {
  const list = Array.isArray(items) ? items : []
  const open = list.filter((item) => item.status === 'open')
  return open.length ? open : list.filter((item) => item.status === 'skip')
}

function leadCardItem(props) {
  return widgetLeadFromItems(props?.items, props?.leadLampId, props?.leadNight)
}

// The Android card steps forward from the snapshot it already has.
// A tap for a lamp that is no longer the open lead does not move it back.
export function advanceTonightCard(props, lampId, kind, night = '') {
  if (!props || !Array.isArray(props.items)) return null
  const id = String(lampId || '').trim()
  const mark = kind === 'did' ? 'yes' : kind === 'nope' ? 'skip' : ''
  if (!id || !mark) return null
  const nightKey = String(night || '').trim()
  const lead = leadCardItem(props)
  if (!lead || lead.lampId !== id) return null
  if (nightKey && String(lead.periodKey || '') !== nightKey) return null
  const items = props.items.map((item) => {
    const same =
      item.lampId === lead.lampId &&
      String(item.periodKey || '') === String(lead.periodKey || '') &&
      item.status === 'open'
    if (!same) return item
    return { ...item, status: mark }
  })
  const nextLead = widgetLeadFromItems(items)
  const left = widgetStackLeft(items)
  if (!nextLead) {
    const clear = String(props.clearLabel || '').trim()
    const empty = String(props.emptyLabel || '').trim()
    const open = String(props.openLabel || '').trim()
    const line = (items.length ? clear : empty) || open || String(props.footer || '').trim()
    if (!line) return null
    return {
      ...props,
      items,
      leadLampId: '',
      leadNight: '',
      question: '',
      sinceLine: '',
      left,
      footer: line,
    }
  }
  const question = String(nextLead.question || nextLead.label || '').trim()
  if (!question) return null
  return {
    ...props,
    items,
    leadLampId: nextLead.lampId,
    leadNight: String(nextLead.periodKey || ''),
    question,
    tagTitle: nextLead.tag || props.tagTitle,
    sinceLine: sinceFor(nextLead),
    left,
    footer: props.footer,
  }
}

// Manual browse through tonight's open questions from the widget's next
// button — unlike advanceTonightCard, this never answers one, it only moves
// which open item is shown. Wraps around. Null when there is nothing to
// browse to (0 or 1 open questions).
export function peekNextTonightCard(props, dir = 1) {
  if (!props || !Array.isArray(props.items)) return null
  const pool = browsableItems(props.items)
  if (pool.length < 2) return null
  const lead = leadCardItem(props)
  const at = lead
    ? pool.findIndex((item) => item.lampId === lead.lampId && item.periodKey === lead.periodKey)
    : -1
  const from = at === -1 ? 0 : at
  const step = dir < 0 ? -1 : 1
  const next = pool[(from + step + pool.length) % pool.length]
  const question = String(next.question || next.label || '').trim()
  if (!question) return null
  return { ...props, leadLampId: next.lampId, leadNight: String(next.periodKey || ''), question, tagTitle: next.tag || props.tagTitle, sinceLine: sinceFor(next) }
}

// Each item answers on whichever tag its own lamp lives on, since the card
// mixes questions from every tag now.
export function mergeWidgetPropsIntoShelf(shelf, props, clock = new Date(), unmatched = null) {
  if (!props?.items?.length) return shelf
  // Each answer pays into the shared purse the one before it left.
  let boards = alignShelfPurse(shelf).boards
  let changed = false
  for (const item of props.items) {
    if (item.status === 'open') continue
    if (String(item.lampId || '').startsWith(WE_ITEM)) {
      // A Did we answered on the iOS widget: saved once, not on every merge.
      const card = item.lampId.slice(WE_ITEM.length)
      const has = weNightStatus(item.periodKey, card)
      if (has !== 'did' && has !== (item.status === 'yes' ? 'did' : 'nope')) {
        // Tap time inside the item's own night (noon), so a card from last
        // night still lands on last night instead of being dropped.
        const noon = new Date(`${item.periodKey}T12:00:00`).getTime()
        applyWeTap(card, item.status, clock, item.periodKey, Number.isFinite(noon) ? noon : 0)
      }
      continue
    }
    const book = findBookHoldingLamp(boards, item.lampId)
    if (!book) {
      // Not on the shelf yet: the caller keeps this tap pending.
      if (unmatched) unmatched.push(item)
      continue
    }
    const nextBook = applyItemStatus(book, item, item.status, clock)
    if (nextBook === book) continue
    boards = spreadPurseFrom({ ...shelf, boards: boards.map((b) => (b.id === nextBook.id ? nextBook : b)) }, nextBook).boards
    changed = true
  }
  if (!changed) return shelf
  return { ...shelf, boards }
}

function widgetStatus(kind) {
  if (kind === 'did' || kind === 'yes') return 'yes'
  if (kind === 'nope' || kind === 'skip') return 'skip'
  return ''
}

function rowForStoredNight(book, lampId, night, clock) {
  const lamp = (book.lamps || []).find((item) => item.id === lampId && !item.archived)
  if (!lamp) return null
  const stored = String(night || '').trim()
  if (!stored) {
    return dueTonight(book, clock).find((row) => row.lamp.id === lampId) || null
  }
  const plain = /^\d{4}-\d{2}-\d{2}$/.test(stored)
  // An old watch or widget card can name a day the question is no longer
  // due on (its schedule changed): that tap is refused, not saved and paid.
  if (plain && !isEvery(lamp) && !(isPerWeek(lamp) ? perWeekDueOn(book, lamp, stored) : isDueOn(lamp, stored))) return null
  const dateIso = plain ? stored : boardDate(clock)
  return {
    lamp,
    dateIso,
    periodKey: stored,
    answer: answerFor(book, lamp.id, stored) || null,
  }
}

// Android only. The receiver and the widget task can both see one tap.
// A second apply for the same lamp and night does not write again.
// `tapAt` is when the tap happened (ms). A tap made after its night turned
// came from a stale card and is dropped; taps queued by older builds carry
// no time and land on their night as before.
const WE_ITEM = 'we:'

// Did or Nope on the widget's Did we card: saved here at once so the widget
// moves on, then sent to the cloud. A failed send is fixed by the next
// refresh of your Did we nights.
function applyWeTap(card, status, clock, cardNight = '', tapAt = 0) {
  // The night the card was showing. A tap made after that night ended (a
  // card left up past midnight) is dropped, the same as your own questions.
  const tappedAt = tapAt > 0 ? new Date(tapAt) : clock
  const night = cardNight || boardDate(tappedAt)
  if (night !== boardDate(tappedAt)) return null
  // A Did already saved for that night is not turned into Not yet by an old card.
  if (status !== 'yes' && weNightStatus(night, card) === 'did') return null
  markWeNight(card, night, status === 'yes' ? 'did' : 'nope')
  if (status === 'yes') skipWePing(card, night)
  const shelf = readShelf()
  const previous = readWidgetTonightProps()
  const props = buildTonightWidgetProps(shelf, clock)
  if (previous?.colors) props.colors = previous.colors
  writeWidgetTonightProps(props)
  const db = cloud()
  if (db) {
    // Not saved: put the real answers back so nothing shows as done that is not.
    db.rpc('we_answer', { card, on_night: night, want_status: status === 'yes' ? 'did' : 'nope' }).then(
      ({ error }) => {
        if (error) refreshWeNights().catch(() => {})
      },
      () => refreshWeNights().catch(() => {}),
    )
  }
  return shelf
}

export function applyWidgetTapOnce(lampId, kind, night = '', clock = new Date(), tapAt = 0) {
  const status = widgetStatus(kind)
  const id = String(lampId || '').trim()
  if (!status || !id) return null
  if (id.startsWith(WE_ITEM)) return applyWeTap(id.slice(WE_ITEM.length), status, clock, night, tapAt)
  // Start from the shared purse, so a folder already out of step is not paid from.
  const shelf = alignShelfPurse(readShelf())
  const book = findBookHoldingLamp(shelf.boards, id)
  if (!book) return null
  const row = rowForStoredNight(book, id, night, clock)
  if (!row) return null
  // A nope can still turn into a did, same as the Tonight stack. Anything else is already set.
  if (row.answer && !(row.answer.status === 'skip' && status === 'yes')) return null
  const tappedAt = tapAt > 0 ? new Date(tapAt) : null
  if (tappedAt && periodPassed(row.lamp, row.periodKey, openFloorIso(tappedAt))) return null
  const nextBook = putAnswer(book, row, status === 'yes' ? didStatusForRow(row) : status, tappedAt || tapClock(row, clock))
  if (nextBook === book) return null
  noteMilestone('widget_used')
  const boards = shelf.boards.map((item) => (item.id === nextBook.id ? nextBook : item))
  const nextShelf = settleTapEarnings(
    shelf,
    // The tap paid only its own folder; copy that purse to every folder.
    writeShelf(spreadPurseFrom({ ...shelf, boards }, nextBook)),
    clock,
    publishShelf,
  )
  const previous = readWidgetTonightProps()
  const props = buildTonightWidgetProps(nextShelf, clock)
  const items = props.items.map((item) =>
    item.lampId === id && (!night || item.periodKey === row.periodKey) ? { ...item, status } : item,
  )
  const nextProps = { ...props, items }
  if (previous?.colors) nextProps.colors = previous.colors
  writeWidgetTonightProps(nextProps)
  publishShelf(nextShelf)
  pushShelfAfterWidgetAnswer(nextShelf, { now: true }).catch(() => {})
  return nextShelf
}

// Android queues every Did / Did not tapped before JS runs, oldest first.
// Builds before the queue stored one object; read that as a queue of one.
export function parseWidgetTapQueue(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const tap = {
        lampId: String(row.lampId || '').trim(),
        kind: String(row.kind || '').trim(),
        night: String(row.night || '').trim(),
      }
      const at = Math.floor(Number(row.at) || 0)
      const sent = Math.floor(Number(row.sent) || 0)
      return { ...tap, ...(at > 0 ? { at } : {}), ...(sent > 0 ? { sent } : {}) }
    })
    .filter((row) => row.lampId && (row.kind === 'did' || row.kind === 'nope'))
}

// Applies each queued tap once. Rows that throw come back in `failed` so the
// caller can put them back for the next open.
export function applyWidgetTapsOnce(taps, clock = new Date()) {
  let shelf = null
  const failed = []
  const kept = []
  let refused = 0
  for (const tap of taps || []) {
    try {
      const next = applyWidgetTapOnce(tap.lampId, tap.kind, tap.night, clock, tap.at)
      if (!next) refused += 1
      // A tap made on another account (signed out or switched before the app
      // applied it) has no question here: keep it for that account, up to 3 days.
      const lamp = String(tap.lampId || '')
      if (!next && !lamp.startsWith(WE_ITEM) && clock.getTime() - Number(tap.at || 0) < 3 * 864e5 && !findBookHoldingLamp(readShelf().boards, lamp)) kept.push(tap)
      shelf = next || shelf
    } catch {
      failed.push(tap)
    }
  }
  return { shelf, failed, kept, refused }
}

// `night` comes from the tapped card (did:<lampId>|<periodKey>). Old targets
// carry none; then the stored open item for that lamp picks the night, so a
// "Last night" card answers last night, not tonight.
export function recordWidgetAnswer(lampId, kind, clock = new Date(), night = '') {
  const status = kind === 'did' || kind === 'yes' ? 'yes' : kind === 'nope' || kind === 'skip' ? 'skip' : ''
  if (!status || !lampId) return null
  if (String(lampId).startsWith(WE_ITEM)) {
    return applyWeTap(String(lampId).slice(WE_ITEM.length), status, clock, night)
  }
  // Start from the shared purse, so a folder already out of step is not paid from.
  const shelf = alignShelfPurse(readShelf())
  const book = findBookHoldingLamp(shelf.boards, lampId)
  if (!book) return null
  let key = String(night || '').trim()
  if (!key) {
    const stored = readWidgetTonightProps()
    const storedLead = stored?.items?.find((item) => item.lampId === lampId && item.status === 'open')
    key = String(storedLead?.periodKey || '')
  }
  const rows = dueTonight(book, clock)
  const row =
    rows.find((r) => r.lamp.id === lampId && (!key || r.periodKey === key)) ||
    (key ? rowForStoredNight(book, lampId, key, clock) : null) ||
    rows.find((r) => r.lamp.id === lampId)
  if (!row) return null
  // A card left over from a night that has closed must not write to it.
  if (!rows.includes(row) && periodPassed(row.lamp, row.periodKey, openFloorIso(clock))) return null
  // A widget that had not redrawn can still show a card answered in the app:
  // a Not yet can turn into a Did, nothing else changes a set answer.
  if (row.answer && !(row.answer.status === 'skip' && status === 'yes')) return null
  const finalStatus = status === 'yes' ? didStatusForRow(row) : status
  const nextBook = putAnswer(book, row, finalStatus, clock)
  if (nextBook === book) return null
  const boards = shelf.boards.map((b) => (b.id === nextBook.id ? nextBook : b))
  const nextShelf = settleTapEarnings(
    shelf,
    // The tap paid only its own folder; copy that purse to every folder.
    writeShelf(spreadPurseFrom({ ...shelf, boards }, nextBook)),
    clock,
    publishShelf,
  )
  const props = buildTonightWidgetProps(nextShelf, clock)
  const items = props.items.map((item) =>
    item.lampId === lampId && String(item.periodKey || '') === String(row.periodKey || '')
      ? { ...item, status }
      : item,
  )
  writeWidgetTonightProps({ ...props, items })
  publishShelf(nextShelf)
  pushShelfAfterWidgetAnswer(nextShelf, { now: true }).catch(() => {})
  return nextShelf
}

export function absorbStoredWidgetProps(shelf, clock = new Date()) {
  const props = readWidgetTonightProps()
  if (!props) return shelf
  return mergeWidgetPropsIntoShelf(shelf, props, clock)
}

export function handleAndroidWidgetClick(clickAction, clickActionData) {
  if (clickAction === 'OPEN_APP' || clickAction === 'OPEN_URI') return null
  const lampId = String(clickActionData?.lampId || '').trim()
  const kind = String(clickActionData?.kind || '').trim()
  const night = String(clickActionData?.night || '').trim()
  if (!lampId || (kind !== 'did' && kind !== 'nope')) return null
  // No tap time reaches this fallback, and the cold start can land after
  // midnight: 0 lets tapClock place the answer on the card's own night.
  return applyWidgetTapOnce(lampId, kind, night, new Date(), 0)
}
