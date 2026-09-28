import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { activeLook } from '../../src/lib/active-look.js'
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
} from '../../src/lib/board-json.js'
import { commitBook } from '../../src/lib/achievements.js'
import { bulkLamps, hangInto, putAnswer, takeDown, toggleArchive, undoBulkLamps } from '../../src/lib/board-ops.js'
import { findBookHoldingLamp } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { clockWords, matchLamps } from '../../src/lib/hall-pages.js'
import { boardDate, formatBoardDate, isDueOn } from '../../src/lib/recurrence.js'
import { LampCalendarStrip } from '../components/LampCalendarStrip.jsx'
import { STARTERS, starterBlank, unusedStarters } from '../../src/lib/starters.js'
import { schedulePick } from '../../src/lib/hang-schedule.js'
import { feelTap, playClick } from '../../src/lib/native.js'
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
import { questionAddsToName, rowId, searchRows, tonightStates } from '../../src/lib/question-list.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { lampRecord } from '../../src/lib/lamp-record.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { TagFilter } from '../components/TagFilter.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { publishSheet } from '../components/SheetHost.jsx'
import { UndoToast } from '../components/UndoToast.jsx'
import {
  ChipRow,
  DidButton,
  Field,
  KeyButton,
  Meta,
  Page,
} from '../components/ui.jsx'
import { goHash } from '../navigation/hash.js'
import { fonts, hallColors } from '../theme.js'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

function useHall(book) {
  const theme = useTheme()
  const look = activeLook(book)
  const colors = hallColors(look, theme)
  const clock = useMemo(() => new Date(), [])
  const dateIso = boardDate(clock, book.dayFoldHour)
  return { colors, clock, dateIso }
}

function shellDate(book, clock = new Date()) {
  return formatBoardDate(boardDate(clock, book.dayFoldHour))
}

