import { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BoardShell } from '../components/BoardShell.jsx'
import { HangCard } from '../components/HangCard.jsx'
import { HangFold } from '../components/HangFold.jsx'
import { SetCap, SetCard, SetRow, SetSheet, SetSwitch } from '../components/SetBits.jsx'
import { Reveal } from '../lib/motion.jsx'
import { PickSheet } from '../components/PickSheet.jsx'
import { ScheduleTile, ScheduleTiles } from '../components/ScheduleTile.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { clockWords } from '../../src/lib/hall-pages.js'
import { Pill, TopicPick, useAddFeel } from './questions.jsx'
import { useLeaveAsk } from '../hooks/useLeaveAsk.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { shelfTopics } from '../../src/lib/board-json.js'
import { useAccount } from '../../src/lib/account.js'
import {
  WE_GOALS,
  weAsk,
  weBest,
  weEdit,
  weFile,
  weGoal,
  weKnownPeople,
  weLeave,
  weClose,
  weNotTonightLine,
  weMake,
  noteAsked,
  reportWe,
  weMine,
  weMonth,
  weEarly,
  weSlotLocked,
  weNextNight,
  weNudge,
  weQuestion,
  weStreak,
  takeWeScheduleNote,
  weCardKept,
  weTonight,
  weWaiting,
  useWeTonight,
} from '../../src/lib/did-we.js'
import { MenuIcon } from '../components/MenuIcon.jsx'
import { readPrefs } from '../../src/lib/prefs.js'
import { showToast } from '../lib/toast-queue.js'
import { SwipeCardHost } from '../components/SwipeCardHost.jsx'
import { SwipeFlyHost } from '../components/SwipeFly.jsx'
import { t, tMiss } from '../../src/lib/i18n.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { WeAsks, WeFaces, useWeAnswer, weDoneStyle, weStatusLine, whenValue, weWhenWords } from '../components/WeTonight.jsx'
import { weDot, weRuleKey, weModeKey, weSlotDay, weWeekDots, weWeekKey } from '../../src/lib/we-look.js'
import { boardDate, formatBoardDate, graceNightIso } from '../../src/lib/recurrence.js'
import { AppTextInput, DidButton, Field, KeyButton, LateMeta, Meta, OfflineLine } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { KEEP, useKept } from '../hooks/useKept.js'
import { goHash, swapHash } from '../navigation/hash.js'
import { useOnline } from '../hooks/useOnline.js'
import { fonts } from '../theme.js'
import { ScreenShell } from './more.jsx'
import { useWeCheer } from '../../src/lib/we-cheer.js'
import { WeNotes } from '../components/WeNotes.jsx'
import { endWeLinks, makeWeLink, myWeLink, sharedDidYouLine } from '../../src/lib/did-you-links.js'
import { passAlong } from '../../src/lib/native.js'
import { confirmDone, confirmMiss, once } from '../lib/confirm.js'
import { readAmount, togetherLine, weMyWeek, wePutAmount, weTrackAmount, weWeekTotals } from '../../src/lib/social-amounts.js'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

// Friends and family to pick from: last launch's list first, then fresh.
export function usePeople() {
  const account = useAccount()
  const [people, setPeople] = useKept(`we.people:${account.user?.id}`, null, KEEP)
  useEffect(() => {
    let alive = true
    weKnownPeople().then((rows) => {
      if (alive) setPeople(rows)
    })
    return () => {
      alive = false
    }
  }, [account.user?.id])
  return people
}

