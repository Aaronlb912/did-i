import { useEffect, useState } from 'react'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { shelfMarks, streakLength } from '../../src/lib/achievements.js'
import { MarksGrid } from '../components/MarksGrid.jsx'
import {
  deleteAccount,
  deviceKey,
  signOutEverywhere,
  signOutHere,
  useAccount,
} from '../../src/lib/account.js'
import {
  exportAll,
  forgetDevice,
  forgetOtherDevices,
  listDevices,
  loadProfile,
  saveProfile,
} from '../../src/lib/cloud-sync.js'
import {
  blankLamp,
  didQuestion,
  isOnceBy,
  shortFromQuestion,
  shortLabel,
} from '../../src/lib/board-json.js'
import { hangInto } from '../../src/lib/board-ops.js'
import { currentBook, enterLand, liveLampCount, readShelf } from '../../src/lib/board-shelf.js'
import { pullAndMerge, signedOutSync, useSync } from '../../src/lib/cloud-sync.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { hallHeat } from '../../src/lib/hall-feel.js'
import {
  clockWords,
  comingDays,
  feedRows,
  markWelcomeSeen,
  stampWhen,
  statsCounts,
  tapWhen,
  weekCell,
  weekLamps,
  weekNights,
} from '../../src/lib/hall-pages.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { PING_KINDS, readPrefs, usePrefs, uses24h, writePrefs } from '../../src/lib/prefs.js'
import { CHEERS, LOOKS, normalizePurse } from '../../src/lib/purse.js'
import { playClick, shareShelf } from '../../src/lib/native.js'
import {
  checkPin,
  clearPin,
  firstName,
  hasPin,
  keeperNamed,
  openSession,
  setPin,
} from '../../src/lib/session.js'
import { armLampPings, upcomingPings } from '../../src/lib/notify.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { hangStarter, starterBlank, unusedStarters } from '../../src/lib/starters.js'
import { leftoverOn } from '../../src/lib/tags.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts, sectionLabel, withAlpha } from '../theme.js'
import { CalendarGrid } from '../components/CalendarGrid.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { AuthEmailCard } from '../components/AuthEmailCard.jsx'
import { SavableField } from '../components/SavableField.jsx'
import { SavableSetField } from '../components/SavableSetField.jsx'
import { Avatar } from '../components/PersonCard.jsx'
import { removeAvatar, saveAvatar, useMyAvatar } from '../../src/lib/avatar.js'
import { canPickAvatar, canTakePhoto, pickAvatarBytes } from '../lib/avatar-pick.js'
import { AppTextInput, DidButton, Field, Kicker, KeyButton, Meta, Page, Row, Title } from '../components/ui.jsx'
import { SetCap, SetCard, SetNote, SetRow, SetSwitch } from '../components/SetBits.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { offerPingPrimer } from '../lib/ping-primer.js'
import { IdeaPicks, useWobble, WaveLead } from '../components/DidLead.jsx'

const IDEA_IDS = ['pills', 'door', 'keys', 'bins', 'water', 'charge']

