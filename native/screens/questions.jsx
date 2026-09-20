import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { activeLook } from '../../src/lib/dit-board.js'
import {
  blankLamp,
  cadenceLine,
  emptyBoard,
  lampNotifyOn,
  lampPriority,
  missLamp,
  shortLabel,
  slotFromAskAfter,
} from '../../src/lib/board-json.js'
import { commitBook, hangInto, putAnswer, takeDown, toggleArchive } from '../../src/lib/board-ops.js'
import { findBookByTitle, findBookHoldingLamp } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { matchLamps } from '../../src/lib/hall-pages.js'
import { answerFor, boardDate, dueTonight, formatBoardDate, recentPeriodKeys } from '../../src/lib/recurrence.js'
import { NightStrip } from '../components/NightStrip.jsx'
import { STARTERS } from '../../src/lib/starters.js'
import { rowKey, taggedLamps } from '../../src/lib/tags.js'
import { HangMonthCal } from '../components/HangMonthCal.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { Jewel } from '../components/Jewel.jsx'
import { TagFilter } from '../components/TagFilter.jsx'
import {
  ChipRow,
  DidButton,
  Field,
  Kicker,
  KeyButton,
  Meta,
  Page,
  Title,
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

function rowJewelState(row, clock) {
  const due = dueTonight(row.book, clock)
  const hit = due.find((item) => item.lamp.id === row.lamp.id)
  if (!hit) return {}
  if (hit.answer && (hit.answer.status === 'yes' || hit.answer.status === 'late')) {
    return { on: true, late: hit.answer.status === 'late' }
  }
  if (hit.answer?.status === 'skip') return { skip: true }
  return {}
}

function openStarters(book) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  return STARTERS.filter(
    (starter) =>
      !hung.some((lamp) => lamp.short === starter.short || lamp.question === starter.question),
  )
}