// Pick people: friends and family only. Tapping a name toggles it.
function PeoplePick({ people, picked, onPick, colors, skip = [] }) {
  const online = useOnline()
  if (people === null) return <Meta colors={colors}>{t('we.loadingPeople')}</Meta>
  const open = people.filter((p) => !skip.includes(p.id))
  if (!open.length && !online) return <Meta colors={colors}>{t('people.offline')}</Meta>
  if (!open.length) {
    return (
      <View style={styles.gap}>
        <Meta colors={colors}>{t('we.noPeople')}</Meta>
        <KeyButton colors={colors} label={t('we.findPeople')} onPress={() => goHash('/people')} />
      </View>
    )
  }
  return (
    <View style={styles.chips}>
      {open.map((p) => {
        const on = picked.includes(p.id)
        return (
          <Pressable
            key={p.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={t('we.pickName', { name: p.name })}
            onPress={() => onPick(on ? picked.filter((id) => id !== p.id) : [...picked, p.id])}
            style={[styles.chip, { borderColor: on ? colors.onDeep : colors.line }]}
          >
            <Text style={{ color: on ? colors.on : colors.ink }}>{p.name}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// The rules of a card. Shared by making one and the owner editing one.
// The rules of a card as the same folding rows the Add screen uses. Shared
// by making one and the owner changing one.
// Your own folder and topics for a card, the same rows as the Add screen.
// Shelf folders and topics are yours; the other people never see them.
function FilingFolds({ folder, topics, onFolder, onTopics, open, fold, last, colors }) {
  const shelf = readShelf().boards.filter((book) => !book.archived)
  const titles = [...new Set(shelf.map((book) => String(book.title || '').trim()).filter(Boolean))]
  const known = titles.some((title) => title.toLowerCase() === String(folder || '').trim().toLowerCase())
  const [typing, setTyping] = useState(false)
  return (
    <>
      <HangFold
        label={t('hang.tag')}
        value={String(folder || '').trim() || t('we.noFolder')}
        icon="folder"
        open={open === 'folder'}
        onToggle={() => fold('folder')}
        colors={colors}
      >
        <Text style={[styles.hint, { color: colors.inkSoft }]}>{t('we.folderHint')}</Text>
        <View style={styles.pillRow} accessibilityRole="radiogroup" accessibilityLabel={t('hang.tag')}>
          <Pill label={t('we.noFolder')} on={!folder && !typing} onPress={() => { setTyping(false); onFolder('') }} colors={colors} radio />
          {titles.map((title) => (
            <Pill
              key={title}
              label={title}
              on={String(folder || '').toLowerCase() === title.toLowerCase()}
              onPress={() => {
                setTyping(false)
                onFolder(title)
              }}
              colors={colors}
              radio
            />
          ))}
          <Pill label={`+ ${t('hang.tagNew')}`} on={typing || (Boolean(folder) && !known)} onPress={() => { setTyping(true); onFolder('') }} colors={colors} />
        </View>
        {typing || (folder && !known) ? (
          <AppTextInput
            colors={colors}
            value={folder || ''}
            onChangeText={onFolder}
            placeholder={t('hang.tagPh')}
            maxLength={60}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            blurOnSubmit
            accessibilityLabel={t('hang.tagNew')}
            style={[styles.lineInput, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg }]}
          />
        ) : null}
      </HangFold>
      <HangFold
        label={t('hang.kind')}
        value={String(topics || '').trim() || t('hang.detailsNone')}
        icon="tag"
        open={open === 'topics'}
        onToggle={() => fold('topics')}
        last={last}
        colors={colors}
      >
        <TopicPick value={topics || ''} known={shelfTopics(shelf)} onChange={onTopics} colors={colors} />
      </HangFold>
    </>
  )
}

// Each rule row on its own, so the new form and the edit form can lay them out differently.
function ruleParts({ draft, setDraft, open, fold, colors }) {
  const set = (key) => (value) => setDraft({ ...draft, [key]: value })
  return {
    mode: (last) => (
          <HangFold
            label={t('we.howDone')}
            value={t(`we.mode.${draft.mode}`)}
            icon="filter"
            open={open === 'mode'}
            onToggle={() => fold('mode')}
            colors={colors}
          >
            <View style={styles.pillRow}>
              {['all', 'any', 'most', 'turns'].map((id) => (
                <Pill key={id} label={t(`we.mode.${id}`)} on={draft.mode === id} onPress={() => set('mode')(id)} colors={colors} radio />
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.inkDim }]}>{t(weModeKey(draft, 'we.modeNote', draft.mode))}</Text>
          </HangFold>
    ),
    shows: (last) => (
          <HangFold
            label={t('we.whatShows')}
            value={t(`we.shows.${draft.shows}`)}
            icon="eye"
            open={open === 'shows'}
            onToggle={() => fold('shows')}
            colors={colors}
          >
            <View style={styles.pillRow}>
              {['waiting', 'all', 'count'].map((id) => (
                <Pill key={id} label={t(`we.shows.${id}`)} on={draft.shows === id} onPress={() => set('shows')(id)} colors={colors} radio />
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.inkDim }]}>{t(`we.showsNote.${draft.shows}`)}</Text>
          </HangFold>
    ),
    when: (last) => (
          <HangFold
            label={t('we.when')}
            value={whenValue(draft)}
            icon="calendar"
            open={open === 'when'}
            onToggle={() => fold('when')}
            colors={colors}
          >
            <ScheduleTiles label={t('we.when')}>
              <ScheduleTile label={t('we.daily')} sub={t('hang.tileSub.daily')} accent={colors.we} on={draft.cadence === 'daily'} onPress={() => set('cadence')('daily')} colors={colors} />
              <ScheduleTile label={t('we.someDays')} sub={t('hang.tileSub.weekly')} accent={colors.we} on={draft.cadence === 'weekly'} onPress={() => set('cadence')('weekly')} colors={colors} />
              <ScheduleTile label={t('we.monthly')} sub={t('we.monthlySub')} accent={colors.we} on={draft.cadence === 'monthly'} onPress={() => set('cadence')('monthly')} colors={colors} />
            </ScheduleTiles>
            {draft.cadence === 'weekly' ? (
              <View style={styles.pillRow}>
                {DAYS.map((day) => {
                  const on = draft.weekdays.includes(day)
                  return (
                    <Pill
                      key={day}
                      label={t(`we.day.${day}`)}
                      on={on}
                      onPress={() =>
                        set('weekdays')(on ? draft.weekdays.filter((d) => d !== day) : [...draft.weekdays, day].sort())
                      }
                      colors={colors}
                    />
                  )
                })}
              </View>
            ) : null}
          </HangFold>
    ),
    goal: (last) => (
          <HangFold
            label={t('we.challenge')}
            value={draft.goal ? t('we.nights', { n: draft.goal }) : t('we.noEnd')}
            icon="flag"
            open={open === 'goal'}
            onToggle={() => fold('goal')}
            last={last}
            colors={colors}
          >
            <View style={styles.pillRow}>
              <Pill label={t('we.noEnd')} on={!draft.goal} onPress={() => set('goal')(null)} colors={colors} radio />
              {WE_GOALS.map((n) => (
                <Pill key={n} label={t('we.nights', { n })} on={draft.goal === n} onPress={() => set('goal')(n)} colors={colors} radio />
              ))}
            </View>
          </HangFold>
    ),
    time: (last) => (
          <HangFold
            label={t('hang.timeRow')}
            value={draft.askAfter ? clockWords(draft.askAfter) : t('hang.askAny')}
            icon="clock"
            open={open === 'time'}
            onToggle={() => fold('time')}
            colors={colors}
          >
            <HangTimePick value={draft.askAfter} onChange={set('askAfter')} colors={colors} />
            <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.timeHint')}</Text>
          </HangFold>
    ),
    remind: (last) => (
          <SetSwitch
            label={t('hang.reminder')}
            sub={
              draft.remind === false
                ? t('hang.remindOff')
                : draft.askAfter
                  ? t('hang.remindAt', { time: clockWords(draft.askAfter) })
                  : t('we.remindNeedsTime')
            }
            icon="bell"
            last={last}
            on={draft.remind !== false}
            onPress={() => set('remind')(draft.remind === false)}
            colors={colors}
          />
    ),
    details: (last) => (
          <HangFold
            label={t('hang.details')}
            value={String(draft.note || '').trim() || t('hang.detailsNone')}
            icon="note"
            open={open === 'details'}
            onToggle={() => fold('details')}
            last={last}
            colors={colors}
          >
            <Text style={[styles.hint, { color: colors.inkSoft }]}>{t('hang.notes')}</Text>
            <AppTextInput
              colors={colors}
              value={draft.note || ''}
              onChangeText={set('note')}
              placeholder={t('we.notePh')}
              multiline
              maxLength={300}
              accessibilityLabel={t('hang.notes')}
              style={[styles.noteInput, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg }]}
            />
          </HangFold>
    ),
  }
}

// The two bottom sheets every Did we form shares: When, and How it counts.
function WeSheets({ draft, setDraft, sheet, setSheet, colors }) {
  const [open, setOpen] = useState('')
  const part = ruleParts({ draft, setDraft, open, fold: (id) => setOpen((now) => (now === id ? '' : id)), colors })
  const set = (key) => (value) => setDraft((was) => ({ ...was, [key]: value }))
  return (
    <>
      <PickSheet open={sheet === 'when'} title={t('hang.whenAsk')} onClose={() => setSheet('')} colors={colors}>
        <View style={styles.countsBody}>
          <ScheduleTiles label={t('we.when')}>
            <ScheduleTile label={t('we.daily')} sub={t('hang.tileSub.daily')} accent={colors.we} on={draft.cadence === 'daily'} onPress={() => set('cadence')('daily')} colors={colors} />
            <ScheduleTile label={t('we.someDays')} sub={t('hang.tileSub.weekly')} accent={colors.we} on={draft.cadence === 'weekly'} onPress={() => set('cadence')('weekly')} colors={colors} />
            <ScheduleTile label={t('we.monthly')} sub={t('we.monthlySub')} accent={colors.we} on={draft.cadence === 'monthly'} onPress={() => set('cadence')('monthly')} colors={colors} />
          </ScheduleTiles>
          {draft.cadence === 'weekly' ? (
<Reveal>
            <View style={styles.pillRow}>
              {DAYS.map((day) => {
                const on = draft.weekdays.includes(day)
                return (
                  <Pill
                    key={day}
                    label={t(`we.day.${day}`)}
                    on={on}
                    onPress={() => set('weekdays')(on ? draft.weekdays.filter((d) => d !== day) : [...draft.weekdays, day].sort())}
                    colors={colors}
                  />
                )
              })}
            </View>
          </Reveal>
) : null}
        </View>
        <SetCard colors={colors}>
          {part.time(false)}
          {part.remind(true)}
        </SetCard>
      </PickSheet>
      <PickSheet open={sheet === 'counts'} title={t('we.secRules')} onClose={() => setSheet('')} colors={colors}>
        <View style={styles.countsBody}>
          <Text style={[styles.hint, { color: colors.inkSoft }]}>{t('we.howDone')}</Text>
          <ScheduleTiles label={t('we.howDone')}>
            {['all', 'any', 'most', 'turns'].map((id) => (
              <ScheduleTile key={id} accent={colors.we} label={t(`we.mode.${id}`)} on={draft.mode === id} onPress={() => set('mode')(id)} colors={colors} />
            ))}
          </ScheduleTiles>
          <Text style={[styles.hint, { color: colors.inkDim }]}>{t(weModeKey(draft, 'we.modeNote', draft.mode))}</Text>
          <Text style={[styles.hint, { color: colors.inkSoft }]}>{t('we.whatShows')}</Text>
          <View style={styles.pillRow}>
            {['waiting', 'all', 'count'].map((id) => (
              <Pill key={id} label={t(`we.shows.${id}`)} on={draft.shows === id} onPress={() => set('shows')(id)} colors={colors} radio />
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.inkDim }]}>{t(`we.showsNote.${draft.shows}`)}</Text>
        </View>
      </PickSheet>
    </>
  )
}

function CountsRow({ draft, onPress, colors }) {
  return <SetRow colors={colors} icon="filter" label={t('we.secRules')} value={t(`we.mode.${draft.mode}`)} chevron onPress={onPress} />
}

// The owner changing a card: the same card, line and sheets as a new one.
function RulesForm({ draft, setDraft, colors }) {
  const [open, setOpen] = useState('')
  const [sheet, setSheet] = useState('')
  const lead = t('we.title')
  const blank = String(draft.question || '').replace(/^did we\s*/i, '')
  const part = ruleParts({ draft, setDraft, open, fold: (id) => setOpen((now) => (now === id ? '' : id)), colors })
  return (
    <>
      <HangCard
        tag={t('we.title')}
        leadText={lead}
        blank={blank}
        onBlank={(value) => setDraft({ ...draft, question: `${lead} ${value}` })}
        leadColor={colors.we}
        placeholder={t('we.blankHint')}
        meta={weWhenWords(draft)}
        metaAction={{ label: t('checkOn.change'), a11y: `${t('we.when')}: ${weWhenWords(draft)}`, onPress: () => setSheet('when') }}
        focused={false}
        onFocus={() => setOpen('')}
        colors={colors}
      />
      <View style={styles.settings}>
        <SetCard colors={colors}>
          <CountsRow draft={draft} onPress={() => setSheet('counts')} colors={colors} />
          {part.goal(false)}
          {part.details(true)}
        </SetCard>
      </View>
      <WeSheets draft={draft} setDraft={setDraft} sheet={sheet} setSheet={setSheet} colors={colors} />
    </>
  )
}
const BLANK = {
  question: '',
  mode: 'all',
  shows: 'waiting',
  cadence: 'daily',
  weekdays: [],
  goal: null,
  askAfter: '',
  remind: true,
  note: '',
  folder: '',
  topics: '',
}

function NeedAccount({ book, colors, onBackToI }) {
  return (
    <ScreenShell book={book} title={t('we.title')} colors={colors}>
      <Meta colors={colors}>{t('we.needAccount')}</Meta>
      <DidButton colors={colors} label={t('we.signIn')} onPress={() => goHash('/account')} />
      {onBackToI ? <Pill label={t('lead.backToI')} onPress={onBackToI} colors={colors} /> : null}
    </ScreenShell>
  )
}

export function WeNewScreen({ book, start = '', withId = '', onBlankChange, onLeadPress, onBackToI }) {
  const account = useAccount()
  const colors = useHallColors(book)
  if (account.ready && !account.user) return <NeedAccount book={book} colors={colors} onBackToI={onBackToI} />
  return (
    <WeNewForm book={book} start={start} withId={withId} onBlankChange={onBlankChange} onLeadPress={onLeadPress} />
  )
}

// Laid out like the Add screen: the card it becomes, "Did we" fixed and the
// rest to finish, then folding rows for who and the rules. start fills the
// blank from an idea; withId picks a person, from their card on People.
function WeNewForm({ book, start = '', withId = '', onBlankChange, onLeadPress }) {
  const colors = useHallColors(book)
  const people = usePeople()
  const inputRef = useRef(null)
  const [draft, setDraft] = useState(BLANK)
  const [blank, setBlank] = useState(start)
  const [picked, setPicked] = useState(withId ? [withId] : [])
  const [open, setOpen] = useState('')
  const [focused, setFocused] = useState(false)
  const [shake, setShake] = useState(0)
  const feel = useAddFeel(book, inputRef)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  // Track an amount, the same switch as the card's more menu; saved once the card exists.
  const [track, setTrack] = useState(false)
  const [more, setMore] = useState(false)
  const [sheet, setSheet] = useState('')
  const part = ruleParts({ draft, setDraft, open, fold, colors })
  const [unit, setUnit] = useState('')
  const lead = t('we.title')
  const question = blank.trim() ? `${lead} ${blank.trim()}` : ''
  const names = (people || []).filter((p) => picked.includes(p.id)).map((p) => p.name)
  const ready = Boolean(question) && picked.length > 0 && !busy
  const leave = useLeaveAsk((blank.trim() !== start.trim() || Boolean(draft.note.trim())) && !feel.stamp, colors, '/we')

  function fold(id) {
    feel.ease()
    setOpen((now) => (now === id ? '' : id))
    Keyboard.dismiss()
  }

  // share: make it, then share a did-i.app link by text. Nobody needs to be
  // picked, so it works for people who are not friends yet.
  async function make(share = false) {
    if (feel.stamp) return
    if (!question) {
      feel.buzz()
      setMiss(t('we.missBlank'))
      setShake((n) => n + 1)
      inputRef.current?.focus()
      return
    }
    if (!picked.length && !share) {
      feel.buzz()
      setMiss(t('we.missNobody'))
      if (open !== 'who') fold('who')
      return
    }
    if (draft.cadence === 'weekly' && !draft.weekdays.length) {
      feel.buzz()
      setMiss(t('we.missDays'))
      setSheet('when')
      return
    }
    Keyboard.dismiss()
    setBusy(true)
    const out = await weMake({ ...draft, question, ask: picked, alone: share }).catch(() => ({ miss: 'people.reach' }))
    if (out.miss && !out.id) {
      setBusy(false)
      feel.buzz()
      setMiss(tMiss(out.miss))
      return
    }
    // Made, but the time, note or folder did not save.
    if (out.miss) confirmMiss(tMiss(out.miss))
    if (track) {
      const tracked = await weTrackAmount(out.id, true, unit.trim())
      if (tracked.miss) confirmMiss(t('weAmount.trackLater'))
    }
    if (share) {
      const link = await makeWeLink(out.id)
      if (link.code) await passAlong(sharedDidYouLine(question, link.code), t('weLink.share'))
      // This screen is about to go; the miss has to outlive it.
      else confirmMiss(t(link.miss === 'linkCap' ? 'didYouLink.cap' : 'weLink.shareLater'))
    }
    setBusy(false)
    if (picked.length) {
      noteAsked(picked)
      const who = names.length === 1 ? t('confirm.askedOne', { name: names[0] }) : t('confirm.askedMany', { n: picked.length })
      confirmDone(`${who} ${t('confirm.weStartsOnYes')}`)
    }
    justMade = out.id
    feel.land(t('lead.sent'), () => swapHash('/we', { id: out.id }))
  }

  return (
    <BoardShell
      book={book}
      title={t('we.newTitle')}
      noTitle
      date={feel.date}
      colors={colors}
      back={false}
      leftAction={{ label: t('hang.cancel'), onPress: leave }}
      rightAction={{ label: t('we.sendShort'), onPress: () => once('we-make', () => make(false)), disabled: !question || busy }}
    >
      <HangCard
        ref={inputRef}
        tag={t('we.title')}
        leadText={lead}
        blank={blank}
        onBlank={(value) => {
          setBlank(value)
          onBlankChange?.(value)
        }}
        onLeadPress={onLeadPress}
        onSubmit={() => once('we-make', () => make(false))}
        leadColor={colors.we}
        placeholder={t('we.blankHint')}
        meta={weWhenWords(draft)}
        metaAction={{ label: t('checkOn.change'), a11y: `${t('we.when')}: ${weWhenWords(draft)}`, onPress: () => setSheet('when') }}
        wave={feel.wave}
        stamp={feel.stamp}
        shake={shake}
        focused={focused}
        onFocus={() => {
          setFocused(true)
          setOpen('')
        }}
        onBlur={() => setFocused(false)}
        autoFocus={false}
        colors={colors}
      />

      <View style={styles.settings}>
        <SetCard colors={colors}>
          <HangFold
            label={t('we.people')}
            value={names.length ? names.join(', ') : t('we.nobody')}
            icon="people"
            open={open === 'who'}
            onToggle={() => fold('who')}
            colors={colors}
          >
            {people === null ? (
              <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.loadingPeople')}</Text>
            ) : people.length ? (
              <View style={styles.pillRow}>
                {people.map((p) => {
                  const on = picked.includes(p.id)
                  return (
                    <Pill
                      key={p.id}
                      label={p.name}
                      on={on}
                      onPress={() => setPicked(on ? picked.filter((id) => id !== p.id) : [...picked, p.id])}
                      colors={colors}
                    />
                  )
                })}
              </View>
            ) : (
              <>
                <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.noPeople')}</Text>
                <Pill label={t('people.addOne')} onPress={() => goHash('/people/connect')} colors={colors} />
              </>
            )}
          </HangFold>
          <CountsRow draft={draft} onPress={() => setSheet('counts')} colors={colors} />

          <SetRow
            colors={colors}
            icon="note"
            label={more ? t('hang.less') : t('hang.more')}
            chevron={!more}
            plain
            last
            onPress={() => {
              feel.ease()
              setMore((was) => !was)
            }}
          />
        </SetCard>

        {more ? (
          <Reveal>
            <View style={styles.moreGap} />
            <SetCard colors={colors}>
              {part.goal(false)}
              <FilingFolds
                folder={draft.folder}
                topics={draft.topics}
                onFolder={(folder) => setDraft((was) => ({ ...was, folder }))}
                onTopics={(topics) => setDraft((was) => ({ ...was, topics }))}
                open={open}
                fold={fold}
                colors={colors}
              />
              {part.details(false)}
              <SetSwitch
                label={t('weAmount.track')}
                sub={t('weAmount.trackSub')}
                last
                on={track}
                onPress={() => setTrack((on) => !on)}
                colors={colors}
              />
            </SetCard>
            {track ? (
              <Field
                colors={colors}
                label={t('weAmount.unit')}
                value={unit}
                onChangeText={setUnit}
                placeholder={t('weAmount.unitPh')}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            ) : null}
          </Reveal>
        ) : null}
      </View>
      <WeSheets draft={draft} setDraft={setDraft} sheet={sheet} setSheet={setSheet} colors={colors} />
      <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.newLead')}</Text>
      {/* The main send, so the link button is never the only one in reach. */}
      <DidButton colors={colors} label={t('we.make')} disabled={!ready} onPress={() => once('we-make', () => make(false))} />
      <KeyButton colors={colors} label={t('weLink.makeShare')} disabled={busy || !question} onPress={() => once('we-make', () => make(true))} />
      <Text style={[styles.hint, { color: colors.inkDim }]}>{t('weLink.hint')}</Text>
      {miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {miss}
        </Text>
      ) : null}
    </BoardShell>
  )
}

// The rarely used and destructive actions, behind the card's ⋯ button.
// "By Nov 30", and the days left once it is the last week of the month.
function monthlyLine(card) {
  const left = Math.round((Date.parse(card.periodEnd) - Date.parse(boardDate())) / 86400000)
  if (left === 0 || (left > 0 && left <= 6)) return left === 0 ? t('we.dayLeft') : t('we.daysLeft', { n: left + 1 })
  return t('we.byDate', { date: formatBoardDate(card.periodEnd) })
}

function WeMenu({ title, items, colors, onClose }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.cap, styles.tight, { color: colors.on }]} numberOfLines={2}>{title}</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => {
                onClose()
                item.onPress()
              }}
              style={({ pressed }) => [
                styles.menuRow,
                { borderColor: colors.lineSoft, backgroundColor: pressed ? colors.panel2 : 'transparent' },
              ]}
            >
              <Text style={[styles.menuRowText, { color: item.danger ? colors.miss : colors.ink }]}>{item.label}</Text>
            </Pressable>
          ))}
          <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// A Did we does nothing alone, so the card you just made opens on sharing.
