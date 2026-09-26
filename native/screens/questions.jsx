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
import { matchLamps } from '../../src/lib/hall-pages.js'
import {
  answerFor,
  boardDate,
  dueTonight,
  formatBoardDate,
  isDueOn,
  periodKeyFor,
  recentPeriodKeys,
} from '../../src/lib/recurrence.js'
import { NightStrip } from '../components/NightStrip.jsx'
import { STARTERS, starterBlank, unusedStarters } from '../../src/lib/starters.js'
import { schedulePick } from '../../src/lib/hang-schedule.js'
import { from24 } from '../../src/lib/hang-time.js'
import { feelTap, playClick } from '../../src/lib/native.js'
import { fireCheer, mergePurses } from '../../src/lib/purse.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { bookForTag, useHangDraft } from '../../src/lib/useHangDraft.js'
import { rowKey, taggedLamps } from '../../src/lib/tags.js'
import { HangMonthCal } from '../components/HangMonthCal.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { Jewel } from '../components/Jewel.jsx'
import { IdeaPicks, useWobble } from '../components/DidLead.jsx'
import { HangCard } from '../components/HangCard.jsx'
import { HangFold } from '../components/HangFold.jsx'
import { SetCard, SetSwitch } from '../components/SetBits.jsx'
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

function rowJewelState(row, clock, dateIso) {
  const due = dueTonight(row.book, clock)
  const hit = due.find((item) => item.lamp.id === row.lamp.id)
  if (!hit) return {}
  if (hit.answer && (hit.answer.status === 'yes' || hit.answer.status === 'late')) {
    return { on: true, late: hit.answer.status === 'late' }
  }
  if (hit.answer?.status === 'skip') return { skip: true }
  const urgency = dueByUrgency(row.lamp, dateIso)
  if (urgency === 'today') return { dueToday: true }
  if (urgency === 'soon') return { dueSoon: true }
  return {}
}

function openStarters(book) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  return STARTERS.filter(
    (starter) =>
      !hung.some((lamp) => lamp.short === starter.short || lamp.question === starter.question),
  )
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

