import { useEffect, useRef, useState } from 'react'
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import { BoardShell } from '../components/BoardShell.jsx'
import { HangCard } from '../components/HangCard.jsx'
import { HangFold } from '../components/HangFold.jsx'
import { SetCap, SetCard, SetSwitch } from '../components/SetBits.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { clockWords } from '../../src/lib/hall-pages.js'
import { Pill, TopicPick, useAddFeel } from './questions.jsx'
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
  weMake,
  noteAsked,
  reportWe,
  weMine,
  weMonth,
  weNextMilestone,
  weNextNight,
  weNudge,
  weStreak,
  weTonight,
  weWaiting,
  useWeTonight,
} from '../../src/lib/did-we.js'
import { MenuIcon } from '../components/MenuIcon.jsx'
import { readPrefs } from '../../src/lib/prefs.js'
import { SwipeCardHost } from '../components/SwipeCardHost.jsx'
import { SwipeFlyHost } from '../components/SwipeFly.jsx'
import { t, tMiss } from '../../src/lib/i18n.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { WeAsks, WeFaces, useWeAnswer, weStatusLine } from '../components/WeTonight.jsx'
import { AppTextInput, DidButton, Field, KeyButton, Meta } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { canGoBack, goBack, goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { ScreenShell } from './more.jsx'
import { useWeCheer } from '../../src/lib/we-cheer.js'
import { endWeLinks, makeWeLink, myWeLink, sharedDidYouLine } from '../../src/lib/did-you-links.js'
import { passAlong } from '../../src/lib/native.js'
import { confirmDone } from '../lib/confirm.js'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

function usePeople() {
  const [people, setPeople] = useState(null)
  useEffect(() => {
    let alive = true
    weKnownPeople().then((rows) => {
      if (alive) setPeople(rows)
    })
    return () => {
      alive = false
    }
  }, [])
  return people
}

// Pick people: friends and family only. Tapping a name toggles it.
function PeoplePick({ people, picked, onPick, colors, skip = [] }) {
  if (people === null) return <Meta colors={colors}>{t('we.loadingPeople')}</Meta>
  const open = people.filter((p) => !skip.includes(p.id))
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
function whenValue(draft) {
  if (draft.cadence !== 'weekly') return t('we.daily')
  if (!draft.weekdays.length) return t('we.someDays')
  return draft.weekdays.map((day) => t(`we.day.${day}`)).join(' ')
}

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

function RulesFolds({ draft, setDraft, open, fold, colors, filing = null }) {
  const set = (key) => (value) => setDraft({ ...draft, [key]: value })
  return (
    <>
      <SetCap colors={colors}>{t('we.secRules')}</SetCap>
      <SetCard colors={colors}>
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
          <Text style={[styles.hint, { color: colors.inkDim }]}>{t(`we.modeNote.${draft.mode}`)}</Text>
        </HangFold>
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
        <HangFold
          label={t('we.when')}
          value={whenValue(draft)}
          icon="calendar"
          open={open === 'when'}
          onToggle={() => fold('when')}
          colors={colors}
        >
          <View style={styles.pillRow}>
            <Pill label={t('we.daily')} on={draft.cadence === 'daily'} onPress={() => set('cadence')('daily')} colors={colors} radio />
            <Pill label={t('we.someDays')} on={draft.cadence === 'weekly'} onPress={() => set('cadence')('weekly')} colors={colors} radio />
          </View>
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
        <HangFold
          label={t('we.challenge')}
          value={draft.goal ? t('we.nights', { n: draft.goal }) : t('we.noEnd')}
          icon="flag"
          open={open === 'goal'}
          onToggle={() => fold('goal')}
          last
          colors={colors}
        >
          <View style={styles.pillRow}>
            <Pill label={t('we.noEnd')} on={!draft.goal} onPress={() => set('goal')(null)} colors={colors} radio />
            {WE_GOALS.map((n) => (
              <Pill key={n} label={t('we.nights', { n })} on={draft.goal === n} onPress={() => set('goal')(n)} colors={colors} radio />
            ))}
          </View>
        </HangFold>
      </SetCard>

      <SetCap colors={colors}>{t('hang.secSchedule')}</SetCap>
      <SetCard colors={colors}>
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
          last
          on={draft.remind !== false}
          onPress={() => set('remind')(draft.remind === false)}
          colors={colors}
        />
      </SetCard>

      <SetCap colors={colors}>{t('hang.secOrganize')}</SetCap>
      <SetCard colors={colors}>
        {filing}
        <HangFold
          label={t('hang.details')}
          value={String(draft.note || '').trim() || t('hang.detailsNone')}
          icon="note"
          open={open === 'details'}
          onToggle={() => fold('details')}
          last
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
      </SetCard>
    </>
  )
}

// The owner changing a card: the question as a plain field, then the same rows.
function RulesForm({ draft, setDraft, colors }) {
  const [open, setOpen] = useState('')
  return (
    <>
      <Field
        colors={colors}
        label={t('we.question')}
        value={draft.question}
        onChangeText={(question) => setDraft({ ...draft, question })}
        placeholder={t('we.questionHint')}
        maxLength={200}
      />
      <RulesFolds draft={draft} setDraft={setDraft} open={open} fold={(id) => setOpen((now) => (now === id ? '' : id))} colors={colors} />
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
  const lead = t('we.title')
  const question = blank.trim() ? `${lead} ${blank.trim()}` : ''
  const names = (people || []).filter((p) => picked.includes(p.id)).map((p) => p.name)
  const ready = Boolean(question) && picked.length > 0 && !busy

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
      if (open !== 'when') fold('when')
      return
    }
    Keyboard.dismiss()
    setBusy(true)
    const out = await weMake({ ...draft, question, ask: picked, alone: share })
    if (out.miss && !out.id) {
      setBusy(false)
      feel.buzz()
      setMiss(tMiss(out.miss))
      return
    }
    if (share) {
      const link = await makeWeLink(out.id)
      if (link.code) await passAlong(sharedDidYouLine(question, link.code), t('weLink.share'))
      else setMiss(t(link.miss === 'linkCap' ? 'didYouLink.cap' : 'weLink.shareLater'))
    }
    setBusy(false)
    if (picked.length) {
      noteAsked(picked)
      const who = names.length === 1 ? t('confirm.askedOne', { name: names[0] }) : t('confirm.askedMany', { n: picked.length })
      confirmDone(`${who} ${t('confirm.weStartsOnYes')}`)
    }
    feel.land(t('lead.sent'), () => goHash('/we', { id: out.id }))
  }

  return (
    <BoardShell
      book={book}
      title={t('we.newTitle')}
      noTitle
      date={feel.date}
      colors={colors}
      back={false}
      leftAction={{ label: t('hang.cancel'), onPress: () => (canGoBack() ? goBack() : goHash('/we')) }}
      rightAction={{ label: t('we.sendShort'), onPress: () => make(false), disabled: !ready }}
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
        leadColor={colors.we}
        placeholder={t('we.blankHint')}
        meta={[
          names.length ? t('we.withLine', { names: names.join(', ') }) : '',
          draft.askAfter ? clockWords(draft.askAfter) : '',
        ]
          .filter(Boolean)
          .join(' · ')}
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
        <SetCap colors={colors}>{t('we.who')}</SetCap>
        <SetCard colors={colors}>
          <HangFold
            label={t('we.people')}
            value={names.length ? names.join(', ') : t('we.nobody')}
            icon="people"
            open={open === 'who'}
            onToggle={() => fold('who')}
            last
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
                <Pill label={t('we.findPeople')} onPress={() => goHash('/people')} colors={colors} />
              </>
            )}
          </HangFold>
        </SetCard>

        <RulesFolds
          draft={draft}
          setDraft={setDraft}
          open={open}
          fold={fold}
          colors={colors}
          filing={
            <FilingFolds
              folder={draft.folder}
              topics={draft.topics}
              onFolder={(folder) => setDraft((was) => ({ ...was, folder }))}
              onTopics={(topics) => setDraft((was) => ({ ...was, topics }))}
              open={open}
              fold={fold}
              colors={colors}
            />
          }
        />
      </View>

      <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.newLead')}</Text>
      <KeyButton colors={colors} label={t('weLink.makeShare')} disabled={busy || !question} onPress={() => make(true)} />
      <Text style={[styles.hint, { color: colors.inkDim }]}>{t('weLink.hint')}</Text>
      {miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {miss}
        </Text>
      ) : null}
    </BoardShell>
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
  const cheer = useWeCheer(book, onChange)
  const people = usePeople()
  const [card, setCard] = useState(undefined)
  const [edit, setEdit] = useState(null)
  const [asking, setAsking] = useState([])
  const [busy, setBusy] = useState(false)
  // Your link for this card while it works, so you can turn it off.
  const [link, setLink] = useState('')
  const [linkSaid, setLinkSaid] = useState('')
  useEffect(() => {
    let alive = true
    myWeLink(cardId)
      .then((code) => {
        if (alive) setLink(code)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [cardId])
  const [miss, setMiss] = useState('')
  const ans = useWeAnswer(() => load(), book)
  // Not asked tonight: its next asked night can be answered early.
  const [early, setEarly] = useState(null)

  async function load() {
    const out = await weTonight()
    if (out.miss) setMiss(tMiss(out.miss))
    const found = out.cards.find((c) => c.id === cardId) || null
    setCard(found)
    const night = found && !found.due && found.myState === 'in' ? weNextNight(found) : ''
    if (!night) return setEarly(null)
    const later = await weTonight(night)
    const then = later.cards.find((c) => c.id === cardId)
    return setEarly(then ? { night, card: then } : null)
  }

  useEffect(() => {
    load()
  }, [cardId])

  // Your folder and topics for it, saved when you tap Save.
  const [filing, setFiling] = useState({ folder: '', topics: '' })
  const [fileOpen, setFileOpen] = useState('')
  useEffect(() => {
    if (card) setFiling({ folder: card.folder || '', topics: card.topics || '' })
  }, [card?.id, card?.folder, card?.topics])

  if (card === undefined) {
    return (
      <ScreenShell book={book} title={t('we.title')} colors={colors}>
        <Meta colors={colors}>{t('we.loading')}</Meta>
      </ScreenShell>
    )
  }
  if (!card) {
    return (
      <ScreenShell book={book} title={t('we.title')} colors={colors}>
        <Meta colors={colors}>{miss || t('we.gone')}</Meta>
        <KeyButton colors={colors} label={t('we.backTonight')} onPress={() => goHash('/tonight')} />
      </ScreenShell>
    )
  }

  const streak = weStreak(card)
  const best = weBest(card)
  const next = weNextMilestone(streak)
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
    const out = await weEdit(card.id, edit)
    setBusy(false)
    if (out.miss) return setMiss(tMiss(out.miss))
    setEdit(null)
    setMiss('')
    confirmDone(t('confirm.saved'))
    load()
  }

  async function ask() {
    setBusy(true)
    let sent = []
    for (const id of asking) {
      const out = await weAsk(card.id, id)
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
    setAsking([])
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
        if (out.miss) return setMiss(tMiss(out.miss))
        confirmDone(t('confirm.weLeft'))
        goHash('/tonight')
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

  return (
    <ScreenShell book={book} title={t('we.title')} colors={colors}>
      <Text style={[styles.question, { color: colors.ink }]}>{card.question}</Text>
      <WeFaces card={card} colors={colors} cheer={cheer} />
      <Meta colors={colors}>{card.due ? weStatusLine(card) : t('we.notTonight')}</Meta>
      <Meta colors={colors}>
        {t(`we.mode.${card.mode}`)} · {t(`we.shows.${card.shows}`)}
        {card.askAfter ? ` · ${t('we.fromTime', { time: clockWords(card.askAfter) })}` : ''}
      </Meta>
      {card.note ? <Meta colors={colors}>{card.note}</Meta> : null}
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
              onPress={() => ans.answer(early.card, weMine(early.card).status, early.night)}
            />
          </View>
        ) : (
          <SwipeFlyHost style={styles.earlySlot}>
            <SwipeCardHost
              key={`we-early:${card.id}`}
              cardKey={`we-early:${card.id}:${early.night}`}
              colors={{ ...colors, on: colors.we || colors.on, line: colors.we || colors.line }}
              kicker={t('we.earlyKicker', { day: new Date(`${early.night}T12:00:00`).toLocaleDateString(readPrefs().locale, { weekday: 'long' }) })}
              title={card.question}
              stampDid={t('tonight.swipeDid')}
              stampNope={t('tonight.swipeNope')}
              behind={[]}
              onDid={() => ans.answer(early.card, 'did', early.night)}
              onNope={() => ans.answer(early.card, 'nope', early.night)}
            />
          </SwipeFlyHost>
        )
      ) : null}
      {card.due ? (
        <View style={styles.acts}>
          <DidButton
            colors={colors}
            small
            dim={mine?.status === 'nope'}
            label={mine?.status === 'did' ? t('we.youDid') : t('we.did')}
            disabled={ans.busy === card.id}
            onPress={() => ans.answer(card, 'did')}
          />
          <KeyButton
            colors={colors}
            picked={mine?.status === 'nope'}
            label={t('we.nope')}
            disabled={ans.busy === card.id}
            onPress={() => ans.answer(card, 'nope')}
          />
          {mine?.status === 'did' && !card.done
            ? weWaiting(card)
                .filter((p) => !p.nudged)
                .map((p) => (
                  <KeyButton
                    key={p.id}
                    colors={colors}
                    label={t('we.nudge', { name: p.name })}
                    disabled={ans.busy === card.id}
                    onPress={async () => {
                      const out = await ans.run(card.id, () => weNudge(card.id, p.id))
                      if (!out?.miss) confirmDone(t('confirm.nudged', { name: p.name }))
                    }}
                  />
                ))
            : null}
          {/* Someone already said did: no nudge, a cheer instead. */}
          {cheer.can
            ? (card.people || [])
                .filter((p) => !p.me && p.state === 'in' && p.status === 'did')
                .map((p) => (
                  <KeyButton
                    key={`cheer-${p.id}`}
                    colors={colors}
                    label={t('we.cheerName', { name: p.name })}
                    disabled={Boolean(cheer.busy)}
                    onPress={() => cheer.cheer(p)}
                  />
                ))
            : null}
        </View>
      ) : null}
      {ans.note ? <Meta colors={colors}>{ans.note}</Meta> : null}
      {cheer.note ? <Meta colors={colors}>{cheer.note}</Meta> : null}
      {cheer.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{cheer.miss}</Text> : null}
      {ans.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{ans.miss}</Text> : null}

      <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Cap colors={colors}>{t('we.together')}</Cap>
        <Text style={[styles.big, { color: colors.ink }]}>{t('we.streak', { n: streak })}</Text>
        <Meta colors={colors}>
          {t('we.best', { n: best })}
          {next ? ` · ${t('we.nextCoins', { n: next - streak })}` : ''}
        </Meta>
        <Meta colors={colors}>{t('we.thisMonth', { n: month.done, due: month.due })}</Meta>
        {last.due ? <Meta colors={colors}>{t('we.lastMonth', { n: last.done, due: last.due })}</Meta> : null}
        {goal ? (
          <Meta colors={colors}>
            {goal.finished ? t('we.goalDone', { goal: goal.goal }) : t('we.goalLine', { n: goal.done, goal: goal.goal })}
          </Meta>
        ) : null}
      </View>

      <Cap colors={colors}>{t('we.people')}</Cap>
      {(card.people || []).map((p) => (
        <Meta key={p.id} colors={colors}>
          {p.me ? t('we.you') : p.name}
          {p.state === 'asked' ? ` · ${t('we.invited')}` : ''}
          {card.mode === 'turns' && card.turn === p.id ? ` · ${t('we.tonightsTurn')}` : ''}
        </Meta>
      ))}
      {card.shows === 'count' ? <Meta colors={colors}>{t('we.countOnly', { total: card.total })}</Meta> : null}

      <SetCap colors={colors}>{t('we.yourFiling')}</SetCap>
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

      <Cap colors={colors}>{t('we.askMore')}</Cap>
      <PeoplePick people={people} picked={asking} onPick={setAsking} colors={colors} skip={onCard} />
      {asking.length ? <KeyButton colors={colors} label={t('we.sendAsk')} disabled={busy} onPress={ask} /> : null}
      <KeyButton colors={colors} label={t('weLink.share')} disabled={busy} onPress={shareLink} />
      <Meta colors={colors}>{t('weLink.hint')}</Meta>
      {link ? <KeyButton colors={colors} label={t('weLink.off')} disabled={busy} onPress={endLink} /> : null}
      {linkSaid ? <Meta colors={colors}>{linkSaid}</Meta> : null}

      {card.mine ? (
        edit ? (
          <>
            <RulesForm draft={edit} setDraft={setEdit} colors={colors} />
            <DidButton colors={colors} label={t('we.save')} disabled={busy || !edit.question.trim()} onPress={save} />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setEdit(null)} />
          </>
        ) : (
          <KeyButton
            colors={colors}
            label={t('we.edit')}
            onPress={() =>
              setEdit({
                question: card.question,
                mode: card.mode,
                shows: card.shows,
                cadence: card.cadence,
                weekdays: card.weekdays || [],
                goal: card.goal || null,
                askAfter: card.askAfter || '',
                remind: card.remind !== false,
                note: card.note || '',
              })
            }
          />
        )
      ) : null}

      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
      <KeyButton colors={colors} label={t('we.leave')} onPress={leave} />
      <KeyButton colors={colors} label={t('we.report')} onPress={report} />
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
  const { cards, reload } = useWeTonight(account.user)
  const ans = useWeAnswer(reload, book)
  const cheer = useWeCheer(book, onChange)
  if (account.ready && !account.user) return <NeedAccount book={book} colors={colors} />

  const mine = cards.filter((card) => card.myState === 'in')
  const tonight = mine.filter((card) => card.due)
  const later = mine.filter((card) => !card.due)
  const month = new Date().toISOString().slice(0, 7)
  const nightsTogether = mine.reduce((sum, card) => sum + weMonth(card, month).done, 0)
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
        style={[styles.weRow, { borderColor: colors.we, backgroundColor: colors.panel }]}
      >
        <View style={styles.weRowCopy}>
          <Text style={[styles.weQ, { color: colors.ink }]}>{card.question}</Text>
          <WeFaces card={card} colors={colors} cheer={cheer} />
          <Text style={[styles.hint, styles.tight, { color: card.done ? colors.we : colors.inkSoft }]}>
            {card.due ? weStatusLine(card) : t('we.notTonight')}
            {card.askAfter && !card.done ? ` · ${clockWords(card.askAfter)}` : ''}
            {streak > 0 ? ` · ${t('we.streak', { n: streak })}` : ''}
          </Text>
        </View>
        {open ? (
          <View style={styles.weRowActs}>
            <DidButton colors={colors} small label={t('we.did')} disabled={ans.busy === card.id} onPress={() => ans.answer(card, 'did')} />
            <KeyButton colors={colors} label={t('we.nope')} disabled={ans.busy === card.id} onPress={() => ans.answer(card, 'nope')} />
          </View>
        ) : null}
      </Pressable>
    )
  }

  return (
    <ScreenShell book={book} title={t('we.title')} colors={colors}>
      <Text style={[styles.weLead, { color: colors.inkSoft }]}>{t('we.homeLead')}</Text>
      <WeAsks colors={colors} />

      {!mine.length ? (
        <View style={[styles.weEmpty, { borderColor: colors.we, backgroundColor: colors.panel }]}>
          <MenuIcon name="together" color={colors.we} size={36} stroke />
          <Text style={[styles.weEmptyTitle, { color: colors.ink }]}>{t('we.emptyTitle')}</Text>
          <Text style={[styles.hint, { color: colors.inkSoft, textAlign: 'center' }]}>{t('we.empty')}</Text>
          <Text style={[styles.cap, { color: colors.inkDim }]}>{t('first.picks')}</Text>
          <View style={[styles.pillRow, { justifyContent: 'center' }]}>
            {WE_IDEAS.map((key) => (
              <Pill key={key} label={`${t('we.title')} ${t(key)}`} onPress={() => goHash('/we/new', { start: t(key) })} colors={colors} />
            ))}
          </View>
        </View>
      ) : null}

      {tonight.length ? <SetCap colors={colors}>{t('we.tonightTogether')}</SetCap> : null}
      {tonight.map((card) => row(card, true))}

      {folders.map((folder) => (
        <View key={folder || '-'}>
          <SetCap colors={colors}>{folder || t('we.yours')}</SetCap>
          {later.filter((card) => (card.folder || '') === folder).map((card) => row(card, false))}
        </View>
      ))}

      {mine.length ? (
        <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          <Cap colors={colors}>{t('we.monthTogether')}</Cap>
          <Text style={[styles.big, { color: colors.we }]}>{t('we.nightsDone', { n: nightsTogether })}</Text>
          {longest?.streak ? (
            <Meta colors={colors}>{t('we.longest', { question: longest.card.question, n: longest.streak })}</Meta>
          ) : null}
        </View>
      ) : null}

      {ans.note ? <Meta colors={colors}>{ans.note}</Meta> : null}
      {ans.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{ans.miss}</Text> : null}
      <DidButton colors={colors} label={t('we.new')} onPress={() => goHash('/we/new')} />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  earlySlot: { height: 250, justifyContent: 'flex-start', position: 'relative', overflow: 'visible', marginVertical: 8 },
  weLead: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  weRow: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 10 },
  weRowCopy: { gap: 6 },
  weRowActs: { flexDirection: 'row', gap: 8 },
  weQ: { fontFamily: fonts.uiSemi, fontSize: 16 },
  tight: { marginTop: 0 },
  weEmpty: { borderWidth: 1.5, borderRadius: 18, padding: 20, gap: 10, alignItems: 'center' },
  weEmptyTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  cap: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  gap: { gap: 8 },
  question: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  panel: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  big: { fontFamily: fonts.display, fontSize: 28, fontWeight: '700' },
  miss: { fontFamily: fonts.ui, fontSize: 13 },
  acts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settings: { marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  hint: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 8 },
  lineInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, marginTop: 8 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 80, fontSize: 15, textAlignVertical: 'top' },
})