let justMade = ''

// One box and Save, in a sheet: the amount unit (maker) or tonight's amount.
function AmountBox({ label, initial = '', placeholder = '', decimal = false, maxLength = 24, colors, onSave }) {
  const [draft, setDraft] = useState(initial)
  const save = () => onSave(draft)
  return (
    <View style={styles.amountBox}>
      <Field
        colors={colors}
        label={label}
        value={draft}
        onChangeText={(value) => setDraft(decimal ? value.replace(/[^\d.,]/g, '').slice(0, 9) : value)}
        placeholder={placeholder}
        keyboardType={decimal ? 'decimal-pad' : 'default'}
        maxLength={maxLength}
        autoFocus
        onSubmitEditing={save}
      />
      <View style={styles.acts}>
        <DidButton small colors={colors} label={t('we.save')} onPress={save} />
        <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => publishSheet(null)} />
      </View>
    </View>
  )
}

function openAmountBox({ title, colors, ...rest }) {
  publishSheet({
    title,
    colors,
    closeLabel: t('settings.neverMind'),
    onClose: () => publishSheet(null),
    noClose: true,
    content: <AmountBox colors={colors} {...rest} />,
  })
}

// The last 7 nights: done together on top, your own answer below. Others'
// past answers stay private (RLS), so only what the group already sees.
function WeWeek({ card, colors }) {
  const night = boardDate()
  const [mine, setMine] = useState(() => new Map())
  const [weekMiss, setWeekMiss] = useState(false)
  const [again, setAgain] = useState(0)
  useEffect(() => {
    let alive = true
    weMyWeek(card.id, night)
      .then((map) => {
        if (!alive) return
        setWeekMiss(false)
        setMine(map)
      })
      .catch(() => {
        if (alive) setWeekMiss(true)
      })
    return () => {
      alive = false
    }
  }, [card.id, night, weMine(card)?.status, again])
  const monthly = card.cadence === 'monthly'
  const days = monthly
    ? [{ night: card.periodEnd || night, together: !!card.done, mine: weDot(weMine(card)) }]
    : weWeekDots(card, night, mine)
  const locale = readPrefs().locale
  const tint = colors.we || colors.on
  const fill = (on) => (on ? { backgroundColor: tint, borderColor: tint } : { backgroundColor: 'transparent', borderColor: colors.line })
  return (
    <View style={styles.factLine}>
      <Cap colors={colors}>{monthly ? new Date(`${days[0].night}T12:00:00`).toLocaleDateString(locale, { month: 'long' }) : t('we.lastWeek')}</Cap>
      <View style={styles.week}>
        {days.map((day) => (
          <View
            key={day.night}
            style={styles.weekDay}
            accessible
            accessibilityLabel={[formatBoardDate(day.night), day.together ? t('we.doneTogether') : '', t(`we.dot.${day.mine}`)].filter(Boolean).join(', ')}
          >
            <Text style={[styles.weekWord, { color: colors.inkDim }]} numberOfLines={1}>
              {monthly ? '' : new Date(`${day.night}T12:00:00`).toLocaleDateString(locale, { weekday: 'narrow' })}
            </Text>
            <View style={[styles.weekDot, fill(day.together)]} />
            <View
              style={[
                styles.weekDot,
                day.mine === 'did' ? fill(true) : day.mine === 'notYet' ? { borderColor: tint } : fill(false),
              ]}
            />
          </View>
        ))}
      </View>
      <Meta colors={colors}>{t('we.weekKey')}</Meta>
      {weekMiss ? (
        <>
          <Text style={[styles.miss, { color: colors.miss }]}>{t('we.loadMiss')}</Text>
          <KeyButton colors={colors} label={t('gift.retry')} onPress={() => setAgain((n) => n + 1)} />
        </>
      ) : null}
    </View>
  )
}