function LampBlock({ label, items, shelf, clock, dateIso, colors, onOpen, picking, picked, onPick }) {
  if (!items.length) return null
  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: colors.inkDim }]}>{label}</Text>
      {items.map((row) => {
        const jewel = rowJewelState(row, clock, dateIso)
        const on = Boolean(picking && picked?.has(rowKey(row)))
        return (
          <Pressable
            key={rowKey(row)}
            accessibilityRole={picking ? 'checkbox' : 'button'}
            accessibilityState={picking ? { checked: on } : undefined}
            onPress={() => {
              if (picking) {
                onPick(row)
                return
              }
              if (onOpen) onOpen(row.boardId, row.lamp.id)
              else goHash('/lamp', { id: row.lamp.id })
            }}
            style={[
              styles.lampRow,
              { borderColor: on ? colors.on : colors.line, backgroundColor: on ? colors.panel3 : colors.panel },
            ]}
          >
            {picking ? <PickBox on={on} colors={colors} /> : null}
            <Jewel
              label={shortLabel(row.lamp)}
              tag={shelf.length > 1 ? row.tag : ''}
              on={jewel.on}
              skip={jewel.skip}
              late={jewel.late}
              dueToday={jewel.dueToday}
              dueSoon={jewel.dueSoon}
              colors={colors}
            />
            <View style={styles.lampCopy}>
              <Text style={[styles.lampName, { color: colors.ink }]} numberOfLines={2}>
                {row.lamp.question}
              </Text>
              <Text style={[styles.lampMeta, { color: colors.inkDim }]} numberOfLines={1}>
                {shelf.length > 1 ? `${row.tag} · ` : ''}
                {cadenceLine(row.lamp)}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const UNDO_MS = 6000

export function QuestionsScreen({ book, boards = [], tagId = '', onTag, onChange, onChangeBooks, onOpen }) {
  const { colors, clock, dateIso } = useHall(book)
  const shelf = boards.length ? boards : [book]
  const rows = taggedLamps(shelf, tagId)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const [topicPicks, setTopicPicks] = useState([])
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const [undo, setUndo] = useState(null)
  const topics = shelfTopics(shelf)
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const hasDeadlines = rows.some((row) => activeDeadline(row.lamp, dateIso))
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
            clock={clock}
            dateIso={dateIso}
            colors={colors}
            onOpen={onOpen}
            picking={picking}
            picked={picked}
            onPick={pick}
          />
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
          clock={clock}
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
  'hang.miss.askAfter',
])
const LAND_HOLD = 1100
const LAND_HOLD_STILL = 450

function timeLabel(value) {
  if (!value) return ''
  const { hour, minute, meridiem } = from24(value)
  return `${hour}:${minute} ${t(`hang.${meridiem}`)}`
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
    seed: copySource ? duplicateLamp(copySource, clock) : null,
    start,
    tagTitle: sourceBook?.title || book.title,
  })
  const { draft } = hang
  // A question that does not read "Did I ..." keeps its own words, with no fixed lead.
  const [lead] = useState(() => !draft.question || /^did i\b/i.test(draft.question))
  const [blank, setBlank] = useState(() => (lead ? starterBlank(draft) : draft.question))
  const [open, setOpen] = useState('')
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

  const meta = [
    whenLine(draft),
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
        autoFocus={fresh && !start}
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
        <SetCard colors={colors}>
          <HangFold
            label={t('hang.when')}
            value={whenLine(draft)}
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

            <Text style={[styles.foldCap, styles.foldCapGap, { color: colors.inkSoft }]}>
              {t('hang.askAfter')}
            </Text>
            <HangTimePick value={draft.askAfter} onChange={hang.changeAskAfter} colors={colors} />
          </HangFold>

          <HangFold
            label={t('hang.tag')}
            value={tagName}
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

          <SetSwitch
            label={t('hang.reminder')}
            sub={reminderLine(draft)}
            on={hang.notifyOn}
            onPress={() => {
              playClick()
              hang.change('notify', !hang.notifyOn)
            }}
            colors={colors}
          />

          <HangFold
            label={t('hang.details')}
            value={
              detailCount
                ? t(detailCount === 1 ? 'hang.detailsOne' : 'hang.detailsSome', { n: detailCount })
                : t('hang.detailsNone')
            }
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

      <View style={styles.hangActions}>
        <DidButton
          label={hang.editing ? t('hang.save') : t('hang.addIt')}
          onPress={save}
          colors={colors}
          dim={!ready}
        />
        <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" style={styles.cancel}>
          <Text style={[styles.cancelText, { color: colors.inkSoft }]}>{t('hang.cancel')}</Text>
        </Pressable>
      </View>
    </BoardShell>
  )
}

export function LampScreen({ book, boards = [], onChange, route }) {
  const lampId = route?.id || ''
  const shelf = boards.length ? boards : [book]
  const lampBook = findBookHoldingLamp(shelf, lampId) || book
  const { colors, clock, dateIso } = useHall(lampBook)
  const lamp = (lampBook.lamps || []).find((item) => item.id === lampId) || null
  const [confirmGone, setConfirmGone] = useState(false)
  const [holePick, setHolePick] = useState(null)
  const stripKeys = lamp ? recentPeriodKeys(lamp, dateIso, 7) : []

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

  if (holePick) {
    const wasSkip = answerFor(lampBook, holePick.id, holePick.key)?.status === 'skip'
    return (
      <BoardShell book={lampBook} title={holePick.question} date={shellDate(lampBook, clock)} colors={colors}>
        <View style={styles.actions}>
          <DidButton
            label={t('hole.late')}
            colors={colors}
            small
            onPress={() => {
              change(putAnswer(lampBook, { lamp: holePick, periodKey: holePick.key }, 'late', clock))
              setHolePick(null)
            }}
          />
          {!wasSkip ? (
            <KeyButton
              label={t('tonight.swipeNope')}
              colors={colors}
              onPress={() => {
                change(putAnswer(lampBook, { lamp: holePick, periodKey: holePick.key }, 'skip', clock))
                setHolePick(null)
              }}
            />
          ) : null}
          <KeyButton label={t('hole.leave')} colors={colors} onPress={() => setHolePick(null)} />
        </View>
      </BoardShell>
    )
  }

  if (confirmGone) {
    const taps = (lampBook.answers || []).filter((item) => item.lampId === lamp.id).length
    const note =
      taps === 0
        ? t('lamp.deleteNone')
        : taps === 1
          ? t('lamp.deleteOne')
          : t('lamp.deleteSome', { n: taps })
    return (
      <BoardShell book={lampBook} title={t('lamp.deleteTitle')} date={shellDate(lampBook, clock)} colors={colors}>
        <Meta colors={colors}>{note}</Meta>
        <View style={styles.actions}>
          <DidButton
            label={t('lamp.delete')}
            onPress={() => {
              change(takeDown(lampBook, lamp))
              goHash('/lamps')
            }}
            colors={colors}
            small
          />
          <KeyButton label={t('lamp.keep')} onPress={() => setConfirmGone(false)} colors={colors} />
        </View>
      </BoardShell>
    )
  }

  return (
    <BoardShell book={lampBook} title={lamp.question} date={shellDate(lampBook, clock)} colors={colors}>
      <Meta colors={colors}>
        {[cadenceLine(lamp), lamp.archived ? t('lamp.paused') : ''].filter(Boolean).join(' · ')}
      </Meta>
      {lamp.notes ? <Meta colors={colors}>{lamp.notes}</Meta> : null}

      <NightStrip
        book={lampBook}
        lamp={lamp}
        keys={stripKeys}
        colors={colors}
        noPickKeys={[periodKeyFor(lamp, dateIso)]}
        onPickHole={(picked, key) => setHolePick({ ...picked, key, question: picked.question })}
      />

      <View style={styles.actions}>
        <DidButton label={t('lamp.edit')} onPress={() => goHash('/hang', { id: lamp.id })} colors={colors} small />
        <KeyButton label={t('lamp.copy')} onPress={() => goHash('/hang', { copy: lamp.id })} colors={colors} />
        <KeyButton label={t('lamp.done')} onPress={() => goHash('/lamps')} colors={colors} />
      </View>

      <View style={styles.more}>
        <Pressable onPress={() => change(toggleArchive(lampBook, lamp))}>
          <Text style={[styles.textBtn, { color: colors.inkSoft }]}>
            {lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
          </Text>
        </Pressable>
        <Pressable onPress={() => setConfirmGone(true)}>
          <Text style={[styles.textBtn, { color: colors.miss }]}>{t('lamp.delete')}</Text>
        </Pressable>
      </View>
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
  lampCopy: { flex: 1, minWidth: 0, gap: 2 },
  lampName: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  lampMeta: { fontFamily: fonts.ui, fontSize: 12 },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tonight: { gap: 8, marginTop: 4 },
  tonightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { gap: 12, marginTop: 8 },
  textBtn: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
})
