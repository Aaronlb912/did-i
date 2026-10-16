import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import {
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { commitBook, shelfMarks, streakLength } from '../../src/lib/achievements.js'
import { MarksGrid } from '../components/MarksGrid.jsx'
import { EmptyCard } from '../components/PersonCard.jsx'
import { clearNotices, markNoticesSeen, restoreNotices, useNotices } from '../../src/lib/notices.js'
import { useUndoToast } from '../lib/toast-queue.js'
import { DELETE_UNDO_MS } from '../../src/lib/undo-times.js'
import { AppVersion } from '../components/AppVersion.jsx'
import { MenuIcon } from '../components/MenuIcon.jsx'
import {
  accountMissText,
  checkCode,
  deleteAccount,
  deviceKey,
  sendCode,
  signOutEverywhere,
  signOutHere,
  useAccount,
} from '../../src/lib/account.js'
import {
  DEVICE_NAME_MAX,
  exportAll,
  forgetDevice,
  renameDevice,
  forgetOtherDevices,
  listDevices,
  keptProfileName,
  loadProfile,
  saveProfile,
} from '../../src/lib/cloud-sync.js'
import {
  didQuestion,
  isOnceBy,
  lampNotifyOn,
  shortFromQuestion,
  shortLabel,
} from '../../src/lib/board-json.js'
import { emptyBoard, newBoardId } from '../../src/lib/board-json.js'
import { currentBook, enterLand, liveLampCount, readShelf } from '../../src/lib/board-shelf.js'
import { pullAndMerge, signedOutSync, useSync } from '../../src/lib/cloud-sync.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { bestShelfStreak, freezeState, shelfStreak } from '../../src/lib/hall-feel.js'
import {
  clockWords,
  comingDays,
  markWelcomeSeen,
  nextStreakGoal,
  shelfFeedRows,
  shelfNoteRows,
  shelfStatsCounts,
  shelfWeekNights,
  stampWhen,
  streakBreak,
  tapWhen,
  weekCell,
  weekLamps,
  weekRecap,
  weekStripNights,
  feedSearch,
} from '../../src/lib/hall-pages.js'
import { shareRecap } from '../components/WeekRecap.jsx'
import { openNightWhy } from '../components/NightSheets.jsx'
import { FreezeChip, freezeLine, openFreezeHow } from '../components/FreezeBits.jsx'
import { weCardState, weCardsOn } from '../../src/lib/we-nights.js'
import { weCardShort } from '../../src/lib/did-we.js'
import { bestQuestionStreak } from '../../src/lib/lamp-record.js'
import { SearchBox } from './questions.jsx'
import { t, tMiss } from '../../src/lib/i18n.js'
import { readMine, usePeoplePulse } from '../../src/lib/people.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { PING_KINDS, readPrefs, usePrefs, uses24h, writePrefs } from '../../src/lib/prefs.js'
import { CHEERS, LOOKS, cheerText, lookText, normalizePurse } from '../../src/lib/purse.js'
import { pingTest, playClick, shareShelf } from '../../src/lib/native.js'
import { syncLine } from '../../src/lib/sync-line.js'
import {
  checkPin,
  clearPin,
  firstName,
  hasPin,
  keeperNamed,
  openSession,
  setPin,
} from '../../src/lib/session.js'
import { armLampPings, requestPings, upcomingPings } from '../../src/lib/notify.js'
import { syncPushTokenIfAllowed } from '../../src/lib/push.js'
import { boardDate, formatBoardDate, isEvery, nightOpen, periodLabel, periodNight } from '../../src/lib/recurrence.js'
import { packList } from '../../src/lib/starters.js'
import { FIRST_TIME, firstRunBook, isNewShelf, togglePack, togglePick } from '../../src/lib/first-run.js'
import { FirstPacks } from '../components/FirstPacks.jsx'
import { cloudSetUp } from '../../src/lib/cloud.js'
import { authSkipped, clearAuthSkip } from '../../src/lib/auth-gate.js'
import { AuthLegalNote } from '../components/AuthLegalNote.jsx'
import { leftoverOn, scopedBooks, tagIdsOf } from '../../src/lib/tags.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { KEEP, useKept } from '../hooks/useKept.js'
import { goHash } from '../navigation/hash.js'
import { fonts, radius, sectionLabel, withAlpha } from '../theme.js'
import { CalendarGrid, YearGrid } from '../components/CalendarGrid.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { AuthEmailCard } from '../components/AuthEmailCard.jsx'
import { SavableSetField } from '../components/SavableSetField.jsx'
import { Avatar } from '../components/PersonCard.jsx'
import { removeAvatar, saveAvatar, useMyAvatar } from '../../src/lib/avatar.js'
import { canPickAvatar, canTakePhoto, pickAvatarBytes } from '../lib/avatar-pick.js'
import { AppTextInput, ChipRow, DidButton, Field, Kicker, KeyButton, Meta, Page, Row, Title } from '../components/ui.jsx'
import { SetCap, SetCard, SetField, SetNote, SetRow, SetSheet, SetSwitch } from '../components/SetBits.jsx'
import { SetChoice } from '../components/SetChoice.jsx'
import { HangTimePick } from '../components/HangTimePick.jsx'
import { WaveLead } from '../components/DidLead.jsx'
import { pressFx, Reveal } from '../lib/motion.jsx'
import { leaveAccount } from '../lib/leave-account.js'
import { missDot } from '../palette.js'

const IDEA_IDS = ['pills', 'water', 'text', 'skin', 'bill', 'charge']

// Signing every phone out and deleting an account do not come back.
export function SureModal({ sure, colors, onClose, onGo }) {
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
export function ScreenShell({ book, title, children, colors, showAdd = false, locked = false, scrollHandle, footer }) {
  const live = book || currentBook(readShelf())
  return (
    <BoardShell
      book={live}
      title={title}
      colors={colors}
      showAdd={showAdd}
      back={locked ? false : undefined}
      showCogs={!locked}
      scrollHandle={scrollHandle}
      footer={footer}
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

// A skip reads Not yet while its night is open, Nope once it closed.
function statusWord(status, open = false) {
  if (status === 'yes') return t('feed.status.did')
  if (status === 'late') return t('feed.status.late')
  if (status === 'skip') return t(open ? 'jewelKey.notYet' : 'feed.status.nope')
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
  // Tonight and the nights ahead are still open.
  return t('jewelKey.notYet')
}

export function AboutScreen({ book }) {
  const colors = useHallColors()
  return (
    <ScreenShell book={book} title={t('about.title')} colors={colors}>
      <View style={[styles.hero, { backgroundColor: withAlpha(colors.on, 0.12), borderColor: colors.on }]}>
        <Text style={[styles.cardBody, { color: colors.ink }]}>{t('about.p1')}</Text>
      </View>
      {['p2', 'p3', 'p4', 'p5'].map((id) => (
        <View key={id} style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{t(`about.${id}Title`)}</Text>
          <Text style={[styles.cardBody, { color: colors.inkSoft }]}>{t(`about.${id}`)}</Text>
        </View>
      ))}
      <View style={[styles.card, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
        <DidButton colors={colors} label={t('about.home')} onPress={() => goHash('/tonight')} />
        <KeyButton colors={colors} label={t('about.how')} onPress={() => goHash('/help')} />
        <AppVersion colors={colors} />
      </View>
    </ScreenShell>
  )
}

// What friends and family can see, in plain words. The streak line reads the
// real share_streak on your profile; the rest follows from how people.js shares.
const SEEN_ROWS = ['friends', 'we', 'family', 'asks', 'never']

export function SeenScreen({ book }) {
  const colors = useHallColors()
  const account = useAccount()
  const [streakOn, setStreakOn] = useState(null)
  useEffect(() => {
    if (!account.user) return undefined
    let alive = true
    readMine()
      .then((mine) => alive && setStreakOn(mine?.share_streak !== false))
      .catch(() => alive && setStreakOn(null))
    return () => {
      alive = false
    }
  }, [account.user])
  let streakLine = t('seen.streakUnknown')
  if (!account.user) streakLine = t('seen.signedOut')
  else if (streakOn === true) streakLine = t('seen.streakOn')
  else if (streakOn === false) streakLine = t('seen.streakOff')
  return (
    <ScreenShell book={book} title={t('seen.title')} colors={colors}>
      <View style={[styles.hero, { backgroundColor: withAlpha(colors.on, 0.12), borderColor: colors.on }]}>
        <Text style={[styles.cardBody, { color: colors.ink }]}>{streakLine}</Text>
      </View>
      {SEEN_ROWS.map((id) => (
        <View key={id} style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{t(`seen.${id}Title`)}</Text>
          <Text style={[styles.cardBody, { color: colors.inkSoft }]}>{t(`seen.${id}`)}</Text>
        </View>
      ))}
      <View style={[styles.card, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
        <KeyButton colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
        <KeyButton colors={colors} label={t('seen.back')} onPress={() => goHash('/settings')} />
      </View>
    </ScreenShell>
  )
}

// One topic group of the help page; folded until tapped so the page scans.
function HelpFold({ colors, title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((was) => !was)}
        style={styles.foldHead}
      >
        <Text style={[styles.cardTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.slotChev, { color: colors.inkDim }]}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? <Reveal style={styles.foldBody}>{children}</Reveal> : null}
    </View>
  )
}

export function HelpScreen() {
  const colors = useHallColors()
  return (
    <ScreenShell title={t('settings.howDidIWorks')} colors={colors}>
      <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.lead')}</Meta>
        <KeyButton colors={colors} label={t('settings.ideas')} onPress={() => goHash('/ideas')} />
        <KeyButton colors={colors} label={t('settings.what')} onPress={() => goHash('/about')} />
      </View>
      <HelpFold colors={colors} title={t('help.groupDaily')}>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.tonight')}</Text>
        <Meta colors={colors}>{t('help.tonightP1')}</Meta>
        <Meta colors={colors}>{t('help.tonightP2', { time: clockWords('09:00') })}</Meta>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.streak')}</Text>
        <Meta colors={colors}>{t('help.streakP', { time: clockWords('09:00') })}</Meta>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('freeze.howTitle')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('freeze.helpP')}</Meta>
        <KeyButton colors={colors} label={t('freeze.helpGo')} onPress={() => openFreezeHow(colors, readShelf()?.boards)} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.grace')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.graceP', { time: clockWords('09:00') })}</Meta>
        <KeyButton colors={colors} label={t('help.marks')} onPress={() => goHash('/marks')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.questions')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.questionsP')}</Meta>
        <KeyButton colors={colors} label={t('help.questionsGo')} onPress={() => goHash('/lamps')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.pings')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.pingsP')}</Meta>
        <KeyButton colors={colors} label={t('help.pingsGo')} onPress={() => goHash('/pings')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.widget')}</Text>
        <Meta colors={colors}>{t('help.widgetP')}</Meta>
      </HelpFold>
      <HelpFold colors={colors} title={t('help.groupSocial')}>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.people')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.peopleP')}</Meta>
        <KeyButton colors={colors} label={t('help.peopleGo')} onPress={() => goHash('/people')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.we')}</Text>
        <Meta colors={colors}>{t('help.weP1')}</Meta>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.weP2')}</Meta>
        <KeyButton colors={colors} label={t('help.weGo')} onPress={() => goHash('/we/new')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.cheers')}</Text>
        <Meta colors={colors}>{t('help.cheersP')}</Meta>
      </HelpFold>
      <HelpFold colors={colors} title={t('help.groupShop')}>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.coins')}</Text>
        <Meta colors={colors}>{t('help.coinsP')}</Meta>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.wishP')}</Meta>
        <KeyButton colors={colors} label={t('help.shopGo')} onPress={() => goHash('/shop')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('frames.what')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('frames.howBody')}</Meta>
        <KeyButton colors={colors} label={t('frames.all')} onPress={() => goHash('/shop/frames')} />
      </HelpFold>
      <HelpFold colors={colors} title={t('help.groupApp')}>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.phone')}</Text>
        <Meta colors={colors}>{t('help.phonePApp')}</Meta>
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.legal')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.legalP')}</Meta>
        <KeyButton colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
        <KeyButton colors={colors} label={t('settings.terms')} onPress={() => goHash('/terms')} />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.feedback')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.feedbackP')}</Meta>
        <DidButton
          colors={colors}
          label={t('feedback.send')}
          onPress={() => {
            const url = feedbackMailto()
            // No mail app (or no address): say so instead of a dead tap.
            if (!url) return confirmMiss(t('confirm.miss'))
            return Linking.openURL(url).catch(() => confirmMiss(t('confirm.miss')))
          }}
        />
      </HelpFold>
      <DidButton colors={colors} label={t('help.home')} onPress={() => goHash('/tonight')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.versionTitle')}</Text>
      <AppVersion colors={colors} />
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
        <>
          <Meta colors={colors}>{t('later.empty')}</Meta>
          <DidButton colors={colors} label={t('home.add')} onPress={() => goHash('/add')} />
        </>
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
      <DidButton colors={colors} label={t('nav.home')} onPress={() => goHash('/tonight')} />
      <KeyButton colors={colors} label={t('tonight.add')} onPress={() => goHash('/add')} />
    </ScreenShell>
  )
}