export function WeCardScreen({ book, cardId, onChange }) {
  const account = useAccount()
  const colors = useHallColors(book)
  if (account.ready && !account.user) return <NeedAccount book={book} colors={colors} />
  return <WeCardPage book={book} cardId={cardId} onChange={onChange} />
}

function WeCardPage({ book, cardId, onChange }) {
  const colors = useHallColors(book)
  const uid = useAccount().user?.id
  const cheer = useWeCheer(book, onChange)
  const people = usePeople()
  const [card, setCard] = useState(() => weCardKept(cardId))
  const [edit, setEdit] = useState(null)
  const [asking, setAsking] = useState([])
  const [pickOpen, setPickOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  // Your link for this card while it works, so you can turn it off.
  const [link, setLink] = useState('')
  const [linkSaid, setLinkSaid] = useState('')
  const [linkMiss, setLinkMiss] = useState(false)
  const [linkTry, setLinkTry] = useState(0)
  const [fresh] = useState(() => justMade === cardId)
  useEffect(() => {
    if (justMade === cardId) justMade = ''
  }, [cardId])
  useEffect(() => {
    let alive = true
    myWeLink(cardId)
      .then((code) => {
        if (!alive) return
        setLinkMiss(false)
        setLink(code)
      })
      .catch(() => {
        if (alive) setLinkMiss(true)
      })
    return () => {
      alive = false
    }
  }, [cardId, linkTry])
  const [miss, setMissText] = useState('')
  // A miss also toasts: the line at the bottom is often off screen.
  const setMiss = (text) => {
    setMissText(text)
    if (text) confirmMiss(text)
  }
  const ans = useWeAnswer(() => load(), book)
  // Not asked tonight: its next asked night can be answered early.
  // Both kept per card, so they are on the page as it opens, not one after
  // the other as their reads land (each one moved the page).
  const [early, setEarly] = useKept(`we.early:${uid}:${cardId}`, null, KEEP)
  // This week's combined amount, when the card tracks one. Missing: not tracked.
  const [sum, setSum] = useKept(`we.sum:${uid}:${cardId}`, null, KEEP)

  async function load() {
    const out = await weTonight()
    // A failed read keeps the card we show and says so. Nothing shown yet:
    // show the miss view, not loading forever.
    if (out.miss) {
      setCard((shown) => (shown === undefined ? null : shown))
      return setMiss(tMiss(out.miss))
    }
    setMiss('')
    const found = out.cards.find((c) => c.id === cardId) || null
    setCard(found)
    // The total and the early card read at the same time.
    const night = found && weEarly(found) && found.myState === 'in' ? weNextNight(found) : ''
    const totals = found?.myState === 'in' ? weWeekTotals([found.id], undefined, found.slot || undefined) : null
    const laterAsk = night ? weTonight(night) : null
    if (totals) {
      totals.then((res) => {
        if (!res.miss) setSum(res.totals.get(found.id) || null)
      }).catch(() => {})
    }
    if (!night) return setEarly(null)
    const later = await laterAsk
    // A kept card from another day would name the wrong day; this day's stays.
    if (later.miss) return setEarly((was) => (was?.night === night ? was : null))
    const then = later.cards.find((c) => c.id === cardId)
    return setEarly(then ? { night, card: then } : null)
  }

  useEffect(() => {
    load()
  }, [cardId])

  // Someone else changed the schedule: say so once.
  useEffect(() => {
    if (!card?.changedAt) return
    const name = card.changedByName || (card.people || []).find((p) => p.id === card.changedBy)?.name || ''
    if (!name) return
    const [fresh] = takeWeScheduleNote([card], uid)
    if (!fresh) return
    confirmDone(
      fresh.cadence === 'monthly'
        ? t('we.changedToMonthly', { name })
        : t('we.changedTo', { name, schedule: whenValue(fresh) }),
      5200,
    )
  }, [card?.id, card?.changedAt])

  // Your folder and topics for it, saved when you tap Save.
  const [filing, setFiling] = useState({ folder: '', topics: '' })
  const [fileOpen, setFileOpen] = useState('')
  useEffect(() => {
    if (card) setFiling({ folder: card.folder || '', topics: card.topics || '' })
  }, [card?.id, card?.folder, card?.topics])

  if (card === undefined) {
    return (
      <ScreenShell book={book} title={t('we.title')} colors={colors} onRefresh={load}>
        <LateMeta colors={colors}>{t('we.loading')}</LateMeta>
      </ScreenShell>
    )
  }
  if (!card) {
    return (
      <ScreenShell book={book} title={t('we.title')} colors={colors} onRefresh={load}>
        <Meta colors={colors}>{miss || t('we.gone')}</Meta>
        {miss ? <KeyButton colors={colors} label={t('gift.retry')} onPress={load} /> : null}
        <KeyButton colors={colors} label={t('we.backTonight')} onPress={() => goHash('/tonight')} />
      </ScreenShell>
    )
  }

  const streak = weStreak(card)
  const best = weBest(card)
  const month = weMonth(card)
  const lastMonthIso = (() => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })()
  const last = weMonth(card, lastMonthIso, `${lastMonthIso}-31`)
  const goal = weGoal(card)
  const mine = weMine(card)
  const onCard = (card.people || []).map((p) => p.id)

  async function save() {
    setBusy(true)
    // A thrown call must not leave Save off for good.
    const out = await weEdit(card.id, edit).catch(() => ({ miss: 'people.reach' }))
    setBusy(false)
    // Nothing saved: the line in the sheet says so, no toast on top.
    if (out.miss && !out.saved) return setMissText(tMiss(out.miss))
    const before = editFrom(card)
    const changed = Object.keys(before).some((key) => JSON.stringify(before[key]) !== JSON.stringify(edit[key]))
    setEdit(null)
    setMissText(out.miss ? tMiss(out.miss) : '')
    if (changed) {
      const now = Date.now()
      showToast({
        id: 'undo:we-edit',
        kind: 'undo',
        rev: now,
        label: t('confirm.saved'),
        hint: t('we.changeBack'),
        until: now + 8000,
        total: 8000,
        onPress: async () => {
          const back = await weEdit(card.id, before).catch(() => ({ miss: 'people.reach' }))
          if (back.miss) {
            confirmMiss(tMiss(back.miss))
            return load()
          }
          confirmDone(t('confirm.saved'))
          load()
        },
      })
    } else if (out.miss) confirmMiss(tMiss(out.miss))
    else confirmDone(t('confirm.saved'))
    load()
  }

  async function ask() {
    setBusy(true)
    let sent = []
    for (const id of asking) {
      const out = await weAsk(card.id, id).catch(() => ({ miss: 'people.reach' }))
      if (out.miss) {
        setMiss(tMiss(out.miss))
        break
      }
      sent.push(id)
    }
    if (sent.length) {
      const said = (people || []).filter((p) => sent.includes(p.id)).map((p) => p.name)
      confirmDone(said.length === 1 ? t('confirm.askedOne', { name: said[0] }) : t('confirm.askedMany', { n: sent.length }))
    }
    setBusy(false)
    setAsking(asking.filter((id) => !sent.includes(id)))
    load()
  }

  // did-i.app/d/CODE: anyone with it can join for 7 days, friend or not.
  async function shareLink() {
    setLinkSaid('')
    setBusy(true)
    const { code, miss: why } = await makeWeLink(card.id)
    setBusy(false)
    if (why === 'linkCap') return setMiss(t('didYouLink.cap'))
    if (why || !code) return setMiss(tMiss(why || 'people.reach'))
    setMiss('')
    setLink(code)
    const how = await passAlong(sharedDidYouLine(card.question, code), t('weLink.share'))
    if (how === 'copied') setLinkSaid(t('didYouLink.copied'))
    else if (how === 'shared') confirmDone(t('confirm.shared'))
  }

  function endLink() {
    publishSheet({
      title: t('weLink.offTitle'),
      body: t('weLink.offBody'),
      goLabel: t('weLink.off'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const out = await endWeLinks(card.id)
        if (out.miss) return setMiss(tMiss(out.miss))
        setLink('')
        setLinkSaid(t('weLink.isOff'))
      },
    })
  }

  function leave() {
    publishSheet({
      title: t('we.leaveTitle'),
      body: t('we.leaveBody'),
      goLabel: t('we.leave'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const out = await weLeave(card.id)
        if (out.miss) return confirmMiss(tMiss(out.miss))
        confirmDone(t('confirm.weLeft'))
        goHash('/we')
      },
    })
  }

  // The maker ends it for everyone. Past answers stay.
  function close() {
    publishSheet({
      title: t('we.closeTitle'),
      body: t('we.closeBody'),
      goLabel: t('we.close'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const out = await weClose(card.id)
        if (out.miss) return confirmMiss(tMiss(out.miss))
        confirmDone(t('confirm.weClosed'))
        goHash('/we')
      },
    })
  }

  // Filed for Aaron to look at, with the question. Blocking stays on the
  // person's own sheet in Friends and family.
  function report() {
    publishSheet({
      title: t('we.reportTitle'),
      body: t('we.reportBody'),
      goLabel: t('we.report'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const out = await reportWe(card.id)
        if (out.miss) return setMiss(tMiss(out.miss))
        confirmDone(t('confirm.reported'))
        // Reporting blocks them, which takes you off this card.
        return goHash('/we')
      },
    })
  }

  function editFrom(c) {
    return {
      question: c.question,
      mode: c.mode,
      shows: c.shows,
      cadence: c.cadence,
      weekdays: c.weekdays || [],
      goal: c.goal || null,
      askAfter: c.askAfter || '',
      remind: c.remind !== false,
      note: c.note || '',
    }
  }

  function startEdit() {
    setEdit(editFrom(card))
  }

  // The rules and who is on it, kept off the page and shown from the ⋯ menu.
  function openDetails() {
    publishSheet({
      title: t('we.details'),
      colors,
      closeLabel: t('settings.close'),
      onClose: () => publishSheet(null),
      content: (
        <View>
          <Meta colors={colors}>
            {t(weModeKey(card, 'we.modeLine', card.mode))} {t(`we.showsLine.${card.shows}`)}
            {card.askAfter ? ` · ${t('we.fromTime', { time: clockWords(card.askAfter) })}` : ''}
          </Meta>
          {goal ? (
            <Meta colors={colors}>
              {goal.finished ? t(weWeekKey(card, 'we.goalDone'), { goal: goal.goal }) : t(weWeekKey(card, 'we.goalLine'), { n: goal.done, goal: goal.goal })}
            </Meta>
          ) : null}
          <Meta colors={colors}>{t(weWeekKey(card, month.due === 1 ? 'we.thisMonthOne' : 'we.thisMonth'), { n: month.done, due: month.due })}</Meta>
          {last.due ? <Meta colors={colors}>{t(weWeekKey(card, 'we.lastMonth'), { n: last.done, due: last.due })}</Meta> : null}
          {card.shows === 'count' ? <Meta colors={colors}>{t('we.countOnly', { total: card.total })}</Meta> : null}
          <View style={[styles.factLine, { borderColor: colors.lineSoft }]}>
            <Cap colors={colors}>{t('we.people')}</Cap>
            {(card.people || []).map((p) => {
              const open = card.due && !weSlotLocked(card)
              const canNudge = open && !card.done && weWaiting(card).some((w) => w.id === p.id && !w.nudged)
              const canCheer = open && cheer.can && !p.me && p.state === 'in' && p.status === 'did'
              return (
                <View key={p.id} style={styles.personRow}>
                  <View style={styles.personCopy}>
                    <Meta colors={colors}>
                      {p.me ? t('we.you') : p.name}
                      {p.state === 'asked' ? ` · ${t('we.invited')}` : ''}
                      {card.mode === 'turns' && card.turn === p.id ? ` · ${t(weWeekKey(card, 'we.tonightsTurn'), { day: weSlotDay(card, readPrefs().locale) })}` : ''}
                    </Meta>
                  </View>
                  {canNudge ? (
                    <KeyButton
                      colors={colors}
                      label={t('we.nudge', { name: p.name })}
                      disabled={ans.busy === card.id}
                      onPress={async () => {
                        publishSheet(null)
                        const out = await ans.run(card.id, () => weNudge(card.id, p.id))
                        if (!out?.miss) confirmDone(t('confirm.nudged', { name: p.name }))
                      }}
                    />
                  ) : null}
                  {canCheer ? (
                    <KeyButton
                      colors={colors}
                      label={t('we.cheerName', { name: p.name })}
                      disabled={Boolean(cheer.busy)}
                      onPress={() => {
                        publishSheet(null)
                        cheer.cheer(p)
                      }}
                    />
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>
      ),
    })
  }

  // The maker turns the amount on (with a unit) or off. Amounts typed stay.
  function trackAmount() {
    if (sum) {
      return weTrackAmount(card.id, false).then((out) => {
        if (out.miss) return setMiss(tMiss(out.miss))
        setSum(null)
        confirmDone(t('weAmount.stopped'))
      })
    }
    return openAmountBox({
      title: t('weAmount.track'),
      colors,
      label: t('weAmount.unit'),
      placeholder: t('weAmount.unitPh'),
      onSave: async (unit) => {
        publishSheet(null)
        const out = await weTrackAmount(card.id, true, unit.trim())
        if (out.miss) return setMiss(tMiss(out.miss))
        confirmDone(t('confirm.saved'))
        load()
      },
    })
  }

  function putAmount() {
    openAmountBox({
      title: sum.unit ? t('note.amountIn', { unit: sum.unit }) : t('note.amount'),
      colors,
      label: t('weAmount.yoursLabel'),
      initial: sum.mine == null ? '' : String(sum.mine),
      placeholder: '0',
      decimal: true,
      maxLength: 9,
      onSave: async (raw) => {
        const amount = readAmount(raw)
        if (Number.isNaN(amount)) return setMiss(t('weAmount.bad'))
        publishSheet(null)
        // Before 9am the did may be last night's: put the amount on that night.
        const night = weMine(card)?.status === 'did' ? card.slot || boardDate() : graceNightIso() || boardDate()
        const out = await wePutAmount(card.id, amount, night)
        if (out.miss) return setMiss(tMiss(out.miss))
        setMiss('')
        confirmDone(t('confirm.saved'))
        load()
      },
    })
  }

  const menuItems = [
    { key: 'details', label: t('we.details'), onPress: openDetails },
    card.mine && !edit ? { key: 'edit', label: t('we.edit'), onPress: startEdit } : null,
    card.mine ? { key: 'amount', label: sum ? t('weAmount.stop') : t('weAmount.track'), onPress: trackAmount } : null,
    link ? { key: 'link', label: t('weLink.off'), onPress: endLink } : null,
    { key: 'leave', label: t('we.leave'), onPress: leave, danger: true },
    card.mine ? { key: 'close', label: t('we.close'), onPress: close, danger: true } : null,
    { key: 'report', label: t('we.report'), onPress: report, danger: true },
  ].filter(Boolean)

  // Nobody else on it yet, or just made: sharing comes first.
  const shareFirst = fresh || !(card.people || []).some((p) => !p.me && (p.state === 'in' || p.state === 'asked'))
  const shareCard = (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <Cap colors={colors}>{t('we.askMore')}</Cap>
      {link ? (
        <>
          <Meta colors={colors}>{t('weLink.on')}</Meta>
          <KeyButton colors={colors} label={t('weLink.off')} disabled={busy} onPress={endLink} />
        </>
      ) : null}
      {pickOpen || asking.length ? (
        <PeoplePick people={people} picked={asking} onPick={setAsking} colors={colors} skip={onCard} />
      ) : null}
      <View style={styles.grid}>
        {asking.length ? (
          <View style={styles.gridCell}>
            <DidButton colors={colors} small label={t('we.sendAsk')} disabled={busy} onPress={ask} />
          </View>
        ) : (
          <View style={styles.gridCell}>
            <KeyButton colors={colors} label={t('weLink.share7')} disabled={busy} onPress={shareLink} />
          </View>
        )}
      </View>
      {!pickOpen && !asking.length ? <KeyButton colors={colors} label={t('weLink.askFriend')} onPress={() => setPickOpen(true)} /> : null}
      {linkSaid ? <Meta colors={colors}>{linkSaid}</Meta> : null}
      {linkMiss ? (
        <>
          <Text style={[styles.miss, { color: colors.miss }]}>{t('we.loadMiss')}</Text>
          <KeyButton colors={colors} label={t('gift.retry')} onPress={() => setLinkTry((n) => n + 1)} />
        </>
      ) : null}
    </View>
  )

  // The swipe card below already shows the question in big type.
  const bigCard = !card.due && early && !early.card.done && !weMine(early.card)?.status
  const names = (card.people || [])
    .filter((p) => p.state === 'in')
    .map((p) => (p.me ? t('we.you') : p.name))
    .join(', ')

  return (
    <ScreenShell book={book} title={t('we.title')} colors={colors} onRefresh={load}>
      {shareFirst ? shareCard : null}
      <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel }, weDoneStyle(card, colors)]}>
        <View style={styles.headTop}>
          <View style={styles.headFaces}>
            {bigCard ? null : <Text style={[styles.headQ, { color: colors.ink }]}>{card.question}</Text>}
            <WeFaces card={card} colors={colors} cheer={cheer} />
            {names ? (
              <Text style={[styles.headNames, { color: colors.inkSoft }]} numberOfLines={1}>
                {names}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => setMenu(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('we.moreActions')}
            style={({ pressed }) => [styles.moreBtn, { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
          >
            <Text style={[styles.moreText, { color: colors.inkSoft }]}>⋯</Text>
          </Pressable>
        </View>
        {card.mine && !edit ? <KeyButton colors={colors} label={t('we.edit')} onPress={startEdit} /> : null}
        <Text style={[styles.weStatus, { color: card.done && card.due ? colors.we : colors.ink }]}>
          {card.due ? weStatusLine(card) : weNotTonightLine(card, readPrefs().locale)}
        </Text>
        {!card.mine && card.makerName ? <Meta colors={colors}>{t('we.onlyMaker', { name: card.makerName })}</Meta> : null}
        {card.cadence === 'monthly' && card.periodEnd ? <Meta colors={colors}>{monthlyLine(card)}</Meta> : null}
        <Meta colors={colors}>{`${t('we.howCounts')}: ${t(weRuleKey(card.mode))}`}</Meta>
        {card.note ? <Meta colors={colors}>{card.note}</Meta> : null}
        <WeWeek card={card} colors={colors} />
      </View>
      {/* Not asked tonight: swipe its next night early, the same card as Tonight. */}
      {!card.due && early && !early.card.done ? (
        weMine(early.card)?.status ? (
          <View style={styles.acts}>
            <Meta colors={colors}>
              {t(weMine(early.card).status === 'did' ? 'we.earlyDid' : 'we.earlyNope', { day: new Date(`${early.night}T12:00:00`).toLocaleDateString(readPrefs().locale, { weekday: 'long' }) })}
            </Meta>
            <KeyButton
              colors={colors}
              label={t('we.earlyUndo')}
              disabled={ans.busy === card.id}
              onPress={() => ans.answer(early.card, null, early.night)}
            />
          </View>
        ) : (
          <>
          <SwipeFlyHost style={styles.earlySlot}>
            <SwipeCardHost
              key={`we-early:${card.id}`}
              cardKey={`we-early:${card.id}:${early.night}`}
              colors={{ ...colors, on: colors.we || colors.on, line: colors.we || colors.line }}
              kicker={t('we.earlyKicker', { day: new Date(`${early.night}T12:00:00`).toLocaleDateString(readPrefs().locale, { weekday: 'long' }) })}
              title={card.question}
              panelStyle={styles.earlyFace}
              stampDid={t('tonight.swipeDid')}
              stampNope={t('tonight.swipeNope')}
              behind={[]}
              onDid={() => ans.answer(early.card, 'did', early.night)}
              onNope={() => ans.answer(early.card, 'nope', early.night)}
            />
          </SwipeFlyHost>
          <View style={styles.earlyKeys}>
            <View style={styles.earlyKey}>
              <KeyButton label={t('tonight.answerNope')} colors={colors} onPress={() => ans.answer(early.card, 'nope', early.night)} />
            </View>
            <View style={styles.earlyKey}>
              <KeyButton label={t('tonight.answerDid')} colors={colors} onPress={() => ans.answer(early.card, 'did', early.night)} />
            </View>
          </View>
          </>
        )
      ) : null}
      {card.due && !weSlotLocked(card) ? (
        <View style={styles.acts}>
          {/* Not answered yet: Did and Nope look the same, so neither reads as picked. */}
          {mine?.status === 'did' ? (
            <DidButton colors={colors} small label={t('we.youDid')} disabled={ans.busy === card.id} onPress={() => ans.answer(card, 'did')} />
          ) : (
            <KeyButton colors={colors} label={t('we.did')} disabled={ans.busy === card.id} onPress={() => ans.answer(card, 'did')} />
          )}
          {sum && mine?.status === 'did' ? (
            <KeyButton
              colors={colors}
              label={sum.mine == null ? t('weAmount.add') : t('weAmount.yours', { n: sum.mine, unit: sum.unit })}
              onPress={putAmount}
            />
          ) : null}
          <KeyButton
            colors={colors}
            picked={mine?.status === 'nope'}
            label={t('we.nope')}
            disabled={ans.busy === card.id}
            onPress={() => ans.answer(card, 'nope')}
          />
        </View>
      ) : null}
      {ans.note ? <Meta colors={colors}>{ans.note}</Meta> : null}
      {cheer.note ? <Meta colors={colors}>{cheer.note}</Meta> : null}
      {cheer.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{cheer.miss}</Text> : null}
      {ans.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{ans.miss}</Text> : null}
      <WeNotes card={card} mine={mine} colors={colors} cheer={cheer} />

      <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Cap colors={colors}>{t('we.together')}</Cap>
        <Text style={[styles.big, { color: colors.ink }]}>{t('we.streak', { n: streak })}</Text>
        {sum ? <Text style={[styles.hint, styles.tight, { color: colors.we }]}>{togetherLine(sum) || t('weAmount.none')}</Text> : null}
        <Meta colors={colors}>
          {t('we.best', { n: best })}
        </Meta>
      </View>

      {shareFirst ? null : shareCard}

      <SetCap colors={colors} style={styles.listCap}>{t('we.yourFiling')}</SetCap>
      <SetCard colors={colors}>
        <FilingFolds
          folder={filing.folder}
          topics={filing.topics}
          onFolder={(folder) => setFiling((was) => ({ ...was, folder }))}
          onTopics={(topics) => setFiling((was) => ({ ...was, topics }))}
          open={fileOpen}
          fold={(id) => setFileOpen((now) => (now === id ? '' : id))}
          last
          colors={colors}
        />
      </SetCard>
      {filing.folder !== (card.folder || '') || filing.topics !== (card.topics || '') ? (
        <KeyButton
          colors={colors}
          label={t('we.save')}
          disabled={busy}
          onPress={async () => {
            setBusy(true)
            const out = await weFile(card.id, filing.folder, filing.topics)
            setBusy(false)
            if (out.miss) return setMiss(tMiss(out.miss))
            confirmDone(filing.folder ? t('confirm.movedTo', { tag: filing.folder }) : t('confirm.saved'))
            load()
          }}
        />
      ) : null}

      {card.mine && edit ? (
        <SetSheet colors={colors} title={t('we.edit')} onClose={() => setEdit(null)}>
          <ScrollView style={styles.editSheet} contentContainerStyle={styles.editSheetBody} keyboardShouldPersistTaps="handled">
            <RulesForm draft={edit} setDraft={setEdit} colors={colors} />
            {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
            <DidButton colors={colors} label={t('we.save')} disabled={busy || !edit.question.trim()} onPress={save} />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setEdit(null)} />
          </ScrollView>
        </SetSheet>
      ) : null}

      {miss && !edit ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
      {menu ? <WeMenu title={card.question} items={menuItems} colors={colors} onClose={() => setMenu(false)} /> : null}
    </ScreenShell>
  )
}

// Ideas for a first Did we. Each fills in the blank after "Did we".
const WE_IDEAS = ['we.idea.dog', 'we.idea.date', 'we.idea.gym', 'we.idea.call', 'we.idea.vitamins', 'we.idea.kitchen']

// The Did we home: asks, tonight's shared questions, all of yours by folder,
// and the month together. Reached from the menu.
export function WeHomeScreen({ book, onChange }) {
  const account = useAccount()
  const colors = useHallColors(book)
  if (account.ready && !account.user) return <NeedAccount book={book} colors={colors} />
  return (
    <ScreenShell book={book} title={t('we.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <WeHomeList book={book} onChange={onChange} />
    </ScreenShell>
  )
}

// The Did we list itself: the Did we page and the Friends and family tab.
export function WeHomeList({ book, onChange }) {
  const account = useAccount()
  const colors = useHallColors(book)
  const { cards, loaded, reload, miss: loadMiss } = useWeTonight(account.user)
  const ans = useWeAnswer(reload, book)
  const cheer = useWeCheer(book, onChange)

  const mine =cards.filter((card) => card.myState === 'in')
  // Combined amounts for every card on the list, in one read. Kept, so the
  // hint line under each card is there on open instead of pushing rows down
  // a moment later; a failed read keeps the last ones.
  const [sumRows, setSumRows] = useKept(`we.sums:${account.user?.id}`, [], KEEP)
  const sums = useMemo(() => new Map(sumRows), [sumRows])
  const ids = mine.map((card) => card.id).join(',')
  useEffect(() => {
    if (!ids) return undefined
    let alive = true
    weWeekTotals(ids.split(',')).then((res) => {
      if (alive && !res.miss) setSumRows([...res.totals])
    })
    return () => {
      alive = false
    }
  }, [ids])
  const tonight = mine.filter((card) => card.due)
  const later = mine.filter((card) => !card.due)
  const nightsTogether = mine.reduce((sum, card) => sum + weMonth(card).done, 0)
  const longest = mine
    .map((card) => ({ card, streak: weStreak(card) }))
    .sort((a, b) => b.streak - a.streak)[0]
  const folders = [...new Set(later.map((card) => card.folder || ''))].sort((a, b) =>
    !a ? 1 : !b ? -1 : a.localeCompare(b),
  )

  function row(card, withActs) {
    const me = weMine(card)
    // Early is fine: the ask time only sets the reminder.
    const open = withActs && !card.done && !me?.status && card.due
    const streak = weStreak(card)
    return (
      <Pressable
        key={card.id}
        accessibilityRole="button"
        onPress={() => goHash('/we', { id: card.id })}
        style={[styles.weRow, { borderColor: colors.we, backgroundColor: colors.panel }, weDoneStyle(card, colors)]}
      >
        <View style={styles.weRowCopy}>
          <WeFaces card={card} colors={colors} cheer={cheer} />
          <Text style={[styles.weQ, { color: colors.ink }]}>{weQuestion(card.question)}</Text>
          <Text style={[styles.weStatus, { color: card.done && card.due ? colors.we : colors.ink }]} numberOfLines={1}>
            {card.due ? weStatusLine(card) : weNotTonightLine(card, readPrefs().locale)}
          </Text>
          {(() => {
            const quiet = [
              card.askAfter && !card.done ? clockWords(card.askAfter) : '',
              streak > 0 ? t('we.streak', { n: streak }) : '',
              togetherLine(sums.get(card.id)) || '',
            ].filter(Boolean)
            return quiet.length ? (
              <Text style={[styles.hint, styles.tight, { color: colors.inkDim }]} numberOfLines={2}>
                {quiet.join(' · ')}
              </Text>
            ) : null
          })()}
        </View>
        {open ? (
          <View style={styles.weRowActs}>
            <KeyButton colors={colors} label={t('we.did')} disabled={ans.busy === card.id} onPress={() => ans.answer(card, 'did')} />
            <KeyButton colors={colors} label={t('we.nope')} disabled={ans.busy === card.id} onPress={() => ans.answer(card, 'nope')} />
          </View>
        ) : null}
      </Pressable>
    )
  }

  return (
    <>
      <Text style={[styles.weLead, { color: colors.inkSoft }]}>{t('we.homeLead')}</Text>
      <WeAsks colors={colors} />

      {!loaded ? <LateMeta colors={colors}>{t('family.loading')}</LateMeta> : null}
      {loadMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{t('people.reach')}</Text> : null}
      {loaded && !loadMiss && !mine.length ? (
        <View style={[styles.weEmpty, { borderColor: colors.we, backgroundColor: colors.panel }]}>
          <MenuIcon name="together" color={colors.we} size={36} stroke />
          <Text style={[styles.weEmptyTitle, { color: colors.ink }]}>{t('we.emptyFriend')}</Text>
          <Text style={[styles.hint, { color: colors.inkSoft, textAlign: 'center' }]}>{t('we.empty')}</Text>
          <DidButton colors={colors} label={t('we.newButton')} onPress={() => goHash('/we/new')} />
          <Text style={[styles.cap, { color: colors.inkDim }]}>{t('first.picks')}</Text>
          <View style={[styles.pillRow, { justifyContent: 'center' }]}>
            {WE_IDEAS.map((key) => (
              <Pill key={key} label={`${t('we.title')} ${t(key)}`} onPress={() => goHash('/we/new', { start: t(key) })} colors={colors} />
            ))}
          </View>
        </View>
      ) : null}

      {tonight.length ? <SetCap colors={colors} style={styles.listCap}>{t('we.tonightTogether')}</SetCap> : null}
      {tonight.map((card) => row(card, true))}

      {folders.map((folder) => (
        <View key={folder || '-'}>
          <SetCap colors={colors} style={styles.listCap}>{folder || t('we.yours')}</SetCap>
          {later.filter((card) => (card.folder || '') === folder).map((card) => row(card, false))}
        </View>
      ))}

      {/* Nothing done together yet: a big 0 only reads as failing. */}
      {mine.length && nightsTogether > 0 ? (
        <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          <Cap colors={colors}>{t('we.monthTogether')}</Cap>
          <Text style={[styles.big, { color: colors.we }]}>{t(nightsTogether === 1 ? 'we.nightsDoneOne' : 'we.nightsDone', { n: nightsTogether })}</Text>
          {longest?.streak ? (
            <Meta colors={colors}>{t(weWeekKey(longest.card, longest.streak === 1 ? 'we.longestOne' : 'we.longest'), { question: longest.card.question, n: longest.streak })}</Meta>
          ) : null}
        </View>
      ) : null}

      {ans.note ? <Meta colors={colors}>{ans.note}</Meta> : null}
      {ans.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{ans.miss}</Text> : null}
      {loaded && !mine.length ? null : <DidButton colors={colors} label={t('we.new')} onPress={() => goHash('/we/new')} />}
    </>
  )
}

const styles = StyleSheet.create({
  editSheet: { maxHeight: '80%' },
  editSheetBody: { padding: 16, gap: 12 },
  earlyKeys: { flexDirection: 'row', gap: 10, marginTop: 0, marginBottom: 8 },
  earlyKey: { flex: 1 },
  earlyFace: { minHeight: 0, paddingTop: 18, paddingBottom: 18 },
  // Sized to the card: the early note, question and keys read as one block.
  earlySlot: { justifyContent: 'flex-start', position: 'relative', overflow: 'visible', marginVertical: 8 },
  weLead: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  // The list sits on the page edge, not in a settings card, so no inset.
  listCap: { marginHorizontal: 0 },
  weRow: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 10 },
  weRowCopy: { gap: 6 },
  amountBox: { gap: 8, width: '100%' },
  weRowActs: { flexDirection: 'row', gap: 8 },
  weQ: { fontFamily: fonts.uiSemi, fontSize: 16 },
  tight: { marginTop: 0 },
  weEmpty: { borderWidth: 1.5, borderRadius: 18, padding: 20, gap: 10, alignItems: 'center' },
  weEmptyTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  cap: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  gap: { gap: 8 },
  question: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  panel: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
  headTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headFaces: { flex: 1, minWidth: 0, gap: 8 },
  headQ: { fontFamily: fonts.display, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  weStatus: { fontFamily: fonts.uiSemi, fontSize: 14 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weekDay: { alignItems: 'center', gap: 4, flex: 1 },
  weekWord: { fontFamily: fonts.ui, fontSize: 11 },
  weekDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  headNames: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19 },
  moreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.uiSemi, fontSize: 20, lineHeight: 22 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  personCopy: { flex: 1, minWidth: 100 },
  factLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 6, gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { flexGrow: 1, flexBasis: '45%' },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  menuRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 8 },
  menuRowText: { fontFamily: fonts.uiSemi, fontSize: 16 },
  big: { fontFamily: fonts.display, fontSize: 28, fontWeight: '700' },
  miss: { fontFamily: fonts.ui, fontSize: 13 },
  acts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settings: { marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  countsBody: { paddingVertical: 4, paddingBottom: 12, gap: 10 },
  moreGap: { height: 12 },
  hint: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 8 },
  lineInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, marginTop: 8 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 80, fontSize: 15, textAlignVertical: 'top' },
})
