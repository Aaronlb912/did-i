import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { ACHIEVEMENTS, markText, streakLength } from '../../src/lib/achievements.js'
import {
  accountMissText,
  checkCode,
  deleteAccount,
  deviceKey,
  looksLikeEmail,
  sendCode,
  signOutEverywhere,
  signOutHere,
  useAccount,
} from '../../src/lib/account.js'
import {
  exportAll,
  forgetDevice,
  listDevices,
  loadProfile,
  saveProfile,
} from '../../src/lib/cloud-sync.js'
import { blankLamp, shortLabel } from '../../src/lib/board-json.js'
import { hangInto } from '../../src/lib/board-ops.js'
import { currentBook, liveLampCount, readShelf } from '../../src/lib/board-shelf.js'
import { pullAndMerge, signedOutSync, useSync } from '../../src/lib/cloud-sync.js'
import { hallHeat } from '../../src/lib/hall-feel.js'
import {
  clockWords,
  comingDays,
  feedRows,
  markWelcomeSeen,
  statsCounts,
  tapWhen,
  weekCell,
  weekLamps,
  weekNights,
} from '../../src/lib/hall-pages.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { CHEERS, LOOKS, normalizePurse } from '../../src/lib/purse.js'
import { shareShelf } from '../../src/lib/native.js'
import { upcomingPings } from '../../src/lib/notify.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { checkPin, firstName, hasPin, keeperNamed, openSession } from '../../src/lib/session.js'
import { hangStarter, unusedStarters } from '../../src/lib/starters.js'
import { leftoverOn } from '../../src/lib/tags.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { CalendarGrid } from '../components/CalendarGrid.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { DidButton, Field, KeyButton, Meta, Page, Row } from '../components/ui.jsx'

const IDEA_IDS = ['pills', 'door', 'keys', 'bins', 'water', 'charge']