export function MarksScreen({ book, boards = [], now }) {
  const colors = useHallColors()
  const gentle = usePrefs().gentle === true
  const clock = now || new Date()
  const dateIso = boardDate(clock, book?.dayFoldHour)
  // Best ever, across every folder. hallHeat is a 0 to 5 level, not a streak, and read as a wrong number here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const best = useMemo(() => bestShelfStreak(boards.length ? boards : [book], clock), [boards, book, dateIso])
  const have = useMemo(() => shelfMarks(boards.length ? boards : [book]), [boards, book])

  return (
    <ScreenShell book={book} title={t('marks.title')} colors={colors}>
      <Meta colors={colors}>{t('marks.lede')}</Meta>
      {book?.quietMode ? (
        <Meta colors={colors}>{t('marks.hidden')}</Meta>
      ) : (
        <MarksGrid have={have} colors={colors} />
      )}
      {gentle ? null : <Meta colors={colors}>{t('recap.best', { n: best })}</Meta>}
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

// Recent: the last achievements and Did we moments, in full, newest first.
// Opening it marks them seen, which clears the menu's count.
export function RecentScreen() {
  const colors = useHallColors()
  const { list } = useNotices()
  // The menu row counts inbox asks too, so the page shows them first.
  const account = useAccount()
  const { inbox } = usePeoplePulse(account.user)
  useEffect(() => {
    markNoticesSeen()
  }, [list.length])
  const locale = readPrefs().locale
  const [undo, setUndo] = useState(null)
  useUndoToast('recent', undo, () => {
    restoreNotices(undo?.list)
    setUndo(null)
  }, DELETE_UNDO_MS)
  function clearAll() {
    setUndo({ label: t('recent.cleared'), list: clearNotices() })
  }
  return (
    <ScreenShell title={t('recent.title')} colors={colors}>
      {account.user && inbox > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => goHash('/inbox')}
          style={({ pressed }) => [styles.idea, { borderColor: colors.on, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
        >
          <Kicker colors={colors}>{t('people.waiting', { n: inbox })}</Kicker>
          <Text style={[styles.recentText, { color: colors.ink }]}>{t('people.waitingSub')}</Text>
        </Pressable>
      ) : null}
      {list.length ? <KeyButton colors={colors} label={t('recent.clear')} onPress={clearAll} /> : null}
      {list.length ? (
        list.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole={item.go?.path ? 'button' : undefined}
            disabled={!item.go?.path}
            onPress={() => goHash(item.go.path, item.go.id ? { id: item.go.id } : undefined)}
            style={({ pressed }) => [styles.idea, { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
          >
            <Kicker colors={colors}>{item.title}</Kicker>
            {item.text ? <Text style={[styles.recentText, { color: colors.ink }]}>{item.text}</Text> : null}
            <Meta colors={colors}>
              {new Date(item.at).toLocaleString(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            </Meta>
          </Pressable>
        ))
      ) : account.user && inbox > 0 ? null : (
        <EmptyCard title={t('recent.emptyTitle')} body={t('recent.emptyBody')} colors={colors} />
      )}
    </ScreenShell>
  )
}

function StreakHero({ colors, n, label, line, chip }) {
  return (
    <View style={[styles.hero, { backgroundColor: withAlpha(colors.on, 0.12), borderColor: colors.on }]}>
      <Text style={[styles.heroCap, { color: colors.on }]}>{label}</Text>
      <View style={styles.heroNumRow}>
        <Text style={[styles.heroNum, { color: colors.ink }]}>{String(n || 0)}</Text>
        {chip || null}
      </View>
      {line ? <Text style={[styles.heroLine, { color: colors.inkSoft }]}>{line}</Text> : null}
    </View>
  )
}

function NumberTile({ colors, label, n, unit = '', onPress, third = false, half = false }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.tile, third && styles.tileThird, half && styles.tileHalf, { backgroundColor: colors.panel, borderColor: colors.line }, pressFx(pressed)]}
    >
      <Text style={[styles.tileNum, { color: colors.ink }]}>
        {String(n || 0)}
        {unit ? <Text style={[styles.tileUnit, { color: colors.inkSoft }]}>{` ${unit}`}</Text> : null}
      </Text>
      <Text style={[styles.tileLabel, { color: colors.inkDim }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  )
}

// Which folders a page counts. Every folder unless a filter is on; then it
// names them and offers All.
function inView(book, boards) {
  const live = (boards || []).filter((item) => !item.archived)
  return live.length ? live : book ? [book] : []
}

function FolderScope({ colors, boards, tagId, path }) {
  const ids = tagIdsOf(tagId)
  // No filter: say nothing. A plain "All folders" line looked like a picker and did nothing.
  if (!ids.length) return null
  const names = (boards || []).filter((item) => ids.includes(item.id)).map((item) => item.title).join(', ')
  return (
    <View>
      <Meta colors={colors}>{t('scope.only', { names })}</Meta>
      <KeyButton colors={colors} label={t('scope.showAll')} onPress={() => goHash(path, { tag: 'all' })} />
    </View>
  )
}

export function StatsScreen({ book, boards, tagId = '', now }) {
  const colors = useHallColors()
  const gentle = usePrefs().gentle === true
  const clock = now || new Date()
  const counts = shelfStatsCounts(inView(book, boards), clock, tagId)
  const dateIso = boardDate(clock, book?.dayFoldHour)
  // The last seven nights, walked once per night (the Sunday recap, any day).
  const recap = useMemo(() => {
    const books = inView(book, boards)
    return weekRecap(books, weekStripNights(books, clock, tagId), tagId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, boards, dateIso, tagId])
  // The longest run any one question had (nope breaks it), walked once a night.
  const bestRun = useMemo(() => {
    let best = 0
    for (const one of scopedBooks(inView(book, boards), tagId)) {
      for (const lamp of one.lamps || []) best = Math.max(best, bestQuestionStreak(one, lamp, dateIso))
    }
    return best
  }, [book, boards, dateIso, tagId])

  return (
    <ScreenShell title={t('stats.title')} colors={colors}>
      <FolderScope colors={colors} boards={boards} tagId={tagId} path="/stats" />
      {!counts.hung ? (
        <>
          <Meta colors={colors}>{t('streaks.empty')}</Meta>
          <DidButton colors={colors} label={t('home.add')} onPress={() => goHash('/add')} />
        </>
      ) : !(counts.did + counts.late + counts.skip) ? (
        <>
          <Meta colors={colors}>{t('stats.empty')}</Meta>
          <DidButton colors={colors} label={t('empty.goTonight')} onPress={() => goHash('/tonight')} />
        </>
      ) : null}
      {/* This week first, then everything since you started, each with the
          same three tiles so the two read the same way. */}
      <SetCap colors={colors}>{t('recap.kicker')}</SetCap>
      {gentle ? (
        <Meta colors={colors}>{t('recap.cleared', { cleared: recap.cleared, n: recap.nights })}</Meta>
      ) : (
        <StreakHero
          colors={colors}
          n={counts.heat}
          label={t('home.streak')}
          line={t('recap.cleared', { cleared: recap.cleared, n: recap.nights })}
          chip={<FreezeChip colors={colors} held={freezeState(inView(book, boards), clock).held} onPress={() => openFreezeHow(colors, inView(book, boards), clock)} />}
        />
      )}
      <View style={styles.tiles}>
        <NumberTile third colors={colors} label={t('stats.did')} n={recap.dids - recap.late} />
        <NumberTile third colors={colors} label={t('stats.late')} n={recap.late} />
        <NumberTile third colors={colors} label={t('stats.nope')} n={recap.nopes} />
      </View>
      <KeyButton colors={colors} label={t('recap.shareBtn')} onPress={() => shareRecap(recap)} />

      <SetCap colors={colors}>{t('stats.allCap')}</SetCap>
      <View style={styles.tiles}>
        <NumberTile third colors={colors} label={t('stats.did')} n={counts.did} />
        <NumberTile third colors={colors} label={t('stats.late')} n={counts.late} />
        <NumberTile third colors={colors} label={t('stats.nope')} n={counts.skip} />
        <NumberTile half={!gentle} colors={colors} label={t('stats.questions')} n={counts.hung} />
        {gentle ? null : <NumberTile half colors={colors} label={t('stats.bestRun')} n={bestRun} />}
      </View>

      <SetCap colors={colors}>{t('stats.moreCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="flag" label={t('stats.marks')} sub={t('stats.marksSub')} chevron onPress={() => goHash('/marks')} />
        <SetRow colors={colors} icon="week" label={t('streaks.seven')} sub={t('stats.sevenSub')} chevron onPress={() => goHash('/week')} />
        <SetRow colors={colors} icon="priority" label={t('streaks.title')} sub={t('stats.streaksSub')} chevron last onPress={() => goHash('/streaks')} />
      </SetCard>
    </ScreenShell>
  )
}

export function FeedScreen({ book, boards, tagId = '', now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const allRows = shelfFeedRows(inView(book, boards), tagId)
  const [query, setQuery] = useState('')
  const rows = feedSearch(allRows, query)

  return (
    <ScreenShell title={t('feed.title')} colors={colors}>
      <FolderScope colors={colors} boards={boards} tagId={tagId} path="/feed" />
      {allRows.length ? (
        <SearchBox value={query} onChange={setQuery} colors={colors} placeholder={t('feed.searchPh')} />
      ) : null}
      {!allRows.length ? (
        <>
          <Meta colors={colors}>{t('feed.empty')}</Meta>
          <KeyButton colors={colors} label={t('empty.goTonight')} onPress={() => goHash('/tonight')} />
        </>
      ) : !rows.length ? (
        <Meta colors={colors}>{t('feed.noMatch')}</Meta>
      ) : (
        rows.map((row) => (
          <Row
            key={row.answer.id}
            colors={colors}
            label={row.lamp ? shortLabel(row.lamp) : t('feed.deleted')}
            note={`${statusWord(row.answer.status, Boolean(row.lamp) && nightOpen(periodNight(row.lamp, row.answer.periodKey), clock))}${
              tapWhen(row.answer.answeredAt, clock) ? ` · ${tapWhen(row.answer.answeredAt, clock)}` : ''
            }${row.answer.note ? `\n${row.answer.note}` : ''}`}
            onPress={() => row.lamp && goHash('/lamp', { id: row.lamp.id })}
          />
        ))
      )}
    </ScreenShell>
  )
}

// Every note, newest first, with a search over the note and its question.
export function NotesScreen({ book, boards }) {
  const colors = useHallColors()
  const allRows = useMemo(() => shelfNoteRows(inView(book, boards)), [book, boards])
  const [query, setQuery] = useState('')
  const rows = feedSearch(allRows, query)

  return (
    <ScreenShell title={t('notes.title')} colors={colors}>
      {allRows.length ? (
        <SearchBox value={query} onChange={setQuery} colors={colors} placeholder={t('notes.searchPh')} />
      ) : null}
      {!allRows.length ? (
        <>
          <Meta colors={colors}>{t('notes.empty')}</Meta>
          <KeyButton colors={colors} label={t('help.questionsGo')} onPress={() => goHash('/lamps')} />
        </>
      ) : !rows.length ? (
        <Meta colors={colors}>{t('feed.noMatch')}</Meta>
      ) : (
        rows.map((row) => {
          const night = periodLabel(row.lamp, row.answer.periodKey)
          return (
            <Row
              key={row.answer.id || `${row.lamp.id}:${row.answer.periodKey}`}
              colors={colors}
              label={shortLabel(row.lamp)}
              note={`${night ? `${night} · ` : ''}${statusWord(row.answer.status, nightOpen(periodNight(row.lamp, row.answer.periodKey)))}\n${row.answer.note}`}
              onPress={() => goHash('/lamp', { id: row.lamp.id })}
            />
          )
        })
      )}
    </ScreenShell>
  )
}

export function CalendarScreen({ book, boards, tagId, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const [view, setView] = useState('month')
  const [startShift, setStartShift] = useState(0)
  const gentle = usePrefs().gentle === true

  return (
    <ScreenShell title={t('settings.history')} colors={colors}>
      {isNewShelf(boards) ? <Meta colors={colors}>{t(gentle ? 'cal.hintGentle' : 'cal.hint')}</Meta> : null}
      <ChipRow
        items={[
          { id: 'month', label: t('cal.viewMonth') },
          { id: 'year', label: t('cal.viewYear') },
        ]}
        value={view}
        onPick={(next) => {
          setStartShift(0)
          setView(next)
        }}
        colors={colors}
      />
      {view === 'year' ? (
        <YearGrid
          book={book}
          boards={boards}
          tagId={tagId}
          now={clock}
          colors={colors}
          onMonth={(shift) => {
            setStartShift(Math.min(0, shift))
            setView('month')
          }}
        />
      ) : (
        <CalendarGrid book={book} boards={boards} tagId={tagId} now={clock} colors={colors} startShift={startShift} />
      )}
      <View style={styles.calKey}>
        <View style={[styles.calDot, view === 'year' && styles.calSquare, { backgroundColor: colors.on }]} />
        <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('cal.keyCleared')}</Text>
        {gentle ? null : (
          <>
            <View style={[styles.calDot, view === 'year' && styles.calSquare, missDot(colors)]} />
            <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('cal.keyMissed')}</Text>
          </>
        )}
        <View style={[styles.calDot, view === 'year' && styles.calSquare, { borderWidth: 1.5, borderColor: colors.freeze }]} />
        <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('freeze.dot')}</Text>
        <View style={[styles.calDot, view === 'year' && styles.calSquare, { backgroundColor: colors.open }]} />
        <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('later.tonight')}</Text>
      </View>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="priority" label={t('streaks.title')} sub={t('stats.streaksSub')} chevron onPress={() => goHash('/streaks')} />
        <SetRow colors={colors} icon="week" label={t('streaks.seven')} sub={t('stats.sevenSub')} chevron onPress={() => goHash('/week')} />
        <SetRow colors={colors} icon="pen" label={t('notes.title')} sub={t('notes.sub')} chevron onPress={() => goHash('/notes')} />
        <SetRow colors={colors} icon="note" label={t('feed.title')} sub={t('settings.feedSub')} chevron onPress={() => goHash('/feed')} />
        <SetRow colors={colors} icon="flag" label={t('stats.marks')} sub={t('stats.marksSub')} chevron onPress={() => goHash('/marks')} />
        <SetRow colors={colors} icon="chart" label={t('stats.title')} sub={t('settings.statsSub')} chevron last onPress={() => goHash('/stats')} />
      </SetCard>
    </ScreenShell>
  )
}

export function WeekGridScreen({ book, boards, tagId = '', now }) {
  const colors = useHallColors(book)
  const clock = now || new Date()
  const gentle = usePrefs().gentle === true
  const shelf = inView(book, boards)
  const nights = shelfWeekNights(shelf, clock, tagId, 7)
  const lamps = weekLamps(nights)
  // Same night rule as the Home dots and So far: every question and every Did
  // we due that night answered Did (or late).
  const strip = weekStripNights(shelf, clock, tagId)
  const cleared = new Set(strip.filter((night) => night.on).map((night) => night.iso))
  const doneNights = cleared.size
  const frozen = new Set(strip.filter((night) => night.freeze).map((night) => night.iso))
  const weCards = weCardsOn(nights.map((night) => night.iso), tagId)
  const anyOff =
    lamps.some((lamp) => nights.some((night) => weekCell(night, lamp).state === 'off')) ||
    weCards.some((card) => nights.some((night) => weCardState(night.iso, card) === 'off'))

  function cellColor(state) {
    if (state === 'yes') return colors.on
    if (state === 'late') return colors.late
    if (state === 'skip') return colors.skip
    // Gentle mode: a missed night is plain, not a warning.
    if (state === 'hole') return gentle ? colors.open : colors.miss
    return colors.open
  }

  function cellLook(state) {
    // Not due that night: a short dash, so it never reads as an empty "not answered yet" square.
    if (state === 'off') return { ...styles.weekOff, backgroundColor: colors.line }
    // The dot under a cleared date, for the legend.
    if (state === 'cleared') return { ...styles.weekDot, marginTop: 0, backgroundColor: colors.on }
    // Due tonight, not answered yet: a ring, so it never reads as a nope.
    if (state === 'open') return { borderWidth: 1.5, borderColor: colors.openRing || colors.inkDim }
    // A night a freeze kept: a ring, as in the history legend.
    if (state === 'freeze') return { borderWidth: 1.5, borderColor: colors.freeze }
    if (state === 'hole') return missDot(colors, cellColor(state))
    return { backgroundColor: cellColor(state) }
  }

  function weState(night, card) {
    const state = weCardState(night.iso, card)
    if (state === 'off') return 'off'
    if (state === 'did') return 'yes'
    if (state === 'nope') return 'skip'
    return night.isToday ? 'open' : 'hole'
  }

  function openNight(night) {
    openNightWhy({ colors, boards: shelf, iso: night.iso, now: clock, tagId, onCalendar: () => goHash('/calendar') })
  }

  function cell(night, state) {
    return (
      <Pressable
        key={night.iso}
        style={styles.weekHeadCell}
        onPress={() => openNight(night)}
        accessibilityRole="button"
        accessibilityLabel={night.label}
      >
        <View
          style={[
            styles.weekCell,
            cellLook(state),
          ]}
        />
      </Pressable>
    )
  }
  const legend = [
    ['yes', t('later.did')],
    ['late', t('later.late')],
    ['skip', t('later.nope')],
    ...(gentle ? [] : [['hole', t('later.missed')]]),
    ...(frozen.size ? [['freeze', t('freeze.dot')]] : []),
    ['open', t('jewelKey.open')],
    ...(anyOff ? [['off', t('week.notAsked')]] : []),
    ...(cleared.size ? [['cleared', t('week.clearedDot')]] : []),
  ]

  return (
    <ScreenShell title={t('streaks.seven')} colors={colors}>
      <FolderScope colors={colors} boards={boards} tagId={tagId} path="/week" />
      {!lamps.length ? (
        <>
          <Meta colors={colors}>{t('streaks.empty')}</Meta>
          <DidButton colors={colors} label={t('home.add')} onPress={() => goHash('/add')} />
        </>
      ) : (
        <>
        <View style={styles.tiles}>
          <NumberTile colors={colors} label={t('week.doneTile')} n={doneNights} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <View style={styles.week}>
          <View style={styles.weekRow}>
            <View style={styles.weekName} />
            {nights.map((night) => (
              <Pressable
                key={night.iso}
                style={styles.weekHeadCell}
                onPress={() => openNight(night)}
                accessibilityRole="button"
                accessibilityLabel={night.label}
              >
                <Text style={[styles.weekDow, { color: night.isToday ? colors.on : colors.inkDim }]}>
                  {night.weekday}
                </Text>
                <Text style={[styles.weekDay, { color: colors.inkSoft }]}>{night.dayNum}</Text>
                {/* Cleared nights get a dot under the date, the same rule as Home. */}
                <View
                  style={[
                    styles.weekDot,
                    cleared.has(night.iso)
                      ? { backgroundColor: colors.on }
                      : frozen.has(night.iso)
                        ? { borderWidth: 1, borderColor: colors.freeze }
                        : null,
                  ]}
                />
              </Pressable>
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
              {nights.map((night) => cell(night, weekCell(night, lamp).state))}
            </View>
          ))}
          {weCards.map((card) => (
            <View key={`we-${card}`} style={styles.weekRow}>
              <Text numberOfLines={1} style={[styles.weekName, styles.weekNameText, { color: colors.ink }]}>
                {weCardShort(card) || t('we.title')}
              </Text>
              {nights.map((night) => cell(night, weState(night, card)))}
            </View>
          ))}
        </View>
          <View style={styles.legend}>
            {legend.map(([state, label]) => (
              <View key={state} style={styles.legendItem}>
                <View style={[styles.weekCell, cellLook(state)]} />
                <Text style={[styles.legendText, { color: colors.inkDim }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Meta colors={colors}>{t('week.tapHint')}</Meta>
        </View>
        </>
      )}
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="priority" label={t('streaks.title')} chevron last onPress={() => goHash('/streaks')} />
      </SetCard>
    </ScreenShell>
  )
}

export function StreaksScreen({ book, boards, tagId = '', now }) {
  const colors = useHallColors()
  const gentle = usePrefs().gentle === true
  const clock = now || new Date()
  const books = scopedBooks(inView(book, boards), tagId)
  const heat = books.length ? shelfStreak(books, clock) : 0
  // Freezes belong to the overall streak, whatever tag is picked.
  const freezes = freezeState(inView(book, boards), clock)
  const goal = nextStreakGoal(heat)
  const rows = books
    .flatMap((one) =>
      (one.lamps || []).filter((lamp) => !lamp.archived && !isEvery(lamp)).map((lamp) => ({ lamp, n: streakLength(one, lamp, clock) })),
    )
    .sort((a, b) => b.n - a.n)
  // A question's run can be longer than the overall one: say which night broke it.
  const longest = rows.length ? rows[0].n : 0
  const breakNight = useMemo(
    () => (longest > heat ? streakBreak(inView(book, boards), clock, tagId, longest + 1) : null),
    [book, boards, tagId, longest, heat], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const breakLine = breakNight
    ? breakNight.question
      ? t('streaks.broke', { date: formatBoardDate(breakNight.iso), what: breakNight.question })
      : t('streaks.brokeWe', { date: formatBoardDate(breakNight.iso), what: weCardShort(breakNight.weId) || t('we.title') })
    : ''

  if (gentle) {
    return (
      <ScreenShell title={t('streaks.title')} colors={colors}>
        <Meta colors={colors}>{t('settings.gentleHidden')}</Meta>
        <SetCard colors={colors}>
          <SetRow colors={colors} icon="week" label={t('streaks.seven')} sub={t('stats.sevenSub')} chevron last onPress={() => goHash('/week')} />
        </SetCard>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('streaks.title')} colors={colors}>
      <FolderScope colors={colors} boards={boards} tagId={tagId} path="/streaks" />
      <StreakHero
        colors={colors}
        n={heat}
        label={t('streaks.aria')}
        line={goal ? t('streaks.nextGoal', { goal }) : null}
      />
      {breakLine ? (
        <SetCard colors={colors}>
          <SetRow
            colors={colors}
            icon="broke"
            label={breakLine}
            chevron
            last
            onPress={() => openNightWhy({ colors, boards: inView(book, boards), iso: breakNight.iso, now: clock, tagId, onCalendar: () => goHash('/calendar') })}
          />
        </SetCard>
      ) : null}
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="snow" tint={colors.freeze} label={t('freeze.rowTitle')} sub={freezeLine(freezes)} chevron last onPress={() => openFreezeHow(colors, inView(book, boards), clock)} />
      </SetCard>
      {!rows.length ? (
        <>
          <Meta colors={colors}>{t('streaks.empty')}</Meta>
          <DidButton colors={colors} label={t('home.add')} onPress={() => goHash('/add')} />
        </>
      ) : (
        <View style={styles.tiles}>
          {rows.map((row) => (
            <NumberTile
              key={row.lamp.id}
              colors={colors}
              label={shortLabel(row.lamp)}
              n={row.n}
              unit={row.n === 1 ? t('streaks.unitOne') : t('streaks.unit')}
              onPress={() => goHash('/lamp', { id: row.lamp.id })}
            />
          ))}
        </View>
      )}
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="week" label={t('streaks.seven')} sub={t('stats.sevenSub')} chevron last onPress={() => goHash('/week')} />
      </SetCard>
    </ScreenShell>
  )
}

export function BoardsScreen({ book, boards, onSelect, onAdd, onRemove, onChange, onStartEmpty }) {
  const colors = useHallColors()
  const [titleDraft, setTitleDraft] = useState(book?.title || '')
  const [addMiss, setAddMiss] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const reduce = useReduceMotion()
  const scrollHandle = useRef(null)
  const addRef = useRef(null)
  const renameDirty = Boolean(titleDraft.trim()) && titleDraft.trim() !== (book?.title || '')

  function saveName() {
    const title = titleDraft.trim()
    if (!title || title === book?.title) return
    // Same name as another folder: saving would merge the two.
    if ((boards || []).some((item) => item.id !== book?.id && String(item.title || '').trim().toLowerCase() === title.toLowerCase())) {
      confirmMiss(t('boards.addSame'))
      return
    }
    setTitleDraft(title)
    onChange({ ...book, title })
    confirmDone(t('settings.saved'))
  }

  function addFolder() {
    const title = newName.trim()
    if (!title) {
      setAddMiss(t('boards.addMiss'))
      return
    }
    if ((boards || []).some((item) => !item.archived && item.title.trim().toLowerCase() === title.toLowerCase())) {
      setAddMiss(t('boards.addSame'))
      return
    }
    onAdd?.(title)
    setAdding(false)
    setNewName('')
    setAddMiss('')
  }
  const live = (boards || []).filter((item) => !item.archived)
  // Empty folders parked once the list is crowded: kept behind one row, so
  // they can still be opened (which brings one back) or removed.
  const parked = (boards || []).filter((item) => item.archived)
  const [showParked, setShowParked] = useState(false)

  useEffect(() => {
    setTitleDraft(book?.title || '')
  }, [book?.title, book?.id])

  // The keyboard covers Add and Cancel. Once it is up, scroll so they sit above it.
  useEffect(() => {
    if (!adding) return undefined
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    let timer = null
    const lift = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const scroller = scrollHandle.current
        const block = addRef.current
        const keyTop = Keyboard.metrics?.()?.screenY
        const inner = scroller?.getInnerViewRef?.()
        if (!scroller?.scrollTo || !inner || !block?.measureLayout || !keyTop) return
        block.measureLayout(
          inner,
          (_x, top) => {
            block.measureInWindow((_bx, blockTop, _bw, blockH) => {
              scroller.measureInWindow?.((_sx, viewTop) => {
                const now = top - (blockTop - viewTop)
                const need = blockTop + blockH + 16 - keyTop
                if (need <= 0) return
                scroller.scrollTo({ y: now + need, animated: !reduce })
              })
            })
          },
          () => {},
        )
      }, Platform.OS === 'ios' ? 300 : 60)
    }
    const sub = Keyboard.addListener(event, lift)
    if (Keyboard.isVisible?.()) lift()
    return () => {
      clearTimeout(timer)
      sub.remove()
    }
  }, [adding, reduce])

  return (
    <ScreenShell book={book} title={t('boards.title')} colors={colors} showAdd scrollHandle={scrollHandle}>
      <SetCard colors={colors}>
      {live.map((item, at) => {
        const left = leftoverOn(boards, new Date(), item.id)
        const n = liveLampCount(item)
        const on = item.id === book?.id
        const countNote =
          n === 1 ? t('boards.qOne') : t('boards.qMany', { n })
        const leftNote =
          left === 0 ? t('boards.leftNone') : left === 1 ? t('boards.leftOne') : t('boards.leftMany', { n: left })
        return (
          <View key={item.id}>
            <SetRow
              colors={colors}
              tint={on ? colors.on : undefined}
              icon="folder"
              label={item.title}
              sub={on ? `${t('boards.addsHere')} · ${countNote} · ${leftNote}` : `${countNote} · ${leftNote}`}
              chevron
              last={at === live.length - 1 && !on}
              onPress={() => {
                onSelect?.(item.id)
                goHash('/tonight', { tag: item.id })
              }}
            />
            {on ? (
              <View style={styles.tagName}>
              <Field
                colors={colors}
                label={t('boards.name')}
                value={titleDraft}
                onChangeText={setTitleDraft}
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
              <KeyButton colors={colors} label={t('settings.save')} disabled={!renameDirty} onPress={saveName} />
              </View>
            ) : null}
          </View>
        )
      })}
      </SetCard>
      {parked.length ? (
        <SetCard colors={colors}>
          <SetRow
            colors={colors}
            icon="folder"
            label={t('hang.tagLater')}
            sub={showParked ? t('hang.tagLaterHint') : undefined}
            value={showParked ? '▾' : `${parked.length} ▸`}
            plain
            last={!showParked}
            onPress={() => setShowParked((open) => !open)}
          />
          {showParked
            ? parked.map((item, at) => (
                <SetRow
                  key={item.id}
                  colors={colors}
                  icon="folder"
                  label={item.title}
                  chevron
                  last={at === parked.length - 1}
                  onPress={() => onSelect?.(item.id)}
                />
              ))
            : null}
        </SetCard>
      ) : null}
      <View style={styles.dataGap} />
      {adding ? (
        <View ref={addRef} collapsable={false} style={styles.tagName}>
          <Field
            colors={colors}
            label={t('boards.addName')}
            value={newName}
            onChangeText={(text) => {
              setNewName(text)
              setAddMiss('')
            }}
            onSubmitEditing={addFolder}
            returnKeyType="done"
            autoFocus
          />
          {/* Side by side, so the keyboard does not cover them. */}
          <View style={styles.addRow}>
            <View style={styles.addCell}>
              <KeyButton colors={colors} label={t('hang.add')} onPress={addFolder} />
            </View>
            <View style={styles.addCell}>
              <KeyButton
                colors={colors}
                label={t('hang.cancel')}
                onPress={() => {
                  setAdding(false)
                  setNewName('')
                  setAddMiss('')
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <SetCard colors={colors}>
          <SetRow
            colors={colors}
            icon="add"
            tint={colors.on}
            label={t('boards.add')}
            sub={t('boards.addHint')}
            last
            onPress={() => setAdding(true)}
          />
        </SetCard>
      )}
      {addMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{addMiss}</Text> : null}
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="home" label={t('nav.home')} chevron onPress={() => goHash('/tonight')} />
        <SetRow colors={colors} icon="calendar" label={t('settings.history')} sub={t('settings.calendarSub')} chevron onPress={() => goHash('/calendar')} />
        <SetRow colors={colors} icon="note" label={t('feed.title')} sub={t('settings.feedSub')} chevron onPress={() => goHash('/feed')} />
        <SetRow colors={colors} icon="chart" label={t('boards.stats')} sub={t('settings.statsSub')} chevron last onPress={() => goHash('/stats')} />
      </SetCard>
      {live.length > 1 && book ? (
        <KeyButton
          colors={colors}
          label={t('boards.removeNamed', { title: book.title })}
          onPress={() =>
            publishSheet({
              title: t('boards.removeTitle', { title: book.title }),
              body: t('boards.removeBody'),
              goLabel: t('boards.removeNamed', { title: book.title }),
              danger: true,
              closeLabel: t('settings.neverMind'),
              colors,
              onClose: () => publishSheet(null),
              onGo: () => {
                publishSheet(null)
                onRemove?.(book.id)
                confirmDone(t('confirm.folderRemoved', { title: book.title }))
              },
            })
          }
        />
      ) : null}
      {onStartEmpty && book ? (
        <>
          <SetCap colors={colors}>{t('settings.danger')}</SetCap>
          <SetCard colors={colors}>
            <SetRow
              colors={colors}
              icon="warning"
              label={t('settings.emptyBoard')}
              sub={t('settings.clearFolderSub', { name: book.title || '' })}
              danger
              last
              onPress={() =>
                publishSheet({
                  kicker: t('settings.startOver'),
                  title: t('settings.clearFolderTitle', { name: book.title || '' }),
                  body: t('settings.clearFolderBody', { name: book.title || '' }),
                  goLabel: t('settings.clearYes'),
                  danger: true,
                  closeLabel: t('settings.neverMind'),
                  colors,
                  onClose: () => publishSheet(null),
                  onGo: () => {
                    publishSheet(null)
                    onStartEmpty()
                    confirmDone(t('confirm.startedOver'))
                  },
                })
              }
            />
          </SetCard>
        </>
      ) : null}
    </ScreenShell>
  )
}

export function EnterScreen({ book, onSaveKeeper, onEraseHere, returnTo }) {
  const colors = useHallColors()
  const named = keeperNamed(book)
  const locked = hasPin()
  const [person, setPerson] = useState(book?.keeperName || '')
  const [title, setTitle] = useState(
    book?.title && book.title !== 'My hall' && book.title !== 'My board' ? book.title : '',
  )
  const [pin, setPinDraft] = useState('')
  const [miss, setMiss] = useState('')
  const account = useAccount()
  const email = account.user?.email || ''
  // Forgot PIN: signed in, a code to the account's email proves it is you.
  const [forgot, setForgot] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendForgotCode() {
    setBusy(true)
    const { miss: bad } = await sendCode(email).catch(() => ({ miss: 'net' }))
    setBusy(false)
    setMiss(bad ? accountMissText(bad) : '')
  }

  function askForgot() {
    if (email) {
      setForgot(true)
      setCode('')
      sendForgotCode()
      return
    }
    // No account: the PIN only lives on this phone, so the way past it is
    // to erase what is here.
    publishSheet({
      title: t('enter.forgotTitle'),
      body: t('enter.eraseBody'),
      goLabel: t('enter.eraseGo'),
      danger: true,
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        clearPin()
        const fresh = { ...emptyBoard(), id: newBoardId() }
        onEraseHere?.({ currentId: fresh.id, boards: [fresh] })
        openSession()
        goHash('/first')
      },
    })
  }

  async function removeWithCode() {
    setBusy(true)
    const { miss: bad } = await checkCode(email, code).catch(() => ({ miss: 'net' }))
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      return
    }
    clearPin()
    confirmDone(t('confirm.pinRemoved'))
    finish()
  }

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
      locked={locked}
    >
      <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.cardBody, { color: colors.inkSoft }]}>{t('enter.body')}</Text>
      </View>
      <SetCard colors={colors}>
        <View style={styles.enterFields}>
          {locked ? (
            <Field colors={colors} label={t('enter.pin')} value={pin} onChangeText={setPinDraft} keyboardType="number-pad" secureTextEntry maxLength={8} autoFocus />
          ) : (
            <>
              <Field colors={colors} label={t('enter.name')} value={person} onChangeText={setPerson} />
              <Field colors={colors} label={t('enter.board')} value={title} onChangeText={setTitle} />
            </>
          )}
        </View>
      </SetCard>
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
      <DidButton
        colors={colors}
        label={
          locked ? t('enter.open') : named ? t('enter.openBoard', { board: book?.title }) : t('enter.openMine')
        }
        onPress={openNamed}
      />
      {!locked ? <KeyButton colors={colors} label={t('enter.later')} onPress={finish} /> : null}
      {locked && !forgot ? <KeyButton colors={colors} label={t('enter.forgot')} onPress={askForgot} /> : null}
      {locked && forgot ? (
        <SetCard colors={colors}>
          <View style={styles.enterFields}>
            <Text style={[styles.cardBody, { color: colors.inkSoft }]}>{t('enter.forgotSent', { email })}</Text>
            <Field
              colors={colors}
              label={t('account.code')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={8}
            />
            <DidButton colors={colors} label={t('enter.forgotGo')} onPress={removeWithCode} disabled={busy} />
            <KeyButton colors={colors} label={t('enter.forgotResend')} onPress={sendForgotCode} disabled={busy} />
            <KeyButton
              colors={colors}
              label={t('nav.back')}
              onPress={() => {
                setForgot(false)
                setMiss('')
              }}
            />
          </View>
        </SetCard>
      ) : null}
    </ScreenShell>
  )
}

export function WelcomeScreen({ book }) {
  const colors = useHallColors()

  function finish() {
    markWelcomeSeen()
    // Every folder, not only the open one: questions in another folder count.
    const empty = readShelf().boards.every((item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0)
    goHash(empty ? '/first' : '/tonight')
  }

  return (
    <ScreenShell title={t('welcome.title')} colors={colors}>
      <Meta colors={colors}>{t('welcome.body')}</Meta>
      <DidButton colors={colors} label={t('welcome.start')} onPress={finish} />
    </ScreenShell>
  )
}

// First run: tap 2 or 3 questions (or a set), pick a time, done. The typed
// card stays for anyone whose question is not on the list. No sign-in here.
export function FirstNightScreen({ book, onChange, now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const named = firstName(book)
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState([])
  const [blank, setBlank] = useState('')
  const [focused, setFocused] = useState(false)
  const [wave, setWave] = useState(0)
  const [askAfter, setAskAfter] = useState(FIRST_TIME)
  const reduce = useReduceMotion()
  const packs = packList(book)
  const question = didQuestion(blank)
  const ownNew = Boolean(question) && !picks.some((item) => item.question === question)
  const count = picks.length + (ownNew ? 1 : 0)
  const ready = count > 0
  const totalSteps = 2

  function pick(item) {
    setPicks((list) => togglePick(list, item))
    if (!reduce) setWave((n) => n + 1)
    playClick()
  }

  function takePack(pack) {
    setPicks((list) => togglePack(list, pack))
    if (!reduce) setWave((n) => n + 1)
    playClick()
  }

  // No questions yet is fine: Today shows how to add one.
  function startEmpty() {
    if (finished.current) return
    finished.current = true
    playClick()
    markWelcomeSeen()
    goHash('/tonight')
  }

  // A second tap on Done before the page leaves would add the picks again.
  const finished = useRef(false)
  function finish() {
    if (finished.current) return
    finished.current = true
    const own =
      question && !picks.some((item) => item.question === question)
        ? { question, short: shortFromQuestion(question, 24) }
        : null
    const made = firstRunBook(book, picks, own, askAfter, clock)
    markWelcomeSeen()
    onChange?.(made.book)
    // No notification ask from here: a sheet opened while /first was still on
    // screen sent Not now back into step 1 with nothing saved. AppShell offers
    // it once Tonight is up (offerFirstPingPrimer).
    goHash('/tonight', made.faceId ? { face: made.faceId } : '')
  }

  function next() {
    playClick()
    if (step === 0) {
      if (!ready) return
      setStep(1)
      return
    }
    finish()
  }

  // Step one goes back to Welcome, when there is one to go back to.
  const canLeave = cloudSetUp() && authSkipped()
  function toWelcome() {
    clearAuthSkip()
    goHash('/')
  }

  function back() {
    playClick()
    if (step === 0) {
      toWelcome()
      return
    }
    setStep(0)
  }

  // Pinned under the page, so Continue is in view however long the list gets.
  const nav = (
    <>
      <View style={styles.stepNav}>
        {step > 0 || canLeave ? <KeyButton colors={colors} label={t('first.back')} onPress={back} /> : null}
        <DidButton
          colors={colors}
          label={step === totalSteps - 1 ? t('first.done') : ready ? t('first.nextCount', { n: count }) : t('first.next')}
          onPress={next}
          dim={step === 0 && !ready}
        />
        {step === 0 && !ready ? (
          <Text style={[styles.firstWhy, { color: colors.inkSoft }]}>{t('first.pickFirst')}</Text>
        ) : null}
      </View>
      {step === 0 ? <KeyButton colors={colors} label={t('first.startEmpty')} onPress={startEmpty} /> : null}
    </>
  )

  return (
    <ScreenShell book={book} title={t('first.kicker')} colors={colors} locked footer={nav}>
      <View style={styles.firstTop}>
        <Text style={[styles.stepCap, { color: colors.inkSoft }]}>
          {t('first.stepOf', { n: step + 1, total: totalSteps })}
        </Text>
        {step === 0 && canLeave ? (
          // Back to the welcome screen to sign in instead.
          <Pressable
            onPress={toWelcome}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text style={[styles.firstSignIn, { color: colors.on }]}>{t('first.haveAccount')}</Text>
          </Pressable>
        ) : null}
      </View>
      {step === 0 ? (
        <>
          <Title colors={colors}>
            {named ? t('first.titleNamed', { name: named }) : t('first.title')}
          </Title>
          <Meta colors={colors}>{t('first.packsBody')}</Meta>
          {/* Typing is the main way in; packs are the shortcut below it. */}
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
              selectionColor={colors.on}
              cursorColor={colors.on}
              accessibilityLabel={t('first.typeOwn')}
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit
              multiline
              maxLength={120}
              style={[
                faceCardStyles.title,
                styles.firstBlank,
                { color: colors.ink, borderBottomColor: focused ? colors.on : colors.line },
              ]}
            />
          </View>
          {packs.length ? (
            <Text style={[styles.stepCap, styles.firstOr, { color: colors.inkSoft }]}>{t('first.orPack')}</Text>
          ) : null}
          <FirstPacks packs={packs} picks={picks} onPack={takePack} onPick={pick} colors={colors} />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Title colors={colors}>{t('first.timeTitle')}</Title>
          <SetCap colors={colors}>{t('hang.secSchedule')}</SetCap>
          <SetCard colors={colors}>
            <View style={styles.firstWhen}>
              <Text style={[styles.firstWhenLabel, { color: colors.ink }]}>{t('hang.daily')}</Text>
              <Text style={[styles.firstWhenSub, { color: colors.inkDim }]}>{t('first.whenLater')}</Text>
            </View>
            <View style={styles.firstTime}>
              <HangTimePick value={askAfter} onChange={setAskAfter} colors={colors} />
            </View>
          </SetCard>
        </>
      ) : null}
      {step === totalSteps - 1 ? <AuthLegalNote colors={colors} leadKey="legal.linksLead" /> : null}
    </ScreenShell>
  )
}

// Pushes come from the server, which reads these switches from the synced prefs.
const PUSH_KINDS = new Set(['sends', 'we', 'cheers', 'friends', 'family', 'didi'])
const QUIET_HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

function PingKinds({ colors, on }) {
  const prefs = usePrefs()
  const account = useAccount()
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
    const saved = await saveProfile({ prefs: readPrefs() }).catch(() => ({ miss: 'net' }))
    // Signed out there are no pushes, so the switch only has to hold here.
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      // Undo only this switch; another tap may have saved since.
      const now = readPrefs().pingsOff
      const wasOff = was.includes(kind)
      writePrefs({ pingsOff: wasOff ? (now.includes(kind) ? now : [...now, kind]) : now.filter((k) => k !== kind) })
      setMiss(t('pings.kindsMiss'))
    }
  }

  // Reminders are set on the phone; pushes wait on the server. Both read these.
  async function saveQuiet(patch) {
    const was = readPrefs()
    writePrefs(patch)
    setMiss('')
    armLampPings(readShelf().boards).catch(() => {})
    const saved = await saveProfile({ prefs: readPrefs() }).catch(() => ({ miss: 'net' }))
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      // Undo only what this save changed, and only if nothing changed it since.
      const now = readPrefs()
      const back = {}
      for (const key of Object.keys(patch)) if (now[key] === patch[key]) back[key] = was[key]
      writePrefs(back)
      armLampPings(readShelf().boards).catch(() => {})
      setMiss(t('pings.kindsMiss'))
    }
  }

  // The server sends the family summary at profiles.family_hour.
  async function saveFamilyHour(id) {
    const hour = Number(id.slice(0, 2))
    const was = readPrefs().familyHour
    writePrefs({ familyHour: hour })
    setMiss('')
    const saved = await saveProfile({ family_hour: hour, prefs: readPrefs() }).catch(() => ({ miss: 'net' }))
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      writePrefs({ familyHour: was })
      setMiss(t('pings.kindsMiss'))
    }
  }

  async function flipPrivate() {
    const was = readPrefs().pingsPrivate
    writePrefs({ pingsPrivate: !was })
    setMiss('')
    const saved = await saveProfile({ prefs: readPrefs() }).catch(() => ({ miss: 'net' }))
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      writePrefs({ pingsPrivate: was })
      setMiss(t('pings.kindsMiss'))
    }
  }

  // The shop drop push. Turning it on asks for notifications first.
  async function flipDropPings() {
    if (prefs.dropPings) {
      writePrefs({ dropPings: false })
      return
    }
    const state = await requestPings().catch(() => 'denied')
    if (state !== 'granted') {
      setMiss(t('pings.offNote'))
      return
    }
    setMiss('')
    writePrefs({ dropPings: true })
    syncPushTokenIfAllowed().catch(() => {})
  }

  const familyId = QUIET_HOURS[prefs.familyHour] || '21:00'
  const familyTime = clockWords(familyId)

  return (
    <>
      <SetCap colors={colors}>{t('pings.kindsCap')}</SetCap>
      {on ? null : <SetNote colors={colors}>{t('pings.offNote')}</SetNote>}
      <SetCard colors={colors}>
        {PING_KINDS.map((kind, i) => (
          <View key={kind}>
            <SetSwitch
              colors={colors}
              label={t(`pings.kind.${kind}`)}
              sub={kind === 'family' ? t('pings.kind.familySubAt', { time: familyTime }) : t(`pings.kind.${kind}Sub`)}
              on={!prefs.pingsOff.includes(kind)}
              onPress={() => flip(kind)}
            />
            {kind === 'family' && !prefs.pingsOff.includes('family') ? (
              <SetChoice
                colors={colors}
                label={t('pings.familyAt')}
                options={QUIET_HOURS.map((id) => ({ id, label: clockWords(id) }))}
                selected={familyId}
                onSelect={saveFamilyHour}
              />
            ) : null}
          </View>
        ))}
        <SetSwitch
          colors={colors}
          label={t('shop.dropPing')}
          sub={account.user ? t('shop.dropPingSub') : t('shop.dropPingOut')}
          on={Boolean(prefs.dropPings)}
          last
          onPress={flipDropPings}
        />
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
      <SetCap colors={colors}>{t('pings.quietCap')}</SetCap>
      <SetCard colors={colors}>
        <SetSwitch
          colors={colors}
          label={t('pings.quiet')}
          sub={t('pings.quietSub')}
          on={prefs.quietOn}
          last={!prefs.quietOn}
          onPress={() => saveQuiet({ quietOn: !prefs.quietOn })}
        />
        {prefs.quietOn ? (
          <>
            <SetChoice
              colors={colors}
              label={t('pings.quietFrom')}
              options={QUIET_HOURS.map((id) => ({ id, label: clockWords(id) }))}
              selected={prefs.quietFrom}
              onSelect={(id) => saveQuiet({ quietFrom: id })}
            />
            <SetChoice
              colors={colors}
              label={t('pings.quietTo')}
              options={QUIET_HOURS.map((id) => ({ id, label: clockWords(id) }))}
              selected={prefs.quietTo}
              onSelect={(id) => saveQuiet({ quietTo: id })}
              last
            />
          </>
        ) : null}
      </SetCard>
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
    </>
  )
}

// Sends one sample reminder a few seconds out. Permission off says so, with a way to settings.
function PingTest({ colors }) {
  const [state, setState] = useState('')

  async function send() {
    if (state === 'busy') return
    setState('busy')
    const out = await pingTest(5).catch(() => 'miss')
    setState(out)
    if (out === 'set') confirmDone(t('pings.testSet'))
    else if (out === 'miss') confirmMiss(t('confirm.miss'))
  }

  return (
    <>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="bell" label={t('pings.test')} sub={t('pings.testSub')} on={state === 'set'} last onPress={send} />
      </SetCard>
      {state === 'off' ? (
        <>
          <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">{t('pings.testOff')}</Text>
          <DidButton colors={colors} label={t('pings.openSettings')} onPress={() => Linking.openSettings().catch(() => {})} />
        </>
      ) : null}
    </>
  )
}

export function PingScreen({ book, boards, now, onAskPings, pingLabel, onChange }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const labelKey = pingLabel || 'pings.state.on'
  const on = labelKey === 'pings.state.on'
  // Every folder pings (armLampPings gets the whole shelf), so list them all.
  const books = boards?.length ? boards : book ? [book] : []
  // One row per question. Rows you switch off stay here until you leave, so
  // you can switch them back on.
  const [seen, setSeen] = useState(() => new Map())
  const rows = new Map(seen)
  for (const one of books) {
    for (const fire of upcomingPings(one, clock)) if (!rows.has(fire.id)) rows.set(fire.id, fire)
  }
  const fires = [...rows.values()].sort((a, b) => a.at - b.at)
  const bookOf = (id) => books.find((one) => (one.lamps || []).some((lamp) => lamp.id === id))

  function flipOne(fire) {
    const home = bookOf(fire.id)
    const lamp = home?.lamps.find((item) => item.id === fire.id)
    if (!lamp || !onChange) return confirmMiss(t('confirm.miss'))
    const next = !lampNotifyOn(lamp)
    setSeen((was) => new Map(was).set(fire.id, fire))
    onChange(commitBook({ ...home, lamps: home.lamps.map((item) => (item.id === lamp.id ? { ...item, notify: next } : item)) }, clock))
    return confirmDone(next ? t('pings.oneOn') : t('pings.oneOff'))
  }

  return (
    <ScreenShell title={t('pings.title')} colors={colors}>
      <Text style={[styles.subtitle, { color: colors.inkDim }]}>{t('pings.body')}</Text>
      <SetCard colors={colors}>
        {onAskPings && labelKey !== 'pings.state.blocked' ? (
          // On: the phone owns the off switch, so tapping opens its settings.
          <SetSwitch
            colors={colors}
            icon="bell"
            tint={colors.on}
            label={t('pings.rowTitle')}
            sub={on ? t('pings.rowOn') : t('pings.rowAsk')}
            on={on}
            last
            onPress={on ? () => Linking.openSettings().catch(() => {}) : onAskPings}
          />
        ) : (
          <SetRow
            colors={colors}
            icon="bell"
            tint={colors.miss}
            label={t('pings.openSettings')}
            sub={t('pings.rowBlocked')}
            chevron
            last
            onPress={() => Linking.openSettings().catch(() => {})}
          />
        )}
      </SetCard>
      <PingKinds colors={colors} on={on && Boolean(onAskPings)} />
      <PingTest colors={colors} />
      <SetCap colors={colors}>{t('pings.waitingTonight')}</SetCap>
      {!fires.length ? (
        <Meta colors={colors}>{t('pings.emptyTonight')}</Meta>
      ) : (
        <SetCard colors={colors}>
          {fires.map((fire, at) => (
            <SetSwitch
              key={fire.id}
              colors={colors}
              icon="bell"
              label={shortFromQuestion(fire.question) || t('lamp.unnamed')}
              sub={foldClock(fire.at)}
              on={lampNotifyOn(bookOf(fire.id)?.lamps.find((lamp) => lamp.id === fire.id))}
              last={at === fires.length - 1}
              onPress={() => flipOne(fire)}
            />
          ))}
        </SetCard>
      )}
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="clock" label={t('pings.comingUp')} sub={t('pings.comingUpSub')} chevron onPress={() => goHash('/later')} />
        <SetRow colors={colors} icon="help" label={t('pings.help')} sub={t('pings.helpSub')} chevron last onPress={() => goHash('/help')} />
      </SetCard>
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
      <View style={{ gap: 8 }}>
      <KeyButton colors={colors} label={locked ? t('settings.changeNumber') : t('settings.lockPhone')} onPress={saveLock} />
      {locked ? (
        <KeyButton
          colors={colors}
          label={t('settings.removeLock')}
          onPress={() =>
            publishSheet({
              title: t('confirm.pinRemoveTitle'),
              body: t('confirm.pinRemoveBody'),
              goLabel: t('settings.removeLock'),
              closeLabel: t('settings.neverMind'),
              colors,
              onClose: () => publishSheet(null),
              onGo: () => {
                publishSheet(null)
                clearPin()
                setPinDraft('')
                setPinMiss('')
                setPinOn(false)
                confirmDone(t('confirm.pinRemoved'))
              },
            })
          }
        />
      ) : null}
      </View>
      {pinMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{pinMiss}</Text> : null}
      {pinSaved ? <Text style={[styles.saved, { color: colors.on }]}>{t('settings.saved')}</Text> : null}
    </>
  )
}

// Name and note for this phone, and People: they sat on the first Settings
// page before it was grouped, so they live with the account now.
function AccountLinks({ colors }) {
  return (
    <>
      <View style={styles.dataGap} />
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="settings"
          tint={colors.inkSoft}
          label={t('settings.title')}
          sub={t('settings.phoneSubOut')}
          chevron
          onPress={() => goHash('/settings/phone')}
        />
        <SetRow
          colors={colors}
          icon="people"
          tint={colors.late}
          label={t('people.kicker')}
          sub={t('people.rowSub')}
          chevron
          last
          onPress={() => goHash('/people')}
        />
      </SetCard>
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
        <AccountLinks colors={colors} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('settings.account')} colors={colors}>
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
      <AccountLinks colors={colors} />
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

// Your own name first, then what the phone calls itself.
// The model beats the generic "Android app", so rows can be told apart.
function phoneName(row, here) {
  if (row.name) return row.name
  return row.device_key === here ? t('account.thisPhone') : row.model || row.label || t('account.aPhone')
}

function phoneSub(row, here) {
  const parts = []
  const mine = row.device_key === here
  if (row.name && mine) parts.push(t('account.thisPhone'))
  // Whatever the name did not already say: the model, or the kind of phone.
  if (row.model && (row.name || mine)) parts.push(row.model)
  else if (row.model && row.label && row.label !== row.model) parts.push(row.label)
  parts.push(t('account.seen', { date: deviceSeen(row.last_seen_at) }))
  return parts.join(' · ')
}

function RenamePhone({ row, colors, onClose, onSaved }) {
  const [draft, setDraft] = useState(row.name || '')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (busy) return
    setBusy(true)
    const out = await renameDevice(row.device_key, draft).catch(() => ({ miss: 'net' }))
    setBusy(false)
    if (out.miss) return confirmMiss(t('confirm.miss'))
    confirmDone(t('account.renamed'))
    onSaved()
  }
  return (
    <SetSheet colors={colors} title={t('account.renameTitle')} onClose={onClose}>
      <SetField
        colors={colors}
        label={t('account.renameLabel')}
        value={draft}
        onChangeText={setDraft}
        placeholder={row.label || t('account.aPhone')}
        maxLength={DEVICE_NAME_MAX}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <View style={styles.renameRow}>
        <DidButton small colors={colors} label={t('account.renameSave')} onPress={save} />
      </View>
    </SetSheet>
  )
}

function AccountSignedIn({ book, email, onChange }) {
  const colors = useHallColors()
  const sync = useSync()
  const purse = normalizePurse(book)
  const myAvatar = useMyAvatar()
  const [nameDraft, setNameDraft] = useState(book?.keeperName || keptProfileName())
  const account = useAccount()
  // Last launch's list shows while the fresh one loads.
  const [devices, setDevices] = useKept(`account.devices:${account.user?.id}`, [], KEEP)
  // Until the list comes back, say nothing rather than "only this phone".
  const [devicesIn, setDevicesIn] = useKept(`account.devicesIn:${account.user?.id}`, false, KEEP)
  const [sure, setSure] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMiss, setPhotoMiss] = useState('')
  const here = deviceKey()
  const canPhoto = canPickAvatar()

  useEffect(() => {
    setNameDraft(book?.keeperName || keptProfileName())
  }, [book?.keeperName])

  useEffect(() => {
    let alive = true
    listDevices().then((rows) => {
      if (!alive) return
      // null = the list didn't load: keep the saved one.
      if (!rows) return confirmMiss(t('confirm.miss'))
      setDevices(rows)
      setDevicesIn(true)
    }).catch(() => {
      if (alive) confirmMiss(t('confirm.miss'))
    })
    loadProfile().then((row) => {
      if (alive && row?.display_name && !book?.keeperName) setNameDraft(row.display_name)
    }).catch(() => {})
    return () => {
      alive = false
    }
  }, [book?.keeperName, sync.at])

  const line = syncLine(sync)
  const syncNote = line.at ? t(line.key, { time: stampWhen(line.at) }) : t(line.key)

  const lookName = purse.lookOn ? t(lookText(purse.lookOn, 'name')) : ''
  const cheerName = purse.cheerOn ? t(cheerText(purse.cheerOn, 'name')) : t('kit.cheerOff')
  // This phone first, then the rest by when they were last seen.
  const phones = [...devices].sort((a, b) => (a.device_key === here ? -1 : b.device_key === here ? 1 : 0))
  const others = phones.filter((row) => row.device_key !== here)

  const [busy, setBusy] = useState('')
  const [dataOpen, setDataOpen] = useState(false)
  const [allPhones, setAllPhones] = useState(false)
  const shownPhones = allPhones ? phones : phones.slice(0, 3)
  const phonesHidden = !allPhones && phones.length > 3

  async function download() {
    if (busy) return
    setBusy('export')
    try {
      const all = await exportAll()
      await shareShelf(all)
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error?.name !== 'AbortError') confirmMiss(t('confirm.exportMiss'))
    }
    setBusy('')
  }

  // Leaving the account: say it worked, or keep them here with what went wrong.
  async function leave(kind, run, force = false) {
    if (busy) return
    setBusy(kind)
    const out = await leaveAccount(kind, run, force)
    setBusy('')
    if (out === 'unsaved') {
      setSure({
        title: t('account.unsavedTitle'),
        body: t('account.unsavedBody'),
        yes: t('account.unsavedYes'),
        go: () => leave(kind, run, true),
      })
    }
  }

  async function pickPhoto(from) {
    setPhotoMiss('')
    setPhotoBusy(true)
    try {
      const bytes = await pickAvatarBytes(from)
      if (bytes) {
        const out = await saveAvatar(bytes)
        if (out.miss) setPhotoMiss(t(out.miss))
        else confirmDone(t('confirm.photoSaved'))
      }
    } catch (error) {
      setPhotoMiss(t({ 'camera-denied': 'avatar.cameraOff', 'photos-denied': 'avatar.photosOff' }[error?.message] || 'avatar.saveFail'))
    }
    setPhotoBusy(false)
  }

  // One row for both: pick from the library or take a new one.
  function choosePhoto() {
    if (photoBusy) return
    if (!canTakePhoto()) {
      pickPhoto('library')
      return
    }
    publishSheet({
      title: myAvatar ? t('avatar.change') : t('avatar.add'),
      goLabel: t('avatar.choose'),
      onGo: () => {
        publishSheet(null)
        pickPhoto('library')
      },
      moreLabel: t('avatar.takePhoto'),
      onMore: () => {
        publishSheet(null)
        pickPhoto('camera')
      },
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  const [renaming, setRenaming] = useState(null)

  // Rename any phone; forget any but this one.
  function phoneMenu(row) {
    if (row.device_key === here) {
      setRenaming(row)
      return
    }
    publishSheet({
      title: phoneName(row, here),
      body: row.model || undefined,
      goLabel: t('account.rename'),
      onGo: () => {
        publishSheet(null)
        setRenaming(row)
      },
      moreLabel: t('account.forgetShort'),
      onMore: () => {
        publishSheet(null)
        forgetOne(row)
      },
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  function forgetOne(row) {
    setSure({
      title: t('account.forgetTitle'),
      body: t('account.forgetBody', { phone: phoneName(row, here) }),
      yes: t('account.forgetYes'),
      go: async () => {
        try {
          const out = await forgetDevice(row.device_key)
          if (out?.miss) return confirmMiss(t('confirm.miss'))
          const rows = await listDevices()
          if (rows) setDevices(rows)
          confirmDone(t('confirm.phoneForgot'))
        } catch {
          confirmMiss(t('confirm.miss'))
        }
      },
    })
  }

  return (
    <ScreenShell title={t('account.inTitle')} colors={colors}>
      <View style={[styles.accountHead, styles.headCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        {/* Tapping your own photo changes it, the way most apps work. */}
        <Pressable
          disabled={!canPhoto || photoBusy}
          onPress={choosePhoto}
          accessibilityRole="button"
          accessibilityLabel={myAvatar ? t('avatar.change') : t('avatar.add')}
        >
          <Avatar person={{ display_name: nameDraft || email, avatar_url: myAvatar }} colors={colors} size={72} />
          {canPhoto ? (
            <View style={[styles.avatarEdit, { backgroundColor: colors.on, borderColor: colors.bg }]}>
              <MenuIcon name="pen" color={colors.bg} size={12} stroke />
            </View>
          ) : null}
        </Pressable>
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
            onPress={photoBusy ? undefined : choosePhoto}
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
            onPress={
              photoBusy
                ? undefined
                : () =>
                    setSure({
                      title: t('confirm.photoRemoveTitle'),
                      body: t('confirm.photoRemoveBody'),
                      yes: t('avatar.remove'),
                      go: async () => {
                        setPhotoMiss('')
                        setPhotoBusy(true)
                        try {
                          const out = await removeAvatar()
                          if (out?.miss) setPhotoMiss(t(out.miss))
                          else confirmDone(t('confirm.photoRemoved'))
                        } catch {
                          setPhotoMiss(t('confirm.miss'))
                        }
                        setPhotoBusy(false)
                      },
                    })
            }
          />
        ) : null}
        <SavableSetField
          colors={colors}
          label={t('account.name')}
          placeholder={t('settings.namePh')}
          value={nameDraft}
          savedValue={book?.keeperName || ''}
          onChangeText={setNameDraft}
          onSave={async (keeperName) => {
            setNameDraft(keeperName)
            onChange({ ...book, keeperName })
            try {
              const out = await saveProfile({ display_name: keeperName, look_on: purse.lookOn, badge_cheer: purse.cheerOn })
              if (out?.miss && out.miss !== 'out' && out.miss !== 'off') {
                confirmMiss(tMiss(out.miss))
                return false
              }
              confirmDone(t('confirm.nameSaved'))
            } catch {
              confirmMiss(t('confirm.miss'))
              return false
            }
          }}
        />
        <SetRow colors={colors} icon="wallpaper" label={t('account.look')} value={lookName} chevron onPress={() => goHash('/kit')} />
        <SetRow colors={colors} icon="collection" label={t('account.cheer')} value={cheerName} chevron last onPress={() => goHash('/kit')} />
      </SetCard>
      {photoMiss ? <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">{photoMiss}</Text> : null}

      <AccountLinks colors={colors} />

      <PhoneLockSection colors={colors} />

      <View style={styles.dataGap} />
      {/* Sign out stays in plain sight; the rarer ways to leave sit in the fold below. */}
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="logout"
          label={t('account.out')}
          last
          onPress={busy ? undefined : () => leave('out', signOutHere)}
        />
      </SetCard>
      <View style={styles.dataGap} />
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="shield"
          label={t('seen.title')}
          sub={t('seen.sub')}
          chevron
          onPress={() => goHash('/settings/seen')}
        />
        <SetRow
          colors={colors}
          icon="shield"
          label={t('account.privacyRow')}
          sub={t('account.privacySub')}
          chevron={!dataOpen}
          last
          onPress={() => setDataOpen((open) => !open)}
        />
      </SetCard>
      {dataOpen ? (
        <Reveal>
      <SetCap colors={colors}>{t('account.syncPhonesCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="globe" label={t('account.syncNow')} sub={syncNote} onPress={() => pullAndMerge()} />
        {phones.length ? (
          shownPhones.map((row, at) => (
            <Reveal key={row.device_key}>
            <SetRow
              colors={colors}
              icon={row.platform === 'web' ? 'globe' : 'person'}
              tint={row.device_key === here ? colors.on : colors.inkSoft}
              label={phoneName(row, here)}
              sub={phoneSub(row, here)}
              chevron
              last={at === shownPhones.length - 1 && !phonesHidden}
              onPress={() => phoneMenu(row)}
            />
            </Reveal>
          ))
        ) : (
          devicesIn ? <SetRow colors={colors} label={t('account.noDevices')} last /> : null
        )}
        {phonesHidden ? (
          <SetRow colors={colors} label={t('people.seeAll')} value={String(phones.length)} chevron last onPress={() => setAllPhones(true)} />
        ) : null}
      </SetCard>
      <SetNote colors={colors}>{t('account.devicesNote')}</SetNote>
      {renaming ? (
        <RenamePhone
          row={renaming}
          colors={colors}
          onClose={() => setRenaming(null)}
          onSaved={async () => {
            setRenaming(null)
            const rows = await listDevices()
            if (rows) setDevices(rows)
          }}
        />
      ) : null}
      {sync.how === 'miss' && sync.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]}>{tMiss(sync.miss)}</Text>
      ) : null}
      {others.length > 1 ? (
        <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="trash"
          danger
          last
          label={t('account.forgetOthers', { n: others.length })}
          onPress={() =>
            setSure({
              title: t('account.forgetOthersTitle'),
              body: t('account.forgetOthersBody'),
              yes: t('account.forgetYes'),
              go: async () => {
                try {
                  const out = await forgetOtherDevices()
                  if (out?.miss) return confirmMiss(t('confirm.miss'))
                  const rows = await listDevices()
                  if (rows) setDevices(rows)
                  confirmDone(t('confirm.phonesForgot'))
                } catch {
                  confirmMiss(t('confirm.miss'))
                }
              },
            })
          }
        />
        </SetCard>
      ) : null}
      <SetCap colors={colors}>{t('account.data')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="note" label={t('account.export')} sub={t('account.exportSub')} chevron last onPress={busy ? undefined : download} />
      </SetCard>

      <SetCap colors={colors}>{t('account.leaveCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="logout"
          label={t('account.outAll')}
          onPress={() =>
            setSure({
              title: t('account.outAllTitle'),
              body: t('account.outAllBody'),
              yes: t('account.outAllYes'),
              go: () => leave('outAll', signOutEverywhere),
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
              go: () => leave('delete', deleteAccount),
            })
          }
        />
      </SetCard>
        </Reveal>
      ) : null}
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
  firstTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  firstSignIn: { fontFamily: fonts.uiBold, fontSize: 14 },
  heroNumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calKey: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  // Year cells are small squares, so the key is too.
  calSquare: { borderRadius: 2 },
  calKeyText: { fontSize: 12, marginRight: 10 },
  accountHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  headCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 20 },
  dataGap: { height: 20 },
  hero: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16, gap: 2 },
  heroCap: { ...sectionLabel },
  heroNum: { fontFamily: fonts.display, fontSize: 44, fontWeight: '700' },
  heroLine: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tile: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 18, padding: 16, gap: 4 },
  // Three in a row: the week's DID, Late and Nope.
  tileThird: { flexBasis: '30%' },
  tileNum: { fontFamily: fonts.display, fontSize: 28, fontWeight: '700' },
  tileUnit: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '400' },
  tileLabel: { fontFamily: fonts.ui, fontSize: 13 },
  subtitle: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 10 },
  slotTime: { fontFamily: fonts.mono, fontSize: 16, minWidth: 64 },
  slotLabel: { flex: 1, minWidth: 0, fontFamily: fonts.ui, fontSize: 15 },
  slotChev: { fontFamily: fonts.ui, fontSize: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16, gap: 8 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  cardBody: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontFamily: fonts.ui, fontSize: 12 },
  // Same gap as the lead card, so a button never sits on the paragraph above it.
  foldBody: { gap: 8 },
  // A little more room between a help paragraph and the buttons under it.
  beforeBtn: { marginBottom: 6 },
  foldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  tagName: { paddingHorizontal: 14, paddingBottom: 10 },
  addRow: { flexDirection: 'row', gap: 10 },
  addCell: { flex: 1 },
  enterFields: { padding: 14, gap: 8 },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    borderRadius: radius.rSm,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  block: { gap: 4 },
  blockTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', marginTop: 8 },
  slot: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  firstCard: { justifyContent: 'flex-start', marginTop: 8 },
  firstBlank: { padding: 0, paddingTop: 0, paddingBottom: 6, minHeight: 32, borderBottomWidth: 2 },
  firstWhy: { flex: 1, fontFamily: fonts.ui, fontSize: 13 },
  firstWhen: { paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  firstWhenLabel: { fontFamily: fonts.uiSemi, fontSize: 16 },
  firstWhenSub: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  firstTime: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 },
  stepCap: { ...sectionLabel, marginBottom: 6 },
  firstOr: { marginTop: 16, marginBottom: 0 },
  stepNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  idea: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 8 },
  ideaQ: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  recentText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  saved: { fontFamily: fonts.uiSemi, fontSize: 12, marginTop: 6 },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  popBody: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  renameRow: { flexDirection: 'row', padding: 16 },
  week: { gap: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'center' },
  weekName: { width: 96, paddingRight: 8 },
  weekNameText: { fontFamily: fonts.ui, fontSize: 13 },
  weekHeadCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekDow: { fontFamily: fonts.mono, fontSize: 10 },
  weekDay: { fontFamily: fonts.mono, fontSize: 10 },
  weekCell: { width: 14, height: 14, borderRadius: 4 },
  weekDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  weekOff: { height: 2, borderRadius: 1, marginVertical: 6 },
  tileHalf: { flexBasis: '45%' },
})