// Signing every phone out and deleting an account do not come back.
function SureModal({ sure, colors, onClose, onGo }) {
  if (!sure) return null
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{t('account.kicker')}</Text>
          <Text style={[styles.popTitle, { color: colors.ink }]}>{sure?.title}</Text>
          <Text style={[styles.popBody, { color: colors.inkSoft }]}>{sure?.body}</Text>
          <View style={styles.popRow}>
            <DidButton small label={sure?.yes} onPress={onGo} colors={colors} />
            <KeyButton label={t('settings.neverMind')} onPress={onClose} colors={colors} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// locked: no back, menu or purse, so the screen can only be left by finishing it.
export function ScreenShell({ book, title, children, colors, showAdd = false, locked = false }) {
  const live = book || currentBook(readShelf())
  return (
    <BoardShell
      book={live}
      title={title}
      colors={colors}
      showAdd={showAdd}
      back={locked ? false : undefined}
      showCogs={!locked}
    >
      {children}
    </BoardShell>
  )
}

function foldClock(at) {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return clockWords(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
}

function statusWord(status) {
  if (status === 'yes') return t('feed.status.did')
  if (status === 'late') return t('feed.status.late')
  if (status === 'skip') return t('feed.status.nope')
  return status
}

function answerLabel(row, nightIso) {
  if (!row.answer) {
    if (isOnceBy(row.lamp)) {
      const dueBy = String(row.lamp.dueBy || '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) {
        if (dueBy === nightIso) return t('later.dueTonight')
        return t('later.dueBy', { date: formatBoardDate(dueBy) })
      }
    }
    return row.lamp.askAfter ? clockWords(row.lamp.askAfter) : t('later.open')
  }
  if (row.answer.status === 'yes') return t('later.did')
  if (row.answer.status === 'late') return t('later.late')
  return t('later.nope')
}

export function AboutScreen({ book }) {
  const colors = useHallColors()
  return (
    <ScreenShell book={book} title={t('about.title')} colors={colors}>
      <Meta colors={colors}>{t('about.p1')}</Meta>
      <Meta colors={colors}>{t('about.p2')}</Meta>
      <Meta colors={colors}>{t('about.p3')}</Meta>
      <Meta colors={colors}>{t('about.p4')}</Meta>
      <Meta colors={colors}>{t('about.p5')}</Meta>
      <DidButton colors={colors} label={t('about.home')} onPress={() => goHash('/tonight')} />
      <KeyButton colors={colors} label={t('about.how')} onPress={() => goHash('/help')} />
    </ScreenShell>
  )
}

export function HelpScreen() {
  const colors = useHallColors()
  return (
    <ScreenShell title={t('settings.howDidIWorks')} colors={colors}>
      <Meta colors={colors}>{t('help.lead')}</Meta>
      <KeyButton colors={colors} label={t('settings.ideas')} onPress={() => goHash('/ideas')} />
      <KeyButton colors={colors} label={t('settings.what')} onPress={() => goHash('/about')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.tonight')}</Text>
      <Meta colors={colors}>{t('help.tonightP1')}</Meta>
      <Meta colors={colors}>{t('help.tonightP2')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.streak')}</Text>
      <Meta colors={colors}>{t('help.streakP')}</Meta>
      <KeyButton colors={colors} label={t('help.marks')} onPress={() => goHash('/marks')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.questions')}</Text>
      <Meta colors={colors}>{t('help.questionsP')}</Meta>
      <KeyButton colors={colors} label={t('help.questionsGo')} onPress={() => goHash('/lamps')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.pings')}</Text>
      <Meta colors={colors}>{t('help.pingsP')}</Meta>
      <KeyButton colors={colors} label={t('help.pingsGo')} onPress={() => goHash('/pings')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.widget')}</Text>
      <Meta colors={colors}>{t('help.widgetP')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.people')}</Text>
      <Meta colors={colors}>{t('help.peopleP')}</Meta>
      <KeyButton colors={colors} label={t('help.peopleGo')} onPress={() => goHash('/people')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.we')}</Text>
      <Meta colors={colors}>{t('help.weP1')}</Meta>
      <Meta colors={colors}>{t('help.weP2')}</Meta>
      <KeyButton colors={colors} label={t('help.weGo')} onPress={() => goHash('/we/new')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.cheers')}</Text>
      <Meta colors={colors}>{t('help.cheersP')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.coins')}</Text>
      <Meta colors={colors}>{t('help.coinsP')}</Meta>
      <KeyButton colors={colors} label={t('help.shopGo')} onPress={() => goHash('/shop')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.phone')}</Text>
      <Meta colors={colors}>{t('help.phoneP')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.legal')}</Text>
      <Meta colors={colors}>{t('help.legalP')}</Meta>
      <KeyButton colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
      <KeyButton colors={colors} label={t('settings.terms')} onPress={() => goHash('/terms')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.feedback')}</Text>
      <Meta colors={colors}>{t('help.feedbackP')}</Meta>
      <DidButton
        colors={colors}
        label={t('feedback.send')}
        onPress={() => {
          const url = feedbackMailto()
          if (url) Linking.openURL(url)
        }}
      />
      <DidButton colors={colors} label={t('help.home')} onPress={() => goHash('/tonight')} />
    </ScreenShell>
  )
}

export function LaterScreen({ book, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const nights = comingDays(book, clock, 7).filter((night) => night.due.length)
  const hung = (book?.lamps || []).filter((lamp) => !lamp.archived)

  return (
    <ScreenShell book={book} title={t('later.title')} colors={colors}>
      <Meta colors={colors}>{t('later.body')}</Meta>
      {!hung.length ? (
        <Meta colors={colors}>{t('later.empty')}</Meta>
      ) : !nights.length ? (
        <Meta colors={colors}>{t('later.emptyWeek')}</Meta>
      ) : (
        nights.map((night) => (
          <View key={night.iso} style={styles.block}>
            <Text style={[styles.slot, { color: colors.inkSoft }]}>
              {night.isToday ? t('later.tonight') : night.weekday} · {night.label}
            </Text>
            {night.due.map((row) => (
              <Row
                key={row.lamp.id}
                colors={colors}
                label={shortLabel(row.lamp)}
                note={answerLabel(row, night.iso)}
                onPress={() =>
                  night.isToday
                    ? goHash('/tonight', { face: row.lamp.id })
                    : goHash('/lamp', { id: row.lamp.id })
                }
              />
            ))}
          </View>
        ))
      )}
      <DidButton colors={colors} label={t('later.tonightBtn')} onPress={() => goHash('/tonight')} />
      <KeyButton colors={colors} label={t('tonight.add')} onPress={() => goHash('/add')} />
    </ScreenShell>
  )
}

export function MarksScreen({ book, boards = [], now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const have = shelfMarks(boards.length ? boards : [book])

  return (
    <ScreenShell book={book} title={t('marks.title')} colors={colors}>
      {book?.quietMode ? (
        <Meta colors={colors}>{t('marks.hidden')}</Meta>
      ) : (
        <MarksGrid have={have} colors={colors} />
      )}
      <Meta colors={colors}>{t('marks.streak', { n: heat })}</Meta>
      <KeyButton colors={colors} label={t('marks.stats')} onPress={() => goHash('/stats')} />
    </ScreenShell>
  )
}

export function IdeasScreen() {
  const colors = useHallColors()
  return (
    <ScreenShell title={t('ideas.title')} colors={colors}>
      <Meta colors={colors}>{t('ideas.body')}</Meta>
      {IDEA_IDS.map((id) => (
        <View key={id} style={[styles.idea, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          <Kicker colors={colors}>{t(`ideas.${id}.kind`)}</Kicker>
          <Text style={[styles.ideaQ, { color: colors.ink }]}>{t(`ideas.${id}.question`)}</Text>
          <Meta colors={colors}>{t(`ideas.${id}.body`)}</Meta>
          <KeyButton
            colors={colors}
            label={t('ideas.use')}
            onPress={() => goHash('/add', { start: t(`ideas.${id}.start`) })}
          />
        </View>
      ))}
      <DidButton colors={colors} label={t('ideas.writeOwn')} onPress={() => goHash('/add')} />
      <KeyButton colors={colors} label={t('ideas.help')} onPress={() => goHash('/help')} />
    </ScreenShell>
  )
}

export function StatsScreen({ book, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const counts = statsCounts(book, clock)

  return (
    <ScreenShell title={t('stats.title')} colors={colors}>
      <Row colors={colors} label={t('stats.questions')} note={String(counts.hung)} />
      <Row colors={colors} label={t('stats.did')} note={String(counts.did)} />
      <Row colors={colors} label={t('stats.late')} note={String(counts.late)} />
      <Row colors={colors} label={t('stats.nope')} note={String(counts.skip)} />
      <Row colors={colors} label={t('stats.nightsOn')} note={String(counts.heat)} />
      <KeyButton colors={colors} label={t('stats.marks')} onPress={() => goHash('/marks')} />
      <KeyButton colors={colors} label={t('streaks.seven')} onPress={() => goHash('/week')} />
      <KeyButton colors={colors} label={t('streaks.title')} onPress={() => goHash('/streaks')} />
    </ScreenShell>
  )
}

export function FeedScreen({ book, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const rows = feedRows(book)

  return (
    <ScreenShell title={t('feed.title')} colors={colors}>
      {!rows.length ? (
        <Meta colors={colors}>{t('feed.empty')}</Meta>
      ) : (
        rows.map((row) => (
          <Row
            key={row.answer.id}
            colors={colors}
            label={row.lamp ? shortLabel(row.lamp) : t('feed.deleted')}
            note={`${statusWord(row.answer.status)}${
              tapWhen(row.answer.answeredAt, clock) ? ` · ${tapWhen(row.answer.answeredAt, clock)}` : ''
            }`}
            onPress={() => row.lamp && goHash('/lamp', { id: row.lamp.id })}
          />
        ))
      )}
    </ScreenShell>
  )
}

export function CalendarScreen({ book, boards, tagId, now }) {
  const colors = useHallColors()
  const clock = now || new Date()

  return (
    <ScreenShell title={t('cal.aria')} colors={colors}>
      <Meta colors={colors}>{t('cal.hint')}</Meta>
      <CalendarGrid book={book} boards={boards} tagId={tagId} now={clock} colors={colors} />
      <KeyButton colors={colors} label={t('streaks.title')} onPress={() => goHash('/streaks')} />
      <KeyButton colors={colors} label={t('boards.week')} onPress={() => goHash('/week')} />
    </ScreenShell>
  )
}

export function WeekGridScreen({ book, now }) {
  const colors = useHallColors(book)
  const clock = now || new Date()
  const nights = weekNights(book, clock, 7)
  const lamps = weekLamps(nights)

  function cellColor(state) {
    if (state === 'yes') return colors.on
    if (state === 'late') return colors.late
    if (state === 'skip') return colors.skip
    if (state === 'hole') return colors.miss
    return colors.open
  }

  return (
    <ScreenShell title={t('streaks.seven')} colors={colors}>
      {!lamps.length ? (
        <Meta colors={colors}>{t('streaks.empty')}</Meta>
      ) : (
        <View style={styles.week}>
          <View style={styles.weekRow}>
            <View style={styles.weekName} />
            {nights.map((night) => (
              <View key={night.iso} style={styles.weekHeadCell}>
                <Text style={[styles.weekDow, { color: night.isToday ? colors.on : colors.inkDim }]}>
                  {night.weekday}
                </Text>
                <Text style={[styles.weekDay, { color: colors.inkSoft }]}>{night.dayNum}</Text>
              </View>
            ))}
          </View>
          {lamps.map((lamp) => (
            <View key={lamp.id} style={styles.weekRow}>
              <Text
                numberOfLines={1}
                onPress={() => goHash('/lamp', { id: lamp.id })}
                style={[styles.weekName, styles.weekNameText, { color: colors.ink }]}
              >
                {shortLabel(lamp)}
              </Text>
              {nights.map((night) => (
                <View key={night.iso} style={styles.weekHeadCell}>
                  <View
                    style={[styles.weekCell, { backgroundColor: cellColor(weekCell(night, lamp).state) }]}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
      <KeyButton colors={colors} label={t('streaks.title')} onPress={() => goHash('/streaks')} />
    </ScreenShell>
  )
}

export function StreaksScreen({ book, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const lamps = (book?.lamps || []).filter((lamp) => !lamp.archived)
  const rows = lamps
    .map((lamp) => ({ lamp, n: streakLength(book, lamp, clock) }))
    .sort((a, b) => b.n - a.n)

  return (
    <ScreenShell title={t('streaks.title')} colors={colors}>
      <Meta colors={colors}>{t('streaks.line', { n: heat })}</Meta>
      {!rows.length ? (
        <Meta colors={colors}>{t('streaks.empty')}</Meta>
      ) : (
        rows.map((row) => (
          <Row
            key={row.lamp.id}
            colors={colors}
            label={shortLabel(row.lamp)}
            note={String(row.n || 0)}
            onPress={() => goHash('/lamp', { id: row.lamp.id })}
          />
        ))
      )}
      <KeyButton colors={colors} label={t('streaks.seven')} onPress={() => goHash('/week')} />
    </ScreenShell>
  )
}

export function BoardsScreen({ book, boards, onSelect, onAdd, onRemove, onChange }) {
  const colors = useHallColors()
  const [titleDraft, setTitleDraft] = useState(book?.title || '')
  const [addMiss, setAddMiss] = useState('')
  const live = (boards || []).filter((item) => !item.archived)

  useEffect(() => {
    setTitleDraft(book?.title || '')
  }, [book?.title, book?.id])

  return (
    <ScreenShell book={book} title={t('boards.title')} colors={colors} showAdd>
      {live.map((item) => {
        const left = leftoverOn(boards, new Date(), item.id)
        const n = liveLampCount(item)
        const on = item.id === book?.id
        const countNote =
          n === 1 ? t('boards.qOne') : t('boards.qMany', { n })
        const leftNote =
          left === 0 ? t('boards.leftNone') : left === 1 ? t('boards.leftOne') : t('boards.leftMany', { n: left })
        return (
          <View key={item.id}>
            <Row
              colors={colors}
              label={item.title}
              note={`${on ? t('boards.thisOne') : t('boards.one')} · ${countNote} · ${leftNote}`}
              onPress={() => {
                onSelect?.(item.id)
                goHash('/tonight', { tag: item.id })
              }}
            />
            {on ? (
              <SavableField
                colors={colors}
                label={t('boards.name')}
                value={titleDraft}
                savedValue={book?.title || ''}
                onChangeText={setTitleDraft}
                onSave={(title) => {
                  if (!title) return false
                  setTitleDraft(title)
                  onChange({ ...book, title })
                }}
              />
            ) : null}
          </View>
        )
      })}
      <Row
        colors={colors}
        label={t('boards.add')}
        note={t('boards.addHint')}
        onPress={() => setAddMiss(onAdd?.() || '')}
      />
      {addMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{addMiss}</Text> : null}
      <KeyButton colors={colors} label={t('boards.home')} onPress={() => goHash('/tonight')} />
      <KeyButton colors={colors} label={t('boards.calendar')} onPress={() => goHash('/calendar')} />
      <KeyButton colors={colors} label={t('boards.feed')} onPress={() => goHash('/feed')} />
      <KeyButton colors={colors} label={t('boards.stats')} onPress={() => goHash('/stats')} />
      {boards?.length > 1 && book ? (
        <KeyButton
          colors={colors}
          label={t('boards.remove')}
          onPress={() => onRemove?.(book.id)}
        />
      ) : null}
    </ScreenShell>
  )
}

export function EnterScreen({ book, onSaveKeeper, returnTo }) {
  const colors = useHallColors()
  const named = keeperNamed(book)
  const locked = named && hasPin()
  const [person, setPerson] = useState(book?.keeperName || '')
  const [title, setTitle] = useState(
    book?.title && book.title !== 'My hall' && book.title !== 'My board' ? book.title : '',
  )
  const [pin, setPinDraft] = useState('')
  const [miss, setMiss] = useState('')

  function finish() {
    openSession()
    markWelcomeSeen()
    goHash(returnTo ?? enterLand('/tonight'))
  }

  function openNamed() {
    if (locked) {
      if (!checkPin(pin)) {
        setMiss(t('enter.missPin'))
        return
      }
      setMiss('')
      finish()
      return
    }
    const keeperName = person.trim()
    const boardTitle = title.trim() || book?.title || 'Did I'
    setMiss('')
    onSaveKeeper?.({ keeperName, title: boardTitle })
    finish()
  }

  return (
    <ScreenShell
      book={book}
      title={
        locked
          ? t('enter.openTitle', { board: book?.title })
          : named
            ? t('enter.backTitle')
            : t('enter.whoTitle')
      }
      colors={colors}
    >
      <Meta colors={colors}>{t('enter.body')}</Meta>
      {locked ? (
        <Field colors={colors} label={t('enter.pin')} value={pin} onChangeText={setPinDraft} />
      ) : (
        <>
          <Field colors={colors} label={t('enter.name')} value={person} onChangeText={setPerson} />
          <Field colors={colors} label={t('enter.board')} value={title} onChangeText={setTitle} />
        </>
      )}
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
      <DidButton
        colors={colors}
        label={
          locked ? t('enter.open') : named ? t('enter.openBoard', { board: book?.title }) : t('enter.openMine')
        }
        onPress={openNamed}
      />
      {!locked ? <KeyButton colors={colors} label={t('enter.later')} onPress={finish} /> : null}
    </ScreenShell>
  )
}

export function WelcomeScreen({ book }) {
  const colors = useHallColors()

  function finish() {
    markWelcomeSeen()
    const empty = (book?.lamps || []).filter((lamp) => !lamp.archived).length === 0
    goHash(empty ? '/first' : '/tonight')
  }

  return (
    <ScreenShell title={t('welcome.title')} colors={colors}>
      <Meta colors={colors}>{t('welcome.body')}</Meta>
      <DidButton colors={colors} label={t('welcome.start')} onPress={finish} />
    </ScreenShell>
  )
}

// The first question is a sentence to finish, written on the card it becomes.
// The first question comes up every day; the only choice here is from when.
function timed(next, question, askAfter) {
  if (!askAfter) return next
  const lamps = (next.lamps || []).map((lamp) => (lamp.question === question ? { ...lamp, askAfter } : lamp))
  return { ...next, lamps }
}

export function FirstNightScreen({ book, onChange, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const named = firstName(book)
  const [step, setStep] = useState(0)
  const [person, setPerson] = useState(book?.keeperName || '')
  const [blank, setBlank] = useState('')
  const [focused, setFocused] = useState(false)
  const [wave, setWave] = useState(0)
  const [askAfter, setAskAfter] = useState('')
  const reduce = useReduceMotion()
  const starters = unusedStarters(book, clock, true)
  const question = didQuestion(blank)
  const picked = starters.find((starter) => starter.question === question)
  const wobble = useWobble(starters.length, !blank.trim() && !focused, reduce)
  const totalSteps = named ? 2 : 3

  function withName(next) {
    const keeperName = person.trim()
    if (!keeperName) return next
    return { ...next, keeperName }
  }

  function land(next, face = '') {
    markWelcomeSeen()
    onChange?.(withName(next))
    goHash('/tonight', face ? { face } : '')
    offerPingPrimer(askAfter, colors)
  }

  function pick(starter) {
    setBlank(starterBlank(starter))
    setWave((count) => count + 1)
    playClick()
  }

  function finish() {
    if (picked) {
      land(timed(hangStarter(book, picked, clock, true), picked.question, askAfter))
      return
    }
    const lamp = {
      ...blankLamp(clock),
      question,
      short: shortFromQuestion(question, 24),
      cadence: 'daily',
      askAfter,
      slot: 'whenever',
    }
    land(hangInto(book, lamp), lamp.id)
  }

  function next() {
    if (step === 0) {
      if (!question) {
        playClick()
        wobble.nudge()
        return
      }
      playClick()
      setStep(1)
      return
    }
    if (step === 1 && !named) {
      playClick()
      setStep(2)
      return
    }
    finish()
  }

  function back() {
    playClick()
    setStep((current) => Math.max(0, current - 1))
  }

  return (
    <ScreenShell book={book} title={t('first.kicker')} colors={colors} locked>
      <Text style={[styles.stepCap, { color: colors.inkDim }]}>
        {t('first.stepOf', { n: step + 1, total: totalSteps })}
      </Text>
      {step === 0 ? (
        <>
          <Title colors={colors}>
            {named ? t('first.titleNamed', { name: named }) : t('first.title')}
          </Title>
          <Meta colors={colors}>{t('first.body')}</Meta>
          <View
            style={[
              ...faceCardStyle(colors),
              styles.firstCard,
              { borderColor: focused ? colors.onDeep : colors.line },
            ]}
          >
            <WaveLead text={t('tonight.didI')} wave={wave} colors={colors} style={faceCardStyles.title} />
            <AppTextInput
              colors={colors}
              value={blank}
              onChangeText={setBlank}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={next}
              placeholder={t('first.ownHint')}
              placeholderTextColor={withAlpha(colors.ink, 0.45)}
              accessibilityLabel={t('tonight.didI')}
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit
              multiline
              maxLength={120}
              style={[faceCardStyles.title, styles.firstBlank, { color: colors.ink }]}
            />
            <View style={[styles.firstSwipes, { borderTopColor: colors.lineSoft }]}>
              <Text style={[styles.firstSwipe, { color: colors.skip }]}>{t('first.swipeNope')}</Text>
              <Text style={[styles.firstSwipe, { color: colors.on }]}>{t('first.swipeDid')}</Text>
            </View>
          </View>
          <IdeaPicks
            label={t('first.picks')}
            starters={starters}
            picked={picked}
            onPick={pick}
            tilt={wobble.tilt}
            colors={colors}
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Title colors={colors}>{t('first.timeTitle')}</Title>
          <SetCap colors={colors}>{t('hang.secSchedule')}</SetCap>
          <SetCard colors={colors}>
            <SetRow colors={colors} icon="calendar" label={t('hang.when')} value={t('hang.daily')} sub={t('first.whenLater')} />
            <View style={styles.firstTime}>
              <HangTimePick value={askAfter} onChange={setAskAfter} colors={colors} />
            </View>
          </SetCard>
        </>
      ) : null}
      {step === 2 && !named ? (
        <Field
          colors={colors}
          label={t('first.name')}
          value={person}
          onChangeText={setPerson}
          placeholder={t('first.nameHint')}
          autoCapitalize="words"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={next}
        />
      ) : null}
      <View style={styles.stepNav}>
        {step > 0 ? <KeyButton colors={colors} label={t('first.back')} onPress={back} /> : null}
        <DidButton
          colors={colors}
          label={step === totalSteps - 1 ? t('first.add') : t('first.next')}
          onPress={next}
          dim={step === 0 && !question}
        />
      </View>
    </ScreenShell>
  )
}

// Pushes come from the server, which reads these switches from the synced prefs.
const PUSH_KINDS = new Set(['sends', 'cheers', 'friends', 'family'])

function PingKinds({ colors, on }) {
  const prefs = usePrefs()
  const [miss, setMiss] = useState('')

  async function flip(kind) {
    const was = readPrefs().pingsOff
    const off = was.includes(kind) ? was.filter((k) => k !== kind) : [...was, kind]
    writePrefs({ pingsOff: off })
    setMiss('')
    if (!PUSH_KINDS.has(kind)) {
      armLampPings(readShelf().boards).catch(() => {})
      return
    }
    const saved = await saveProfile({ prefs: readPrefs() })
    // Signed out there are no pushes, so the switch only has to hold here.
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      writePrefs({ pingsOff: was })
      setMiss(t('pings.kindsMiss'))
    }
  }

  async function flipPrivate() {
    const was = readPrefs().pingsPrivate
    writePrefs({ pingsPrivate: !was })
    setMiss('')
    const saved = await saveProfile({ prefs: readPrefs() })
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      writePrefs({ pingsPrivate: was })
      setMiss(t('pings.kindsMiss'))
    }
  }

  return (
    <>
      <SetCap colors={colors}>{t('pings.kindsCap')}</SetCap>
      {on ? null : <SetNote colors={colors}>{t('pings.offNote')}</SetNote>}
      <SetCard colors={colors}>
        {PING_KINDS.map((kind, i) => (
          <SetSwitch
            key={kind}
            colors={colors}
            label={t(`pings.kind.${kind}`)}
            sub={t(`pings.kind.${kind}Sub`)}
            on={!prefs.pingsOff.includes(kind)}
            last={i === PING_KINDS.length - 1}
            onPress={() => flip(kind)}
          />
        ))}
      </SetCard>
      <SetNote colors={colors}>{t('pings.kindsNote')}</SetNote>
      <SetCard colors={colors}>
        <SetSwitch
          colors={colors}
          label={t('pings.private')}
          sub={t('pings.privateSub')}
          on={prefs.pingsPrivate}
          last
          onPress={flipPrivate}
        />
      </SetCard>
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
    </>
  )
}

export function PingScreen({ book, now, onAskPings, pingLabel }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const labelKey = pingLabel || 'pings.state.on'
  const on = labelKey === 'pings.state.on'
  const fires = upcomingPings(book, clock)

  return (
    <ScreenShell title={t('pings.title')} colors={colors}>
      <Meta colors={colors}>{t('pings.body')}</Meta>
      {onAskPings ? (
        <DidButton
          colors={colors}
          label={on ? t('pings.on') : labelKey === 'pings.state.blocked' ? t('pings.openSettings') : t(labelKey)}
          onPress={onAskPings}
        />
      ) : (
        <Meta colors={colors}>{t('pings.noBrowser')}</Meta>
      )}
      <PingKinds colors={colors} on={on} />
      <Text style={[styles.slot, { color: colors.inkSoft }]}>{t('pings.waitingTonight')}</Text>
      {!fires.length ? (
        <Meta colors={colors}>{t('pings.emptyTonight')}</Meta>
      ) : (
        fires.map((fire) => (
          <Row
            key={fire.id}
            colors={colors}
            label={shortFromQuestion(fire.question) || t('lamp.unnamed')}
            note={foldClock(fire.at)}
            onPress={() => goHash('/tonight', { face: fire.id })}
          />
        ))
      )}
      <KeyButton colors={colors} label={t('pings.comingUp')} onPress={() => goHash('/later')} />
      <KeyButton colors={colors} label={t('pings.help')} onPress={() => goHash('/help')} />
    </ScreenShell>
  )
}

function PhoneLockSection({ colors }) {
  const [pinDraft, setPinDraft] = useState('')
  const [pinMiss, setPinMiss] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [pinOn, setPinOn] = useState(hasPin)
  const locked = pinOn

  function saveLock() {
    if (!setPin(pinDraft)) {
      setPinMiss(t('settings.pinDigits'))
      setPinSaved(false)
      return
    }
    setPinMiss('')
    setPinDraft('')
    setPinOn(true)
    setPinSaved(true)
    setTimeout(() => setPinSaved(false), 2000)
  }

  return (
    <>
      <SetCap colors={colors}>{t('account.lockCap')}</SetCap>
      <Meta colors={colors}>{locked ? t('settings.lockOn') : t('settings.lockOff')}</Meta>
      <Field
        colors={colors}
        label={locked ? t('settings.newNumber') : t('settings.number')}
        value={pinDraft}
        onChangeText={setPinDraft}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />
      <Row colors={colors} label={locked ? t('settings.changeNumber') : t('settings.lockPhone')} onPress={saveLock} />
      {locked ? (
        <Row
          colors={colors}
          label={t('settings.removeLock')}
          onPress={() => {
            clearPin()
            setPinDraft('')
            setPinMiss('')
            setPinOn(false)
          }}
        />
      ) : null}
      {pinMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{pinMiss}</Text> : null}
      {pinSaved ? <Text style={[styles.saved, { color: colors.on }]}>{t('settings.saved')}</Text> : null}
    </>
  )
}

function AccountSignedOut({ on }) {
  const colors = useHallColors()
  const auth = useAuthSignIn({})

  if (!on) {
    return (
      <ScreenShell title={t('account.offTitle')} colors={colors}>
        <Meta colors={colors}>{t('account.offBody')}</Meta>
        <Meta colors={colors}>{t('account.offTester')}</Meta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('account.outTitle')} colors={colors}>
      <Text style={[styles.accountLead, { color: colors.inkSoft }]}>{t('account.outBody')}</Text>

      <AuthEmailCard
        colors={colors}
        auth={auth}
        body=""
        footer={<KeyButton colors={colors} label={t('account.stay')} onPress={() => goHash('/settings')} />}
      />

      <View style={[styles.lockPanel, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
        <PhoneLockSection colors={colors} />
      </View>
    </ScreenShell>
  )
}

function deviceSeen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: !uses24h(),
  })
}

function AccountSignedIn({ book, email, onChange }) {
  const colors = useHallColors()
  const sync = useSync()
  const purse = normalizePurse(book)
  const myAvatar = useMyAvatar()
  const [nameDraft, setNameDraft] = useState(book?.keeperName || '')
  const [devices, setDevices] = useState([])
  const [sure, setSure] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMiss, setPhotoMiss] = useState('')
  const here = deviceKey()
  const canPhoto = canPickAvatar()

  useEffect(() => {
    setNameDraft(book?.keeperName || '')
  }, [book?.keeperName])

  useEffect(() => {
    let alive = true
    listDevices().then((rows) => {
      if (alive) setDevices(rows)
    })
    loadProfile().then((row) => {
      if (alive && row?.display_name && !book?.keeperName) setNameDraft(row.display_name)
    })
    return () => {
      alive = false
    }
  }, [book?.keeperName, sync.at])

  const syncNote =
    sync.how === 'busy'
      ? t('account.syncBusy')
      : sync.how === 'miss'
        ? t('account.syncMiss')
        : sync.how === 'saved'
          ? t('account.syncSaved', { time: stampWhen(sync.at) })
          : t('account.syncIdle')

  const lookName = LOOKS.find((item) => item.id === purse.lookOn)?.name || purse.lookOn
  const cheerName = CHEERS.find((item) => item.id === purse.cheerOn)?.name || purse.cheerOn
  // This phone first, then the rest by when they were last seen.
  const phones = [...devices].sort((a, b) => (a.device_key === here ? -1 : b.device_key === here ? 1 : 0))
  const others = phones.filter((row) => row.device_key !== here)

  async function download() {
    const all = await exportAll()
    await shareShelf(all)
  }

  async function pickPhoto(from) {
    setPhotoMiss('')
    setPhotoBusy(true)
    try {
      const bytes = await pickAvatarBytes(from)
      if (bytes) {
        const out = await saveAvatar(bytes)
        if (out.miss) setPhotoMiss(t(out.miss))
      }
    } catch (error) {
      setPhotoMiss(t(error?.message === 'camera-denied' ? 'avatar.cameraOff' : 'avatar.saveFail'))
    }
    setPhotoBusy(false)
  }

  function forgetOne(row) {
    setSure({
      title: t('account.forgetTitle'),
      body: t('account.forgetBody', { phone: row.label || t('account.aPhone') }),
      yes: t('account.forgetYes'),
      go: async () => {
        await forgetDevice(row.device_key)
        setDevices(await listDevices())
      },
    })
  }

  return (
    <ScreenShell title={t('account.inTitle')} colors={colors}>
      <View style={styles.accountHead}>
        <Avatar person={{ display_name: nameDraft || email, avatar_url: myAvatar }} colors={colors} size={72} />
        <View style={styles.accountWho}>
          <Text style={[styles.accountName, { color: colors.ink }]} numberOfLines={1}>
            {nameDraft || t('account.noName')}
          </Text>
          <Text style={[styles.accountEmail, { color: colors.inkDim }]} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>

      <SetCap colors={colors}>{t('account.profileCap')}</SetCap>
      <SetCard colors={colors}>
        {canPhoto ? (
          <SetRow
            colors={colors}
            icon="person"
            tint={colors.on}
            label={myAvatar ? t('avatar.change') : t('avatar.add')}
            sub={photoBusy ? t('avatar.saving') : t('avatar.sub')}
            chevron
            onPress={photoBusy ? undefined : () => pickPhoto('library')}
          />
        ) : null}
        {canPhoto && canTakePhoto() ? (
          <SetRow
            colors={colors}
            icon="camera"
            tint={colors.on}
            label={t('avatar.takePhoto')}
            chevron
            onPress={photoBusy ? undefined : () => pickPhoto('camera')}
          />
        ) : null}
        {canPhoto ? null : (
          <SetRow colors={colors} icon="person" tint={colors.inkSoft} label={t('avatar.add')} sub={t('avatar.needUpdate')} />
        )}
        {myAvatar ? (
          <SetRow
            colors={colors}
            icon="trash"
            label={t('avatar.remove')}
            onPress={async () => {
              setPhotoMiss('')
              const out = await removeAvatar()
              if (out.miss) setPhotoMiss(t(out.miss))
            }}
          />
        ) : null}
        <SavableSetField
          colors={colors}
          label={t('account.name')}
          value={nameDraft}
          savedValue={book?.keeperName || ''}
          onChangeText={setNameDraft}
          onSave={(keeperName) => {
            setNameDraft(keeperName)
            onChange({ ...book, keeperName })
            saveProfile({ display_name: keeperName, look_on: purse.lookOn, badge_cheer: purse.cheerOn })
          }}
        />
        <SetRow colors={colors} icon="wallpaper" label={t('account.look')} value={lookName} chevron onPress={() => goHash('/kit')} />
        <SetRow colors={colors} icon="collection" label={t('account.cheer')} value={cheerName} chevron last onPress={() => goHash('/kit')} />
      </SetCard>
      {photoMiss ? <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">{photoMiss}</Text> : null}

      <SetCap colors={colors}>{t('account.syncCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="globe" label={t('account.syncNow')} sub={syncNote} last onPress={() => pullAndMerge()} />
      </SetCard>
      {sync.how === 'miss' && sync.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]}>{tMiss(sync.miss)}</Text>
      ) : null}

      <PhoneLockSection colors={colors} />

      <SetCap colors={colors}>{t('account.devices')}</SetCap>
      <SetNote colors={colors}>{t('account.devicesNote')}</SetNote>
      <SetCard colors={colors}>
        {phones.length ? (
          phones.map((row, at) => (
            <SetRow
              key={row.device_key}
              colors={colors}
              icon={row.platform === 'web' ? 'globe' : 'person'}
              tint={row.device_key === here ? colors.on : colors.inkSoft}
              label={row.device_key === here ? t('account.thisPhone') : row.label || t('account.aPhone')}
              sub={t('account.seen', { date: deviceSeen(row.last_seen_at) })}
              value={row.device_key === here ? '' : t('account.forgetShort')}
              last={at === phones.length - 1}
              onPress={row.device_key === here ? undefined : () => forgetOne(row)}
            />
          ))
        ) : (
          <SetRow colors={colors} label={t('account.noDevices')} last />
        )}
      </SetCard>
      {others.length > 1 ? (
        <KeyButton
          colors={colors}
          label={t('account.forgetOthers', { n: others.length })}
          onPress={() =>
            setSure({
              title: t('account.forgetOthersTitle'),
              body: t('account.forgetOthersBody'),
              yes: t('account.forgetYes'),
              go: async () => {
                await forgetOtherDevices()
                setDevices(await listDevices())
              },
            })
          }
        />
      ) : null}

      <SetCap colors={colors}>{t('account.data')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="note" label={t('account.export')} sub={t('account.exportSub')} chevron last onPress={download} />
      </SetCard>

      <SetCap colors={colors}>{t('account.leaveCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="logout"
          label={t('account.out')}
          onPress={async () => {
            await signOutHere()
            signedOutSync()
          }}
        />
        <SetRow
          colors={colors}
          icon="logout"
          label={t('account.outAll')}
          onPress={() =>
            setSure({
              title: t('account.outAllTitle'),
              body: t('account.outAllBody'),
              yes: t('account.outAllYes'),
              go: async () => {
                await signOutEverywhere()
                signedOutSync()
              },
            })
          }
        />
        <SetRow
          colors={colors}
          icon="trash"
          danger
          last
          label={t('account.delete')}
          onPress={() =>
            setSure({
              title: t('account.deleteTitle'),
              body: t('account.deleteBody'),
              yes: t('account.deleteYes'),
              go: async () => {
                await deleteAccount()
                signedOutSync()
              },
            })
          }
        />
      </SetCard>
      <SureModal
        sure={sure}
        colors={colors}
        onClose={() => setSure(null)}
        onGo={() => {
          const go = sure?.go
          setSure(null)
          if (typeof go === 'function') go()
        }}
      />
    </ScreenShell>
  )
}

export function AccountScreen({ book, onChange }) {
  const account = useAccount()
  if (account.user) {
    return <AccountSignedIn book={book} email={account.email} onChange={onChange} />
  }
  return <AccountSignedOut on={account.on} />
}

const styles = StyleSheet.create({
  accountHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  accountWho: { flex: 1, minWidth: 0, gap: 2 },
  accountName: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  accountEmail: { fontFamily: fonts.ui, fontSize: 14 },
  accountLead: {
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  lockPanel: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  block: { gap: 4 },
  blockTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', marginTop: 8 },
  slot: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  firstCard: { justifyContent: 'flex-start', marginTop: 8, paddingBottom: 0 },
  firstBlank: { padding: 0, paddingTop: 0, minHeight: 32 },
  firstSwipes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  firstSwipe: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6 },
  firstTime: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 14 },
  stepCap: { ...sectionLabel, marginBottom: 6 },
  stepNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, alignItems: 'center' },
  idea: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 8 },
  ideaQ: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  saved: { fontFamily: fonts.uiSemi, fontSize: 12, marginTop: 6 },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  popBody: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  week: { gap: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'center' },
  weekName: { width: 96, paddingRight: 8 },
  weekNameText: { fontFamily: fonts.ui, fontSize: 13 },
  weekHeadCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekDow: { fontFamily: fonts.mono, fontSize: 10 },
  weekDay: { fontFamily: fonts.mono, fontSize: 10 },
  weekCell: { width: 14, height: 14, borderRadius: 4 },
})