// Signing every phone out and deleting an account do not come back.
function SureModal({ sure, colors, onClose, onGo }) {
  return (
    <Modal visible={Boolean(sure)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
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

function ScreenShell({ book, title, children, colors, showAdd = false }) {
  const live = book || currentBook(readShelf())
  const clock = new Date()
  const date = formatBoardDate(boardDate(clock, live.dayFoldHour))
  return (
    <BoardShell book={live} title={title} date={date} colors={colors} showAdd={showAdd}>
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

function answerLabel(row) {
  if (!row.answer) {
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
    <ScreenShell title={t('help.title')} colors={colors}>
      <Meta colors={colors}>{t('help.lead')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.tonight')}</Text>
      <Meta colors={colors}>{t('help.tonightP1')}</Meta>
      <Meta colors={colors}>{t('help.tonightP2')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.streak')}</Text>
      <Meta colors={colors}>{t('help.streakP')}</Meta>
      <KeyButton colors={colors} label={t('help.marks')} onPress={() => goHash('/marks')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.phone')}</Text>
      <Meta colors={colors}>{t('help.phoneP')}</Meta>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.legal')}</Text>
      <Meta colors={colors}>{t('help.legalP')}</Meta>
      <KeyButton colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
      <KeyButton colors={colors} label={t('settings.terms')} onPress={() => goHash('/terms')} />
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
                note={answerLabel(row)}
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

export function MarksScreen({ book, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const have = new Set(book?.unlocked || [])

  return (
    <ScreenShell book={book} title={t('marks.title')} colors={colors}>
      <Meta colors={colors}>{t('marks.streak', { n: heat })}</Meta>
      {book?.quietMode ? (
        <Meta colors={colors}>{t('marks.hidden')}</Meta>
      ) : (
        ACHIEVEMENTS.map((item) => {
          const on = have.has(item.id)
          return (
            <View key={item.id} style={[styles.markRow, { borderColor: colors.line }]}>
              <Text style={[styles.markName, { color: colors.ink }]}>
                {on ? t(markText(item.id, 'name')) : t('marks.notYet')}
              </Text>
              <Text style={[styles.markLine, { color: colors.inkSoft }]}>
                {on ? t(markText(item.id, 'line')) : t(markText(item.id, 'name'))}
              </Text>
            </View>
          )
        })
      )}
      <DidButton colors={colors} label={t('marks.home')} onPress={() => goHash('/tonight')} />
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
  const today = formatBoardDate(boardDate(clock, book?.dayFoldHour))

  return (
    <ScreenShell title={t('cal.aria')} colors={colors}>
      <Meta colors={colors}>{today}</Meta>
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

  useEffect(() => {
    if (!book || !onChange) return undefined
    const title = titleDraft.trim()
    if (!title || title === (book.title || '')) return undefined
    const timer = setTimeout(() => onChange({ ...book, title }), 400)
    return () => clearTimeout(timer)
  }, [titleDraft, book, onChange])

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
              <Field
                colors={colors}
                label={t('boards.name')}
                value={titleDraft}
                onChangeText={setTitleDraft}
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

export function EnterScreen({ book, onSaveKeeper, returnTo = '/tonight' }) {
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
    goHash(returnTo || '/tonight')
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

function asQuestion(raw) {
  let question = String(raw || '').trim()
  if (!question) return ''
  if (!/^did i\b/i.test(question)) question = `Did I ${question}`
  if (!question.endsWith('?')) question += '?'
  return question
}

function shortFrom(question) {
  return question
    .replace(/^Did I /i, '')
    .replace(/\?$/, '')
    .slice(0, 24)
}

export function FirstNightScreen({ book, onChange, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const named = firstName(book)
  const [person, setPerson] = useState(book?.keeperName || '')
  const [own, setOwn] = useState('')
  const starters = unusedStarters(book, clock, true)

  function withName(next) {
    const keeperName = person.trim()
    if (!keeperName) return next
    return { ...next, keeperName }
  }

  function land(next, face = '') {
    markWelcomeSeen()
    onChange?.(withName(next))
    goHash('/tonight', face ? { face } : '')
  }

  function addOwn() {
    const question = asQuestion(own)
    if (!question) return
    const lamp = {
      ...blankLamp(clock),
      question,
      short: shortFrom(question),
      cadence: 'daily',
      askAfter: '',
      slot: 'whenever',
    }
    land(hangInto(book, lamp), lamp.id)
  }

  return (
    <ScreenShell
      book={book}
      title={named ? t('first.titleNamed', { name: named }) : t('first.title')}
      colors={colors}
    >
      <Meta colors={colors}>{t('first.body')}</Meta>
      {!named ? (
        <Field colors={colors} label={t('first.name')} value={person} onChangeText={setPerson} />
      ) : null}
      {starters.length ? (
        <>
          <Text style={[styles.slot, { color: colors.inkSoft }]}>{t('first.picks')}</Text>
          {starters.map((starter) => (
            <KeyButton
              key={starter.short}
              colors={colors}
              label={starter.short}
              onPress={() => land(hangStarter(book, starter, clock, true))}
            />
          ))}
        </>
      ) : null}
      <Field colors={colors} label={t('first.own')} value={own} onChangeText={setOwn} />
      <DidButton colors={colors} label={t('first.add')} onPress={addOwn} />
    </ScreenShell>
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
        <DidButton colors={colors} label={on ? t('pings.on') : t(labelKey)} onPress={onAskPings} />
      ) : (
        <Meta colors={colors}>{t('pings.noBrowser')}</Meta>
      )}
      <Text style={[styles.slot, { color: colors.inkSoft }]}>{t('pings.waitingTonight')}</Text>
      {!fires.length ? (
        <Meta colors={colors}>{t('pings.emptyTonight')}</Meta>
      ) : (
        fires.map((fire) => (
          <Row
            key={fire.id}
            colors={colors}
            label={fire.question.replace(/^Did I\s+/i, '').replace(/\?+$/, '')}
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

function AccountSignedOut({ on }) {
  const colors = useHallColors()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')

  async function ask() {
    if (!looksLikeEmail(email)) {
      setMiss(t('account.missEmail'))
      return
    }
    setBusy(true)
    const { miss: bad } = await sendCode(email)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      return
    }
    setMiss('')
    setStep('code')
  }

  async function open() {
    setBusy(true)
    const { miss: bad } = await checkCode(email, code)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      return
    }
    setMiss('')
    await pullAndMerge()
  }

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
      <Meta colors={colors}>{t('account.outBody')}</Meta>
      <Field
        colors={colors}
        label={t('account.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {step === 'code' ? (
        <Field colors={colors} label={t('account.code')} value={code} onChangeText={setCode} />
      ) : null}
      {step === 'code' ? <Meta colors={colors}>{t('account.sent', { email })}</Meta> : null}
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
      <Meta colors={colors}>
        {t('legal.signInLead')} {t('legal.termsShort')} {t('legal.linksAnd')} {t('legal.privacyShort')}.
      </Meta>
      {step === 'email' ? (
        <DidButton colors={colors} label={t('account.send')} disabled={busy} onPress={ask} />
      ) : (
        <>
          <DidButton colors={colors} label={t('account.signIn')} disabled={busy} onPress={open} />
          <KeyButton colors={colors} label={t('account.again')} disabled={busy} onPress={ask} />
          <KeyButton
            colors={colors}
            label={t('account.other')}
            onPress={() => {
              setStep('email')
              setCode('')
              setMiss('')
            }}
          />
        </>
      )}
      <KeyButton colors={colors} label={t('account.stay')} onPress={() => goHash('/settings')} />
      <KeyButton colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
      <KeyButton colors={colors} label={t('settings.terms')} onPress={() => goHash('/terms')} />
    </ScreenShell>
  )
}

function deviceSeen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function AccountSignedIn({ book, email, onChange }) {
  const colors = useHallColors()
  const sync = useSync()
  const purse = normalizePurse(book)
  const [nameDraft, setNameDraft] = useState(book?.keeperName || '')
  const [devices, setDevices] = useState([])
  const [sure, setSure] = useState(null)
  const here = deviceKey()

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

  useEffect(() => {
    if (!book || !onChange) return undefined
    const keeperName = nameDraft.trim()
    if (keeperName === (book.keeperName || '')) return undefined
    const timer = setTimeout(() => {
      onChange({ ...book, keeperName })
      saveProfile({ display_name: keeperName, look_on: purse.lookOn, badge_cheer: purse.cheerOn })
    }, 400)
    return () => clearTimeout(timer)
  }, [nameDraft, book, onChange, purse.cheerOn, purse.lookOn])

  const syncNote =
    sync.how === 'busy'
      ? t('account.syncBusy')
      : sync.how === 'miss'
        ? t('account.syncMiss')
        : sync.how === 'saved'
          ? t('account.syncSaved', { time: sync.at || '' })
          : t('account.syncIdle')

  const lookName = LOOKS.find((item) => item.id === purse.lookOn)?.name || purse.lookOn
  const cheerName = CHEERS.find((item) => item.id === purse.cheerOn)?.name || purse.cheerOn

  async function download() {
    const all = await exportAll()
    await shareShelf(all)
  }

  return (
    <ScreenShell title={t('account.inTitle')} colors={colors}>
      <Row colors={colors} label={t('account.who')} note={email} />
      <Row colors={colors} label={t('account.syncNow')} note={syncNote} onPress={() => pullAndMerge()} />
      {sync.how === 'miss' && sync.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]}>{tMiss(sync.miss)}</Text>
      ) : null}
      <Field colors={colors} label={t('account.name')} value={nameDraft} onChangeText={setNameDraft} />
      <Row colors={colors} label={t('account.look')} note={lookName} onPress={() => goHash('/kit')} />
      <Row colors={colors} label={t('account.cheer')} note={cheerName} onPress={() => goHash('/kit')} />

      <Text style={[styles.slot, { color: colors.inkSoft }]}>{t('account.devices')}</Text>
      {devices.length ? (
        devices.map((row) => (
          <Row
            key={row.device_key}
            colors={colors}
            label={row.device_key === here ? t('account.thisPhone') : row.label || t('account.aPhone')}
            note={t('account.seen', { date: deviceSeen(row.last_seen_at) })}
            onPress={
              row.device_key === here
                ? undefined
                : async () => {
                    await forgetDevice(row.device_key)
                    setDevices(await listDevices())
                  }
            }
          />
        ))
      ) : (
        <Meta colors={colors}>{t('account.noDevices')}</Meta>
      )}

      <Text style={[styles.slot, { color: colors.inkSoft }]}>{t('account.data')}</Text>
      <Row colors={colors} label={t('account.export')} onPress={download} />
      <KeyButton
        colors={colors}
        label={t('account.out')}
        onPress={async () => {
          await signOutHere()
          signedOutSync()
        }}
      />
      <KeyButton
        colors={colors}
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
      <KeyButton
        colors={colors}
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
  block: { gap: 4 },
  blockTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', marginTop: 8 },
  slot: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  markRow: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4, marginBottom: 8 },
  markName: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '700' },
  markLine: { fontFamily: fonts.ui, fontSize: 13 },
  idea: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 8 },
  ideaQ: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
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
