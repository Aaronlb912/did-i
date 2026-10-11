import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import {
  Animated,
  AppState,
  BackHandler,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  findNodeHandle,
} from 'react-native'
import { checkPings } from '../../src/lib/notify.js'
import {
  activeDeadline,
  blankLamp,
  cadenceLine,
  dueByUrgency,
  didQuestion,
  duplicateLamp,
  lampBuzzes,
  hasAnyTopic,
  lampOrder,
  setLampOrder,
  joinTopics,
  lampNotifyOn,
  prepQuestionRows,
  shelfTopics,
  topicLabel,
  topicsOf,
  shortFromQuestion,
  shortLabel,
  SHORT_MAX,
  UNIT_MAX,
} from '../../src/lib/board-json.js'
import { commitBook } from '../../src/lib/achievements.js'
import { bulkLamps, hangInto, moveLamps, putAnswer, takeDown, toggleArchive, undoBulkLamps } from '../../src/lib/board-ops.js'
import { findBookHoldingLamp, readShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { clockWords, matchLamps } from '../../src/lib/hall-pages.js'
import { addDaysIso, answerFor, boardDate, everyDueOn, formatBoardDate, isDueOn, isEvery } from '../../src/lib/recurrence.js'
import { gapLine, lastTimeLine, sinceBadge } from '../../src/lib/every-copy.js'
import { LampMonth } from '../components/LampMonth.jsx'
import { readPrefs, usePrefs } from '../../src/lib/prefs.js'
import { NightNotes } from '../components/NightNotes.jsx'
import { addPack, packList, starterBlank, starterList, undoPack, unusedStarters } from '../../src/lib/starters.js'
import { schedulePick } from '../../src/lib/hang-schedule.js'
import { feelTap, playClick } from '../../src/lib/native.js'
import { ripple } from '../lib/ripple.js'
import { fireCheer, mergePurses } from '../../src/lib/purse.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { bookForTag, useHangDraft } from '../../src/lib/useHangDraft.js'
import { rowKey, tagIdsOf, taggedLamps } from '../../src/lib/tags.js'
import { HangMonthCal } from '../components/HangMonthCal.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { IdeaPicks, useWobble } from '../components/DidLead.jsx'
import { HangCard } from '../components/HangCard.jsx'
import { HangFold } from '../components/HangFold.jsx'
import { PickSheet } from '../components/PickSheet.jsx'
import Reanimated, { FadeIn } from 'react-native-reanimated'
import { ScheduleTile, ScheduleTiles } from '../components/ScheduleTile.jsx'
import { SetCap, SetCard, SetRow, SetSheet, SetSwitch } from '../components/SetBits.jsx'
import { LampManage, lampActions } from '../components/LampManage.jsx'
import { takeSpoken } from '../../src/lib/voice-add.js'
import { rowId, searchRows, tonightStates } from '../../src/lib/question-list.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { amountAverageLine, amountWords, bestQuestionStreak, lampAmounts, lampRecord, lampWeeks, lastDidTimes } from '../../src/lib/lamp-record.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { TagFilter } from '../components/TagFilter.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { SheetHost, publishSheet } from '../components/SheetHost.jsx'
import { confirmDone } from '../lib/confirm.js'
import { askPingsNow, offerPingPrimer } from '../lib/ping-primer.js'
import { useUndoToast } from '../lib/toast-queue.js'
import { useShakeUndo } from '../hooks/useShakeUndo.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { useHeaderBottom } from '../hooks/useHeaderSpace.js'
import {
  AppTextInput,
  ChipRow,
  DidButton,
  Field,
  KeyButton,
  Meta,
  Page,
  Row,
} from '../components/ui.jsx'
import { behindPath, goBack, goHash, onRoute, readRoute, swapHash } from '../navigation/hash.js'
import { useAccount } from '../../src/lib/account.js'
import { CheckOnCard } from '../components/CheckOnCard.jsx'
import { usePeoplePulse } from '../../src/lib/people.js'
import { useWeTonight } from '../../src/lib/did-we.js'
import { fonts, sectionLabel } from '../theme.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { EditPen } from '../components/SwipeFace.jsx'
import { checkOnFits, followCheckOn } from '../../src/lib/check-on.js'
import { pressFx, Reveal, useLayoutState } from '../lib/motion.jsx'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

function useHall(book) {
  const colors = useHallColors(book)
  const clock = useMemo(() => new Date(), [])
  const dateIso = boardDate(clock, book.dayFoldHour)
  return { colors, clock, dateIso }
}

// "Sep 28" in the person's language, for the week bars.
function shortDay(iso) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(readPrefs().locale || undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso.slice(5)
  }
}

function shellDate(book, clock = new Date()) {
  return formatBoardDate(boardDate(clock, book.dayFoldHour))
}

function openStarters(book) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  return starterList().filter(
    (starter) =>
      !hung.some((lamp) => lamp.short === starter.short || lamp.question === starter.question),
  )
}

// The dot on each row, in Home's colors: did, late, not yet (muted; nope
// on a closed night), not answered yet, due today (red ring), or not asked tonight.
function dotKind(state, urgency) {
  if (state === 'did' || state === 'late' || state === 'nope' || state === 'pastNope' || state === 'missed') return state
  if (urgency === 'today' || urgency === 'soon') return 'due'
  if (state === 'open') return 'open'
  return 'off'
}

function stateDot(kind, colors) {
  if (kind === 'did') return { backgroundColor: colors.on, borderColor: colors.on }
  if (kind === 'late') return { backgroundColor: colors.late || colors.on, borderColor: colors.late || colors.on }
  if (kind === 'nope' || kind === 'pastNope') return { backgroundColor: colors.skip || colors.inkDim, borderColor: colors.skip || colors.inkDim }
  if (kind === 'due') return { backgroundColor: 'transparent', borderColor: colors.miss }
  if (kind === 'open') return { backgroundColor: 'transparent', borderColor: colors.openRing || colors.open || colors.on }
  if (kind === 'missed') return { backgroundColor: colors.miss, borderColor: colors.miss }
  return { backgroundColor: 'transparent', borderColor: colors.line }
}

// Tonight's skip is a not yet; a past one-time question's skip is a nope.
const DOT_WORDS = { did: 'jewelKey.did', late: 'jewelKey.late', nope: 'jewelKey.notYet', pastNope: 'jewelKey.nope', open: 'jewelKey.open', due: 'jewelKey.due', missed: 'later.missed' }

// One line over the list naming only the dots that are on it.
function DotKey({ kinds, colors }) {
  const shown = ['did', 'late', 'nope', 'pastNope', 'missed', 'open', 'due'].filter((kind) => kinds.has(kind))
  if (!shown.length) return null
  return (
    <View style={styles.dotKey} accessible accessibilityLabel={shown.map((kind) => t(DOT_WORDS[kind])).join(', ')}>
      {shown.map((kind) => (
        <View key={kind} style={styles.dotKeyItem}>
          <View style={[styles.dotKeyDot, stateDot(kind, colors)]} />
          <Text style={[styles.dotKeyText, { color: colors.inkSoft }]}>{t(DOT_WORDS[kind])}</Text>
        </View>
      ))}
    </View>
  )
}

function PickBox({ on, colors }) {
  return (
    <View
      style={[
        styles.pickBox,
        { borderColor: on ? colors.onDeep : colors.inkDim, backgroundColor: on ? colors.on : colors.panel2 },
      ]}
    >
      {on ? <Text style={[styles.pickTick, { color: colors.bg }]}>✓</Text> : null}
    </View>
  )
}

function MoveKey({ glyph, label, on, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!on}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !on }}
      style={({ pressed }) => [
        styles.moveKey,
        { borderColor: colors.line, backgroundColor: pressed ? colors.panel3 : colors.panel2, opacity: on ? 1 : 0.3 },
      ]}
    >
      <Text style={[styles.moveGlyph, { color: colors.ink }]}>{glyph}</Text>
    </Pressable>
  )
}

// One question per row: its short name, the question on one line, then
// tag, schedule and time. Every line clips, so long words never crowd the list.
// A one-time question whose night has passed: it is done, not paused.
export function onceIsPast(lamp, dateIso) {
  if (lamp?.cadence !== 'once') return false
  const target = String((lamp.onceWhen === 'by' ? lamp.dueBy : lamp.onceOn) || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(target) && target < dateIso
}

// The short name and the question in the same words: the row shows one line.
function sameWords(lamp) {
  const plain = (text) => shortFromQuestion(text).toLowerCase()
  return plain(shortLabel(lamp)) === plain(lamp.question)
}

// Past one-time questions: how their night went, or missed when never answered.
// Gentle mode leaves a missed one blank.
function earlierStates(rows, gentle = false) {
  const missed = gentle ? '' : 'missed'
  const ids = new Set(rows.map(rowId))
  const books = new Map(rows.map((row) => [row.boardId, row.book]))
  const states = new Map()
  for (const row of rows) states.set(rowId(row), missed)
  for (const [boardId, book] of books) {
    for (const answer of book?.answers || []) {
      const id = `${boardId}:${answer.lampId}`
      if (!ids.has(id)) continue
      const status = answer.status
      states.set(id, status === 'yes' ? 'did' : status === 'late' ? 'late' : status === 'skip' ? 'pastNope' : missed)
    }
  }
  return states
}

function LampBlock({ label, items, shelf, states, dateIso, colors, onOpen, picking, picked, onPick, onMove, open = true, onToggle }) {
  if (!items.length) return null
  const head = (
    <Text style={[styles.blockLabel, { color: colors.inkDim }]}>
      {label} · {items.length}
      {onToggle ? (open ? '  ▾' : '  ▸') : ''}
    </Text>
  )
  return (
    <View style={styles.block}>
      {onToggle ? (
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => pressFx(pressed)}
        >
          {head}
        </Pressable>
      ) : (
        head
      )}
      {open ? (
      <Reveal key="list" layout={false}>
      <View style={[styles.lampList, { borderColor: colors.lineSoft, backgroundColor: colors.panel }]}>
        {items.map((row, index) => {
          const urgency = dueByUrgency(row.lamp, dateIso)
          const on = Boolean(picking && picked?.has(rowKey(row)))
          const meta = [
            row.lamp.fromName ? t('inbox.from', { name: row.lamp.fromName }) : '',
            shelf.length > 1 ? row.tag : '',
            cadenceLine(row.lamp),
            row.lamp.askAfter ? timeLabel(row.lamp.askAfter) : '',
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <Pressable
              key={rowId(row)}
              disabled={Boolean(onMove)}
              accessibilityRole={picking ? 'checkbox' : 'button'}
              accessibilityState={picking ? { checked: on } : undefined}
              accessibilityLabel={row.lamp.question}
              onPress={() => {
                if (picking) {
                  onPick(row)
                  return
                }
                if (onOpen) onOpen(row.boardId, row.lamp.id)
                else goHash('/lamp', { id: row.lamp.id })
              }}
              android_ripple={ripple(colors.panel3)}
              style={({ pressed }) => [
                styles.lampItem,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.lineSoft },
                (pressed || on) && { backgroundColor: on ? colors.panel3 : colors.panel2 },
              ]}
            >
              {picking ? (
                <PickBox on={on} colors={colors} />
              ) : (
                <View style={[styles.lampDot, stateDot(dotKind(states.get(rowId(row)) || '', urgency), colors)]} />
              )}
              <View style={styles.lampCopy}>
                <Text style={[styles.lampName, { color: colors.ink }]} numberOfLines={1}>
                  {shortLabel(row.lamp)}
                </Text>
                {sameWords(row.lamp) && !isEvery(row.lamp) ? null : (
                  <Text style={[styles.lampQ, { color: colors.inkSoft }]} numberOfLines={1}>
                    {row.lamp.question}
                  </Text>
                )}
                <Text style={[styles.lampMeta, { color: colors.inkDim }]} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
              {onMove ? (
                <View style={styles.moveKeys}>
                  <MoveKey glyph="↑" label={t('questions.moveUp', { name: shortLabel(row.lamp) })} on={index > 0} onPress={() => onMove(index, -1)} colors={colors} />
                  <MoveKey glyph="↓" label={t('questions.moveDown', { name: shortLabel(row.lamp) })} on={index < items.length - 1} onPress={() => onMove(index, 1)} colors={colors} />
                </View>
              ) : picking ? null : (
                <>
                  {isEvery(row.lamp) && sinceBadge(row.book, row.lamp, dateIso) ? (
                    <Text
                      accessibilityLabel={lastTimeLine(row.book, row.lamp, dateIso, true)}
                      style={[styles.everyPill, { color: colors.inkSoft, backgroundColor: colors.panel2 }]}
                    >
                      {sinceBadge(row.book, row.lamp, dateIso)}
                    </Text>
                  ) : null}
                  <Text style={[styles.lampChev, { color: colors.inkDim }]}>›</Text>
                </>
              )}
            </Pressable>
          )
        })}
      </View>
      </Reveal>
      ) : null}
    </View>
  )
}

