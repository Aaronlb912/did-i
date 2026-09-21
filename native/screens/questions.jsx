import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { activeLook } from '../../src/lib/dit-board.js'
import {
  activeDeadline,
  cadenceLine,
  dueByUrgency,
  duplicateLamp,
  prepQuestionRows,
  shortLabel,
} from '../../src/lib/board-json.js'
import { commitBook } from '../../src/lib/achievements.js'
import { hangInto, putAnswer, takeDown, toggleArchive } from '../../src/lib/board-ops.js'
import { findBookHoldingLamp } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { matchLamps } from '../../src/lib/hall-pages.js'
import { answerFor, boardDate, dueTonight, formatBoardDate, periodKeyFor, recentPeriodKeys } from '../../src/lib/recurrence.js'
import { NightStrip } from '../components/NightStrip.jsx'
import { STARTERS } from '../../src/lib/starters.js'
import {
  CADENCE_OPTIONS,
  cadenceDropdownValue,
  isDeadlineMode,
  schedulePick,
} from '../../src/lib/hang-schedule.js'
import { HangSelect } from '../components/HangSelect.jsx'
import { bookForTag, useHangDraft } from '../../src/lib/useHangDraft.js'
import { rowKey, taggedLamps } from '../../src/lib/tags.js'
import { HangMonthCal } from '../components/HangMonthCal.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { Jewel } from '../components/Jewel.jsx'
import { TagFilter } from '../components/TagFilter.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
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

