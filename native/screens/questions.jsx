import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import {
  AppState,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
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
  joinTopics,
  lampNotifyOn,
  prepQuestionRows,
  shelfTopics,
  topicLabel,
  topicsOf,
  shortFromQuestion,
  shortLabel,
  SHORT_MAX,
} from '../../src/lib/board-json.js'
import { commitBook } from '../../src/lib/achievements.js'
import { bulkLamps, hangInto, putAnswer, takeDown, toggleArchive, undoBulkLamps } from '../../src/lib/board-ops.js'
import { findBookHoldingLamp, readShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { clockWords, matchLamps } from '../../src/lib/hall-pages.js'
import { addDaysIso, boardDate, formatBoardDate, isDueOn } from '../../src/lib/recurrence.js'
import { LampCalendarStrip } from '../components/LampCalendarStrip.jsx'
import { NightNotes } from '../components/NightNotes.jsx'
import { addPack, packList, starterBlank, starterList, undoPack, unusedStarters } from '../../src/lib/starters.js'
import { schedulePick } from '../../src/lib/hang-schedule.js'
import { feelTap, playClick } from '../../src/lib/native.js'
import { ripple } from '../lib/ripple.js'
import { fireCheer, mergePurses } from '../../src/lib/purse.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { bookForTag, useHangDraft } from '../../src/lib/useHangDraft.js'
import { rowKey, taggedLamps } from '../../src/lib/tags.js'
import { HangMonthCal } from '../components/HangMonthCal.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { IdeaPicks, useWobble } from '../components/DidLead.jsx'
import { HangCard } from '../components/HangCard.jsx'
import { HangFold } from '../components/HangFold.jsx'
import { SetCap, SetCard, SetRow, SetSwitch } from '../components/SetBits.jsx'
import { LampManage } from '../components/LampManage.jsx'
import { takeSpoken } from '../../src/lib/voice-add.js'
import { rowId, searchRows, tonightStates } from '../../src/lib/question-list.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { lampRecord, lampWeeks } from '../../src/lib/lamp-record.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { TagFilter } from '../components/TagFilter.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { publishSheet } from '../components/SheetHost.jsx'
import { confirmDone } from '../lib/confirm.js'
import { askPingsNow, offerPingPrimer } from '../lib/ping-primer.js'
import { useUndoToast } from '../lib/toast-queue.js'
import { useShakeUndo } from '../hooks/useShakeUndo.js'
import {
  AppTextInput,
  ChipRow,
  DidButton,
  Field,
  KeyButton,
  Meta,
  Page,
} from '../components/ui.jsx'
import { goHash, swapHash } from '../navigation/hash.js'
import { useAccount } from '../../src/lib/account.js'
import { usePeoplePulse } from '../../src/lib/people.js'
import { useWeTonight } from '../../src/lib/did-we.js'
import { fonts, sectionLabel } from '../theme.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { EditPen } from '../components/SwipeFace.jsx'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

function useHall(book) {
  const colors = useHallColors(book)
  const clock = useMemo(() => new Date(), [])
  const dateIso = boardDate(clock, book.dayFoldHour)
  return { colors, clock, dateIso }
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

function stateDot(state, urgency, colors) {
  if (state === 'did') return { backgroundColor: colors.on, borderColor: colors.on }
  if (state === 'late') return { backgroundColor: colors.late || colors.on, borderColor: colors.late || colors.on }
  if (state === 'nope') return { backgroundColor: colors.miss, borderColor: colors.miss }
  if (urgency === 'today' || urgency === 'soon') return { backgroundColor: 'transparent', borderColor: colors.miss }
  if (state === 'open') return { backgroundColor: 'transparent', borderColor: colors.on }
  return { backgroundColor: 'transparent', borderColor: colors.line }
}

function PickBox({ on, colors }) {
  return (
    <View
      style={[
        styles.pickBox,
        { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.on : colors.panel2 },
      ]}
    >
      {on ? <Text style={[styles.pickTick, { color: colors.bg }]}>✓</Text> : null}
    </View>
  )
}

// One question per row: its short name, the question on one line, then
// tag, schedule and time. Every line clips, so long words never crowd the list.
function LampBlock({ label, items, shelf, states, dateIso, colors, onOpen, picking, picked, onPick }) {
  if (!items.length) return null
  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: colors.inkDim }]}>
        {label} · {items.length}
      </Text>
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
                <View style={[styles.lampDot, stateDot(states.get(rowId(row)) || '', urgency, colors)]} />
              )}
              <View style={styles.lampCopy}>
                <Text style={[styles.lampName, { color: colors.ink }]} numberOfLines={1}>
                  {shortLabel(row.lamp)}
                </Text>
                <Text style={[styles.lampQ, { color: colors.inkSoft }]} numberOfLines={1}>
                  {row.lamp.question}
                </Text>
                <Text style={[styles.lampMeta, { color: colors.inkDim }]} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
              {picking ? null : <Text style={[styles.lampChev, { color: colors.inkDim }]}>›</Text>}
            </Pressable>
          )
        })}
      </View>
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
function FromFriends({ rows, didYouOnly, onDidYou, dateIso, colors }) {
  const account = useAccount()
  const { inbox } = usePeoplePulse(account.user)
  const { cards } = useWeTonight(account.user)
  if (!account.user) return null
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
  if (!youN && !weN && !didYouOnly) return null
  return (
    <>
      <View style={styles.pillRow}>
        {youN || didYouOnly ? (
          <Pill label={t('questions.didYouPill', { n: youN })} on={didYouOnly} onPress={onDidYou} colors={colors} />
        ) : null}
        {weN ? <Pill label={t('questions.didWePill', { n: weN })} onPress={() => goHash('/we')} colors={colors} /> : null}
      </View>
      {didYouOnly ? (
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
      ) : null}
    </>
  )
}