function LampBlock({ label, items, shelf, clock, colors, onOpen }) {
  if (!items.length) return null
  return (
    <View style={styles.block}>
      <Text style={[styles.blockLabel, { color: colors.inkDim }]}>{label}</Text>
      {items.map((row) => {
        const jewel = rowJewelState(row, clock)
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
  const hung = rows.filter((row) => !row.lamp.archived)
  const down = rows.filter((row) => row.lamp.archived)
  const starters = openStarters(book)

  return (
    <Page colors={colors}>
      <Text style={[styles.mastDate, { color: colors.inkDim }]}>{formatBoardDate(dateIso)}</Text>
      <Kicker colors={colors}>{t('questions.kicker')}</Kicker>
      <Title colors={colors}>{hung.length ? t('questions.title') : t('questions.empty')}</Title>

      <TagFilter boards={shelf} tagId={tagId} onTag={onTag} now={clock} colors={colors} />

      <DidButton label={t('tonight.add')} onPress={() => goHash('/add')} colors={colors} small />

      {hung.length ? (
        <LampBlock
          label={t('questions.list')}
          items={hung}
          shelf={shelf}
          clock={clock}
          colors={colors}
          onOpen={onOpen}
        />
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
        colors={colors}
        onOpen={onOpen}
      />
    </Page>
  )
}

function bookForTag(boards, book, name) {
  const title = String(name || '').trim() || book.title
  const hit = findBookByTitle(boards, title)
  if (hit) return hit
  return { ...emptyBoard(), title, keeperName: book.keeperName }
}

function hasExtraFields(item) {
  return Boolean(
    item && (item.short || item.askAfter || item.notes || String(item.kind || '').trim()),
  )
}

const PRIORITIES = ['high', 'normal', 'low']

export function SearchScreen({ book }) {
  const { colors } = useHall(book)
  const [query, setQuery] = useState('')
  const hits = matchLamps(book, query)

  return (
    <Page colors={colors}>
      <Kicker colors={colors}>{t('search.kicker')}</Kicker>
      <Title colors={colors}>{t('search.title')}</Title>
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
    </Page>
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
  const editing = Boolean(existing)

  const [draft, setDraft] = useState(() => {
    if (existing) return { ...existing }
    if (copySource) {
      const fresh = blankLamp(clock)
      return { ...fresh, ...copySource, id: fresh.id, archived: false }
    }
    const pick = STARTERS.find(
      (item) => item.short.toLowerCase() === String(start || '').toLowerCase(),
    )
    return pick ? { ...blankLamp(clock), ...pick } : blankLamp(clock)
  })
  const [tagTitle, setTagTitle] = useState(sourceBook?.title || book.title)
  const [more, setMore] = useState(() => hasExtraFields(existing) || hasExtraFields(copySource))
  const [miss, setMiss] = useState('')

  const liveTags = (boards || []).filter((item) => !item.archived)
  const parkedTags = (boards || []).filter((item) => item.archived)
  const knownTag = Boolean(findBookByTitle(boards, tagTitle))
  const priority = lampPriority(draft)
  const notifyOn = lampNotifyOn(draft)

  const cadenceItems = [
    { id: 'daily', label: t('hang.daily') },
    { id: 'weekly', label: t('hang.weekly') },
    { id: 'monthly', label: t('hang.monthly') },
    { id: 'every_n', label: t('hang.everyN') },
    { id: 'once', label: t('hang.once') },
  ]

  function change(field, value) {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'cadence' && value === 'once' && !/^\d{4}-\d{2}-\d{2}$/.test(String(prev.onceOn || ''))) {
        next.onceOn = boardDate(clock, book.dayFoldHour)
      }
      return next
    })
    if (miss) setMiss('')
  }

  function changeAskAfter(next) {
    setDraft((prev) => ({ ...prev, askAfter: next, slot: slotFromAskAfter(next) }))
  }

  function toggleDay(day) {
    setDraft((prev) => {
      const has = (prev.weekdays || []).includes(day)
      const weekdays = has
        ? prev.weekdays.filter((item) => item !== day)
        : [...(prev.weekdays || []), day].sort((a, b) => a - b)
      return { ...prev, weekdays }
    })
  }

  function cancel() {
    if (existing) goHash('/lamp', { id: existing.id })
    else if (copySource) goHash('/lamp', { id: copySource.id })
    else goHash('/lamps')
  }

  function save() {
    const next = {
      ...draft,
      question: draft.question.trim(),
      short: String(draft.short || '').trim() || shortLabel(draft),
      monthDay: draft.cadence === 'monthly' ? draft.monthDay : '',
      onceOn: draft.cadence === 'once' ? draft.onceOn : '',
      everyN: draft.cadence === 'every_n' ? Number(draft.everyN) || draft.everyN : '',
      everyNAnchor: draft.cadence === 'every_n' ? draft.everyNAnchor : '',
      weekdays: draft.cadence === 'weekly' ? draft.weekdays || [] : [],
      priority,
      notify: notifyOn,
    }
    const problem = missLamp(next)
    if (problem) {
      setMiss(problem)
      return
    }
    const target = bookForTag(boards, book, tagTitle)
    const wasEmpty = (target.lamps || []).filter((item) => !item.archived).length === 0
    if (onSaveTo) onSaveTo(target, next, sourceBook)
    else onChange(commitBook(hangInto(target, next, editing), clock))
    if (editing) goHash('/lamp', { id: next.id })
    else goHash(wasEmpty ? '/tonight' : '/lamps')
  }

  return (
    <Page colors={colors}>
      <Kicker colors={colors}>{editing ? t('hang.edit') : t('hang.new')}</Kicker>

      <Field
        label={t('hang.question')}
        value={draft.question}
        onChangeText={(value) => change('question', value)}
        colors={colors}
        multiline
      />

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.tag')}</Text>
      <View style={styles.weekdayRow}>
        {liveTags.map((item) => {
          const on = item.title === tagTitle
          return (
            <Pressable
              key={item.id}
              onPress={() => setTagTitle(item.title)}
              style={[
                styles.weekdayChip,
                { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.panel3 : colors.panel2 },
              ]}
            >
              <Text style={{ color: on ? colors.on : colors.ink, fontSize: 12 }}>{item.title}</Text>
            </Pressable>
          )
        })}
        <Pressable
          onPress={() => setTagTitle('')}
          style={[
            styles.weekdayChip,
            { borderColor: !knownTag ? colors.onDeep : colors.line, backgroundColor: !knownTag ? colors.panel3 : colors.panel2 },
          ]}
        >
          <Text style={{ color: !knownTag ? colors.on : colors.ink, fontSize: 12 }}>{t('hang.tagNew')}</Text>
        </Pressable>
      </View>
      {parkedTags.length ? (
        <View style={styles.weekdayRow}>
          {parkedTags.map((item) => {
            const on = item.title === tagTitle
            return (
              <Pressable
                key={item.id}
                onPress={() => setTagTitle(item.title)}
                style={[styles.weekdayChip, { borderColor: colors.line, opacity: on ? 1 : 0.7 }]}
              >
                <Text style={{ color: colors.inkDim, fontSize: 12 }}>{item.title}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
      {knownTag ? null : (
        <Field
          label={t('hang.tagNew')}
          value={tagTitle}
          onChangeText={setTagTitle}
          colors={colors}
          placeholder={t('hang.tagPh')}
        />
      )}

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.often')}</Text>
      <ChipRow items={cadenceItems} value={draft.cadence} onPick={(value) => change('cadence', value)} colors={colors} />

      {draft.cadence === 'weekly' ? (
        <View style={styles.weekdays}>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.weekdays')}</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => {
              const on = (draft.weekdays || []).includes(day)
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
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

      {draft.cadence === 'monthly' ? (
        <View>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.monthDay')}</Text>
          <HangMonthCal
            mode="monthly"
            value={draft.monthDay === '' ? '' : draft.monthDay}
            onChange={(day) => change('monthDay', day)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
          <Text style={[styles.fieldHint, { color: colors.inkDim }]}>{t('hang.monthCalHint')}</Text>
        </View>
      ) : null}

      {draft.cadence === 'once' ? (
        <View>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.onceOn')}</Text>
          <HangMonthCal
            mode="date"
            value={draft.onceOn}
            onChange={(iso) => change('onceOn', iso)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
        </View>
      ) : null}

      {draft.cadence === 'every_n' ? (
        <>
          <Field
            label={t('hang.everyNDays')}
            value={String(draft.everyN || '')}
            onChangeText={(value) => change('everyN', value)}
            colors={colors}
            placeholder="3"
          />
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.startingOn')}</Text>
          <HangMonthCal
            mode="date"
            value={draft.everyNAnchor}
            onChange={(iso) => change('everyNAnchor', iso)}
            now={clock}
            dayFoldHour={book.dayFoldHour}
            colors={colors}
          />
        </>
      ) : null}

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.priority')}</Text>
      <ChipRow
        items={PRIORITIES.map((id) => ({ id, label: t(`hang.priority.${id}`) }))}
        value={priority}
        onPick={(value) => change('priority', value)}
        colors={colors}
      />

      <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('hang.notify')}</Text>
      <ChipRow
        items={[
          { id: 'on', label: t('hang.notifyOn') },
          { id: 'off', label: t('hang.notifyOff') },
        ]}
        value={notifyOn ? 'on' : 'off'}
        onPick={(value) => change('notify', value === 'on')}
        colors={colors}
      />

      {more ? (
        <>
          <Field label={t('hang.short')} value={draft.short} onChangeText={(value) => change('short', value)} colors={colors} />
          <HangTimePick value={draft.askAfter} onChange={changeAskAfter} colors={colors} />
          <Field label={t('hang.kind')} value={draft.kind} onChangeText={(value) => change('kind', value)} colors={colors} />
          <Field label={t('hang.notes')} value={draft.notes} onChangeText={(value) => change('notes', value)} colors={colors} multiline />
        </>
      ) : null}

      <KeyButton label={more ? t('hang.less') : t('hang.more')} onPress={() => setMore((open) => !open)} colors={colors} />

      {miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {t(miss)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <DidButton label={editing ? t('hang.save') : t('hang.add')} onPress={save} colors={colors} small />
        <KeyButton label={t('hang.cancel')} onPress={cancel} colors={colors} />
      </View>
    </Page>
  )
}

export function LampScreen({ book, onChange, route }) {
  const { colors, clock, dateIso } = useHall(book)
  const lampId = route?.id || ''
  const lamp = (book.lamps || []).find((item) => item.id === lampId) || null
  const [confirmGone, setConfirmGone] = useState(false)
  const [holePick, setHolePick] = useState(null)
  const stripKeys = lamp ? recentPeriodKeys(lamp, dateIso, 7) : []

  const dueRow = dueTonight(book, clock).find((item) => item.lamp.id === lampId) || null
  const answered = dueRow ? answerFor(book, lampId, dueRow.periodKey) : null

  function change(next) {
    onChange(commitBook(next, clock))
  }

  if (!lamp) {
    return (
      <Page colors={colors}>
        <Kicker colors={colors}>{t('lamp.missing')}</Kicker>
        <Title colors={colors}>{t('lamp.gone')}</Title>
        <DidButton label={t('nav.questions')} onPress={() => goHash('/lamps')} colors={colors} small />
      </Page>
    )
  }

  if (holePick) {
    const wasSkip = answerFor(book, holePick.id, holePick.key)?.status === 'skip'
    return (
      <Page colors={colors}>
        <Kicker colors={colors}>{wasSkip ? t('hole.nopeKicker') : t('hole.kicker')}</Kicker>
        <Title colors={colors}>{holePick.question}</Title>
        <View style={styles.actions}>
          <DidButton
            label={t('hole.late')}
            colors={colors}
            small
            onPress={() => {
              change(putAnswer(book, { lamp: holePick, periodKey: holePick.key }, 'late', clock))
              setHolePick(null)
            }}
          />
          {!wasSkip ? (
            <KeyButton
              label={t('tonight.swipeNope')}
              colors={colors}
              onPress={() => {
                change(putAnswer(book, { lamp: holePick, periodKey: holePick.key }, 'skip', clock))
                setHolePick(null)
              }}
            />
          ) : null}
          <KeyButton label={t('hole.leave')} colors={colors} onPress={() => setHolePick(null)} />
        </View>
      </Page>
    )
  }

  if (confirmGone) {
    const taps = (book.answers || []).filter((item) => item.lampId === lamp.id).length
    const note =
      taps === 0
        ? t('lamp.deleteNone')
        : taps === 1
          ? t('lamp.deleteOne')
          : t('lamp.deleteSome', { n: taps })
    return (
      <Page colors={colors}>
        <Kicker colors={colors}>{t('lamp.delete')}</Kicker>
        <Title colors={colors}>{t('lamp.deleteTitle')}</Title>
        <Meta colors={colors}>{note}</Meta>
        <View style={styles.actions}>
          <DidButton
            label={t('lamp.delete')}
            onPress={() => {
              change(takeDown(book, lamp))
              goHash('/lamps')
            }}
            colors={colors}
            small
          />
          <KeyButton label={t('lamp.keep')} onPress={() => setConfirmGone(false)} colors={colors} />
        </View>
      </Page>
    )
  }

  return (
    <Page colors={colors}>
      <Text style={[styles.mastDate, { color: colors.inkDim }]}>{formatBoardDate(dateIso)}</Text>
      <Kicker colors={colors}>{t('lamp.kicker')}</Kicker>
      <Title colors={colors}>{lamp.question}</Title>
      <Meta colors={colors}>
        {[cadenceLine(lamp), lamp.archived ? t('lamp.paused') : ''].filter(Boolean).join(' · ')}
      </Meta>
      {lamp.notes ? <Meta colors={colors}>{lamp.notes}</Meta> : null}

      <NightStrip
        book={book}
        lamp={lamp}
        keys={stripKeys}
        colors={colors}
        onPickHole={(picked, key) => setHolePick({ ...picked, key, question: picked.question })}
      />

      {dueRow ? (
        <View style={styles.tonight}>
          <Text style={[styles.fieldCap, { color: colors.inkSoft }]}>{t('tonight.didI')}</Text>
          <View style={styles.tonightRow}>
            <DidButton
              label={t('tonight.swipeDid')}
              onPress={() => change(putAnswer(book, dueRow, 'yes', clock))}
              colors={colors}
              small
              disabled={answered?.status === 'yes' || answered?.status === 'late'}
            />
            <KeyButton
              label={t('tonight.swipeNope')}
              onPress={() => change(putAnswer(book, dueRow, 'skip', clock))}
              colors={colors}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <DidButton label={t('lamp.edit')} onPress={() => goHash('/hang', { id: lamp.id })} colors={colors} small />
        <KeyButton label={t('lamp.copy')} onPress={() => goHash('/hang', { copy: lamp.id })} colors={colors} />
        <KeyButton label={t('lamp.done')} onPress={() => goHash('/lamps')} colors={colors} />
      </View>

      <View style={styles.more}>
        <Pressable onPress={() => change(toggleArchive(book, lamp))}>
          <Text style={[styles.textBtn, { color: colors.inkSoft }]}>
            {lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
          </Text>
        </Pressable>
        <Pressable onPress={() => setConfirmGone(true)}>
          <Text style={[styles.textBtn, { color: colors.miss }]}>{t('lamp.delete')}</Text>
        </Pressable>
      </View>
    </Page>
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
  weekdays: { gap: 6 },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