function LampBlock({ label, items, shelf, clock, dateIso, colors, onOpen }) {
  if (!items.length) return null
  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: colors.inkDim }]}>{label}</Text>
      {items.map((row) => {
        const jewel = rowJewelState(row, clock, dateIso)
        return (
          <Pressable
            key={rowKey(row)}
            onPress={() =>
              onOpen ? onOpen(row.boardId, row.lamp.id) : goHash('/lamp', { id: row.lamp.id })
            }
            style={[styles.lampRow, { borderColor: colors.line, backgroundColor: colors.panel }]}
          >
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

export function QuestionsScreen({ book, boards = [], tagId = '', onTag, onChange, onOpen }) {
  const { colors, clock, dateIso } = useHall(book)
  const shelf = boards.length ? boards : [book]
  const rows = taggedLamps(shelf, tagId)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const hasDeadlines = rows.some((row) => activeDeadline(row.lamp, dateIso))
  const hung = prepQuestionRows(rows.filter((row) => !row.lamp.archived), {
    dateIso,
    deadlineOnly,
  })
  const down = prepQuestionRows(rows.filter((row) => row.lamp.archived), {
    dateIso,
    deadlineOnly,
  })
  const starters = openStarters(book)

  return (
    <BoardShell book={book} boards={shelf} title={hung.length ? t('questions.title') : t('questions.empty')} date={shellDate(book, clock)} colors={colors} showAdd>
      <TagFilter boards={shelf} tagId={tagId} onTag={onTag} now={clock} colors={colors} />

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

      <DidButton label={t('tonight.add')} onPress={() => goHash('/add')} colors={colors} small />

      {hung.length ? (
        <LampBlock
          label={t('questions.list')}
          items={hung}
          shelf={shelf}
          clock={clock}
          dateIso={dateIso}
          colors={colors}
          onOpen={onOpen}
        />
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
      />
    </BoardShell>
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

export function HangScreen({ book, boards = [], onChange, onSaveTo, route }) {
  const { colors, clock } = useHall(book)
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
  const cadenceOptions = useMemo(
    () => CADENCE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
    [],
  )
  const schedule = schedulePick(hang.draft)
  const deadline = isDeadlineMode(hang.draft)
  const [cadenceOpen, setCadenceOpen] = useState(false)

  function cancel() {
    if (existing) goHash('/lamp', { id: existing.id })
    else if (copySource) goHash('/lamp', { id: copySource.id })
    else goHash('/lamps')
  }

  function save() {
    const { lamp: next, problem } = hang.buildLamp()
    if (problem) {
      hang.setMiss(problem)
      return
    }
    const target = bookForTag(boards, book, hang.tagTitle)
    const wasEmpty = (target.lamps || []).filter((item) => !item.archived).length === 0
    if (onSaveTo) onSaveTo(target, next, sourceBook)
    else onChange(commitBook(hangInto(target, next, hang.editing), clock))
    if (hang.editing) goHash('/lamp', { id: next.id })
    else goHash(wasEmpty ? '/tonight' : '/lamps')
  }

  return (
    <BoardShell
      book={book}
      title={hang.editing ? t('hang.edit') : t('hang.new')}
      date={shellDate(book, clock)}
      colors={colors}
      showAdd
    >
      <Field
        label={t('hang.question')}
        value={hang.draft.question}
        onChangeText={(value) => hang.change('question', value)}
        colors={colors}
        multiline
        autoFocus
      />

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.tag')}</Text>
      <View style={styles.weekdayRow}>
        {hang.liveTags.map((item) => {
          const on = hang.isTagSelected(item.title)
          return (
            <Pressable
              key={item.id}
              onPress={() => hang.setTagTitle(item.title)}
              style={[
                styles.weekdayChip,
                { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.panel3 : colors.panel2 },
              ]}
            >
              <Text style={{ color: on ? colors.on : colors.ink, fontSize: 12 }}>{item.title}</Text>
            </Pressable>
          )
        })}
        {hang.knownTag ? (
          <Pressable onPress={() => hang.setTagTitle('')}>
            <Text style={[styles.tagNewLink, { color: colors.inkDim }]}>{t('hang.tagNew')}</Text>
          </Pressable>
        ) : (
          <TextInput
            style={[styles.tagNewInput, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.bg }]}
            value={hang.tagTitle}
            onChangeText={hang.setTagTitle}
            placeholder={t('hang.tagPh')}
            placeholderTextColor={colors.inkDim}
            accessibilityLabel={t('hang.tagNew')}
          />
        )}
      </View>
      {hang.parkedTags.length ? (
        <View style={[styles.parkedTags, { borderTopColor: colors.line }]}>
          <Text style={[styles.parkedLabel, { color: colors.inkDim }]}>{t('hang.tagLater')}</Text>
          {hang.parkedTags.map((item) => {
            const on = hang.isTagSelected(item.title)
            return (
              <Pressable
                key={item.id}
                onPress={() => hang.setTagTitle(item.title)}
                style={[
                  styles.weekdayChip,
                  {
                    borderColor: on ? colors.onDeep : colors.line,
                    backgroundColor: on ? colors.panel3 : colors.panel2,
                    opacity: on ? 1 : 0.85,
                  },
                ]}
              >
                <Text style={{ color: on ? colors.on : colors.inkDim, fontSize: 12 }}>{item.title}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {deadline ? (
        <View>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.dueBy')}</Text>
          <HangMonthCal
            mode="date"
            value={hang.draft.dueBy}
            onChange={(iso) => hang.change('dueBy', iso)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
          <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.dueByHint')}</Text>
          <Pressable onPress={() => hang.change('cadence', 'daily')} hitSlop={8}>
            <Text style={[styles.timingBack, { color: colors.inkSoft }]}>{t('hang.useOften')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.timingRow}>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.often')}</Text>
          <View style={styles.timingPick}>
            <HangSelect
              ariaLabel={t('hang.often')}
              value={cadenceDropdownValue(hang.draft)}
              onChange={(value) => hang.change('cadence', value)}
              options={cadenceOptions}
              colors={colors}
              open={cadenceOpen}
              onOpenChange={setCadenceOpen}
            />
            <View style={styles.timingAlt}>
              <Text style={[styles.timingOr, { color: colors.inkDim }]}>{t('hang.or')}</Text>
              <KeyButton colors={colors} label={t('hang.deadline')} onPress={() => hang.changeSchedule('deadline')} />
            </View>
          </View>
        </View>
      )}

      {!deadline && hang.draft.cadence === 'weekly' ? (
        <View style={styles.weekdays}>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.weekdays')}</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => {
              const on = (hang.draft.weekdays || []).includes(day)
              return (
                <Pressable
                  key={day}
                  onPress={() => hang.toggleDay(day)}
                  style={[
                    styles.weekdayChip,
                    { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.panel3 : colors.panel2 },
                  ]}
                >
                  <Text style={{ color: on ? colors.on : colors.ink, fontSize: 12 }}>{t(`hang.day.${day}`)}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {!deadline && hang.draft.cadence === 'monthly' ? (
        <View>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.monthDay')}</Text>
          <HangMonthCal
            mode="monthly"
            value={hang.draft.monthDay === '' ? '' : hang.draft.monthDay}
            onChange={(day) => hang.change('monthDay', day)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
          <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.monthCalHint')}</Text>
        </View>
      ) : null}

      {!deadline && schedule === 'once_on' ? (
        <View>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.onceOn')}</Text>
          <HangMonthCal
            mode="date"
            value={hang.draft.onceOn}
            onChange={(iso) => hang.change('onceOn', iso)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
          <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.onceOnHint')}</Text>
        </View>
      ) : null}

      {!deadline && hang.draft.cadence === 'every_n' ? (
        <>
          <Field
            label={t('hang.everyNDays')}
            value={String(hang.draft.everyN || '')}
            onChangeText={(value) => hang.change('everyN', value)}
            colors={colors}
            placeholder="3"
          />
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.startingOn')}</Text>
          <HangMonthCal
            mode="date"
            value={hang.draft.everyNAnchor}
            onChange={(iso) => hang.change('everyNAnchor', iso)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
        </>
      ) : null}

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.priority')}</Text>
      <ChipRow
        items={PRIORITIES.map((id) => ({ id, label: t(`hang.priority.${id}`) }))}
        value={hang.priority}
        onPick={(value) => hang.change('priority', value)}
        colors={colors}
      />

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.notify')}</Text>
      <View style={styles.notifyRow}>
        <ChipRow
          items={[
            { id: 'on', label: t('hang.notifyOn') },
            { id: 'off', label: t('hang.notifyOff') },
          ]}
          value={hang.notifyOn ? 'on' : 'off'}
          onPick={(value) => hang.change('notify', value === 'on')}
          colors={colors}
        />
        <KeyButton
          label={hang.more ? t('hang.less') : t('hang.more')}
          colors={colors}
          picked={hang.more}
          onPress={() => hang.setMore((open) => !open)}
        />
      </View>

      {hang.more ? (
        <>
          <Field
            label={t('hang.short')}
            value={hang.draft.short}
            onChangeText={(value) => hang.change('short', value)}
            colors={colors}
          />
          <HangTimePick value={hang.draft.askAfter} onChange={hang.changeAskAfter} colors={colors} />
          <Field label={t('hang.kind')} value={hang.draft.kind} onChangeText={(value) => hang.change('kind', value)} colors={colors} />
          <Field
            label={t('hang.notes')}
            value={hang.draft.notes}
            onChangeText={(value) => hang.change('notes', value)}
            colors={colors}
            multiline
          />
        </>
      ) : null}

      {hang.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {t(hang.miss)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <DidButton label={hang.editing ? t('hang.save') : t('hang.add')} onPress={save} colors={colors} small />
        <KeyButton label={t('hang.cancel')} onPress={cancel} colors={colors} />
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
  fieldHint: { fontFamily: fonts.ui, fontSize: 12, marginBottom: 8 },
  timingRow: { gap: 6, marginBottom: 4 },
  timingPick: { gap: 8 },
  timingAlt: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  timingOr: { fontFamily: fonts.ui, fontSize: 13 },
  timingBack: { fontFamily: fonts.ui, fontSize: 13, textDecorationLine: 'underline', marginTop: 6 },
  weekdays: { gap: 6 },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 },
  tagNewLink: {
    fontFamily: fonts.ui,
    fontSize: 12,
    textDecorationLine: 'underline',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  tagNewInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  parkedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  parkedLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginRight: 2,
  },
  notifyRow: {
    gap: 12,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  weekdayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tonight: { gap: 8, marginTop: 4 },
  tonightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { gap: 12, marginTop: 8 },
  textBtn: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
})