export function QuestionsScreen({ book, boards = [], tagId = '', onTag, onChange, onChangeBooks, onOpen }) {
  const { colors, clock, dateIso } = useHall(book)
  const shelf = boards.length ? boards : [book]
  const allRows = taggedLamps(shelf, tagId)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const [didYouOnly, setDidYouOnly] = useState(false)
  const [query, setQuery] = useState('')
  const rows = searchRows(allRows, query)
  const states = useMemo(() => tonightStates(allRows, clock), [shelf, tagId, clock])
  const [topicPicks, setTopicPicks] = useState([])
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const [undo, setUndo] = useState(null)
  // The undo toast joins the one line above the tab bar; shake still undoes.
  useUndoToast('questions', undo, takeBack, UNDO_MS, t('tonight.undoTap'))
  useShakeUndo(Boolean(undo), takeBack)
  const topics = shelfTopics(shelf)
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const hasDeadlines = allRows.some((row) => activeDeadline(row.lamp, dateIso))
  const fromOk = (row) => !didYouOnly || row.lamp.fromDidYou
  const hung = prepQuestionRows(rows.filter((row) => !row.lamp.archived && hasAnyTopic(row.lamp, picks) && fromOk(row)), {
    dateIso,
    deadlineOnly,
  })
  const down = prepQuestionRows(rows.filter((row) => row.lamp.archived && hasAnyTopic(row.lamp, picks) && fromOk(row)), {
    dateIso,
    deadlineOnly,
  })
  const starters = openStarters(book)
  const shown = [...hung, ...down]
  // Only what is on screen counts, so a filter change never acts on hidden rows.
  const chosen = shown.filter((row) => picked.has(rowKey(row)))
  const allOn = shown.length > 0 && chosen.length === shown.length
  const allDown = chosen.length > 0 && chosen.every((row) => row.lamp.archived)

  function stopPicking() {
    setPicking(false)
    setPicked(new Set())
  }

  useEffect(() => {
    if (!picking) return undefined
    function onBack(event) {
      stopPicking()
      event?.preventDefault?.()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [picking])

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
        ? t('questions.bulkDeleted', { n })
        : kind === 'stop'
          ? t('questions.bulkStopped', { n })
          : t('questions.bulkAsked', { n })
    setUndo({ id: Date.now(), label, before, picks: lampPicks })
    stopPicking()
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
    onChangeBooks(undoBulkLamps(shelf, undo.before, undo.picks))
    setUndo(null)
  }

  return (
    <View style={styles.fill}>
      {/* A tab, never pushed: no back arrow, even while a form that just saved is still popping off the stack. */}
      <BoardShell book={book} boards={shelf} title={allRows.length ? t('questions.title') : t('questions.empty')} date={shellDate(book, clock)} colors={colors} showAdd back={false}>
        <TagFilter
          boards={shelf}
          tagId={tagId}
          onTag={onTag}
          now={clock}
          colors={colors}
          topics={topics}
          topicPicks={picks}
          onTopics={setTopicPicks}
        />
        {allRows.length ? <SearchBox value={query} onChange={setQuery} colors={colors} /> : null}
        <FromFriends
          rows={allRows}
          didYouOnly={didYouOnly}
          onDidYou={() => setDidYouOnly((on) => !on)}
          dateIso={dateIso}
          colors={colors}
        />

        {hasDeadlines ? (
          <>
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
          </>
        ) : null}

        {picking ? (
          <View style={[styles.pickBar, { borderColor: colors.on, backgroundColor: colors.panel }]}>
            <View style={styles.pickHead}>
              <Text style={[styles.pickCount, { color: colors.ink }]}>
                {t('questions.pickedN', { n: chosen.length })}
              </Text>
              <KeyButton
                colors={colors}
                label={allOn ? t('questions.pickNone') : t('questions.pickAll')}
                onPress={() => setPicked(allOn ? new Set() : new Set(shown.map(rowKey)))}
              />
              <KeyButton colors={colors} label={t('questions.pickDone')} onPress={stopPicking} />
            </View>
            <View style={styles.pickActions}>
              <KeyButton
                colors={colors}
                disabled={!chosen.length}
                label={allDown ? t('lamp.askAgain') : t('lamp.stop')}
                onPress={() => apply(allDown ? 'ask' : 'stop')}
              />
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
          </View>
        ) : didYouOnly ? null : (
          <View style={styles.topKeys}>
            <DidButton label={t('tonight.add')} onPress={() => goHash('/add')} colors={colors} small />
            {shown.length && onChangeBooks ? (
              <KeyButton colors={colors} label={t('questions.pick')} onPress={() => setPicking(true)} />
            ) : null}
          </View>
        )}

        {hung.length ? (
          <LampBlock
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
          <Meta colors={colors}>{t('questions.noMatch')}</Meta>
        ) : picks.length ? (
          <Meta colors={colors}>{t('questions.emptyTopic')}</Meta>
        ) : deadlineOnly ? (
          <Meta colors={colors}>{t('questions.emptyDeadline')}</Meta>
        ) : (
          <>
            <Meta colors={colors}>{t('questions.hint')}</Meta>
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

        <LampBlock
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
        />
      </BoardShell>
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
])
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

function whenLine(draft) {
  if (draft.cadence === 'every_n' && !Number(draft.everyN)) return t('hang.everyN')
  if (draft.cadence === 'weekly' && !(draft.weekdays || []).length) return t('hang.weekly')
  return cadenceLine(draft)
}

function reminderLine(draft) {
  if (!lampNotifyOn(draft)) return t('hang.remindOff')
  if (!lampBuzzes(draft)) return t('hang.remindQuiet')
  if (draft.askAfter) return t('hang.remindAt', { time: timeLabel(draft.askAfter) })
  return t('hang.remindAny')
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
      <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{t('hang.kindLabel')}</Text>
      <Text style={[styles.fieldHint, styles.fieldHintTight, { color: colors.inkDim }]}>{t('hang.kindHint')}</Text>
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
    tagTitle: sourceBook?.title || book.title,
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
  const tagName = String(hang.tagTitle || '').trim() || book.title
  const ready = Boolean(draft.question.trim())
  const detailCount = [draft.kind, draft.notes].filter((v) => String(v || '').trim()).length
  const phone = usePhoneQuiet()
  // The short name shows in full, filled with the one made from the question
  // until they type their own, so it never changes behind their back.
  const [shortTyped, setShortTyped] = useState(false)
  const [shortRoom] = useState(() => Math.max(SHORT_MAX, String(draft.short || '').length))
  const shortShown = shortTyped || String(draft.short || '').trim() ? draft.short : shortFromQuestion(draft.question, SHORT_MAX)
  const scrollHandle = useRef(null)
  const picksH = useRef(0)

  useEffect(() => () => clearTimeout(leave.current), [])

  const [startSnap] = useState(() => JSON.stringify([draft, hang.tagTitle]))
  const dirty = hang.editing && JSON.stringify([draft, hang.tagTitle]) !== startSnap
  const leaveRef = useRef(null)
  const editing = hang.editing
  // Phone back on the edit page asks first when there are changes.
  useEffect(() => {
    if (!editing) return undefined
    function onBack(event) {
      event?.preventDefault?.()
      leaveRef.current?.()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [editing])

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

  function fold(id) {
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    setOpen((now) => (now === id ? '' : id))
    Keyboard.dismiss()
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
      title: t('hang.discardTitle'),
      goLabel: t('hang.discard'),
      closeLabel: t('hang.keepEditing'),
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
    const { lamp: next, problem } = hang.buildLamp()
    if (problem) {
      hang.setMiss(problem)
      feelTap('skip')
      if (problem === 'hang.miss.empty') {
        setShake((count) => count + 1)
        wobble.nudge()
        inputRef.current?.focus()
      } else if (SCHEDULE_MISSES.has(problem) && open !== 'when') {
        fold('when')
      } else if (problem === 'hang.miss.askAfter' && open !== 'time') {
        fold('time')
      }
      return
    }
    Keyboard.dismiss()
    const target = bookForTag(boards, book, hang.tagTitle)
    const wasEmpty = (target.lamps || []).filter((item) => !item.archived).length === 0
    // Only an edit moves from its old folder; a copy is new wherever it lands.
    if (onSaveTo) onSaveTo(target, next, existing ? sourceBook : null)
    else onChange(commitBook(hangInto(target, next, hang.editing), clock))
    const newTime = next.askAfter && next.askAfter !== existing?.askAfter ? next.askAfter : ''
    if (hang.editing) {
      playClick()
      confirmDone(t('confirm.questionSaved'))
      swapHash('/lamp', { id: next.id })
      offerPingPrimer(newTime, colors)
      return
    }
    // The reward: the card stamps itself, "Did I" lights up, and their cheer goes off.
    setStamp(isDueOn(next, dateIso) ? t('hang.landTonight') : t('hang.landAdded'))
    setWave((count) => count + 1)
    const purse = mergePurses(boards.length ? boards : [book])
    if (purse.cheerOn) fireCheer(purse.cheerOn, 1)
    else feelTap('hall-on')
    leave.current = setTimeout(
      () => {
        goHash(wasEmpty ? '/tonight' : '/lamps')
        offerPingPrimer(newTime, colors)
      },
      reduce ? LAND_HOLD_STILL : LAND_HOLD,
    )
  }

  // The rows below already say when it repeats, so the card keeps to the extras.
  const meta = [
    timeLabel(draft.askAfter),
    hang.priority === 'high' ? t('hang.metaHigh') : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <BoardShell
      book={book}
      title={hang.editing ? t('hang.edit') : t('hang.new')}
      noTitle={!hang.editing}
      date={shellDate(book, clock)}
      colors={colors}
      showAdd
      back={false}
      leftAction={{ label: t('hang.cancel'), onPress: hang.editing ? leaveEdit : cancel }}
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

      <View
        onLayout={(event) => {
          picksH.current = event.nativeEvent.layout.height
        }}
      >
        <IdeaPicks
          label={t('first.picks')}
          starters={blank.trim() && !picked ? [] : starters}
          picked={picked}
          onPick={pickIdea}
          tilt={wobble.tilt}
          colors={colors}
        />
        {packs.length && !blank.trim() ? (
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
                  value={t('pack.count', { n: pack.items.length })}
                  chevron
                  last={at === packs.length - 1}
                  onPress={() => askPack(pack)}
                />
              ))}
            </SetCard>
          </View>
        ) : null}
      </View>

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

      <View style={styles.settings}>
        <SetCap colors={colors}>{t('hang.secSchedule')}</SetCap>
        <SetCard colors={colors}>
          <HangFold
            label={t('hang.when')}
            value={whenLine(draft)}
            icon="calendar"
            open={open === 'when'}
            onToggle={() => fold('when')}
            colors={colors}
          >
            <View style={styles.pillRow}>
              {SCHEDULES.map((item) => (
                <Pill
                  key={item.id}
                  label={t(item.labelKey)}
                  on={schedule === item.id}
                  onPress={() => hang.changeSchedule(item.id)}
                  colors={colors}
                />
              ))}
            </View>

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

            {schedule === 'every_n' ? (
              <>
                <FoldInput
                  label={t('hang.everyNDays')}
                  value={String(draft.everyN || '')}
                  onChangeText={(value) => hang.change('everyN', value.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="3"
                  maxLength={3}
                  colors={colors}
                />
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

          </HangFold>

          <HangFold
            label={t('hang.timeRow')}
            value={draft.askAfter ? timeLabel(draft.askAfter) : t('hang.askAny')}
            icon="clock"
            open={open === 'time'}
            onToggle={() => fold('time')}
            colors={colors}
          >
            <HangTimePick value={draft.askAfter} onChange={hang.changeAskAfter} colors={colors} />
            <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{draft.askAfter ? t('hang.timeHint') : t('hang.anyTimeHint')}</Text>
          </HangFold>

          {hang.priority === 'low' ? (
            <SetRow colors={colors} icon="bell" label={t('hang.reminder')} sub={t('hang.remindLowNote')} value={t('hang.remindOff')} last />
          ) : phone.quiet ? (
            <QuietReminderRow colors={colors} onTurnOn={() => phone.turnOn(colors)} last />
          ) : (
            <SetSwitch
              label={t('hang.reminder')}
              sub={reminderLine(draft)}
              icon="bell"
              last
              on={hang.notifyOn}
              onPress={() => {
                playClick()
                hang.change('notify', !hang.notifyOn)
              }}
              colors={colors}
            />
          )}
        </SetCard>

        <SetCap colors={colors}>{t('hang.secOrganize')}</SetCap>
        <SetCard colors={colors}>
          <HangFold
            label={t('hang.tag')}
            value={tagName}
            icon="folder"
            open={open === 'tag'}
            onToggle={() => fold('tag')}
            colors={colors}
          >
            <Text style={[styles.foldCap, { color: colors.inkSoft }]}>{t('hang.tagOne')}</Text>
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
            icon="flag"
            open={open === 'priority'}
            onToggle={() => fold('priority')}
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
            last
            colors={colors}
          >
            <TopicPick
              value={draft.kind}
              known={shelfTopics(boards.length ? boards : [book])}
              onChange={(value) => hang.change('kind', value)}
              colors={colors}
            />
            <FoldInput
              label={t('hang.notes')}
              value={draft.notes}
              onChangeText={(value) => hang.change('notes', value)}
              placeholder={t('hang.notesPh')}
              multiline
              colors={colors}
            />
          </HangFold>
        </SetCard>
      </View>

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
  )
}

export function LampScreen({ book, boards = [], onChange, route }) {
  const lampId = route?.id || ''
  const shelf = boards.length ? boards : [book]
  const lampBook = findBookHoldingLamp(shelf, lampId) || book
  const { colors, clock, dateIso } = useHall(lampBook)
  const lamp = (lampBook.lamps || []).find((item) => item.id === lampId) || null
  const record = useMemo(() => lampRecord(lampBook, lamp, dateIso, 30), [lampBook, lamp, dateIso])
  const weeks = useMemo(() => lampWeeks(lampBook, lamp, dateIso, 8), [lampBook, lamp, dateIso])
  const phone = usePhoneQuiet()

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
    : record.due
      ? t('lamp.tonightIs', { status: pillStatusLabel(record.tonight) })
      : nextDueLine(lamp, dateIso)
  const priority = lamp.priority || 'normal'
  const topics = topicsOf(lamp).map(topicLabel).join(', ')
  // Topics are labeled so they don't read as the question's name.
  const extras = [topics ? `${t('hang.kind')}: ${topics}` : '', lamp.notes]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  // One look at the settings; changing them happens on Edit question.
  const summary = [
    cadenceLine(lamp),
    lamp.askAfter ? timeLabel(lamp.askAfter) : t('hang.askAny'),
    priority !== 'low' && phone.quiet ? t('lamp.sumPhoneOff') : reminderLine(lamp),
    lampBook.title,
    t(`hang.priority.${priority}`),
  ].join(' · ')

  return (
    <BoardShell book={lampBook} title={t('lamp.kicker')} noTitle date={shellDate(lampBook, clock)} colors={colors}>
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
        <LampCalendarStrip book={lampBook} lamp={lamp} colors={colors} dateIso={dateIso} />
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

      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
          <Text style={[styles.tileNum, { color: colors.on }]}>{record.streak}</Text>
          <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('lamp.streakCap')}</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
          <Text style={[styles.tileNum, { color: colors.ink }]}>
            {record.did}
            <Text style={[styles.tileOf, { color: colors.inkDim }]}> / {record.asked}</Text>
          </Text>
          <Text style={[styles.tileCap, { color: colors.inkDim }]}>{t('lamp.didCap', { n: 30 })}</Text>
        </View>
      </View>

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
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <NightNotes book={lampBook} lamp={lamp} colors={colors} onChange={change} />

      <KeyButton label={t('lamp.copy')} onPress={() => goHash('/hang', { copy: lamp.id })} colors={colors} />

      <SetCard colors={colors}>
        <Text style={[styles.summary, { color: colors.ink }]}>{summary}</Text>
        {extras.length ? (
          <Text style={[styles.summary, { color: colors.inkSoft }]} numberOfLines={2}>
            {extras.join(' · ')}
          </Text>
        ) : null}
        <View style={styles.summaryEdit}>
          <KeyButton label={t('hang.edit')} onPress={() => goHash('/hang', { id: lamp.id })} colors={colors} />
        </View>
      </SetCard>
      <LampManage book={lampBook} lamp={lamp} colors={colors} onChange={change} />
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
  pickBar: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  packs: { gap: 8, marginBottom: 12 },
  packLabel: { ...sectionLabel, marginBottom: 2 },
  pickHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
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
  summaryEdit: { padding: 12 },
  summary: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 12 },
  settings: { marginTop: 4 },
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
  tileOf: { fontSize: 16, fontWeight: '400' },
  tileCap: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
  trend: { gap: 8, marginBottom: 12 },
  trendLabel: { ...sectionLabel },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  trendWeek: { flex: 1, alignItems: 'center', gap: 4 },
  trendBar: { width: '100%', maxWidth: 28, height: 48, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  trendFill: { width: '100%' },
  trendNum: { fontFamily: fonts.mono, fontSize: 10 },
  tonight: { gap: 8, marginTop: 4 },
  tonightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { gap: 12, marginTop: 8 },
  textBtn: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
})