export function SearchBox({ value, onChange, colors, placeholder = t('questions.searchPh') }) {
  return (
    <View style={[styles.search, { borderColor: value ? colors.onDeep : colors.line, backgroundColor: colors.panel }]}>
      <Text style={[styles.searchGlyph, { color: colors.inkDim }]}>⌕</Text>
      <AppTextInput
        colors={colors}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.searchInput, { color: colors.ink }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('questions.searchClear')}
          style={styles.searchClear}
        >
          <Text style={[styles.searchGlyph, { color: colors.ink }]}>×</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const UNDO_MS = 6000

// A row that opens another screen.
function GoRow({ label, note, lit = false, top = false, onPress, colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.goRow,
        top && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
        pressed && { backgroundColor: colors.panel2 },
      ]}
    >
      <View style={styles.goText}>
        <Text style={[styles.goLabel, { color: lit ? colors.on : colors.ink }]}>{label}</Text>
        <Text style={[styles.goNote, { color: colors.inkSoft }]}>{note}</Text>
      </View>
      <Text style={[styles.goChev, { color: colors.inkDim }]}>›</Text>
    </Pressable>
  )
}

// Did yous and Did wes, one tap from Questions. Each pill shows only when
// there is something behind it, so the page looks the same for people who
// never use them.
function useFromFriends(rows, dateIso) {
  const account = useAccount()
  const { inbox } = usePeoplePulse(account.user)
  const { cards } = useWeTonight(account.user)
  if (!account.user) return { signedIn: false, youN: 0, weN: 0, inbox: 0 }
  // Count only what is still being asked, tonight or on a later night: not
  // stopped, and not a one-night did you whose night has gone.
  const kept = rows.filter(
    (row) =>
      row.lamp.fromDidYou &&
      !row.lamp.archived &&
      !(row.lamp.cadence === 'once' && row.lamp.onceOn && row.lamp.onceOn < dateIso),
  ).length
  const youN = kept + (inbox || 0)
  const weN = (cards || []).filter(
    (card) =>
      (card.myState === 'asked' || card.myState === 'in') &&
      !(card.cadence === 'once' && card.startsOn && card.startsOn < dateIso),
  ).length
  return { signedIn: true, youN, weN, inbox: inbox || 0 }
}

function FriendPills({ friends, didYouOnly, onDidYou, colors }) {
  if (!friends.signedIn) return null
  const { youN, weN } = friends
  return (
    <>
      {youN || didYouOnly ? (
        <Pill label={t('questions.didYouPill', { n: youN })} on={didYouOnly} onPress={onDidYou} colors={colors} />
      ) : null}
      {weN ? <Pill label={t('questions.didWePill', { n: weN })} onPress={() => goHash('/we')} colors={colors} /> : null}
    </>
  )
}

function DidYouRows({ inbox, colors }) {
  return (
    <View style={[styles.lampList, { borderColor: inbox ? colors.on : colors.lineSoft, backgroundColor: colors.panel }]}>
      <GoRow
        label={t('questions.didYouInbox')}
        note={inbox ? t('questions.didYouToKeep', { n: inbox }) : t('questions.didYouNoneWaiting')}
        lit={Boolean(inbox)}
        onPress={() => goHash('/inbox')}
        colors={colors}
      />
      <GoRow label={t('sent.kicker')} note={t('sent.rowSub')} onPress={() => goHash('/sent')} colors={colors} top />
    </View>
  )
}

// Questions in their hand-set order (see lampOrder); unmoved ones keep theirs after.
function inHandOrder(rows) {
  return rows
    .map((row, at) => ({ row, at, rank: lampOrder(row.lamp) }))
    .sort((a, b) => (a.rank === b.rank ? a.at - b.at : a.rank === Infinity ? 1 : b.rank === Infinity ? -1 : a.rank - b.rank))
    .map((item) => item.row)
}

const SEARCH_FROM = 10