function openStarters(book) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  return STARTERS.filter(
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
                {questionAddsToName(row.lamp) ? (
                  <Text style={[styles.lampQ, { color: colors.inkSoft }]} numberOfLines={1}>
                    {row.lamp.question}
                  </Text>
                ) : null}
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

function SearchBox({ value, onChange, colors }) {
  return (
    <View style={[styles.search, { borderColor: value ? colors.onDeep : colors.line, backgroundColor: colors.panel }]}>
      <Text style={[styles.searchGlyph, { color: colors.inkDim }]}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('questions.searchPh')}
        placeholderTextColor={colors.inkDim}
        selectionColor={colors.on}
        accessibilityLabel={t('questions.searchPh')}
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

export function QuestionsScreen({ book, boards = [], tagId = '', onTag, onChange, onChangeBooks, onOpen }) {
  const { colors, clock, dateIso } = useHall(book)
  const shelf = boards.length ? boards : [book]
  const allRows = taggedLamps(shelf, tagId)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const [query, setQuery] = useState('')
  const rows = searchRows(allRows, query)
  const states = useMemo(() => tonightStates(allRows, clock), [shelf, tagId, clock])
  const [topicPicks, setTopicPicks] = useState([])
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const [undo, setUndo] = useState(null)
  const topics = shelfTopics(shelf)
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const hasDeadlines = allRows.some((row) => activeDeadline(row.lamp, dateIso))
  const hung = prepQuestionRows(rows.filter((row) => !row.lamp.archived && hasAnyTopic(row.lamp, picks)), {
    dateIso,
    deadlineOnly,
  })
  const down = prepQuestionRows(rows.filter((row) => row.lamp.archived && hasAnyTopic(row.lamp, picks)), {
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
      <BoardShell book={book} boards={shelf} title={hung.length ? t('questions.title') : t('questions.empty')} date={shellDate(book, clock)} colors={colors} showAdd>
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
        ) : (
          <View style={styles.topKeys}>
            <DidButton label={t('tonight.add')} onPress={() => goHash('/add')} colors={colors} small />
            {shown.length && onChangeBooks ? (
              <KeyButton colors={colors} label={t('questions.pick')} onPress={() => setPicking(true)} />
            ) : null}
          </View>
        )}

        {hung.length ? (
          <LampBlock
            label={t('questions.list')}
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
                      onPress={() =>
                        onChange(commitBook(hangInto(book, { ...blankLamp(clock), ...starter }), clock))
                      }
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
      <UndoToast undo={undo} onUndo={takeBack} colors={colors} />
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

function timeLabel(value) {
  return value ? clockWords(value) : ''
}

function whenLine(draft) {
  if (draft.cadence === 'every_n' && !Number(draft.everyN)) return t('hang.everyN')
  return cadenceLine(draft)
}

function reminderLine(draft) {
  if (!lampNotifyOn(draft)) return t('hang.remindOff')
  if (!lampBuzzes(draft)) return t('hang.remindQuiet')
  if (draft.askAfter) return t('hang.remindAt', { time: timeLabel(draft.askAfter) })
  return t('hang.remindAny')
}

function Pill({ label, on, onPress, colors, dim, radio }) {
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
function TopicPick({ value, known, onChange, colors }) {
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
      <TextInput
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
        placeholderTextColor={colors.inkDim}
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
      <TextInput
        {...props}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkDim}
        selectionColor={colors.on}
        style={[
          styles.foldInput,
          multiline && styles.foldInputMulti,
          { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg },
        ]}
      />
    </View>
  )
}

export function HangScreen({ book, boards = [], onChange, onSaveTo, route }) {
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
  const wobble = useWobble(starters.length, fresh && !blank.trim() && !focused && !stamp, reduce)
  const schedule = schedulePick(draft)
  const tagName = String(hang.tagTitle || '').trim() || book.title
  const ready = Boolean(draft.question.trim())
  const detailCount = [draft.short, draft.kind, draft.notes].filter((v) => String(v || '').trim()).length

  useEffect(() => () => clearTimeout(leave.current), [])

  function fold(id) {
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    setOpen((now) => (now === id ? '' : id))
    Keyboard.dismiss()
  }

  function changeBlank(value) {
    setBlank(value)
    const question = lead ? didQuestion(value) : value
    if (picked && question !== picked.question && draft.short === picked.short) {
      hang.change('short', '')
      hang.change('kind', '')
    }
    hang.change('question', question)
  }

  function pickIdea(starter) {
    setBlank(starterBlank(starter))
    hang.applyStarter(starter)
    setWave((count) => count + 1)
    playClick()
  }

  function cancel() {
    if (existing) goHash('/lamp', { id: existing.id })
    else if (copySource) goHash('/lamp', { id: copySource.id })
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
    if (onSaveTo) onSaveTo(target, next, sourceBook)
    else onChange(commitBook(hangInto(target, next, hang.editing), clock))
    if (hang.editing) {
      playClick()
      goHash('/lamp', { id: next.id })
      return
    }
    // The reward: the card stamps itself, "Did I" lights up, and their cheer goes off.
    setStamp(isDueOn(next, dateIso) ? t('hang.landTonight') : t('hang.landAdded'))
    setWave((count) => count + 1)
    const purse = mergePurses(boards.length ? boards : [book])
    if (purse.cheerOn) fireCheer(purse.cheerOn, 1)
    else feelTap('hall-on')
    leave.current = setTimeout(
      () => goHash(wasEmpty ? '/tonight' : '/lamps'),
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
      date={shellDate(book, clock)}
      colors={colors}
      showAdd
      back={hang.editing ? undefined : false}
      leftAction={hang.editing ? undefined : { label: t('hang.cancel'), onPress: cancel }}
      rightAction={hang.editing ? undefined : { label: t('hang.addIt'), onPress: save, disabled: !ready }}
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
        autoFocus={fresh && !start && !spoken}
        colors={colors}
      />

      <IdeaPicks
        label={t('first.picks')}
        starters={blank.trim() && !picked ? [] : starters}
        picked={picked}
        onPick={pickIdea}
        tilt={wobble.tilt}
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
            <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.timeHint')}</Text>
          </HangFold>

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
              String(draft.short || '').trim() ||
              (detailCount
                ? t(detailCount === 1 ? 'hang.detailsOne' : 'hang.detailsSome', { n: detailCount })
                : t('hang.detailsNone'))
            }
            icon="note"
            open={open === 'details'}
            onToggle={() => fold('details')}
            last
            colors={colors}
          >
            <FoldInput
              label={t('hang.short')}
              value={draft.short}
              onChangeText={(value) => hang.change('short', value)}
              placeholder={shortFromQuestion(draft.question, 24) || t('hang.shortPh')}
              maxLength={24}
              colors={colors}
            />
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

      {hang.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {t(hang.miss)}
        </Text>
      ) : null}

      {hang.editing ? (
        <View style={styles.hangActions}>
          <DidButton label={t('hang.save')} onPress={save} colors={colors} dim={!ready} />
          <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" style={styles.cancel}>
            <Text style={[styles.cancelText, { color: colors.inkSoft }]}>{t('hang.cancel')}</Text>
          </Pressable>
        </View>
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

  function change(next) {
    onChange(commitBook(next, clock))
  }

  function editAt(section) {
    foldNext = section
    goHash('/hang', { id: lamp.id })
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
      : t('lamp.notTonight')
  const priority = lamp.priority || 'normal'
  const extras = [lamp.kind, lamp.notes].map((item) => String(item || '').trim()).filter(Boolean)

  return (
    <BoardShell book={lampBook} title={t('lamp.kicker')} date={shellDate(lampBook, clock)} colors={colors}>
      <View style={[...faceCardStyle(colors), styles.lampCard, lamp.archived && { opacity: 0.75 }]}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]} numberOfLines={1}>
          {lampBook.title}
        </Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{lamp.question}</Text>
        <Text style={[styles.lampStatus, { color: lamp.archived ? colors.inkDim : colors.inkSoft }]}>{status}</Text>
        <LampCalendarStrip book={lampBook} lamp={lamp} colors={colors} dateIso={dateIso} />
      </View>

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

      <KeyButton label={t('lamp.copy')} onPress={() => goHash('/hang', { copy: lamp.id })} colors={colors} />

      <SetCap colors={colors}>{t('hang.secSchedule')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="calendar" label={t('hang.when')} value={cadenceLine(lamp)} chevron onPress={() => editAt('when')} />
        <SetRow
          colors={colors}
          icon="clock"
          label={t('hang.timeRow')}
          value={lamp.askAfter ? timeLabel(lamp.askAfter) : t('hang.askAny')}
          chevron
          onPress={() => editAt('time')}
        />
        <SetRow colors={colors} icon="bell" label={t('hang.reminder')} sub={reminderLine(lamp)} last />
      </SetCard>

      <SetCap colors={colors}>{t('hang.secOrganize')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="folder" label={t('hang.tag')} value={lampBook.title} chevron onPress={() => editAt('tag')} />
        <SetRow
          colors={colors}
          icon="flag"
          label={t('hang.priority')}
          value={t(`hang.priority.${priority}`)}
          chevron
          onPress={() => editAt('priority')}
        />
        <SetRow
          colors={colors}
          icon="note"
          label={t('hang.details')}
          sub={extras.join(' · ') || ''}
          value={extras.length ? '' : t('hang.detailsNone')}
          chevron
          last
          onPress={() => editAt('details')}
        />
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
  pickHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pickCount: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '700', flexGrow: 1 },
  pickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickTick: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '800', lineHeight: 16 },
  dropBtn: { borderWidth: 1, borderRadius: 999, minHeight: 40, paddingHorizontal: 16, justifyContent: 'center' },
  dropText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '600' },
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
  lampName: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600', lineHeight: 20 },
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
  settings: { marginTop: 4 },
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
  foldCap: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
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
  tonight: { gap: 8, marginTop: 4 },
  tonightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { gap: 12, marginTop: 8 },
  textBtn: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
})