export function QuestionsScreen({ book, boards = [], tagId = '', onTag, onChange, onChangeBooks, onOpen }) {
  const { colors, clock, dateIso } = useHall(book)
  const shelf = boards.length ? boards : [book]
  const allRows = inHandOrder(taggedLamps(shelf, tagId))
  const [deadlineOnly, setDeadlineOnly] = useLayoutState(false)
  const [didYouOnly, setDidYouOnly] = useLayoutState(false)
  const [query, setQuery] = useState('')
  const rows = searchRows(allRows, query)
  const states = useMemo(() => tonightStates(allRows, clock), [shelf, tagId, clock])
  const gentle = usePrefs().gentle === true
  const [topicPicks, setTopicPicks] = useState([])
  const [picking, setPicking] = useLayoutState(false)
  const [ordering, setOrdering] = useLayoutState(false)
  const friends = useFromFriends(allRows, dateIso)
  const [picked, setPicked] = useState(() => new Set())
  const [undo, setUndo] = useState(null)
  // The undo toast joins the one line above the tab bar. Shake undo is off.
  useUndoToast('questions', undo, takeBack, UNDO_MS, t('tonight.undoTap'))
  useShakeUndo(Boolean(undo), takeBack)
  const topics = shelfTopics(shelf)
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const hasDeadlines = allRows.some((row) => activeDeadline(row.lamp, dateIso))
  const fromOk = (row) => !didYouOnly || row.lamp.fromDidYou
  const [earlierOpen, setEarlierOpen] = useLayoutState(false)
  const liveRows = rows.filter(
    (row) => !row.lamp.archived && !onceIsPast(row.lamp, dateIso) && hasAnyTopic(row.lamp, picks) && fromOk(row),
  )
  // While ordering, the list shows the plain hand order, not deadlines first.
  const hung = ordering ? liveRows : prepQuestionRows(liveRows, { dateIso, deadlineOnly })
  const down = prepQuestionRows(
    rows.filter((row) => row.lamp.archived && !onceIsPast(row.lamp, dateIso) && hasAnyTopic(row.lamp, picks) && fromOk(row)),
    { dateIso, deadlineOnly },
  )
  // Finished one-time questions: their own folded list, so they stop crowding the paused ones.
  const earlier = rows.filter((row) => onceIsPast(row.lamp, dateIso) && hasAnyTopic(row.lamp, picks) && fromOk(row))
  const pastStates = earlierOpen ? earlierStates(earlier, gentle) : states
  const starters = openStarters(book)
  const shown = [...hung, ...down, ...(earlierOpen ? earlier : [])]
  // Only what is on screen counts, so a filter change never acts on hidden rows.
  const chosen = shown.filter((row) => picked.has(rowKey(row)))
  const allOn = shown.length > 0 && chosen.length === shown.length
  const allDown = chosen.length > 0 && chosen.every((row) => row.lamp.archived)

  const dotKinds = (() => {
    const kinds = new Set()
    for (const row of hung) kinds.add(dotKind(states.get(rowId(row)) || '', dueByUrgency(row.lamp, dateIso)))
    // Open Earlier rows have dots too, so the key names theirs.
    if (earlierOpen) for (const row of earlier) kinds.add(pastStates.get(rowId(row)) || (gentle ? 'off' : 'missed'))
    return kinds
  })()

  // Swaps a question with the one next to it on screen, then numbers every
  // live question so tonight and the widget follow.
  function move(index, step) {
    const a = hung[index]
    const b = hung[index + step]
    if (!a || !b || !onChangeBooks) return
    feelTap()
    // Every folder at once, so orders never collide when tonight shows All.
    const ids = inHandOrder(taggedLamps(shelf, '')).filter((row) => !row.lamp.archived).map((row) => row.lamp.id)
    const ai = ids.indexOf(a.lamp.id)
    const bi = ids.indexOf(b.lamp.id)
    if (ai < 0 || bi < 0) return
    ids[ai] = b.lamp.id
    ids[bi] = a.lamp.id
    const next = setLampOrder(shelf, ids)
    const changed = next.filter((item, at) => item !== shelf[at])
    if (changed.length) onChangeBooks(changed.map((item) => commitBook(item, clock)))
  }

  function stopPicking() {
    setPicking(false)
    setPicked(new Set())
  }

  // Reorder saves as you go; Never mind puts the order back the way it was.
  const orderBefore = useRef(null)
  function startOrdering() {
    orderBefore.current = inHandOrder(taggedLamps(shelf, '')).filter((row) => !row.lamp.archived).map((row) => row.lamp.id)
    setOrdering(true)
  }
  function cancelOrder() {
    const ids = orderBefore.current
    setOrdering(false)
    if (!ids || !onChangeBooks) return
    const next = setLampOrder(shelf, ids)
    const changed = next.filter((item, at) => item !== shelf[at])
    if (changed.length) onChangeBooks(changed.map((item) => commitBook(item, clock)))
  }

  useEffect(() => {
    if (!picking && !ordering) return undefined
    function onBack(event) {
      stopPicking()
      setOrdering(false)
      event?.preventDefault?.()
    }
    window.addEventListener('did-i-back', onBack)
    // Android back reaches the stack before did-i-back, so take it here first, like a sheet.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack()
      return true
    })
    // Leaving Questions (another tab, a pushed page) ends the mode and drops the picks.
    const here = readRoute()?.path
    const off = onRoute((route) => {
      if (route?.path !== here) onBack()
    })
    return () => {
      window.removeEventListener('did-i-back', onBack)
      sub.remove()
      off()
    }
  }, [picking, ordering])

  useEffect(() => {
    if (!undo) return undefined
    const timer = setTimeout(() => setUndo(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [undo])

  function pick(row) {
    feelTap()
    setPicked((live) => {
      const next = new Set(live)
      const key = rowKey(row)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function apply(kind) {
    if (!chosen.length || !onChangeBooks) return
    const lampPicks = chosen.map((row) => ({ boardId: row.boardId || row.book?.id, lampId: row.lamp.id }))
    const before = shelf.filter((item) => lampPicks.some((one) => one.boardId === item.id))
    onChangeBooks(bulkLamps(shelf, lampPicks, kind).map((item) => commitBook(item, clock)))
    const n = lampPicks.length
    const label =
      kind === 'delete'
        ? t(n === 1 ? 'questions.bulkDeletedOne' : 'questions.bulkDeleted', { n })
        : kind === 'stop'
          ? t('questions.bulkStopped', { n })
          : t('questions.bulkAsked', { n })
    setUndo({ id: Date.now(), label, before, picks: lampPicks })
    stopPicking()
  }

  // Move only makes sense with somewhere else to go. Empty folders are parked
  // (archived) but are still places to move to.
  const folders = shelf
  const { overlayBottom } = useAppInsets()
  const headerBottom = useHeaderBottom()
  // The pinned bars sit under the header. On iOS the large title starts
  // expanded, so the header ends where the page starts (-offset) until the
  // title shrinks into the bar.
  const scrollY = useRef(new Animated.Value(0)).current
  const barShift = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [-2000, -headerBottom, 0],
        outputRange: [2000 + 8, headerBottom + 8, headerBottom + 8],
        extrapolate: 'clamp',
      }),
    [scrollY, headerBottom],
  )

  function moveTo(targetId) {
    if (!chosen.length || !onChangeBooks) return
    const lampPicks = chosen.map((row) => ({ boardId: row.boardId || row.book?.id, lampId: row.lamp.id }))
    const moving = lampPicks.filter((one) => one.boardId !== targetId)
    const changed = moveLamps(shelf, moving, targetId)
    if (changed.length) onChangeBooks(changed.map((item) => commitBook(item, clock)))
    const folder = folders.find((item) => item.id === targetId)?.title || ''
    // Undo moves each one back to the folder it came from.
    const n = lampPicks.length
    const label = n === 1 ? t('questions.bulkMovedOne', { folder }) : t('questions.bulkMoved', { n, folder })
    setUndo({ id: Date.now(), label, moved: moving, to: targetId })
    stopPicking()
  }

  function askMove() {
    if (!chosen.length) return
    const n = chosen.length
    const from = new Set(chosen.map((row) => row.boardId || row.book?.id))
    publishSheet({
      title: n === 1 ? t('questions.moveTitleOne') : t('questions.moveTitle', { n }),
      colors,
      closeLabel: t('settings.neverMind'),
      onClose: () => publishSheet(null),
      content: (
        <View style={styles.editMenu}>
          {/* The folder they sit in now leads, so "Here now" is never cut off at the bottom. */}
          {[...folders.filter((item) => from.has(item.id)), ...folders.filter((item) => !from.has(item.id))].map((item) => {
            // Every picked question already sits here: nothing to move.
            const here = from.size === 1 && from.has(item.id)
            return (
              <Row
                key={item.id}
                colors={colors}
                label={item.title}
                note={here ? t('questions.hereNow') : ''}
                onPress={
                  here
                    ? undefined
                    : () => {
                        publishSheet(null)
                        moveTo(item.id)
                      }
                }
              />
            )
          })}
        </View>
      ),
    })
  }

  function askDelete() {
    if (!chosen.length) return
    publishSheet({
      title: t('questions.bulkDeleteTitle'),
      body: t('questions.bulkDeleteBody', { n: chosen.length }),
      goLabel: t('lamp.delete'),
      danger: true,
      closeLabel: t('lamp.keep'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        apply('delete')
      },
    })
  }

  function takeBack() {
    if (!undo || !onChangeBooks) return
    if (undo.moved) {
      let books = shelf
      const back = new Set()
      for (const boardId of new Set(undo.moved.map((one) => one.boardId))) {
        const picks = undo.moved.filter((one) => one.boardId === boardId).map((one) => ({ boardId: undo.to, lampId: one.lampId }))
        for (const item of moveLamps(books, picks, boardId)) {
          books = books.map((old) => (old.id === item.id ? item : old))
          back.add(item.id)
        }
      }
      if (back.size) onChangeBooks(books.filter((item) => back.has(item.id)).map((item) => commitBook(item, clock)))
      setUndo(null)
      return
    }
    onChangeBooks(undoBulkLamps(shelf, undo.before, undo.picks))
    setUndo(null)
  }

  return (
    <View style={styles.fill}>
      {/* A tab, never pushed: no back arrow, even while a form that just saved is still popping off the stack. */}
      <BoardShell book={book} boards={shelf} title={allRows.length ? t('questions.title') : t('questions.empty')} date={shellDate(book, clock)} colors={colors} showAdd back={false} scrollY={scrollY}>
        {/* Filters, Did you / Did we, Add and Edit share one row, so the list starts high.
            It scrolls sideways instead of wrapping, so a picked filter never pushes Edit down. */}
        {/* Select and Reorder swap this row for their pinned bar. */}
        {ordering || picking ? null : (
          <Reveal style={styles.topWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.topRow}>
            <TagFilter
              boards={shelf}
              tagId={tagId}
              onTag={onTag}
              now={clock}
              colors={colors}
              topics={topics}
              topicPicks={picks}
              onTopics={setTopicPicks}
              inline
            />
            <FriendPills friends={friends} didYouOnly={didYouOnly} onDidYou={() => setDidYouOnly((on) => !on)} colors={colors} />
            {didYouOnly ? null : (
              <>
                <DidButton label={t('tonight.add')} onPress={() => goHash('/add')} colors={colors} small />
                {shown.length && onChangeBooks ? (
                  <KeyButton
                    colors={colors}
                    label={t('questions.editMenu')}
                    onPress={() => {
                      // Select and Reorder share one pill so the top row stays short.
                      if (hung.length < 2) return setPicking(true)
                      const pick = (go) => () => {
                        publishSheet(null)
                        go(true)
                      }
                      publishSheet({
                        title: t('questions.editTitle'),
                        colors,
                        closeLabel: t('settings.neverMind'),
                        onClose: () => publishSheet(null),
                        content: (
                          <View style={styles.editMenu}>
                            <Row colors={colors} label={t('questions.pick')} note={t(folders.length > 1 ? 'questions.pickSub' : 'questions.pickSubNoMove')} onPress={pick(setPicking)} />
                            <Row colors={colors} label={t('questions.reorder')} note={t('questions.reorderHint')} onPress={pick(startOrdering)} />
                          </View>
                        ),
                      })
                    }}
                  />
                ) : null}
              </>
            )}
          </ScrollView>
          </Reveal>
        )}
        {/* Room under the pinned Select bar, where the top row was. */}
        {picking ? <View style={styles.modeRoom} /> : null}
        {(allRows.length >= SEARCH_FROM || query) && !ordering ? (
          <Reveal>
            <SearchBox value={query} onChange={setQuery} colors={colors} />
          </Reveal>
        ) : null}
        {didYouOnly && friends.signedIn ? (
          <Reveal>
            <DidYouRows inbox={friends.inbox} colors={colors} />
          </Reveal>
        ) : null}

        {hasDeadlines && !ordering ? (
          <Reveal>
            <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('questions.filter')}</Text>
            <ChipRow
              items={[
                { id: 'all', label: t('questions.filterAll') },
                { id: 'deadline', label: t('questions.filterDeadline') },
              ]}
              value={deadlineOnly ? 'deadline' : 'all'}
              onPick={(value) => setDeadlineOnly(value === 'deadline')}
              colors={colors}
            />
          </Reveal>
        ) : null}

        {/* Room under the pinned mode bar, so it never covers the first row. */}
        {ordering ? <View style={styles.modeRoom} /> : null}
        {ordering && liveRows.some((row) => /^\d\d:\d\d$/.test(String(row.lamp.askAfter || ''))) ? (
          <Reveal>
            <Text style={[styles.reorderTimed, { color: colors.inkSoft }]}>{t('questions.reorderTimed')}</Text>
          </Reveal>
        ) : null}
        {hung.length && !ordering && !picking ? <DotKey kinds={dotKinds} colors={colors} /> : null}
        {hung.length ? (
          <LampBlock
            onMove={ordering ? move : undefined}
            label={didYouOnly ? t('questions.didYouKeptList') : t('questions.list')}
            items={hung}
            shelf={shelf}
            states={states}
            dateIso={dateIso}
            colors={colors}
            onOpen={onOpen}
            picking={picking}
            picked={picked}
            onPick={pick}
          />
        ) : query.trim() && allRows.length ? (
          <Reveal key="noMatch">
            <Meta colors={colors}>{t('questions.noMatch')}</Meta>
          </Reveal>
        ) : picks.length ? (
          <Reveal key="emptyTopic">
            <Meta colors={colors}>{t('questions.emptyTopic')}</Meta>
          </Reveal>
        ) : deadlineOnly ? (
          <Reveal key="emptyDeadline">
            <Meta colors={colors}>{t('questions.emptyDeadline')}</Meta>
          </Reveal>
        ) : (
          <>
            <Meta colors={colors}>{t('questions.hint')}</Meta>
            {allRows.length ? null : <DidButton colors={colors} label={t('home.add')} onPress={() => goHash('/add')} />}
            {starters.length && onChange ? (
              <View style={styles.starters}>
                <Text style={[styles.blockLabel, { color: colors.inkDim }]}>{t('first.picks')}</Text>
                <View style={styles.starterRow}>
                  {starters.map((starter) => (
                    <KeyButton
                      key={starter.short}
                      label={starter.short}
                      colors={colors}
                      onPress={() => {
                        onChange(commitBook(hangInto(book, { ...blankLamp(clock), ...starter }), clock))
                        confirmDone(t('confirm.questionAdded'))
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}

        {ordering ? null : <LampBlock
          label={t('questions.down')}
          items={down}
          shelf={shelf}
          states={states}
          dateIso={dateIso}
          colors={colors}
          onOpen={onOpen}
          picking={picking}
          picked={picked}
          onPick={pick}
        />}
        {ordering ? null : (
          <LampBlock
            label={t('questions.earlier')}
            items={earlier}
            shelf={shelf}
            states={pastStates}
            dateIso={dateIso}
            colors={colors}
            onOpen={onOpen}
            picking={picking}
            picked={picked}
            onPick={pick}
            open={earlierOpen}
            onToggle={() => setEarlierOpen((on) => !on)}
          />
        )}
        {/* Room so the floating Select bar never covers the last rows. */}
        {picking ? <View style={styles.pickRoom} /> : null}
      </BoardShell>
          {/* Pinned Reorder bar: Never mind puts the order back, Done keeps it. */}
          {ordering ? (
            <Animated.View pointerEvents="box-none" style={[styles.modeWrap, { transform: [{ translateY: barShift }] }]}>
            <Reveal
              style={[styles.modeBar, { borderColor: colors.on, backgroundColor: colors.panel }]}
              accessibilityRole="header"
            >
              <Pressable accessibilityRole="button" onPress={cancelOrder} hitSlop={10} style={styles.modeSide}>
                <Text style={[styles.modeCancel, { color: colors.inkSoft }]} numberOfLines={1}>{t('settings.neverMind')}</Text>
              </Pressable>
              <View style={styles.modeMid}>
                <Text style={[styles.modeTitle, { color: colors.ink }]} numberOfLines={1}>{t('questions.reorder')}</Text>
                <Text style={[styles.modeSub, styles.modeSubWrap, { color: colors.inkSoft }]} numberOfLines={2}>{t('questions.reorderHint')}</Text>
              </View>
              <View style={[styles.modeSide, styles.modeEnd]}>
                <DidButton label={t('questions.pickDone')} onPress={() => setOrdering(false)} colors={colors} small />
              </View>
            </Reveal>
            </Animated.View>
          ) : null}
          {/* Pinned Select bar: Never mind, count, Select all. It stays while the list scrolls. */}
          {picking ? (
            <Animated.View pointerEvents="box-none" style={[styles.modeWrap, { transform: [{ translateY: barShift }] }]}>
            <Reveal
              style={[styles.modeBar, { borderColor: colors.on, backgroundColor: colors.panel }]}
              accessibilityRole="header"
            >
              <Pressable accessibilityRole="button" onPress={stopPicking} hitSlop={10} style={styles.modeSide}>
                <Text style={[styles.modeCancel, { color: colors.inkSoft }]} numberOfLines={1}>{t('settings.neverMind')}</Text>
              </Pressable>
              <View style={styles.modeMid}>
                <Text style={[styles.modeTitle, { color: colors.ink }]} numberOfLines={1}>{t('questions.pick')}</Text>
                <Text style={[styles.modeSub, { color: colors.inkSoft }]} numberOfLines={1}>{t('questions.pickedN', { n: chosen.length })}</Text>
              </View>
              <View style={[styles.modeSide, styles.modeEnd]}>
                <KeyButton
                  colors={colors}
                  label={allOn ? t('questions.pickNone') : t('questions.pickAll')}
                  onPress={() => setPicked(allOn ? new Set() : new Set(shown.map(rowKey)))}
                />
              </View>
            </Reveal>
            </Animated.View>
          ) : null}
          {picking ? (
            <Reveal style={[styles.pickBar, styles.pickFloat, { bottom: overlayBottom, borderColor: colors.on, backgroundColor: colors.panel }]}>
              <View style={styles.pickActions}>
                <KeyButton
                  colors={colors}
                  disabled={!chosen.length}
                  label={allDown ? t('lamp.askAgain') : t('lamp.stop')}
                  onPress={() => apply(allDown ? 'ask' : 'stop')}
                />
                {folders.length > 1 ? (
                  <KeyButton colors={colors} disabled={!chosen.length} label={t('questions.move')} onPress={askMove} />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={!chosen.length}
                  onPress={askDelete}
                  style={({ pressed }) => [
                    styles.dropBtn,
                    {
                      borderColor: colors.miss,
                      backgroundColor: pressed ? colors.panel2 : 'transparent',
                      opacity: chosen.length ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={[styles.dropText, { color: colors.miss }]}>{t('lamp.delete')}</Text>
                </Pressable>
              </View>
            </Reveal>
          ) : null}
    </View>
  )
}


const PRIORITIES = ['high', 'normal', 'low']
export function SearchScreen({ book }) {
  const { colors } = useHall(book)
  const [query, setQuery] = useState('')
  const hits = matchLamps(book, query)

  return (
    <BoardShell book={book} title={t('search.title')} date={shellDate(book)} colors={colors}>
      <Field colors={colors} label={t('search.label')} value={query} onChangeText={setQuery} placeholder={t('search.ph')} />
      {!hits.length ? (
        <Meta colors={colors}>{query.trim() ? t('search.empty') : t('search.type')}</Meta>
      ) : (
        hits.map((lamp) => (
          <Pressable
            key={lamp.id}
            accessibilityRole="button"
            onPress={() => goHash('/lamp', { id: lamp.id })}
            android_ripple={ripple(colors.panel3)}
            style={[styles.lampRow, { borderColor: colors.line, backgroundColor: colors.panel }]}
          >
            <View style={styles.lampCopy}>
              <Text style={[styles.lampName, { color: colors.ink }]}>{shortLabel(lamp)}</Text>
              <Text style={[styles.lampMeta, { color: colors.inkDim }]}>{lamp.question}</Text>
            </View>
          </Pressable>
        ))
      )}
      <KeyButton label={t('nav.questions')} onPress={() => goHash('/lamps')} colors={colors} />
    </BoardShell>
  )
}

const SCHEDULES = [
  { id: 'daily', labelKey: 'hang.daily' },
  { id: 'weekly', labelKey: 'hang.weekly' },
  { id: 'monthly', labelKey: 'hang.monthly' },
  { id: 'every_n', labelKey: 'hang.everyN' },
  { id: 'every', labelKey: 'hang.every' },
  { id: 'once_on', labelKey: 'hang.once' },
  { id: 'deadline', labelKey: 'hang.dueByPick' },
]
const SCHEDULE_MISSES = new Set([
  'hang.miss.weekday',
  'hang.miss.monthDay',
  'hang.miss.onceOn',
  'hang.miss.dueBy',
  'hang.miss.dueByBefore',
  'hang.miss.everyN',
  'hang.miss.everyNStart',
  'hang.miss.everyDays',
])
// Every so often: about a week, two weeks, a month, or any number of days.
const EVERY_PILLS = [
  { days: 7, labelKey: 'hang.everyWeek' },
  { days: 14, labelKey: 'hang.every2Weeks' },
  { days: 30, labelKey: 'hang.everyMonth' },
]
const LAND_HOLD = 1100
let foldNext = ''
const LAND_HOLD_STILL = 450

// The Did I form's feel, shared with Did we and Did you on the Add screen:
// folds ease open, a miss buzzes, and a save stamps the card and cheers
// before moving on.
export function useAddFeel(book, inputRef) {
  const reduce = useReduceMotion()
  const [wave, setWave] = useState(0)
  const [stamp, setStamp] = useState('')
  const leave = useRef(null)
  useEffect(() => () => clearTimeout(leave.current), [])
  // Ready to type, like Did I. Waits for the Did I / Did we / Did you
  // picker to close, since autoFocus under a closing modal loses the keyboard.
  useEffect(() => {
    if (!inputRef) return undefined
    const id = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(id)
  }, [inputRef])
  return {
    wave,
    stamp,
    date: shellDate(book),
    ease() {
      if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    },
    buzz() {
      feelTap('skip')
    },
    land(label, go) {
      setStamp(label)
      setWave((count) => count + 1)
      const purse = mergePurses(readShelf().boards)
      if (purse.cheerOn) fireCheer(purse.cheerOn, 1)
      else feelTap('hall-on')
      leave.current = setTimeout(go, reduce ? LAND_HOLD_STILL : LAND_HOLD)
    },
  }
}

function timeLabel(value) {
  return value ? clockWords(value) : ''
}

// The short name made from the question, cut at a whole word so it never
// looks like a letter went missing.
function autoShort(question) {
  const full = shortFromQuestion(question)
  if (full.length <= SHORT_MAX) return full
  const cut = full.slice(0, SHORT_MAX + 1).lastIndexOf(' ')
  return (cut > 0 ? full.slice(0, cut) : full.slice(0, SHORT_MAX)).trim()
}

function whenLine(draft) {
  if (draft.cadence === 'every_n' && !Number(draft.everyN)) return t('hang.everyN')
  if (draft.cadence === 'every' && !Number(draft.everyDays)) return t('hang.every')
  if (draft.cadence === 'weekly' && !(draft.weekdays || []).length) return t('hang.weekly')
  return cadenceLine(draft)
}

// summary: the question page's one line, where "Off until you pick a time"
// reads oddly out of the form, so it just says No reminder.
function reminderLine(draft, summary = false) {
  if (!lampNotifyOn(draft)) return t('hang.remindOff')
  if (!lampBuzzes(draft)) return t('hang.remindQuiet')
  if (draft.askAfter) return t('hang.remindAt', { time: timeLabel(draft.askAfter) })
  return summary ? t('hang.remindNone') : t('hang.remindAny')
}

// Off tonight: say when it comes up next, if that is within two months.
function nextDueLine(lamp, dateIso) {
  const shown = { ...lamp, archived: false }
  for (let day = 1; day <= 62; day += 1) {
    const iso = addDaysIso(dateIso, day)
    if (isDueOn(shown, iso)) return t('lamp.notTonightNext', { date: formatBoardDate(iso) })
  }
  return t('lamp.notTonight')
}

// True while the phone has notifications off, so a reminder cannot buzz.
// Checked again when the app comes back, in case they changed it in settings.
function usePhoneQuiet() {
  const [state, setState] = useState('')
  useEffect(() => {
    let live = true
    const check = () =>
      checkPings()
        .then((next) => live && setState(next))
        .catch(() => {})
    check()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check()
    })
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  const quiet = state === 'default' || state === 'denied' || state === 'missing'
  return {
    quiet,
    turnOn: (colors) => {
      playClick()
      askPingsNow(colors)
        .then(setState)
        .catch(() => {})
    },
  }
}

// The reminder row when the phone will not let it buzz. The question keeps its own setting.
function QuietReminderRow({ colors, onTurnOn, last }) {
  return (
    <SetRow
      colors={colors}
      icon="bell"
      label={t('hang.reminder')}
      sub={t('hang.remindPhoneOff')}
      value={t('hang.remindTurnOn')}
      onPress={onTurnOn}
      last={last}
    />
  )
}

export function Pill({ label, on, onPress, colors, dim, radio }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { checked: Boolean(on) } : { selected: on }}
      style={[
        styles.pill,
        {
          borderColor: on ? colors.onDeep : colors.line,
          backgroundColor: on ? colors.panel3 : colors.panel,
          opacity: dim && !on ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: on ? colors.on : dim ? colors.inkDim : colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  )
}

// Topics: tap any you have used to add or remove it, or type a new one.
export function TopicPick({ value, known, onChange, colors }) {
  const [draft, setDraft] = useState('')
  const mine = topicsOf({ kind: value })
  const lower = mine.map((topic) => topic.toLowerCase())
  const choices = [...mine, ...known.filter((topic) => !lower.includes(topic.toLowerCase()))]
  function flip(topic) {
    const on = lower.includes(topic.toLowerCase())
    onChange(joinTopics(on ? mine.filter((item) => item.toLowerCase() !== topic.toLowerCase()) : [...mine, topic]))
  }
  function addTyped() {
    const topic = draft.trim()
    if (topic) onChange(joinTopics([...mine, topic]))
    setDraft('')
  }
  return (
    <View style={styles.foldField}>
      <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{t('hang.kind')}</Text>
      <Text style={[styles.fieldHint, styles.fieldHintTight, { color: colors.inkDim }]}>{t('hang.topicsHint')}</Text>
      {choices.length ? (
        <View style={styles.pillRow}>
          {choices.map((topic) => (
            <Pill
              key={topic.toLowerCase()}
              label={topicLabel(topic)}
              on={lower.includes(topic.toLowerCase())}
              onPress={() => flip(topic)}
              colors={colors}
            />
          ))}
        </View>
      ) : null}
      <AppTextInput
        colors={colors}
        value={draft}
        onChangeText={(text) => {
          // A comma finishes a topic, like pressing done.
          if (text.includes(',')) {
            onChange(joinTopics([...mine, ...text.split(',')]))
            setDraft('')
            return
          }
          setDraft(text)
        }}
        onSubmitEditing={addTyped}
        onBlur={addTyped}
        placeholder={t('hang.topicAdd')}
        returnKeyType="done"
        accessibilityLabel={t('hang.topicAdd')}
        style={[styles.foldInput, { borderColor: colors.line, backgroundColor: colors.panel, color: colors.ink }]}
      />
    </View>
  )
}

const EVERY_N_MAX = 999
const STEP_NIGHTS = 7

// Every few days: − n + and the next week with the nights it asks lit.
function EveryNStep({ draft, dateIso, onChange, colors }) {
  const reduce = useReduceMotion()
  const n = Number(draft.everyN) || 0
  const step = (by) => onChange(String(Math.min(EVERY_N_MAX, Math.max(2, (n || 2) + by))))
  const shown = { ...draft, cadence: 'every_n', archived: false }
  const nights = Array.from({ length: STEP_NIGHTS }, (_, at) => {
    const iso = addDaysIso(dateIso, at)
    const day = new Date(`${iso}T12:00:00`).getDay()
    return { iso, label: at ? t(`hang.day.${day}`) : t('home.tonight'), on: isDueOn(shown, iso) }
  })
  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{t('hang.everyNDays')}</Text>
      <View style={styles.stepRow}>
        <Pressable
          onPress={() => step(-1)}
          disabled={n <= 2}
          accessibilityRole="button"
          accessibilityLabel={`${t('hang.everyNDays')} −`}
          style={[styles.stepBtn, { borderColor: colors.line, backgroundColor: colors.panel2, opacity: n <= 2 ? 0.5 : 1 }]}
        >
          <Text style={[styles.stepGlyph, { color: colors.ink }]}>−</Text>
        </Pressable>
        <Reanimated.Text key={n} entering={reduce ? undefined : FadeIn.duration(150)} style={[styles.stepNum, { color: colors.ink }]} accessibilityLiveRegion="polite">
          {n || '–'}
        </Reanimated.Text>
        <Pressable
          onPress={() => step(1)}
          disabled={n >= EVERY_N_MAX}
          accessibilityRole="button"
          accessibilityLabel={`${t('hang.everyNDays')} +`}
          style={[styles.stepBtn, { borderColor: colors.line, backgroundColor: colors.panel2 }]}
        >
          <Text style={[styles.stepGlyph, { color: colors.ink }]}>+</Text>
        </Pressable>
      </View>
      <View style={styles.stepNights}>
        {nights.map((night) => (
          <View key={night.iso} style={styles.stepNight}>
            <View
              style={[
                styles.stepDot,
                night.on ? { backgroundColor: colors.on, borderColor: colors.on } : { borderColor: colors.line },
              ]}
            />
            <Text style={[styles.stepDay, { color: night.on ? colors.ink : colors.inkDim }]} numberOfLines={1}>
              {night.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function FoldInput({ label, colors, multiline, ...props }) {
  return (
    <View style={styles.foldField}>
      <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{label}</Text>
      <AppTextInput
        colors={colors}
        {...props}
        multiline={multiline}
        accessibilityLabel={label}
        style={[
          styles.foldInput,
          multiline && styles.foldInputMulti,
          { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg },
        ]}
      />
    </View>
  )
}

// initialBlank / onBlankChange carry the words across when the Add screen
// switches between Did I, Did we and Did you; onLeadPress opens that choice.
// A new question goes in the folder being shown. With every folder shown
// (ALL), it goes in the first folder in the list, never a last-used one.
function newFolderTitle(boards, book, tagId) {
  const live = (boards.length ? boards : [book]).filter((item) => !item.archived)
  const ids = tagIdsOf(tagId)
  const shownOne = ids.length === 1 ? live.find((item) => item.id === ids[0]) : null
  return (shownOne || live[0] || book).title
}

export function HangScreen({ book, boards = [], onChange, onSaveTo, route, initialBlank = '', onBlankChange, onLeadPress, below = null }) {
  const { colors, clock, dateIso } = useHall(book)
  const reduce = useReduceMotion()
  const lampId = route?.id || ''
  const copyId = route?.copy || ''
  const start = route?.start || ''
  // Words said to a voice assistant, handed over once by the deep link.
  const [spoken] = useState(() => (lampId || copyId ? '' : takeSpoken()))
  const sourceBook = findBookHoldingLamp(boards, lampId || copyId)
  const existing = lampId ? (sourceBook?.lamps || []).find((lamp) => lamp.id === lampId) || null : null
  const copySource =
    copyId && !existing
      ? (sourceBook?.lamps || []).find((lamp) => lamp.id === copyId) || null
      : null
  const hang = useHangDraft({
    book,
    boards,
    now: clock,
    lamp: existing,
    seed: copySource
      ? duplicateLamp(copySource, clock)
      : spoken
        ? { ...blankLamp(clock), question: didQuestion(spoken) }
        : initialBlank
          ? { ...blankLamp(clock), question: didQuestion(initialBlank) }
          : null,
    start,
    tagTitle: sourceBook?.title || newFolderTitle(boards, book, route?.tag),
  })
  const { draft } = hang
  // A question that does not read "Did I ..." keeps its own words, with no fixed lead.
  const [lead] = useState(() => !draft.question || /^did i\b/i.test(draft.question))
  const [blank, setBlank] = useState(() => (lead ? starterBlank(draft) : draft.question))
  const [open, setOpen] = useState(() => {
    const first = foldNext
    foldNext = ''
    return first
  })
  const [timeOpen, setTimeOpen] = useState(false)
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [topicsOn, setTopicsOn] = useState(false)
  const [focused, setFocused] = useState(false)
  const [wave, setWave] = useState(0)
  const [shake, setShake] = useState(0)
  const [stamp, setStamp] = useState('')
  const inputRef = useRef(null)
  const leave = useRef(null)
  const fresh = !hang.editing && !copySource
  const starters = fresh ? unusedStarters(book, clock) : []
  const picked = starters.find((starter) => starter.question === draft.question) || null
  // Packs help someone getting started; once a folder has a few questions they
  // would just be in the way every time, so they go.
  const fewSoFar = (book?.lamps || []).filter((lamp) => !lamp.archived).length < 3
  const packs = fresh && fewSoFar ? packList(book) : []
  const [packUndo, setPackUndo] = useState(null)
  useUndoToast('pack', packUndo, takePackBack, UNDO_MS, t('tonight.undoTap'))
  useEffect(() => {
    if (!packUndo) return undefined
    const timer = setTimeout(() => setPackUndo(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [packUndo])

  function takePackBack() {
    if (!packUndo) return
    onChange(commitBook(undoPack(book, packUndo.ids, clock), clock))
    setPackUndo(null)
  }

  // A pack adds its questions only after a look at what they are.
  function askPack(pack) {
    publishSheet({
      kicker: pack.title,
      title: t('pack.sureTitle', { n: pack.items.length }),
      body: pack.items.map((item) => item.question).join('\n'),
      goLabel: t('pack.sureGo'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        const added = addPack(book, pack, clock)
        onChange(commitBook(added.book, clock))
        setPackUndo({ label: t('pack.added', { n: added.ids.length }), ids: added.ids })
      },
    })
  }
  const wobble = useWobble(starters.length, fresh && !blank.trim() && !focused && !stamp, reduce)
  const schedule = schedulePick(draft)
  const [everyOwn, setEveryOwn] = useState(() => draft.cadence === 'every' && ![7, 14, 30].includes(Number(draft.everyDays)))
  const tagName = String(hang.tagTitle || '').trim() || book.title
  const ready = Boolean(draft.question.trim())
  const detailCount = [draft.notes].filter((v) => String(v || '').trim()).length + (draft.trackAmount ? 1 : 0)
  const topicCount = topicsOf({ kind: draft.kind }).length
  const phone = usePhoneQuiet()
  // The short name shows in full, filled with the one made from the question
  // until they type their own, so it never changes behind their back.
  const [shortTyped, setShortTyped] = useState(false)
  const [shortRoom] = useState(() => Math.max(SHORT_MAX, String(draft.short || '').length))
  const shortAuto = !shortTyped && !String(draft.short || '').trim()
  const shortShown = shortAuto ? autoShort(draft.question) : draft.short
  const scrollHandle = useRef(null)
  const picksH = useRef(0)

  useEffect(() => () => clearTimeout(leave.current), [])

  const [startSnap] = useState(() => JSON.stringify([draft, hang.tagTitle]))
  const dirty = JSON.stringify([draft, hang.tagTitle]) !== startSnap
  const leaveRef = useRef(null)
  // Phone back asks first when there are changes, on Add as well as Edit.
  // First back closes an open section; then, with changes, it asks.
  useEffect(() => {
    if (!dirty && !open) return undefined
    function onBack(event) {
      event?.preventDefault?.()
      if (open) fold(open)
      else leaveRef.current?.()
    }
    window.addEventListener('did-i-back', onBack)
    // Android back reaches the stack before did-i-back, so take it here first.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack()
      return true
    })
    return () => {
      window.removeEventListener('did-i-back', onBack)
      sub.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, open])

  // The iPhone edge swipe can't be asked about, so it is off while there are
  // unsaved changes. Add keeps its swipe.
  const navigation = useNavigation()
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: !dirty })
    return () => navigation.setOptions?.({ gestureEnabled: true })
  }, [dirty, navigation])

  // The keyboard would cover the ideas and schedule under the card. Once it is
  // up, scroll so the question and the ideas right under it stay in sight.
  useEffect(() => {
    if (!focused) return undefined
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    let timer = null
    const lift = () => {
      timer = setTimeout(() => {
        const scroller = scrollHandle.current
        const field = findNodeHandle(inputRef.current)
        if (!scroller?.scrollResponderScrollNativeHandleToKeyboard || !field) return
        scroller.scrollResponderScrollNativeHandleToKeyboard(field, picksH.current + 16, true)
      }, Platform.OS === 'ios' ? 300 : 60)
    }
    const sub = Keyboard.addListener(event, lift)
    if (Keyboard.isVisible?.()) lift()
    return () => {
      clearTimeout(timer)
      sub.remove()
    }
  }, [focused])

  // The time sits in When, so asking for it opens When with the time open.
  function openTime() {
    setTimeOpen(true)
    if (open !== 'when') fold('when')
  }

  function fold(id) {
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    setOpen((now) => (now === id ? '' : id))
    Keyboard.dismiss()
  }

  // An opened section that ends below the screen scrolls up just enough to
  // show it, keeping its top row in sight.
  function showFold(node) {
    const scroller = scrollHandle.current
    const inner = scroller?.getInnerViewRef?.()
    if (!scroller?.scrollTo || !inner || !node?.measureLayout) return
    node.measureLayout(
      inner,
      (_x, top, _w, height) => {
        node.measureInWindow((_wx, winTop, _ww, winH) => {
          scroller.measureInWindow?.((_sx, viewTop, _sw, viewH) => {
            const offset = top - (winTop - viewTop)
            const below = winTop + winH - (viewTop + viewH) + 24
            if (below <= 0) return
            const y = Math.min(offset + below, top - 8)
            scroller.scrollTo({ y: Math.max(0, y), animated: !reduce })
          })
        })
      },
      () => {},
    )
  }

  function changeBlank(value) {
    setBlank(value)
    onBlankChange?.(value)
    const question = lead ? didQuestion(value) : value
    if (picked && question !== picked.question && draft.short === picked.short) {
      hang.change('short', '')
    }
    hang.change('question', question)
  }

  function pickIdea(starter) {
    setBlank(starterBlank(starter))
    // Ideas carry a topic of their own; topics only come from the topics field.
    hang.applyStarter({ ...starter, kind: draft.kind })
    setWave((count) => count + 1)
    playClick()
  }

  // Asks before throwing away edits, from Cancel and from back.
  function leaveEdit() {
    if (!dirty || stamp) {
      cancel()
      return
    }
    Keyboard.dismiss()
    publishSheet({
      title: hang.editing ? t('hang.discardTitle') : t('hang.discardNewTitle'),
      goLabel: t('hang.discard'),
      closeLabel: t('hang.keepEditing'),
      danger: true,
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        cancel()
      },
    })
  }
  leaveRef.current = leaveEdit

  function cancel() {
    if (existing) swapHash('/lamp', { id: existing.id })
    else if (copySource) swapHash('/lamp', { id: copySource.id })
    else goHash('/lamps')
  }

  function save() {
    if (stamp) return
    const built = hang.buildLamp()
    const problem = built.problem
    // The short name saved is the one the field showed.
    const next = shortAuto && shortShown ? { ...built.lamp, short: shortShown } : built.lamp
    if (problem) {
      hang.setMiss(problem)
      feelTap('skip')
      if (problem === 'hang.miss.empty') {
        setShake((count) => count + 1)
        wobble.nudge()
        inputRef.current?.focus()
      } else if (SCHEDULE_MISSES.has(problem) && open !== 'when') {
        fold('when')
      } else if (problem === 'hang.miss.askAfter') {
        openTime()
      } else if (!SCHEDULE_MISSES.has(problem) && !moreOpen) {
        setMoreOpen(true)
      }
      return
    }
    Keyboard.dismiss()
    const target = bookForTag(boards, book, hang.tagTitle)
    const wasEmpty = (target.lamps || []).filter((item) => !item.archived).length === 0
    // Only an edit moves from its old folder; a copy is new wherever it lands.
    if (onSaveTo) onSaveTo(target, next, existing ? sourceBook : null)
    else onChange(commitBook(hangInto(target, next, hang.editing), clock))
    // A check-on follows the question's new words and schedule.
    if (existing) followCheckOn(existing, next).catch(() => {})
    const newTime = next.askAfter && next.askAfter !== existing?.askAfter ? next.askAfter : ''
    if (hang.editing) {
      playClick()
      confirmDone(t('confirm.questionSaved'))
      swapHash('/lamp', { id: next.id })
      offerPingPrimer(newTime, colors)
      return
    }
    // The reward: the card stamps itself, "Did I" lights up, and their cheer goes off.
    const landsTonight = isDueOn(next, dateIso) || everyDueOn(target, next, dateIso)
    setStamp(landsTonight ? t('hang.landTonight') : t('hang.landAdded'))
    setWave((count) => count + 1)
    const purse = mergePurses(boards.length ? boards : [book])
    if (purse.cheerOn) fireCheer(purse.cheerOn, 1)
    else feelTap('hall-on')
    // Back to where Add was opened: Questions stays on Questions; Home opens the new card;
    // any other page (Recent, Settings) is popped back to, params and all.
    const from = behindPath()
    leave.current = setTimeout(
      () => {
        if (from === '/lamps') goHash('/lamps')
        else if (from === '/tonight' || from === '/' || from === '/home') goHash('/tonight', landsTonight ? { face: next.id } : '')
        else if (from && !wasEmpty) goBack()
        else goHash(wasEmpty ? '/tonight' : '/lamps')
        confirmDone(t('confirm.questionAdded'))
        offerPingPrimer(newTime, colors)
      },
      reduce ? LAND_HOLD_STILL : LAND_HOLD,
    )
  }

  // The card keeps to the extras; the line under it says when it repeats.
  const whenWords = [whenLine(draft), draft.askAfter ? timeLabel(draft.askAfter) : t('hang.askAny')].join(' · ')
  const meta = [whenWords, hang.priority === 'high' ? t('hang.metaHigh') : ''].filter(Boolean).join(' · ')
  // Topics stay out of the way until someone uses them.
  const topicsShown = topicsOn || topicCount > 0 || shelfTopics(boards.length ? boards : [book]).length > 0
  // Shown in the main rows, and in When next to the time while that is open.
  const reminderRow = (last) =>
    hang.priority === 'low' ? (
      <SetRow colors={colors} icon="bell" label={t('hang.reminder')} sub={t('hang.remindLowNote')} value={t('hang.remindOff')} last={last} />
    ) : phone.quiet ? (
      <QuietReminderRow colors={colors} onTurnOn={() => phone.turnOn(colors)} last={last} />
    ) : (
      <SetSwitch
        label={t('hang.reminder')}
        sub={reminderLine(draft)}
        icon="bell"
        last={last}
        // With no time it cannot buzz, so it reads off; turning it on opens the time.
        on={hang.notifyOn && Boolean(draft.askAfter)}
        onPress={() => {
          playClick()
          if (!draft.askAfter) {
            hang.change('notify', true)
            openTime()
            return
          }
          hang.change('notify', !hang.notifyOn)
        }}
        colors={colors}
      />
    )
  const ideasShown = fresh && (starters.length > 0 || packs.length > 0)

  return (
    <>
    <BoardShell
      book={book}
      title={hang.editing ? t('hang.edit') : t('hang.new')}
      noTitle={!hang.editing}
      date={shellDate(book, clock)}
      colors={colors}
      showAdd
      back={false}
      leftAction={{ label: t('hang.cancel'), onPress: leaveEdit }}
      rightAction={{ label: hang.editing ? t('hang.save') : t('hang.addIt'), onPress: save, disabled: !ready }}
      scrollHandle={scrollHandle}
    >
      <HangCard
        ref={inputRef}
        tag={tagName}
        lead={lead}
        blank={blank}
        onBlank={changeBlank}
        meta={meta}
        metaAction={{ label: t('checkOn.change'), a11y: `${t('hang.when')}: ${whenWords}`, onPress: () => fold('when') }}
        wave={wave}
        stamp={stamp}
        shake={shake}
        focused={focused}
        onFocus={() => {
          setFocused(true)
          setOpen('')
        }}
        onBlur={() => setFocused(false)}
        autoFocus={fresh && !start && !spoken && !initialBlank}
        onLeadPress={fresh && lead ? onLeadPress : undefined}
        colors={colors}
      />
      {below}

      <PickSheet open={open === 'when'} title={t('hang.when')} onClose={() => open === 'when' && fold('when')} colors={colors}>
          <SetCard colors={colors}>
            <View style={styles.whenBody}>
              <ScheduleTiles label={t('hang.when')}>
                {SCHEDULES.map((item) => (
                  <ScheduleTile
                    key={item.id}
                    label={t(item.labelKey)}
                    sub={t(`hang.tileSub.${item.id}`)}
                    on={schedule === item.id}
                    onPress={() => hang.changeSchedule(item.id)}
                    colors={colors}
                  />
                ))}
              </ScheduleTiles>
            <Reveal key={schedule} style={styles.whenDetail}>
            {/* A schedule problem shows here, where it gets fixed, not below the fold. */}
            {SCHEDULE_MISSES.has(hang.miss) ? (
              <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
                {t(hang.miss)}
              </Text>
            ) : null}

            {schedule === 'weekly' ? (
              <View style={styles.pillRow}>
                {WEEKDAYS.map((day) => (
                  <Pill
                    key={day}
                    label={t(`hang.day.${day}`)}
                    on={(draft.weekdays || []).includes(day)}
                    onPress={() => hang.toggleDay(day)}
                    colors={colors}
                  />
                ))}
              </View>
            ) : null}

            {schedule === 'monthly' ? (
              <View>
                <HangMonthCal
                  mode="monthly"
                  value={draft.monthDay === '' ? '' : draft.monthDay}
                  onChange={(day) => hang.change('monthDay', day)}
                  now={clock}
                  dayFoldHour={book.dayFoldHour}
                  colors={colors}
                />
                <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.monthCalHint')}</Text>
              </View>
            ) : null}

            {schedule === 'once_on' || schedule === 'deadline' ? (
              <View>
                <HangMonthCal
                  mode="date"
                  value={schedule === 'deadline' ? draft.dueBy : draft.onceOn}
                  onChange={(iso) => hang.change(schedule === 'deadline' ? 'dueBy' : 'onceOn', iso)}
                  now={clock}
                  dayFoldHour={book.dayFoldHour}
                  colors={colors}
                />
                <Text style={[styles.fieldHint, { color: colors.inkDim }]}>
                  {t(schedule === 'deadline' ? 'hang.dueByHint' : 'hang.onceOnHint')}
                </Text>
              </View>
            ) : null}

            {schedule === 'every' ? (
              <>
                <View style={styles.pillRow}>
                  {EVERY_PILLS.map((item) => (
                    <Pill
                      key={item.days}
                      label={t(item.labelKey)}
                      on={!everyOwn && Number(draft.everyDays) === item.days}
                      onPress={() => {
                        setEveryOwn(false)
                        hang.change('everyDays', item.days)
                      }}
                      colors={colors}
                    />
                  ))}
                  <Pill label={t('hang.everyOwn')} on={everyOwn} onPress={() => setEveryOwn(true)} colors={colors} />
                </View>
                {everyOwn ? (
                  <FoldInput
                    label={t('hang.everyDays')}
                    value={String(draft.everyDays || '')}
                    onChangeText={(value) => hang.change('everyDays', value.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    placeholder="10"
                    maxLength={3}
                    colors={colors}
                  />
                ) : null}
                <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.everyHint')}</Text>
              </>
            ) : null}

            {schedule === 'every_n' ? (
              <>
                <EveryNStep draft={draft} dateIso={dateIso} onChange={(value) => hang.change('everyN', value)} colors={colors} />
                <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{t('hang.startingOn')}</Text>
                <HangMonthCal
                  mode="date"
                  value={draft.everyNAnchor}
                  onChange={(iso) => hang.change('everyNAnchor', iso)}
                  now={clock}
                  dayFoldHour={book.dayFoldHour}
                  colors={colors}
                />
              </>
            ) : null}
            </Reveal>
            </View>

            <HangFold
              label={t('hang.timeRow')}
              value={draft.askAfter ? timeLabel(draft.askAfter) : t('hang.askAny')}
              icon="clock"
              open={timeOpen}
              onToggle={() => {
                if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
                setTimeOpen((was) => !was)
              }}
              colors={colors}
            >
              <HangTimePick value={draft.askAfter} onChange={hang.changeAskAfter} colors={colors} />
              <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{draft.askAfter ? t('hang.timeHint') : t('hang.anyTimeHint')}</Text>
            </HangFold>
          {reminderRow(true)}
          </SetCard>
      </PickSheet>

      <View
        style={styles.settings}
        onLayout={(event) => {
          picksH.current = event.nativeEvent.layout.height
        }}
      >
        <SetCard colors={colors}>
          {reminderRow(false)}
          {ideasShown ? (
            <SetRow
              colors={colors}
              icon="help"
              label={t('first.picks')}
              sub={packs.length ? t('pack.label') : ''}
              chevron={!ideasOpen}
              plain
              onPress={() => {
                if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
                setIdeasOpen((was) => !was)
              }}
            />
          ) : null}
          <SetRow
            colors={colors}
            icon="note"
            label={moreOpen ? t('hang.less') : t('hang.more')}
            value={moreOpen ? '' : tagName}
            chevron={!moreOpen}
            plain
            last
            onPress={() => {
              if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
              setMoreOpen((was) => !was)
            }}
          />
        </SetCard>

        <IdeaPicks
          label={t('first.picks')}
          starters={ideasOpen ? starters : blank.trim() && !picked ? [] : starters}
          picked={picked}
          onPick={pickIdea}
          tilt={wobble.tilt}
          colors={colors}
        />
        {ideasOpen && packs.length > 0 ? (
          <View style={styles.packs}>
            <SetCap colors={colors}>{t('pack.label')}</SetCap>
            {/* One row per pack: what it adds is right there, so it never reads as another idea chip. */}
            <SetCard colors={colors}>
              {packs.map((pack, at) => (
                <SetRow
                  key={pack.id}
                  colors={colors}
                  label={pack.title}
                  sub={pack.items.map((item) => shortLabel(item)).join(', ')}
                  value={pack.items.length === 1 ? t('pack.countOne') : t('pack.count', { n: pack.items.length })}
                  chevron
                  last={at === packs.length - 1}
                  onPress={() => askPack(pack)}
                />
              ))}
            </SetCard>
          </View>
        ) : null}
      </View>

      {moreOpen ? (
        <Reveal>
      <FoldInput
        label={t('hang.short')}
        value={shortShown}
        onChangeText={(value) => {
          setShortTyped(true)
          hang.change('short', value)
        }}
        placeholder={t('hang.shortPh')}
        // A name saved under an older, longer limit still fits, so it can be
        // edited and shortened instead of locking the field.
        maxLength={shortRoom}
        colors={colors}
      />

        <SetCap colors={colors}>{t('hang.secOrganize')}</SetCap>
        <SetCard colors={colors}>
          <HangFold
            label={t('hang.tag')}
            value={tagName}
            icon="folder"
            open={open === 'tag'}
            onToggle={() => fold('tag')}
            onShown={showFold}
            colors={colors}
          >
            <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{t('hang.tagOne')}</Text>
            <Text style={[styles.fieldHint, styles.fieldHintTight, { color: colors.inkDim }]}>{t('hang.folderHint')}</Text>
            <Text style={[styles.fieldHint, styles.fieldHintTight, { color: colors.inkDim }]}>{t('hang.folderVsTopic')}</Text>
            <View style={styles.pillRow} accessibilityRole="radiogroup" accessibilityLabel={t('hang.tag')}>
              {hang.liveTags.map((item) => (
                <Pill
                  key={item.id}
                  label={item.title}
                  on={hang.isTagSelected(item.title)}
                  onPress={() => hang.setTagTitle(item.title)}
                  colors={colors}
                  radio
                />
              ))}
              {hang.knownTag ? (
                <Pill label={`+ ${t('hang.tagNew')}`} onPress={() => hang.setTagTitle('')} colors={colors} />
              ) : null}
            </View>
            {!hang.knownTag ? (
              <FoldInput
                label={t('hang.tagNew')}
                value={hang.tagTitle}
                onChangeText={hang.setTagTitle}
                placeholder={t('hang.tagPh')}
                autoFocus
                returnKeyType="done"
                colors={colors}
              />
            ) : null}
            {hang.parkedTags.length ? (
              <>
                <Text style={[styles.foldCap, styles.foldCapGap, { color: colors.inkDim }]}>
                  {t('hang.tagLater')}
                </Text>
                <View style={styles.pillRow} accessibilityRole="radiogroup" accessibilityLabel={t('hang.tagLater')}>
                  {hang.parkedTags.map((item) => (
                    <Pill
                      key={item.id}
                      label={item.title}
                      on={hang.isTagSelected(item.title)}
                      onPress={() => hang.setTagTitle(item.title)}
                      colors={colors}
                      dim
                      radio
                    />
                  ))}
                </View>
              </>
            ) : null}
          </HangFold>

          <HangFold
            label={t('hang.priority')}
            value={t(`hang.priority.${hang.priority}`)}
            icon="priority"
            open={open === 'priority'}
            onToggle={() => fold('priority')}
            onShown={showFold}
            colors={colors}
          >
            <View style={styles.pillRow}>
              {PRIORITIES.map((id) => (
                <Pill
                  key={id}
                  label={t(`hang.priority.${id}`)}
                  on={hang.priority === id}
                  onPress={() => hang.change('priority', id)}
                  colors={colors}
                />
              ))}
            </View>
            <Text style={[styles.fieldHint, { color: colors.inkDim }]}>
              {t(`hang.priority.hint.${hang.priority}`)}
            </Text>
          </HangFold>

          {topicsShown ? (
          <Reveal key="topics">
          <HangFold
            label={t('hang.kind')}
            value={topicCount ? topicsOf({ kind: draft.kind }).map(topicLabel).join(', ') : t('hang.detailsNone')}
            icon="tag"
            open={open === 'topics'}
            onToggle={() => fold('topics')}
            onShown={showFold}
            colors={colors}
          >
            <TopicPick
              value={draft.kind}
              known={shelfTopics(boards.length ? boards : [book])}
              onChange={(value) => hang.change('kind', value)}
              colors={colors}
            />
          </HangFold>
          </Reveal>
          ) : (
            <SetRow
              colors={colors}
              icon="tag"
              label={t('hang.topicAdd')}
              onPress={() => {
                setTopicsOn(true)
                fold('topics')
              }}
            />
          )}

          <HangFold
            label={t('hang.details')}
            value={
              detailCount
                ? t(detailCount === 1 ? 'hang.detailsOne' : 'hang.detailsSome', { n: detailCount })
                : t('hang.detailsNone')
            }
            icon="note"
            open={open === 'details'}
            onToggle={() => fold('details')}
            onShown={showFold}
            last
            colors={colors}
          >
            <FoldInput
              label={t('hang.notes')}
              value={draft.notes}
              onChangeText={(value) => hang.change('notes', value)}
              placeholder={t('hang.notesPh')}
              multiline
              colors={colors}
            />
            <View style={styles.amountRow}>
              <Pill
                label={t('hang.trackAmount')}
                on={Boolean(draft.trackAmount)}
                onPress={() => hang.change('trackAmount', !draft.trackAmount)}
                colors={colors}
              />
            </View>
            <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.trackAmountSub')}</Text>
            {draft.trackAmount ? (
              <FoldInput
                label={t('hang.amountUnit')}
                value={draft.amountUnit || ''}
                onChangeText={(value) => hang.change('amountUnit', value)}
                placeholder={t('hang.amountUnitPh')}
                maxLength={UNIT_MAX}
                colors={colors}
              />
            ) : null}
          </HangFold>
        </SetCard>
        </Reveal>
      ) : null}
      {hang.miss && !SCHEDULE_MISSES.has(hang.miss) ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {t(hang.miss)}
        </Text>
      ) : null}

      {existing && sourceBook && !stamp ? (
        <LampManage
          book={sourceBook}
          lamp={existing}
          colors={colors}
          onChange={(next) => onChange(commitBook(next, clock))}
          onPaused={(paused) => hang.change('archived', paused)}
        />
      ) : null}
    </BoardShell>
    {/* On iPhone, Add is a native sheet that covers the app-wide sheet layer, so it hosts its own. */}
    {Platform.OS === 'ios' && !hang.editing ? <SheetHost /> : null}
    </>
  )
}

export function LampScreen({ book, boards = [], onChange, route }) {
  const lampId = route?.id || ''
  const shelf = boards.length ? boards : [book]
  const lampBook = findBookHoldingLamp(shelf, lampId) || book
  const { colors, clock, dateIso } = useHall(lampBook)
  const lamp = (lampBook.lamps || []).find((item) => item.id === lampId) || null
  const record = useMemo(() => lampRecord(lampBook, lamp, dateIso, 30), [lampBook, lamp, dateIso])
  const best = useMemo(() => bestQuestionStreak(lampBook, lamp, dateIso), [lampBook, lamp, dateIso])
  const weeks = useMemo(() => lampWeeks(lampBook, lamp, dateIso, 8), [lampBook, lamp, dateIso])
  const lastFive = useMemo(() => lastDidTimes(lampBook, lamp, 5), [lampBook, lamp])
  const amounts = useMemo(() => lampAmounts(lampBook, lamp, dateIso, 14, 30), [lampBook, lamp, dateIso])
  // Every so often: no streak, so the tiles say when it was last done and the usual gap.
  const every = useMemo(() => {
    if (!isEvery(lamp)) return null
    const tonight = answerFor(lampBook, lamp.id, dateIso)?.status || ''
    return {
      due: !lamp.archived && (Boolean(tonight) || everyDueOn(lampBook, lamp, dateIso)),
      tonight,
      last: lastTimeLine(lampBook, lamp, dateIso, true),
      badge: sinceBadge(lampBook, lamp, dateIso, false),
      gap: gapLine(lampBook, lamp, dateIso),
    }
  }, [lampBook, lamp, dateIso])
  const gentle = usePrefs().gentle === true
  const phone = usePhoneQuiet()
  const account = useAccount()
  const reduce = useReduceMotion()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)
  const [notePick, setNotePick] = useState(0)
  const [menu, setMenu] = useState(false)

  function flip(set) {
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    set((was) => !was)
  }

  // Close the menu first, so a sheet it opens is not under it.
  function menuGo(run) {
    setMenu(false)
    setTimeout(run, 250)
  }

  function change(next) {
    onChange(commitBook(next, clock))
  }

  if (!lamp) {
    return (
      <BoardShell book={lampBook} title={t('lamp.gone')} date={shellDate(lampBook, clock)} colors={colors}>
        <DidButton label={t('nav.questions')} onPress={() => goHash('/lamps')} colors={colors} small />
      </BoardShell>
    )
  }

  const status = lamp.archived
    ? t('lamp.pausedLine')
    : every
      ? every.due
        ? t('lamp.tonightIs', { status: pillStatusLabel(every.tonight) })
        : every.last
      : record.due
        ? t('lamp.tonightIs', { status: pillStatusLabel(record.tonight) })
        : nextDueLine(lamp, dateIso)
  const priority = lamp.priority || 'normal'
  const topics = topicsOf(lamp).map(topicLabel).join(', ')
  const notes = String(lamp.notes || '').trim()
  const notedCount = (lampBook.answers || []).filter((item) => item.lampId === lamp.id && String(item.note || '').trim()).length
  const checkFits = !lamp.fromName && Boolean(account.user) && checkOnFits(lamp)
  const actions = lampActions({ book: lampBook, lamp, colors, onChange: change })
  // One look at the settings; changing them happens on Edit question.
  const summary = [
    cadenceLine(lamp),
    lamp.askAfter ? timeLabel(lamp.askAfter) : t('hang.askAny'),
    priority !== 'low' && phone.quiet ? t('lamp.sumPhoneOff') : reminderLine(lamp, true),
    t(`hang.priority.${priority}`),
  ].join(' · ')

  return (
    <BoardShell
      book={lampBook}
      title={t('lamp.kicker')}
      noTitle
      date={shellDate(lampBook, clock)}
      colors={colors}
      rightAction={{ label: '⋯', onPress: () => setMenu(true) }}
    >
      <View style={[...faceCardStyle(colors), styles.lampCard, lamp.archived && { opacity: 0.75 }]}>
        <EditPen onPress={() => goHash('/hang', { id: lamp.id })} colors={colors} />
        <Text style={[faceCardStyles.kicker, { color: colors.on }]} numberOfLines={1}>
          {lampBook.title}
        </Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{lamp.question}</Text>
        <Text style={[styles.lampStatus, { color: lamp.archived ? colors.inkDim : colors.inkSoft }]}>{status}</Text>
        {lamp.fromName ? (
          <Text style={[styles.lampStatus, { color: colors.inkSoft }]}>{t('lamp.sentBy', { name: lamp.fromName })}</Text>
        ) : null}
      </View>

      {lamp.archived ? (
        <KeyButton
          label={t('lamp.askAgain')}
          onPress={() => {
            change(toggleArchive(lampBook, lamp))
            confirmDone(t('confirm.questionResumed'))
          }}
          colors={colors}
        />
      ) : null}

      {lamp.optional ? (
        // Added for you: it only counts once you choose it.
        <>
          <Text style={[styles.lampStatus, { color: colors.inkSoft }]}>{t('lamp.optionalLine')}</Text>
          <KeyButton
            label={t('lamp.makeCount')}
            onPress={() => {
              const { optional: _optional, ...chosen } = lamp
              change(hangInto(lampBook, chosen, true))
              confirmDone(t('confirm.questionCounts'))
            }}
            colors={colors}
          />
        </>
      ) : null}

      {every ? (
        <View style={styles.tiles}>
          <View style={[styles.tile, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
            <Text style={[styles.tileNum, { color: colors.on }]}>{every.badge || '-'}</Text>
            <Text style={[styles.tileCap, { color: colors.inkDim }]}>{every.last}</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
            <Text style={[styles.tileCap, { color: colors.ink }]}>{every.gap}</Text>
          </View>
        </View>
      ) : (
      <View style={styles.tiles}>
        {gentle ? null : (
          <View style={[styles.tile, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
            <Text style={[styles.tileNum, { color: colors.on }]}>{record.streak}</Text>
            <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('lamp.streakCap')}</Text>
            {best ? <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('lamp.best', { n: best })}</Text> : null}
          </View>
        )}
        <View style={[styles.tile, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
          <Text style={[styles.tileNum, { color: colors.ink }]}>{t('lamp.didOf', { did: record.did, n: record.asked })}</Text>
          <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('lamp.didCap', { n: 30 })}</Text>
        </View>
      </View>
      )}

      <View style={styles.settings} />
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="chart"
          label={t('settings.history')}
          value={every ? '' : t('lamp.didOf', { did: record.did, n: record.asked })}
          chevron={!historyOpen}
          plain
          onPress={() => flip(setHistoryOpen)}
        />
        <SetRow
          colors={colors}
          icon="pen"
          label={t('note.title')}
          value={notedCount ? String(notedCount) : ''}
          chevron={!notesOpen}
          plain
          last={!checkFits}
          onPress={() => flip(setNotesOpen)}
        />
        {checkFits ? (
          <SetRow colors={colors} icon="people" label={t('checkOn.title')} chevron={!checkOpen} plain last onPress={() => flip(setCheckOpen)} />
        ) : null}
      </SetCard>

      {historyOpen ? (
      <Reveal>
      {weeks.length > 1 ? (
        <View style={styles.trend}>
          <Text style={[styles.trendLabel, { color: colors.inkSoft }]}>{t('lamp.trend')}</Text>
          <View style={styles.trendRow}>
            {weeks.map((week) => (
              <View
                key={week.from}
                style={styles.trendWeek}
                accessible
                accessibilityLabel={t('lamp.trendWeek', { date: formatBoardDate(week.from), did: week.did, due: week.due })}
              >
                <View style={[styles.trendBar, { backgroundColor: colors.lineSoft }]}>
                  {week.due ? (
                    <View
                      style={[styles.trendFill, { backgroundColor: colors.on, height: `${Math.round((week.did / week.due) * 100)}%` }]}
                    />
                  ) : null}
                </View>
                <Text style={[styles.trendNum, { color: colors.inkDim }]}>{week.due ? `${week.did}/${week.due}` : '-'}</Text>
                <Text style={[styles.trendDate, { color: colors.inkDim }]} numberOfLines={1}>
                  {shortDay(week.from)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <LampMonth book={lampBook} lamp={lamp} colors={colors} dateIso={dateIso} />

      {lamp.trackAmount ? (
        <View style={styles.amounts}>
          <Text style={[styles.trendLabel, { color: colors.inkSoft }]}>{t('amounts.title')}</Text>
          {amounts.count ? (
            <>
              <Text style={[styles.amountAvg, { color: colors.ink }]}>{amountAverageLine(amounts.average, lamp.amountUnit)}</Text>
              <View style={styles.amountBars}>
                {amounts.bars.map((bar) => (
                  <View
                    key={bar.night}
                    style={[styles.amountBar, { backgroundColor: colors.lineSoft }]}
                    accessible
                    accessibilityLabel={
                      bar.amount === null
                        ? t('amounts.barNone', { date: formatBoardDate(bar.night) })
                        : t('amounts.bar', { date: formatBoardDate(bar.night), amount: amountWords(bar.amount, lamp.amountUnit) })
                    }
                  >
                    {bar.amount ? (
                      <View
                        style={{ backgroundColor: colors.on, height: `${Math.max(4, Math.round((bar.amount / amounts.max) * 100))}%` }}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
              <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('amounts.cap')}</Text>
            </>
          ) : (
            <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('amounts.empty')}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.lastFive}>
        <Text style={[styles.trendLabel, { color: colors.inkSoft }]}>{t('lamp.lastFive')}</Text>
        {!lastFive.length ? (
          <>
            <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('lamp.lastFiveEmpty')}</Text>
            <Pressable accessibilityRole="link" onPress={() => goHash('/tonight')} hitSlop={8}>
              <Text style={[styles.tileCap, { color: colors.on }]}>{t('empty.goTonight')}</Text>
            </Pressable>
          </>
        ) : null}
        {lastFive.map((row) => (
          <View key={row.periodKey} style={[styles.lastRow, { borderBottomColor: colors.lineSoft }]}>
            <View style={styles.lastTop}>
              <Text style={[styles.lastDate, { color: colors.ink }]}>{row.night ? formatBoardDate(row.night) : row.periodKey}</Text>
              {row.amount !== null ? (
                <Text style={[styles.lastAmount, { color: colors.on }]}>{amountWords(row.amount, lamp.amountUnit)}</Text>
              ) : null}
            </View>
            {row.note ? <Text style={[styles.lastNote, { color: colors.inkSoft }]}>{row.note}</Text> : null}
          </View>
        ))}
      </View>
      </Reveal>
      ) : null}

      {notesOpen ? (
        <Reveal>
          <NightNotes book={lampBook} lamp={lamp} colors={colors} onChange={change} pickSignal={notePick} />
        </Reveal>
      ) : null}
      {checkOpen && !lamp.fromName ? <CheckOnCard lamp={lamp} colors={colors} /> : null}

      <SetCard colors={colors}>
        {/* The whole card opens Edit question, like the pen at the top. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('hang.edit')}
          accessibilityHint={summary}
          onPress={() => goHash('/hang', { id: lamp.id })}
          android_ripple={ripple(colors.panel3)}
          style={({ pressed }) => [styles.summaryTap, pressed && { backgroundColor: colors.panel2 }]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summary, styles.summaryText, { color: colors.ink }]}>{summary}</Text>
            <Text style={[styles.summaryChev, { color: colors.inkDim }]}>›</Text>
          </View>
          <Text style={[styles.summary, { color: colors.inkSoft }]} numberOfLines={1}>
            {`${t('hang.tag')}: ${lampBook.title}`}
          </Text>
          {topics ? (
            <>
              <Text style={[styles.summary, { color: colors.inkSoft }]} numberOfLines={1}>
                {`${t('hang.kind')}: ${topics}`}
              </Text>
              <Text style={[styles.hintLine, { color: colors.inkDim }]}>{t('hang.topicsHint')}</Text>
            </>
          ) : null}
          {notes ? (
            <Text style={[styles.summary, { color: colors.inkSoft }]} numberOfLines={2}>
              {notes}
            </Text>
          ) : null}
        </Pressable>
      </SetCard>
      <View style={styles.editBtn}>
        <DidButton label={t('hang.edit')} onPress={() => goHash('/hang', { id: lamp.id })} colors={colors} />
      </View>
      {menu ? (
        <SetSheet title={t('lamp.secManage')} onClose={() => setMenu(false)} colors={colors}>
          <SetRow colors={colors} icon="pen" label={t('hang.edit')} chevron onPress={() => menuGo(() => goHash('/hang', { id: lamp.id }))} />
          <SetRow colors={colors} icon="copy" label={t('lamp.copy')} sub={t('lamp.copySub')} plain onPress={() => menuGo(() => goHash('/hang', { copy: lamp.id }))} />
          <SetRow
            colors={colors}
            icon="note"
            label={t('note.add')}
            plain
            onPress={() =>
              menuGo(() => {
                setNotesOpen(true)
                setNotePick((n) => n + 1)
              })
            }
          />
          <SetRow
            colors={colors}
            icon={lamp.archived ? 'play' : 'pause'}
            label={lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
            sub={lamp.archived ? t('lamp.askAgainSub') : t('lamp.stopSub')}
            plain
            onPress={() => menuGo(actions.togglePause)}
          />
          <SetRow colors={colors} icon="trash" label={t('lamp.delete')} sub={t('lamp.deleteSub')} danger last onPress={() => menuGo(actions.askDelete)} />
        </SetSheet>
      ) : null}
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  mastDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  block: { gap: 8, marginTop: 4 },
  fill: { flex: 1 },
  topKeys: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  topWrap: { marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editMenu: { gap: 8 },
  dotKey: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4, marginTop: 2 },
  dotKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dotKeyDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  dotKeyText: { fontFamily: fonts.ui, fontSize: 12 },
  moveKeys: { flexDirection: 'row', gap: 6 },
  moveKey: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moveGlyph: { fontFamily: fonts.uiBold, fontSize: 16 },
  pickBar: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  pickFloat: { position: 'absolute', left: 12, right: 12, zIndex: 20, elevation: 12 },
  pickRoom: { height: 90 },
  modeWrap: { position: 'absolute', top: 0, left: 12, right: 12, zIndex: 21, elevation: 12 },
  modeBar: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeSide: { flexBasis: 96, flexShrink: 1, justifyContent: 'center' },
  modeEnd: { alignItems: 'flex-end' },
  modeMid: { flex: 1, alignItems: 'center' },
  modeTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  modeSub: { fontFamily: fonts.ui, fontSize: 13 },
  modeSubWrap: { fontSize: 12, lineHeight: 15, textAlign: 'center' },
  modeCancel: { fontFamily: fonts.uiSemi, fontSize: 15 },
  modeRoom: { height: 64 },
  flex1: { flex: 1 },
  packs: { gap: 8, marginBottom: 12 },
  packLabel: { ...sectionLabel, marginBottom: 2 },
  reorderTimed: { fontFamily: fonts.ui, fontSize: 13, marginTop: 6 },
  pickCount: { fontFamily: fonts.uiBold, fontSize: 15, flexGrow: 1 },
  pickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickTick: { fontFamily: fonts.uiBold, fontSize: 14, lineHeight: 16 },
  dropBtn: { borderWidth: 1, borderRadius: 999, minHeight: 40, paddingHorizontal: 16, justifyContent: 'center' },
  dropText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  blockLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  lampList: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  lampItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  lampDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  lampCopy: { flex: 1, minWidth: 0, gap: 2 },
  lampName: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 20 },
  lampQ: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  lampMeta: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.3 },
  everyPill: { fontFamily: fonts.uiBold, fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', marginRight: 6 },
  lampChev: { fontFamily: fonts.ui, fontSize: 22 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    marginBottom: 10,
  },
  searchGlyph: { fontFamily: fonts.ui, fontSize: 18 },
  searchInput: { flex: 1, fontFamily: fonts.ui, fontSize: 15, paddingVertical: 8 },
  searchClear: { paddingHorizontal: 4 },
  starters: { gap: 8 },
  starterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldCap: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldHint: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 8 },
  fieldHintTight: { marginTop: -4 },
  summaryTap: { paddingBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  summaryText: { flex: 1 },
  summaryChev: { fontFamily: fonts.ui, fontSize: 22, paddingTop: 8, paddingRight: 14 },
  summary: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 12 },
  settings: { marginTop: 4 },
  editBtn: { marginTop: 16, marginBottom: 8 },
  whenBody: { padding: 16, gap: 12 },
  whenDetail: { gap: 12 },
  stepWrap: { gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontFamily: fonts.uiSemi, fontSize: 22, lineHeight: 26 },
  stepNum: { fontFamily: fonts.display, fontSize: 28, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  stepNights: { flexDirection: 'row', justifyContent: 'space-between' },
  stepNight: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  stepDay: { fontFamily: fonts.ui, fontSize: 11 },
  goRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  goText: { flex: 1, gap: 2 },
  goLabel: { fontFamily: fonts.uiSemi, fontSize: 15 },
  goNote: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  goChev: { fontFamily: fonts.ui, fontSize: 22 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '500' },
  foldField: { gap: 6 },
  foldCap: { ...sectionLabel, lineHeight: 18 },
  foldCapGap: { marginTop: 6 },
  foldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  foldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  hangActions: { gap: 4, marginTop: 12 },
  cancel: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '500' },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  lampCard: { justifyContent: 'flex-start', minHeight: 0, marginTop: 4 },
  lampStatus: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 10 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  tileNum: { fontFamily: fonts.mono, fontSize: 26, fontWeight: '700' },
  tileCap: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
  trend: { gap: 8, marginBottom: 12 },
  trendLabel: { ...sectionLabel },
  trendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8 },
  trendWeek: { width: 36, alignItems: 'center', gap: 4 },
  trendBar: { width: 24, height: 48, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  trendFill: { width: '100%' },
  trendNum: { fontFamily: fonts.mono, fontSize: 10 },
  trendDate: { fontFamily: fonts.mono, fontSize: 9 },
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  amounts: { gap: 6, marginBottom: 12 },
  amountAvg: { fontFamily: fonts.uiSemi, fontSize: 15 },
  amountBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 64 },
  amountBar: { flex: 1, height: '100%', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  lastFive: { gap: 6, marginBottom: 12 },
  lastRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 2 },
  lastTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lastDate: { fontFamily: fonts.uiSemi, fontSize: 14, flexShrink: 1 },
  lastAmount: { fontFamily: fonts.mono, fontSize: 14 },
  lastNote: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  hintLine: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16, paddingHorizontal: 16, paddingTop: 2 },
  tonight: { gap: 8, marginTop: 4 },
  tonightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { gap: 12, marginTop: 8 },
  textBtn: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
})
