import { useEffect, useMemo, useRef, useState } from 'react'
import { pingsFailed } from '../shim/native.js'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import { takeSpoken } from '../../src/lib/voice-add.js'
import {
  AppState,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { commitBook, shelfMarks, streakLength } from '../../src/lib/achievements.js'
import { moveLamps } from '../../src/lib/board-ops.js'
import { savePastAnswer } from '../lib/past-answer.js'
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
import * as DocumentPicker from 'expo-document-picker'
import { planBackupLoad } from '../../src/lib/shelf-merge.js'
import { currentBook, enterLand, folderNameKey, liveLampCount, readShelf } from '../../src/lib/board-shelf.js'
import { pullAndMerge, signedOutSync, useSync } from '../../src/lib/cloud-sync.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { bestShelfStreak, freezeState, shelfStreak } from '../../src/lib/hall-feel.js'
import {
  clockWords,
  comingDays,
  markWelcomeSeen,
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
import { bestQuestionStreak, isDayCadence, shelfRate30 } from '../../src/lib/lamp-record.js'
import { SearchBox } from './questions.jsx'
import { pinWidget } from '../lib/widget-pin.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { readMine, usePeoplePulse } from '../../src/lib/people.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { exactAlarmsOn, openExactAlarms } from '../lib/exact-alarms.js'
import { openReminderChannel, reminderChannelOn } from '../lib/notification-perms.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { AFTERNOON_AT_DEFAULT, AFTERNOON_AT_TIMES, DAY_NUDGE_TIMES, MORNING_AT_DEFAULT, MORNING_AT_TIMES } from '../../src/lib/day-nudges.js'
import { LATER_MINUTES } from '../../src/lib/notify-answer.js'
import { lastCallAt as sharedLastCallAt, quietToFor } from '../../src/lib/quiet.js'
import { PING_KINDS, afterQuiet, awayEnd, awayKey, awayLeft, awayNow, awayStart, readPrefs, usePrefs, uses24h, writePrefs } from '../../src/lib/prefs.js'
import { CHEERS, LOOKS, cheerText, lookText, normalizePurse } from '../../src/lib/purse.js'
import { backupFileReady, copyText, pingTest, playClick, shareShelf } from '../../src/lib/native.js'
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
import { useDayNow } from '../hooks/useDayNow.js'
import { addDaysIso, boardDate, dateTag, dueTonight, formatBoardDate, isEvery, isPerWeek, nightOpen, periodLabel, periodNight } from '../../src/lib/recurrence.js'
import { perWeekLine } from '../../src/lib/every-copy.js'
import { packList } from '../../src/lib/starters.js'
import { FIRST_TIME, answeredNights, firstRunBook, isNewShelf, togglePack, togglePick } from '../../src/lib/first-run.js'
import { FirstPacks } from '../components/FirstPacks.jsx'
import { cloudSetUp } from '../../src/lib/cloud.js'
import { authSkipped, clearAuthSkip } from '../../src/lib/auth-gate.js'
import { AuthLegalNote } from '../components/AuthLegalNote.jsx'
import { leftoverOn, moveFolder, moveTargetFor, scopedBooks, sortFolders, tagIdsOf } from '../../src/lib/tags.js'
import { ripple } from '../lib/ripple.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { KEEP, useKept } from '../hooks/useKept.js'
import { startTour, useTourTarget } from '../lib/tour.js'
import { GRACE_END } from '../../src/lib/zone.js'
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
export function lastCopyLine() {
  try {
    const at = localStorage.getItem('did-i-last-copy')
    const d = at ? new Date(at) : null
    return d && !Number.isNaN(d.getTime()) ? t('account.lastCopy', { date: d.toLocaleDateString(dateTag()) }) : ''
  } catch {
    return ''
  }
}

export function SureModal({ sure, colors, onClose, onGo }) {
  if (!sure) return null
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{sure?.kicker || t('account.kicker')}</Text>
          <Text accessibilityRole="header" style={[styles.popTitle, { color: colors.ink }]}>{sure?.title}</Text>
          <Text style={[styles.popBody, { color: colors.inkSoft }]}>{sure?.body}</Text>
          {sure?.extra ? <KeyButton label={sure.extra.label} onPress={sure.extra.go} colors={colors} accessibilityLabel={sure.extra.label} /> : null}
          <View style={styles.popRow}>
            <DidButton small danger={Boolean(sure?.danger)} label={sure?.yes} onPress={onGo} colors={colors} />
            <KeyButton label={t('settings.neverMind')} onPress={onClose} colors={colors} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// locked: no back, menu or purse, so the screen can only be left by finishing it.
export function ScreenShell({ book, title, children, colors, showAdd = false, locked = false, scrollHandle, footer, onRefresh }) {
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
      onRefresh={onRefresh}
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

// A skip reads Not yet while its day is open. Once the day is over it is
// A past Not yet stays a Not yet, as in the calendar day sheet.
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
  const closeAt = clockWords(`${String(GRACE_END).padStart(2, '0')}:00`)
  return (
    <ScreenShell book={book} title={t('about.title')} colors={colors}>
      <View style={[styles.hero, { backgroundColor: withAlpha(colors.on, 0.12), borderColor: colors.on }]}>
        <Text style={[styles.cardBody, { color: colors.ink }]}>{t('about.p1')}</Text>
      </View>
      {['p2', 'p3', 'p4', 'p5'].map((id) => (
        <View key={id} style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{t(`about.${id}Title`)}</Text>
          <Text style={[styles.cardBody, { color: colors.inkSoft }]}>{t(`about.${id}`, { time: closeAt })}</Text>
        </View>
      ))}
      <View style={[styles.card, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
        <KeyButton colors={colors} label={t('about.how')} onPress={() => goHash('/help')} />
        <AppVersion colors={colors} />
      </View>
    </ScreenShell>
  )
}

// What friends and family can see, in plain words. The streak line reads the
// real share_streak on your profile; the rest follows from how people.js shares.
const SEEN_ROWS = ['friends', 'we', 'family', 'asks', 'checkOn', 'never']

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
        // 32 tall; the slop gives the 44pt tap.
        hitSlop={{ top: 6, bottom: 6 }}
        style={styles.foldHead}
      >
        <Text style={[styles.cardTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.slotChev, { color: colors.inkDim }]}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? <Reveal style={styles.foldBody}>{children}</Reveal> : null}
    </View>
  )
}

// One help topic: title, one short line, its Go buttons. Any longer text folds
// behind a full-width More row.
function HelpTopic({ colors, title, short, go, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{title}</Text>
      <Meta colors={colors} style={go || children ? styles.beforeBtn : undefined}>{short}</Meta>
      {go}
      {children ? (
        open ? (
          <Reveal>{children}</Reveal>
        ) : (
          <KeyButton colors={colors} label={t('help.more')} onPress={() => setOpen(true)} />
        )
      ) : null}
    </>
  )
}

export function HelpScreen() {
  const colors = useHallColors()
  const closeAt = clockWords(`${String(GRACE_END).padStart(2, '0')}:00`)
  return (
    <ScreenShell title={t('settings.howDidIWorks')} colors={colors}>
      <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.lead')}</Meta>
        <KeyButton colors={colors} label={t('settings.ideas')} onPress={() => goHash('/ideas')} />
        <KeyButton colors={colors} label={t('settings.what')} onPress={() => goHash('/about')} />
      </View>
      <KeyButton colors={colors} label={t('tour.help')} onPress={() => startTour('basics', { replay: true })} />
      <KeyButton colors={colors} label={t('tour.showFriends')} onPress={() => startTour('more', { replay: true })} />
      <HelpFold colors={colors} title={t('help.groupDaily')}>
        <HelpTopic colors={colors} title={t('help.tonight')} short={t('help.tonightP1')}>
          <Meta colors={colors}>{t('help.tonightP2', { time: closeAt })}</Meta>
        </HelpTopic>
        <HelpTopic colors={colors} title={t('help.streak')} short={t('help.streakP', { time: closeAt })}>
          <Meta colors={colors}>{t('help.slipFreeze')}</Meta>
        </HelpTopic>
        <HelpTopic
          colors={colors}
          title={t('freeze.howTitle')}
          short={t('freeze.helpP')}
          go={<KeyButton colors={colors} label={t('freeze.helpGo')} onPress={() => openFreezeHow(colors, readShelf()?.boards)} />}
        />
        <HelpTopic
          colors={colors}
          title={t('help.break')}
          short={t('help.breakP')}
          go={
            <View style={styles.moveRows}>
              <KeyButton colors={colors} label={t('away.cap')} onPress={() => goHash('/pings')} />
              <KeyButton colors={colors} label={t('help.breakPause')} onPress={() => goHash('/lamps')} />
              <KeyButton colors={colors} label={t('streaks.title')} onPress={() => goHash('/streaks')} />
            </View>
          }
        />
        <HelpTopic
          colors={colors}
          title={t('help.grace')}
          short={t('help.graceP', { time: closeAt })}
          go={<KeyButton colors={colors} label={t('home.calendar')} onPress={() => goHash('/calendar')} />}
        />
        <HelpTopic
          colors={colors}
          title={t('help.questions')}
          short={t('help.questionsP')}
          go={<KeyButton colors={colors} label={t('help.questionsGo')} onPress={() => goHash('/lamps')} />}
        />
        <HelpTopic
          colors={colors}
          title={t('help.pings')}
          short={t('help.pingsP')}
          go={<KeyButton colors={colors} label={t('help.pingsGo')} onPress={() => goHash('/pings')} />}
        >
          <Meta colors={colors}>{t('help.pingsZone')}</Meta>
        </HelpTopic>
        {Platform.OS === 'android' ? (
          <HelpTopic
            colors={colors}
            title={t('pings.lateTitle')}
            short={t('pings.lateBody')}
            go={<KeyButton colors={colors} label={t('pings.lateGo')} onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))} />}
          />
        ) : null}
        <HelpTopic
          colors={colors}
          title={t('help.widget')}
          short={t(Platform.OS === 'ios' ? 'help.widgetPIos' : 'help.widgetPAndroid')}
          go={<KeyButton colors={colors} label={t('help.widgetGo')} onPress={() => pinWidget(colors)} />}
        >
          <Meta colors={colors}>{t('help.widgetMore')}</Meta>
          <Meta colors={colors}>{t('help.widgetWatch')}</Meta>
        </HelpTopic>
      </HelpFold>
      <HelpFold colors={colors} title={t('help.groupSocial')}>
        <HelpTopic
          colors={colors}
          title={t('help.people')}
          short={t('help.peopleP')}
          go={<KeyButton colors={colors} label={t('help.peopleGo')} onPress={() => goHash('/people')} />}
        />
        <HelpTopic
          colors={colors}
          title={t('help.we')}
          short={t('help.weP1')}
          go={<KeyButton colors={colors} label={t('help.weGo')} onPress={() => goHash('/we/new')} />}
        >
          <Meta colors={colors}>{t('help.weP2')}</Meta>
        </HelpTopic>
        <HelpTopic colors={colors} title={t('help.cheers')} short={t('help.cheersP')} />
        <HelpTopic
          colors={colors}
          title={t('photos.title')}
          short={t('photos.emptyBody')}
          go={<KeyButton colors={colors} label={t('photos.title')} onPress={() => goHash('/photos')} />}
        />
      </HelpFold>
      <HelpFold colors={colors} title={t('help.groupShop')}>
        <HelpTopic
          colors={colors}
          title={t('help.coins')}
          short={t('help.coinsP')}
          go={<KeyButton colors={colors} label={t('help.shopGo')} onPress={() => goHash('/shop')} />}
        >
          <Meta colors={colors}>{t('help.wishP')}</Meta>
        </HelpTopic>
        <HelpTopic
          colors={colors}
          title={t('frames.what')}
          short={t('frames.howBody')}
          go={<KeyButton colors={colors} label={t('frames.all')} onPress={() => goHash('/kit', { id: 'frames' })} />}
        />
      </HelpFold>
      <HelpFold colors={colors} title={t('help.groupApp')}>
        <HelpTopic colors={colors} title={t('help.phone')} short={t('help.phonePApp')}>
          {backupFileReady() ? <Meta colors={colors}>{t('help.phoneBackup', { save: t('settings.sendFile'), load: t('account.loadFile') })}</Meta> : null}
        </HelpTopic>
        <HelpTopic
          colors={colors}
          title={t('help.safety')}
          short={t('help.safetyP')}
          go={
            <>
              <KeyButton colors={colors} label={t('help.peopleGo')} onPress={() => goHash('/people')} />
              <KeyButton colors={colors} label={t('settings.account')} onPress={() => goHash('/account')} />
            </>
          }
        />
        <HelpTopic
          colors={colors}
          title={t('help.legal')}
          short={t('help.legalP')}
          go={
            <>
              <KeyButton colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
              <KeyButton colors={colors} label={t('settings.terms')} onPress={() => goHash('/terms')} />
            </>
          }
        />
        <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.feedback')}</Text>
        <Meta colors={colors} style={styles.beforeBtn}>{t('help.feedbackP')}</Meta>
        <Meta colors={colors} style={styles.beforeBtn}>{legalEmail()}</Meta>
        <KeyButton
          colors={colors}
          label={t('friendId.copy')}
          onPress={async () => ((await copyText(legalEmail())) ? confirmDone(t('people.copied')) : confirmMiss(t('confirm.miss')))}
        />
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
      <DidButton colors={colors} label={t('nav.home')} onPress={() => goHash('/tonight')} />
      <Text style={[styles.blockTitle, { color: colors.ink }]}>{t('help.versionTitle')}</Text>
      <AppVersion colors={colors} />
    </ScreenShell>
  )
}

export function LaterScreen({ book, boards = [], now }) {
  const colors = useHallColors()
  // Ticks at midnight, so a screen left open moves to the new day.
  const today = useDayNow()
  const clock = now || today
  // Every folder, like Marks; rows name their folder when there is more than one.
  const books = boards.length ? boards : [book]
  const many = books.length > 1
  const nights = books
    .map((b) => comingDays(b, clock, 7).map((night) => ({ ...night, due: night.due.map((row) => ({ ...row, folder: many ? b.title : '' })) })))
    .reduce((all, list) => all.map((night, i) => ({ ...night, due: [...night.due, ...(list[i]?.due || [])] })))
    .filter((night) => night.due.length)
  const hung = books.flatMap((b) => (b?.lamps || []).filter((lamp) => !lamp.archived))

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
                key={`${row.folder}:${row.lamp.id}`}
                colors={colors}
                label={row.folder ? `${shortLabel(row.lamp)} · ${row.folder}` : shortLabel(row.lamp)}
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
      {hung.length ? <KeyButton colors={colors} label={t('tonight.add')} onPress={() => goHash('/add')} /> : null}
    </ScreenShell>
  )
}

export function MarksScreen({ book, boards = [], now }) {
  const colors = useHallColors()
  const gentle = usePrefs().gentle === true
  // Ticks at midnight, so a screen left open moves to the new day.
  const today = useDayNow()
  const clock = now || today
  const dateIso = boardDate(clock, book?.dayFoldHour)
  // Best ever, across every folder. hallHeat is a 0 to 5 level, not a streak, and read as a wrong number here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const best = useMemo(() => bestShelfStreak(boards.length ? boards : [book], clock), [boards, book, dateIso, awayKey()])
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
  const recentTour = useTourTarget('recent')
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
      <View {...recentTour}>
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
      {list.length ? (
        <View style={styles.recentClear}>
          <KeyButton colors={colors} label={t('recent.clear')} onPress={clearAll} />
        </View>
      ) : null}
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
              {new Date(item.at).toLocaleString(dateTag(), Date.now() - item.at > 6 * 86400000 ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            </Meta>
          </Pressable>
        ))
      ) : account.user && inbox > 0 ? null : (
        <EmptyCard title={t('recent.emptyTitle')} body={t('recent.emptyBody')} colors={colors}>
          <DidButton small label={t('nav.home')} onPress={() => goHash('/tonight')} colors={colors} />
        </EmptyCard>
      )}
      </View>
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

function NumberTile({ colors, label, n, unit = '', sub = '', onPress, third = false, half = false }) {
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
      {sub ? <Text style={[styles.tileLabel, { color: colors.inkDim }]} numberOfLines={1}>{sub}</Text> : null}
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
  // Ticks at midnight, so a screen left open moves to the new day.
  const today = useDayNow()
  const clock = now || today
  const dateIso = boardDate(clock, book?.dayFoldHour)
  // Long walks (streak, freezes): once per day, folder or Away change, not every render.
  const { counts, freezesHeld } = useMemo(
    () => ({ counts: shelfStatsCounts(inView(book, boards), clock, tagId), freezesHeld: freezeState(inView(book, boards), clock).held }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, boards, tagId, dateIso, awayKey()],
  )
  // The last seven nights, walked once per night (the Sunday recap, any day).
  const recap = useMemo(() => {
    const books = inView(book, boards)
    return weekRecap(books, weekStripNights(books, clock, tagId), tagId, clock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, boards, dateIso, tagId, awayKey()])
  // The longest run any one question had (nope breaks it), walked once a night.
  const bestRun = useMemo(() => {
    let best = 0
    for (const one of scopedBooks(inView(book, boards), tagId)) {
      for (const lamp of one.lamps || []) if (isDayCadence(lamp)) best = Math.max(best, bestQuestionStreak(one, lamp, dateIso))
    }
    return best
  }, [book, boards, dateIso, tagId, awayKey()])

  const rate30 = useMemo(() => shelfRate30(scopedBooks(inView(book, boards), tagId), dateIso), [book, boards, tagId, dateIso, awayKey()]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!counts.hung) {
    const filtered = tagIdsOf(tagId).length > 0
    return (
      <ScreenShell title={t('stats.title')} colors={colors}>
        <FolderScope colors={colors} boards={boards} tagId={tagId} path="/stats" />
        <Meta colors={colors}>{t(filtered ? 'stats.folderEmpty' : 'streaks.empty')}</Meta>
        {filtered ? null : <DidButton colors={colors} label={t('home.add')} onPress={() => goHash('/add')} />}
      </ScreenShell>
    )
  }

  if (!(counts.did + counts.late + counts.skip)) {
    return (
      <ScreenShell title={t('stats.title')} colors={colors}>
        <FolderScope colors={colors} boards={boards} tagId={tagId} path="/stats" />
        <Meta colors={colors}>{t('stats.empty')}</Meta>
        <DidButton colors={colors} label={t('empty.goTonight')} onPress={() => goHash('/tonight')} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('stats.title')} colors={colors}>
      <FolderScope colors={colors} boards={boards} tagId={tagId} path="/stats" />
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
          chip={<FreezeChip colors={colors} held={freezesHeld} onPress={() => openFreezeHow(colors, inView(book, boards), clock)} />}
        />
      )}
      <View style={styles.tiles}>
        <NumberTile third colors={colors} label={t('stats.did')} n={recap.dids - recap.late} />
        <NumberTile third colors={colors} label={t('stats.late')} n={recap.late} />
        {gentle ? null : <NumberTile third colors={colors} label={t('stats.nope')} n={recap.nopes} />}
      </View>
      <KeyButton colors={colors} label={t('recap.shareBtn')} onPress={() => shareRecap(recap)} />

      <SetCap colors={colors}>{t('stats.allCap')}</SetCap>
      <View style={styles.tiles}>
        <NumberTile third colors={colors} label={t('stats.did')} n={counts.did} />
        <NumberTile third colors={colors} label={t('stats.late')} n={counts.late} />
        {gentle ? null : <NumberTile third colors={colors} label={t('stats.nope')} n={counts.skip} />}
        <NumberTile half={!gentle} colors={colors} label={t('stats.questions')} n={counts.hung} />
        {gentle ? null : bestRun ? <NumberTile half colors={colors} label={t('stats.bestRun')} n={bestRun} /> : null}
        {gentle || rate30 == null ? null : <NumberTile half colors={colors} label={t('stats.last30')} n={`${rate30.rate}%`} sub={t('stats.last30Of', { did: rate30.did, n: rate30.asked })} />}
      </View>

      <SetCap colors={colors}>{t('stats.moreCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="flag" label={t('stats.marks')} sub={t('stats.marksSub')} chevron onPress={() => goHash('/marks')} />
        <SetRow colors={colors} icon="week" label={t('streaks.seven')} sub={t('stats.sevenSub')} chevron onPress={() => goHash('/week')} />
        <SetRow colors={colors} icon="chart" label={t('settings.history')} chevron onPress={() => goHash('/calendar')} />
        <SetRow colors={colors} icon="calendar" label={t('cal.viewYear')} chevron onPress={() => goHash('/calendar', 'year')} />
        <SetRow colors={colors} icon="priority" label={t('streaks.title')} sub={t('stats.streaksSub')} chevron last onPress={() => goHash('/streaks')} />
      </SetCard>
    </ScreenShell>
  )
}

// Long lists (every answer ever, every note) drew every row on open, which
// held up the screen. The first PAGE draw; Show more adds the next.
const PAGE = 40
function useShown(rows, resetKey) {
  const [count, setCount] = useState(PAGE)
  useEffect(() => setCount(PAGE), [resetKey])
  return { shown: rows.length > count ? rows.slice(0, count) : rows, more: Math.max(0, rows.length - count), showMore: () => setCount((n) => n + PAGE) }
}

function ShowMore({ more, onPress, colors }) {
  if (!more) return null
  return <KeyButton colors={colors} label={t('list.more', { n: Math.min(more, PAGE) })} onPress={onPress} />
}

export function FeedScreen({ book, boards, tagId = '', now }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const allRows = useMemo(() => shelfFeedRows(inView(book, boards), tagId), [book, boards, tagId])
  const [query, setQuery] = useState('')
  const rows = useMemo(() => feedSearch(allRows, query), [allRows, query])
  const page = useShown(rows, query)

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
        <><Meta colors={colors}>{t('feed.noMatch')}</Meta><KeyButton colors={colors} label={t('questions.searchClear')} onPress={() => setQuery('')} /></>
      ) : (
        <>
        {page.shown.map((row) => (
          <Row
            key={row.answer.id}
            colors={colors}
            label={row.lamp ? (row.folder ? `${shortLabel(row.lamp)} · ${row.folder}` : shortLabel(row.lamp)) : t('feed.deleted')}
            note={`${statusWord(row.answer.status, Boolean(row.lamp) && nightOpen(periodNight(row.lamp, row.answer.periodKey), clock))}${
              tapWhen(row.answer.answeredAt, clock) ? ` · ${tapWhen(row.answer.answeredAt, clock)}` : ''
            }${row.answer.note ? `\n${row.answer.note}` : ''}`}
            onPress={() => row.lamp && goHash('/lamp', { id: row.lamp.id })}
          />
        ))}
        <ShowMore more={page.more} onPress={page.showMore} colors={colors} />
        </>
      )}
    </ScreenShell>
  )
}

// Every note, newest first, with a search over the note and its question.
export function NotesScreen({ book, boards }) {
  const colors = useHallColors()
  const allRows = useMemo(() => shelfNoteRows(inView(book, boards)), [book, boards])
  const [query, setQuery] = useState('')
  const rows = useMemo(() => feedSearch(allRows, query), [allRows, query])
  const page = useShown(rows, query)

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
        <><Meta colors={colors}>{t('feed.noMatch')}</Meta><KeyButton colors={colors} label={t('questions.searchClear')} onPress={() => setQuery('')} /></>
      ) : (
        <>
        {page.shown.map((row) => {
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
        })}
        <ShowMore more={page.more} onPress={page.showMore} colors={colors} />
        </>
      )}
    </ScreenShell>
  )
}

export function CalendarScreen({ book, boards, tagId, now, route, onChangeBooks }) {
  const colors = useHallColors()
  const today = useDayNow()
  const clock = now || today
  const [view, setView] = useState(route?.face === 'year' ? 'year' : 'month')
  const [startShift, setStartShift] = useState(0)
  const calPrefs = usePrefs()
  const gentle = calPrefs.gentle === true
  const showFreeKey = calPrefs.freeMiss === true || (calPrefs.freeMissSpans || []).length > 0
  const newShelf = useMemo(() => isNewShelf(boards), [boards])
  const noAnswers = useMemo(() => answeredNights(scopedBooks(inView(book, boards), tagId), 1) === 0, [book, boards, tagId])
  const lampId = route?.id || ''
  const oneLamp = useMemo(() => {
    if (!lampId) return null
    for (const b of boards?.length ? boards : [book]) {
      const found = (b.lamps || []).find((l) => l.id === lampId)
      if (found) return found
    }
    return null
  }, [lampId, boards, book])

  if (lampId) {
    return (
      <ScreenShell title={oneLamp ? shortLabel(oneLamp) : t('settings.history')} colors={colors}>
        <YearGrid book={book} boards={boards} lampId={lampId} now={clock} colors={colors} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('settings.history')} colors={colors}>
      <FolderScope colors={colors} boards={boards} tagId={tagId} path="/calendar" />
      {newShelf ? <Meta colors={colors}>{t('cal.hintGentle')}</Meta> : null}
      {noAnswers ? (
        <EmptyCard title={t('recent.emptyTitle')} body={t('cal.emptyBody')} colors={colors}>
          <DidButton small label={t('nav.home')} onPress={() => goHash('/tonight')} colors={colors} />
        </EmptyCard>
      ) : null}
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
        <CalendarGrid
          book={book}
          boards={boards}
          tagId={tagId}
          now={clock}
          colors={colors}
          startShift={startShift}
          onAnswer={onChangeBooks ? (row, status) => {
            const from = (boards?.length ? boards : [book]).find((item) => item.id === row.boardId) || book
            return savePastAnswer(from, row, status, (saved) => onChangeBooks([saved]))
          } : undefined}
          onNote={onChangeBooks ? (saved) => onChangeBooks([saved]) : undefined}
        />
      )}
      <View style={styles.calKey}>
        <View style={[styles.calDot, view === 'year' && styles.calSquare, { backgroundColor: colors.on }]} />
        <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('stats.did')}</Text>
        {gentle ? null : (
          <>
            <View style={[styles.calDot, view === 'year' && styles.calSquare, missDot(colors, colors.open)]} />
            <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('cal.keyMissed')}</Text>
          </>
        )}
        <View style={[styles.calDot, view === 'year' && styles.calSquare, { borderWidth: 1.5, borderColor: colors.freeze }]} />
        <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('freeze.dot')}</Text>
        {showFreeKey ? (
          <>
            <View style={[styles.calDot, view === 'year' && styles.calSquare, { borderWidth: 1.5, borderColor: colors.on }]} />
            <Text style={[styles.calKeyText, { color: colors.inkDim }]}>{t('saves.dot')}</Text>
          </>
        ) : null}
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
  const today = useDayNow()
  const clock = now || today
  const gentle = usePrefs().gentle === true
  const [weekShift, setWeekShift] = useState(0)
  useEffect(() => setWeekShift(0), [tagId])
  // The week's walks once per shelf, folder and minute, not every render.
  const minute = Math.floor(clock.getTime() / 60000)
  const { nights, lamps, strip } = useMemo(() => {
    const at = new Date(minute * 60000)
    const shelf = inView(book, boards)
    const nights = shelfWeekNights(shelf, at, tagId, 7, weekShift)
    // Same night rule as the Home dots and So far: every question and every Did
    // we due that night answered Did (or late).
    return { nights, lamps: weekLamps(nights), strip: weekStripNights(shelf, at, tagId, weekShift) }
  }, [book, boards, tagId, minute, weekShift])
  const perWeekFor = (lamp) => {
    const owner = inView(book, boards).find((b) => (b.lamps || []).some((l) => l.id === lamp.id))
    return owner ? perWeekLine(owner, lamp, nights[nights.length - 1].iso) : ''
  }
  const cleared = new Set(strip.filter((night) => night.on).map((night) => night.iso))
  const doneNights = cleared.size
  const frozen = new Set(strip.filter((night) => night.freeze).map((night) => night.iso))
  const freeDays = new Set(strip.filter((night) => night.free).map((night) => night.iso))
  const weCards = weCardsOn(nights.map((night) => night.iso), tagId)
  const anyOff =
    lamps.some((lamp) => nights.some((night) => weekCell(night, lamp).state === 'off')) ||
    weCards.some((card) => nights.some((night) => weCardState(night.iso, card) === 'off'))

  function cellColor(state) {
    if (state === 'yes') return colors.on
    if (state === 'late') return colors.late
    if (state === 'skip') return colors.skip
    // A missed day is plain, not a warning, gentle or not.
    if (state === 'hole') return colors.open
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
    if (state === 'free') return { borderWidth: 1.5, borderColor: colors.on }
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

  function stateWord(state) {
    if (state === 'yes') return t('later.did')
    if (state === 'late') return t('later.late')
    if (state === 'skip') return t(gentle ? 'later.nope' : 'jewelKey.notYet')
    if (state === 'hole') return t('later.missed')
    if (state === 'off') return t('week.notAsked')
    return t('jewelKey.open')
  }

  function openNight(night) {
    openNightWhy({ colors, boards: inView(book, boards), iso: night.iso, now: clock, tagId, onCalendar: () => goHash('/calendar') })
  }

  function cell(night, state, label) {
    return (
      <Pressable
        key={night.iso}
        style={styles.weekCellHit}
        onPress={() => openNight(night)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${night.label}, ${stateWord(state)}`}
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
    ['skip', t(gentle ? 'later.nope' : 'jewelKey.notYet')],
    ...(gentle ? [] : [['hole', t('later.missed')]]),
    ...(frozen.size ? [['freeze', t('freeze.dot')]] : []),
    ...(freeDays.size ? [['free', t('saves.dot')]] : []),
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
        <View style={styles.weekPager}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('weekbar.prev')} onPress={() => setWeekShift((n) => n - 1)} style={styles.weekShiftBtn}>
            <Text style={[styles.weekShift, { color: colors.inkSoft }]}>‹</Text>
          </Pressable>
          <Text style={[styles.weekRange, { color: colors.inkDim }]}>{`${nights[0].label} - ${nights[nights.length - 1].label}`}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('weekbar.next')}
            accessibilityState={{ disabled: weekShift >= 0 }}
            disabled={weekShift >= 0}
            onPress={() => setWeekShift((n) => Math.min(0, n + 1))}
            style={styles.weekShiftBtn}
          >
            <Text style={[styles.weekShift, { color: weekShift >= 0 ? colors.line : colors.inkSoft }]}>›</Text>
          </Pressable>
        </View>
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
                        : freeDays.has(night.iso)
                          ? { borderWidth: 1, borderColor: colors.on }
                          : null,
                  ]}
                />
              </Pressable>
            ))}
          </View>
          {lamps.map((lamp) => (
            <View key={lamp.id} style={styles.weekRow}>
              <Pressable
                onPress={() => goHash('/lamp', { id: lamp.id })}
                accessibilityRole="button"
                style={[styles.weekName, styles.weekNameHit]}
              >
                <Text numberOfLines={1} style={[styles.weekNameText, { color: colors.ink }]}>
                  {shortLabel(lamp)}
                </Text>
                {isPerWeek(lamp) ? (
                  <Text numberOfLines={1} style={[styles.weekPer, { color: colors.inkSoft }]}>{perWeekFor(lamp)}</Text>
                ) : null}
              </Pressable>
              {nights.map((night) => cell(night, weekCell(night, lamp).state, shortLabel(lamp)))}
            </View>
          ))}
          {weCards.map((card) => (
            <View key={`we-${card}`} style={styles.weekRow}>
              <Text numberOfLines={1} style={[styles.weekName, styles.weekNameText, { color: colors.ink }]}>
                {weCardShort(card) || t('we.title')}
              </Text>
              {nights.map((night) => cell(night, weState(night, card), weCardShort(card) || t('we.title')))}
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

function streakUnit(lamp, n) {
  const one = n === 1
  if (isPerWeek(lamp)) return t(one ? 'streaks.unitWeekOne' : 'streaks.unitWeeks')
  if (isEvery(lamp)) return t(one ? 'streaks.unitOnTimeOne' : 'streaks.unitOnTime')
  return t(one ? 'streaks.unitOne' : 'streaks.unit')
}

export function StreaksScreen({ book, boards, tagId = '', now }) {
  const colors = useHallColors()
  const gentle = usePrefs().gentle === true
  // Ticks at midnight, so a screen left open moves to the new day.
  const today = useDayNow()
  const clock = now || today
  // Multi-night walks: once per shelf, folder, day and Away change, not every render.
  const dateIso = boardDate(clock, book?.dayFoldHour)
  const freeMiss = usePrefs().freeMiss === true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { books, heat, freezes, rows } = useMemo(() => {
    const at = clock
    const books = scopedBooks(inView(book, boards), tagId)
    return {
      books,
      heat: books.length ? shelfStreak(books, at) : 0,
      // Freezes belong to the overall streak, whatever tag is picked.
      freezes: freezeState(inView(book, boards), at),
      rows: books
        .flatMap((one) =>
          (one.lamps || []).filter((lamp) => !lamp.archived).map((lamp) => ({ lamp, n: streakLength(one, lamp, at) })),
        )
        // Days first, so weeks or on-time counts never outrank a day count.
        .sort((a, b) => Number(isDayCadence(b.lamp)) - Number(isDayCadence(a.lamp)) || b.n - a.n),
    }
  }, [book, boards, tagId, dateIso, awayKey(), freeMiss])
  const bestEver = useMemo(() => bestShelfStreak(inView(book, boards), clock), [book, boards, dateIso, awayKey(), freeMiss]) // eslint-disable-line react-hooks/exhaustive-deps
  // A question's run can be longer than the overall one: say which night broke it.
  const longest = rows.length && isDayCadence(rows[0].lamp) ? rows[0].n : 0
  const breakNight = useMemo(
    () => (longest > heat ? streakBreak(inView(book, boards), clock, tagId, longest + 1) : null),
    [book, boards, tagId, longest, heat, awayKey(), dateIso, freeMiss], // eslint-disable-line react-hooks/exhaustive-deps
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
      />
      {bestEver > heat ? <Meta colors={colors}>{t('streaks.best', { n: bestEver })}</Meta> : null}
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
        <SetRow colors={colors} icon="snow" tint={colors.freeze} label={t('freeze.rowTitle')} sub={freezeLine(freezes)} chevron onPress={() => openFreezeHow(colors, inView(book, boards), clock, { fromStreaks: true })} />
        <SetSwitch colors={colors} icon="snow" tint={colors.freeze} label={t('saves.toggle')} sub={t('saves.how')} on={freeMiss} last onPress={() => writePrefs({ freeMiss: !freeMiss })} />
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
              unit={streakUnit(row.lamp, row.n)}
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

export function BoardsScreen({ book, boards, onSelect, onAdd, onRemove, onReorder, onChange, onChangeBooks, onStartEmpty }) {
  const colors = useHallColors()
  const [titleDraft, setTitleDraft] = useState(book?.title || '')
  const [addMiss, setAddMiss] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const reduce = useReduceMotion()
  const scrollHandle = useRef(null)
  const addRef = useRef(null)
  const renameDirty = Boolean(titleDraft.trim()) && titleDraft.trim() !== (book?.title || '')
  const [removed, setRemoved] = useState(null)
  // Remove has an undo: the folder comes back with its questions and answers.
  useUndoToast('folders', removed, () => {
    // The folder comes back, and the one its questions moved into goes back too.
    if (removed?.folder) {
      const folder = removed.folder
      if (removed.moveTo && onChangeBooks) {
        const empty = { ...folder, lamps: [], answers: [] }
        const current = (readShelf().boards || []).filter((item) => item.id !== folder.id)
        const picks = removed.lampIds.map((lampId) => ({ boardId: removed.moveTo, lampId }))
        const moved = moveLamps([...current, empty], picks, folder.id)
        onChangeBooks(moved.length ? moved : [folder])
      } else if (onChangeBooks) onChangeBooks([folder])
      else onChange?.(folder)
    }
    setRemoved(null)
  }, DELETE_UNDO_MS, t('tonight.undoTap'))

  // The title last saved, so a blur right after a save does not save twice.
  const savedTitle = useRef(book?.title || '')
  const [renamed, setRenamed] = useState(null)
  // A rename has an undo: the folder gets its old title back.
  useUndoToast('folder-rename', renamed, () => {
    const now = (readShelf().boards || []).find((item) => item.id === renamed?.id)
    if (now) {
      savedTitle.current = renamed.prior
      setTitleDraft(renamed.prior)
      onChange({ ...now, title: renamed.prior, at: new Date().toISOString() })
    }
    setRenamed(null)
  }, DELETE_UNDO_MS, t('tonight.undoTap'))
  // Returns false when the typed name cannot be saved (a clash).
  function commitName() {
    const title = titleDraft.trim()
    if (!title || title === savedTitle.current) return true
    // Same name as another folder: saving would merge the two.
    const clash = (boards || []).find((item) => item.id !== book?.id && folderNameKey(item.title) === folderNameKey(title))
    if (clash) {
      confirmMiss(clash.archived ? t('boards.addSameParked', { name: clash.title }) : t('boards.addSame'))
      return false
    }
    const prior = savedTitle.current
    savedTitle.current = title
    setTitleDraft(title)
    onChange({ ...book, title, at: new Date().toISOString() })
    if (prior) setRenamed({ id: book.id, stamp: Date.now(), label: t('confirm.folderRenamed', { title }), prior })
    else confirmDone(t('settings.saved'))
    return true
  }

  // Picking another folder saves a rename first; a name that clashes stays put with its message.
  function pick(id) {
    if (id !== book?.id && !commitName()) return
    onSelect?.(id)
  }

  function addFolder() {
    const title = newName.trim()
    if (!title) {
      setAddMiss(t('boards.addMiss'))
      return
    }
    if ((boards || []).some((item) => !item.archived && folderNameKey(item.title) === folderNameKey(title))) {
      setAddMiss(t('boards.addSame'))
      return
    }
    // A parked folder with that name: open it, which brings it back.
    const asleep = (boards || []).find((item) => item.archived && folderNameKey(item.title) === folderNameKey(title))
    if (asleep) {
      setAdding(false)
      setNewName('')
      setAddMiss('')
      pick(asleep.id)
      return
    }
    onAdd?.(title)
    setAdding(false)
    setNewName('')
    setAddMiss('')
  }
  const live = sortFolders((boards || []).filter((item) => !item.archived))
  // Empty folders parked once the list is crowded: kept behind one row, so
  // they can still be opened (which brings one back) or removed.
  const parked = (boards || []).filter((item) => item.archived)
  const [showParked, setShowParked] = useState(false)

  const [reordered, setReordered] = useState(null)
  // Move has an undo: the folders go back to the order they had.
  useUndoToast('folder-order', reordered, () => {
    const stamp = new Date().toISOString()
    const fresh = readShelf().boards || []
    const back = (reordered?.prior || []).flatMap((one) => {
      const now = fresh.find((item) => item.id === one.id)
      return now && now.order !== one.order ? [{ ...now, order: one.order, at: stamp }] : []
    })
    if (back.length) onReorder?.(back)
    setReordered(null)
  }, DELETE_UNDO_MS, t('tonight.undoTap'))

  function shift(item, step) {
    const changed = moveFolder(live, item.id, step)
    if (!changed.length) return
    setReordered({ id: Date.now(), label: t('confirm.folderMoved', { title: item.title }), prior: live.map((one, at) => ({ id: one.id, order: at })) })
    onReorder?.(changed)
  }

  function askMove(item, at) {
    const last = live.length - 1
    const rows = [
      ['boards.moveTop', -live.length, at === 0],
      ['boards.moveUp', -1, at === 0],
      ['boards.moveDown', 1, at === last],
      ['boards.moveBottom', live.length, at === last],
    ]
    publishSheet({
      bottom: true,
      title: t('boards.moveTitle', { title: item.title }),
      content: (
        <View style={styles.moveRows}>
          {rows.map(([key, step, off]) => (
            <KeyButton
              key={key}
              colors={colors}
              disabled={off}
              label={t(`${key}Short`)}
              accessibilityLabel={t(key, { title: item.title })}
              onPress={() => {
                publishSheet(null)
                shift(item, step)
              }}
            />
          ))}
        </View>
      ),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  function removeFolder(moveTo) {
    publishSheet(null)
    const saved = readShelf().boards || []
    const target = moveTo ? saved.find((item) => item.id === moveTo) : null
    const folder = saved.find((item) => item.id === book.id) || book
    // With a move, undo takes the questions back out of the current target
    // (answers since then kept), not a saved copy of it.
    setRemoved({ id: Date.now(), label: t('confirm.folderRemoved', { title: book.title }), folder, moveTo: target ? moveTo : '', lampIds: (folder.lamps || []).map((item) => item.id) })
    onRemove?.(book.id, moveTo)
  }

  function askRemove() {
    const n = (book.lamps || []).length
    // A live folder takes them; a parked one only when nothing else is live (the move wakes it).
    const home = moveTargetFor(boards, book.id, (item) => folderNameKey(item.title) === folderNameKey(t('tags.general')))
    if (!n || !home) {
      publishSheet({
        title: t('boards.removeTitle', { title: book.title }),
        body: t('boards.removeEmpty'),
        goLabel: t('boards.removeNamed', { title: book.title }),
        danger: true,
        closeLabel: t('settings.neverMind'),
        colors,
        onClose: () => publishSheet(null),
        onGo: () => removeFolder(null),
      })
      return
    }
    publishSheet({
      title: t('boards.removeTitle', { title: book.title }),
      body: t('boards.removeHolds', { count: n === 1 ? t('boards.qOne') : t('boards.qMany', { n }) }),
      goLabel: t('boards.removeMove', { folder: home.title }),
      onGo: () => removeFolder(home.id),
      moreLabel: t('boards.removeWith'),
      moreDanger: true,
      onMore: () => removeFolder(null),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  useEffect(() => {
    setTitleDraft(book?.title || '')
    savedTitle.current = book?.title || ''
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
            <View style={styles.folderLine}>
              <View style={styles.folderMain}>
                <SetRow
                  colors={colors}
                  tint={on ? colors.on : undefined}
                  icon="folder"
                  label={item.title}
                  sub={on ? `${t('boards.addsHere')} · ${countNote} · ${leftNote}` : `${countNote} · ${leftNote}`}
                  last={at === live.length - 1 && !on && n > 0}
                  onPress={() => pick(item.id)}
                />
                {n === 0 ? (
                  <SetRow
                    colors={colors}
                    icon="add"
                    tint={colors.on}
                    label={t('boards.addQuestionHere')}
                    chevron
                    last={at === live.length - 1 && !on}
                    onPress={() => {
                      pick(item.id)
                      goHash('/add', { tag: item.id })
                    }}
                  />
                ) : null}
              </View>
              {live.length > 1 ? (
                <Pressable
                  onPress={() => askMove(item, at)}
                  accessibilityRole="button"
                  accessibilityLabel={t('boards.moveBtnNamed', { title: item.title })}
                  android_ripple={ripple(colors.panel3)}
                  style={styles.moveBtn}
                >
                  <Text maxFontSizeMultiplier={1.3} style={{ color: colors.ink, fontSize: 14 }}>{t('boards.moveBtn')}</Text>
                </Pressable>
              ) : null}
            </View>
            {on ? (
              <View style={styles.tagName}>
              <DidButton
                colors={colors}
                label={t('boards.openNamed', { title: item.title })}
                accessibilityLabel={t('boards.openNamed', { title: item.title })}
                onPress={() => goHash('/tonight', { tag: item.id })}
              />
              <View style={styles.openGap} />
              <Field
                colors={colors}
                label={t('boards.name')}
                value={titleDraft}
                onChangeText={setTitleDraft}
                onEndEditing={commitName}
                returnKeyType="done"
                maxLength={60}
                autoCapitalize="words"
              />
              <KeyButton colors={colors} label={t('settings.save')} disabled={!renameDirty} onPress={commitName} />
              {live.length > 1 ? (
                <KeyButton colors={colors} label={t('boards.removeNamed', { title: item.title })} onPress={askRemove} />
              ) : (
                <Text style={[styles.lastFolder, { color: colors.inkSoft }]}>{t('boards.lastFolder')}</Text>
              )}
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
                <View key={item.id}>
                <SetRow
                  colors={colors}
                  icon="folder"
                  label={item.title}
                  chevron
                  last={at === parked.length - 1 && item.id !== book?.id}
                  onPress={() => pick(item.id)}
                />
                {/* A parked folder picked here can be renamed too. */}
                {item.id === book?.id ? (
                  <View style={styles.tagName}>
                  <DidButton
                    colors={colors}
                    label={t('boards.openNamed', { title: item.title })}
                    accessibilityLabel={t('boards.openNamed', { title: item.title })}
                    onPress={() => goHash('/tonight', { tag: item.id })}
                  />
                  <View style={styles.openGap} />
                  <Field
                    colors={colors}
                    label={t('boards.name')}
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    onEndEditing={commitName}
                    returnKeyType="done"
                    maxLength={60}
                    autoCapitalize="words"
                  />
                  <KeyButton colors={colors} label={t('settings.save')} disabled={!renameDirty} onPress={commitName} />
                  {live.length > 0 ? (
                    <KeyButton colors={colors} label={t('boards.removeNamed', { title: item.title })} onPress={askRemove} />
                  ) : null}
                  </View>
                ) : null}
                </View>
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
            maxLength={60}
            autoCapitalize="words"
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
      {onStartEmpty && book ? (
        <>
          <View style={styles.dataGap} />
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

export function EnterScreen({ book, onSaveKeeper, onEraseHere, returnTo, returnRoute }) {
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
    goHash(returnTo ?? enterLand('/tonight'), returnTo && returnRoute ? { ...returnRoute, keepFocus: true } : '')
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
    const boardTitle = title.trim() || book?.title || t('enter.boardHint')
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
            <Field colors={colors} label={t('enter.pin')} value={pin} onChangeText={setPinDraft} keyboardType="number-pad" secureTextEntry maxLength={8} autoFocus returnKeyType="go" onSubmitEditing={openNamed} />
          ) : (
            <>
              <Field colors={colors} label={t('enter.name')} value={person} onChangeText={setPerson} autoCapitalize="words" maxLength={40} returnKeyType="next" />
              <Field colors={colors} label={t('enter.board')} value={title} onChangeText={setTitle} maxLength={60} returnKeyType="go" onSubmitEditing={openNamed} />
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
              onChangeText={(value) => setCode(String(value).replace(/\D/g, ''))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={8}
              returnKeyType="go"
              onSubmitEditing={busy ? undefined : removeWithCode}
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
  const [blank, setBlank] = useState(() => takeSpoken())
  const [focused, setFocused] = useState(false)
  const [wave, setWave] = useState(0)
  const [hint, setHint] = useState(false)
  const blankRef = useRef(null)
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
    onChange?.(made.book)
    markWelcomeSeen()
    // No notification ask from here: a sheet opened while /first was still on
    // screen sent Not now back into step 1 with nothing saved. AppShell offers
    // it once Tonight is up (offerFirstPingPrimer).
    goHash('/tonight', made.faceId ? { face: made.faceId } : '')
  }

  function next() {
    playClick()
    if (step === 0) {
      if (!ready) {
        setHint(true)
        blankRef.current?.focus()
        return
      }
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
        {step > 0 ? <KeyButton colors={colors} label={t('first.back')} onPress={back} /> : null}
        <DidButton
          colors={colors}
          label={step === totalSteps - 1 ? t('first.done') : ready ? t('first.nextCount', { n: count }) : t('first.next')}
          onPress={next}
        />
        {step === 0 && !ready ? (
          <Text style={[styles.firstWhy, { color: colors.inkSoft }]}>{t(hint ? 'first.addHint' : 'first.pickFirst')}</Text>
        ) : null}
      </View>
      {/* Continue stays the main button; these two sit under it as quiet full-width rows. */}
      {step === 0 ? (
        <View style={styles.quietRow}>
          <KeyButton colors={colors} label={t('first.startEmpty')} onPress={startEmpty} />
        </View>
      ) : null}
      {/* Back to the welcome screen to sign in instead. */}
      {step === 0 && canLeave ? (
        <View style={styles.quietRow}>
          <KeyButton colors={colors} label={t('first.haveAccount')} onPress={toWelcome} />
        </View>
      ) : null}
    </>
  )

  return (
    <ScreenShell book={book} title={t('first.kicker')} colors={colors} locked footer={nav}>
      <View style={styles.firstTop}>
        <Text style={[styles.stepCap, { color: colors.inkSoft }]}>
          {t('first.stepOf', { n: step + 1, total: totalSteps })}
        </Text>
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
              ref={blankRef}
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
              autoCapitalize="sentences"
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
// Shown under one "From friends" row that opens; each keeps its own switch.
const FRIEND_KINDS = ['sends', 'we', 'cheers', 'friends', 'family']
const FRIENDS_ROW = 'fromFriends'
const PUSH_KINDS = new Set(['sends', 'we', 'cheers', 'friends', 'family', 'didi'])
// Morning ask times outside quiet hours: a nudge inside them never rings.
// The picked one stays listed so the choice never looks empty.
function nudgeTimes(prefs, list, picked) {
  const free = list.filter((id) => {
    const [h, m] = id.split(':').map(Number)
    const at = new Date()
    at.setHours(h, m, 0, 0)
    return afterQuiet(at, prefs).getTime() === at.getTime() || id === picked
  })
  return free.length ? free : list
}

const QUIET_HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

function PingKinds({ colors, on }) {
  const prefs = usePrefs()
  const account = useAccount()
  const [miss, setMiss] = useState('')
  const [friendsOpen, setFriendsOpen] = useState(false)

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
      // A newer pick made while this saved stays.
      if (readPrefs().familyHour === hour) writePrefs({ familyHour: was })
      setMiss(t('pings.kindsMiss'))
    }
  }

  async function flipPrivate() {
    setMiss('')
    if (!(await flipPingsPrivate())) setMiss(t('pings.kindsMiss'))
  }

  // The shop drop push. Turning it on asks for notifications first.
  // The server reads dropPings, so save it there now like the other switches.
  async function saveDropPings(next) {
    writePrefs({ dropPings: next })
    const saved = await saveProfile({ prefs: readPrefs() }).catch(() => ({ miss: 'net' }))
    if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
      if (readPrefs().dropPings === next) writePrefs({ dropPings: !next })
      setMiss(t('pings.kindsMiss'))
    }
  }

  async function flipDropPings() {
    if (prefs.dropPings) {
      setMiss('')
      await saveDropPings(false)
      return
    }
    const state = await requestPings().catch(() => 'denied')
    if (state !== 'granted') {
      setMiss(t('pings.offNote'))
      return
    }
    setMiss('')
    syncPushTokenIfAllowed().catch(() => {})
    await saveDropPings(true)
  }

  const familyId = QUIET_HOURS[prefs.familyHour] || '21:00'
  const familyTime = clockWords(familyId)
  const familyAt = new Date(2000, 0, 1, Number(familyId.slice(0, 2)), 0)
  // The server drops the family summary inside quiet hours.
  const familyQuiet = afterQuiet(familyAt, prefs).getTime() !== familyAt.getTime()

  return (
    <>
      <SetCap colors={colors}>{t('pings.kindsCap')}</SetCap>
      {on ? null : <SetNote colors={colors}>{t('pings.offNote')}</SetNote>}
      <SetCard colors={colors}>
        {PING_KINDS.flatMap((kind) => (FRIEND_KINDS.includes(kind) ? (kind === FRIEND_KINDS[0] ? [FRIENDS_ROW] : []).concat(friendsOpen ? [kind] : []) : [kind])).map((kind) =>
          kind === FRIENDS_ROW ? (
            <SetRow
              key={kind}
              colors={colors}
              icon="bell"
              label={t('pings.fromFriends')}
              value={friendsOpen ? '▴' : '▾'}
              onPress={() => setFriendsOpen(!friendsOpen)}
            />
          ) : (
          <View key={kind}>
            <SetSwitch
              colors={colors}
              label={t(`pings.kind.${kind}`)}
              sub={
                kind === 'family'
                  ? t('pings.kind.familySubAt', { time: familyTime })
                  : prefs.gentle === true && kind === 'streakHit'
                    ? t('pings.kind.gentleOff')
                  : prefs.gentle === true && kind === 'streakRisk'
                    ? t('pings.kind.streakRiskGentle', { time: clockWords('07:00') })
                  : kind === 'day'
                    ? t('pings.kind.daySub', {
                        morning: clockWords(prefs.morningAsk !== false ? prefs.morningAt || MORNING_AT_DEFAULT : DAY_NUDGE_TIMES[0]),
                        afternoon: clockWords(prefs.afternoonAt || AFTERNOON_AT_DEFAULT),
                      })
                    : t(`pings.kind.${kind}Sub`)
              }
              on={!prefs.pingsOff.includes(kind)}
              onPress={() => flip(kind)}
            />
            {kind === 'day' ? (
              <SetSwitch
                colors={colors}
                label={t('morning.toggle')}
                sub={t('morning.toggleSub')}
                on={prefs.morningAsk !== false}
                onPress={() => {
                  writePrefs({ morningAsk: prefs.morningAsk === false })
                  // The morning nudge's time and words follow this switch.
                  armLampPings(readShelf().boards).catch(() => {})
                }}
              />
            ) : null}
            {kind === 'day' && prefs.morningAsk !== false && !prefs.pingsOff.includes('day') ? (
              <SetChoice
                colors={colors}
                label={t('morning.at')}
                options={nudgeTimes(prefs, MORNING_AT_TIMES, prefs.morningAt).map((id) => ({ id, label: clockWords(id) }))}
                selected={prefs.morningAt || MORNING_AT_DEFAULT}
                onSelect={(id) => {
                  writePrefs({ morningAt: id })
                  armLampPings(readShelf().boards).catch(() => {})
                }}
              />
            ) : null}
            {kind === 'day' && !prefs.pingsOff.includes('day') ? (
              <SetChoice
                colors={colors}
                label={t('morning.afternoonAt')}
                options={nudgeTimes(prefs, AFTERNOON_AT_TIMES, prefs.afternoonAt).map((id) => ({ id, label: clockWords(id) }))}
                selected={prefs.afternoonAt || AFTERNOON_AT_DEFAULT}
                onSelect={(id) => {
                  writePrefs({ afternoonAt: id })
                  armLampPings(readShelf().boards).catch(() => {})
                }}
              />
            ) : null}
            {kind === 'family' && !prefs.pingsOff.includes('family') ? (
              <SetChoice
                colors={colors}
                label={t('pings.familyAt')}
                options={QUIET_HOURS.map((id) => ({ id, label: clockWords(id) }))}
                selected={familyId}
                onSelect={saveFamilyHour}
              />
            ) : null}
            {kind === 'family' && !prefs.pingsOff.includes('family') && familyQuiet ? (
              <SetNote colors={colors}>{t('pings.familyQuiet')}</SetNote>
            ) : null}
          </View>
          )
        )}
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
              onSelect={(id) => saveQuiet({ quietFrom: id, quietTo: quietToFor(id, prefs.quietTo) })}
            />
            <SetChoice
              colors={colors}
              label={t('pings.quietTo')}
              options={QUIET_HOURS.filter((id) => id !== prefs.quietFrom).map((id) => ({ id, label: clockWords(id) }))}
              selected={prefs.quietTo}
              onSelect={(id) => saveQuiet({ quietTo: id })}
              last
            />
          </>
        ) : null}
      </SetCard>
      {movedLastCall(prefs) === 'none' ? (
        <Meta colors={colors}>{t('pings.quietNoLast')}</Meta>
      ) : movedLastCall(prefs) ? (
        <Meta colors={colors}>{t('pings.quietNoLastCall', { time: clockWords(movedLastCall(prefs)) })}</Meta>
      ) : null}
      <SetCap colors={colors}>{t('pings.laterCap')}</SetCap>
      <SetCard colors={colors}>
        <SetChoice
          colors={colors}
          label={t('tonight.answerLater')}
          sub={t('pings.laterSub')}
          options={LATER_MINUTES.map((id) => ({ id, label: t('pings.laterOpt', { n: id }) }))}
          selected={prefs.laterMin}
          onSelect={(id) => writePrefs({ laterMin: id })}
          last
        />
      </SetCard>
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
    </>
  )
}

// Sends one sample reminder a few seconds out, or a minute out so a locked
// phone shows what battery saving does. Permission off says so, with a way to settings.
function PingTest({ colors }) {
  const [state, setState] = useState('')
  const [wait, setWait] = useState(0)

  async function send(seconds) {
    if (state === 'busy') return
    setState('busy')
    setWait(seconds)
    const out = await pingTest(seconds).catch(() => 'miss')
    setState(out)
    if (out === 'set') confirmDone(t(seconds > 5 ? 'pings.testLaterSet' : 'pings.testSet'))
    else if (out === 'miss') confirmMiss(t('confirm.miss'))
  }

  return (
    <>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="bell" label={t('pings.test')} sub={t('pings.testSub')} on={state === 'set' && wait === 5} onPress={() => send(5)} />
        <SetRow colors={colors} icon="clock" label={t('pings.testLater')} sub={t('pings.testLaterSub')} on={state === 'set' && wait === 60} last onPress={() => send(60)} />
      </SetCard>
      {state === 'off' ? (
        <>
          <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">{t('pings.testOff')}</Text>
          <DidButton colors={colors} label={t('pings.openSettings')} onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))} />
        </>
      ) : null}
    </>
  )
}

// Android: a muted Did I channel, alarms off, or the battery saver make
// reminders late or silent. Checked again on the way back from settings.
function AndroidReminderFixes({ colors }) {
  const [state, setState] = useState({ channel: true, exact: true })
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    let live = true
    const check = () =>
      Promise.all([reminderChannelOn(), exactAlarmsOn()]).then(([channel, exact]) => {
        if (live) setState({ channel, exact })
      })
    check()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check()
    })
    return () => {
      live = false
      sub.remove()
    }
  }, [])
  if (Platform.OS !== 'android') return null
  const miss = () => confirmMiss(t('confirm.miss'))
  return (
    <SetCard colors={colors}>
      {!state.channel ? (
        <SetRow colors={colors} icon="bell" tint={colors.miss} label={t('pings.channelOff')} sub={t('pings.channelOffSub')} chevron onPress={() => openReminderChannel().catch(miss)} />
      ) : null}
      {!state.exact ? <SetRow colors={colors} icon="clock" label={t('notify.exactTitle')} sub={t('notify.exactBody')} chevron onPress={openExactAlarms} /> : null}
      <SetRow colors={colors} icon="settings" label={t('pings.lateTitle')} sub={t('pings.lateSub')} chevron last onPress={() => Linking.openSettings().catch(miss)} />
    </SetCard>
  )
}

// Away mode: every question pauses and no reminders come until the picked day.
function AwayCard({ colors }) {
  const prefs = usePrefs()
  const today = boardDate()
  const range = awayNow(prefs, today)
  const answered = readShelf().boards.some((book) => dueTonight(book, new Date()).some((row) => row.answer))
  const first = answered ? addDaysIso(today, 1) : today
  const left = awayLeft(prefs, first)
  const change = (patch) => {
    writePrefs(patch)
    armLampPings(readShelf().boards).catch(() => {})
  }
  return (
    <>
      <SetCap colors={colors}>{t('away.cap')}</SetCap>
      <SetCard colors={colors}>
        {range ? (
          <SetRow
            colors={colors}
            icon="clock"
            tint={colors.on}
            label={t('away.until', { date: formatBoardDate(range[1]) })}
            sub={t('away.backSub')}
            value={t('away.back')}
            last
            onPress={() => change(awayEnd(prefs, today))}
          />
        ) : left < 1 ? (
          <SetRow colors={colors} icon="clock" label={t('away.pick')} sub={t('away.left', { n: 0 })} last />
        ) : (
          <SetChoice
            colors={colors}
            icon="clock"
            label={t('away.pick')}
            sub={t('away.sub') + ' ' + t('away.left', { n: left })}
            options={Array.from({ length: left }, (_, i) => addDaysIso(first, i + 1)).map((id) => ({ id, label: formatBoardDate(id) }))}
            selected=""
            last
            onSelect={(id) => {
              change(awayStart(prefs, today, id, answered))
              confirmDone(t('away.until', { date: formatBoardDate(id) }))
            }}
          />
        )}
      </SetCard>
      {answered && (range ? range[0] > today : left >= 1) ? <Meta colors={colors}>{t('away.startsTomorrow')}</Meta> : null}
    </>
  )
}

// Quiet hours that cover 21:00 move the last call. Same rule as the reminder (src/lib/quiet.js); null hides the line, 'none' means no last call today.
function movedLastCall(prefs) {
  if (!prefs.quietOn) return null
  const now = new Date()
  const when = sharedLastCallAt(now.getFullYear(), now.getMonth() + 1, now.getDate(), null, prefs, new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  if (!when) return 'none'
  if (when.getHours() === 21 && when.getMinutes() === 0) return null
  return `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`
}

export function PingScreen({ book, boards, now, onAskPings, pingLabel, onChange }) {
  const colors = useHallColors()
  const clock = now || new Date()
  const labelKey = pingLabel || 'pings.state.on'
  const on = labelKey === 'pings.state.on'
  // The notifications module is missing: asking again cannot help, so point at settings.
  const unavailable = pingLabel === '' && pingsFailed()
  // Every folder pings (armLampPings gets the whole shelf), so list them all.
  const books = boards?.length ? boards : book ? [book] : []
  // One row per question. Rows you switch off stay here until you leave, so
  // you can switch them back on.
  const [seen, setSeen] = useState(() => new Map())
  const rows = new Map(seen)
  for (const one of books) {
    for (const fire of upcomingPings(one, clock)) if (!rows.has(fire.tag)) rows.set(fire.tag, fire)
  }
  const fires = [...rows.values()].sort((a, b) => a.at - b.at)
  const bookOf = (id) => books.find((one) => (one.lamps || []).some((lamp) => lamp.id === id))
  const timed = books.flatMap((one) => (one.lamps || []).filter((lamp) => !lamp.archived))

  function flipOne(fire) {
    const home = bookOf(fire.id)
    const lamp = home?.lamps.find((item) => item.id === fire.id)
    if (!lamp || !onChange) return confirmMiss(t('confirm.miss'))
    const next = !lampNotifyOn(lamp)
    setSeen((was) => new Map(was).set(fire.tag, fire))
    onChange(commitBook({ ...home, lamps: home.lamps.map((item) => (item.id === lamp.id ? { ...item, notify: next, at: clock.toISOString() } : item)) }, clock))
    return confirmDone(next ? t('pings.oneOn') : t('pings.oneOffAll'))
  }

  return (
    <ScreenShell title={t('pings.title')} colors={colors}>
      <Text style={[styles.subtitle, { color: colors.inkDim }]}>{t('pings.body')}</Text>
      <SetCard colors={colors}>
        {onAskPings && labelKey !== 'pings.state.blocked' && !unavailable ? (
          // On: the phone owns the off switch, so tapping opens its settings.
          <SetSwitch
            colors={colors}
            icon="bell"
            tint={colors.on}
            label={t('pings.rowTitle')}
            sub={on ? t('pings.rowOn') : t('pings.rowAsk')}
            on={on}
            last
            onPress={on ? () => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss'))) : onAskPings}
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
            onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))}
          />
        )}
      </SetCard>
      {pingsFailed() || unavailable ? (
        <SetCard colors={colors}>
          <SetRow colors={colors} icon="bell" tint={colors.miss} label={t('pings.setFailed')} chevron last onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))} />
        </SetCard>
      ) : null}
      <AwayCard colors={colors} />
      <PingKinds colors={colors} on={on && Boolean(onAskPings)} />
      <PingTest colors={colors} />
      {on ? <AndroidReminderFixes colors={colors} /> : null}
      <Meta colors={colors}>{t('pings.stopNote')}</Meta>
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
      {/* Times live on each question; list them all here, so Settings leads to them. */}
      {timed.length ? (
        <>
          <SetCap colors={colors}>{t('pings.timesCap')}</SetCap>
          <SetCard colors={colors}>
            {timed.map((lamp, at) => (
              <SetRow
                key={lamp.id}
                colors={colors}
                icon="clock"
                label={shortFromQuestion(lamp.question) || t('lamp.unnamed')}
                sub={lamp.askAfter ? [clockWords(lamp.askAfter), lamp.askAfter2 ? clockWords(lamp.askAfter2) : ''].filter(Boolean).join(', ') : t('pings.noTime')}
                chevron
                last={at === timed.length - 1}
                onPress={() => goHash('/hang', { id: lamp.id })}
              />
            ))}
          </SetCard>
        </>
      ) : null}
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="clock" label={t('pings.comingUp')} sub={t('pings.comingUpSub')} chevron onPress={() => goHash('/later')} />
        <SetRow colors={colors} icon="help" label={t('pings.help')} sub={t('pings.helpSub')} chevron last onPress={() => goHash('/help')} />
      </SetCard>
    </ScreenShell>
  )
}

// Hide questions on the lock screen. The server hides pushes too, so a save
// that fails puts the switch back. False when it did not save.
export async function flipPingsPrivate() {
  const was = readPrefs().pingsPrivate
  writePrefs({ pingsPrivate: !was })
  armLampPings(readShelf()?.boards || []).catch(() => {})
  const saved = await saveProfile({ prefs: readPrefs() }).catch(() => ({ miss: 'net' }))
  if (saved.miss && saved.miss !== 'out' && saved.miss !== 'off') {
    if (readPrefs().pingsPrivate === !was) {
      writePrefs({ pingsPrivate: was })
      armLampPings(readShelf()?.boards || []).catch(() => {})
    }
    return false
  }
  return true
}

export function PhoneLockSection({ colors }) {
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
        returnKeyType="done"
        onSubmitEditing={saveLock}
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
    </ScreenShell>
  )
}

function deviceSeen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(dateTag(), {
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

function AccountSignedIn({ book, email, onChange, onImport }) {
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
  const [copied, setCopied] = useState(0)
  const [dataOpen, setDataOpen] = useState(false)
  const [allPhones, setAllPhones] = useState(false)
  const shownPhones = allPhones ? phones : phones.slice(0, 3)
  const phonesHidden = !allPhones && phones.length > 3

  function askDelete() {
    setSure({
      title: t('account.deleteTitle'),
      body: `${t('account.deleteBody')}\n\n${t('account.deleteGone')}`,
      // After the copy is saved, the delete question comes back.
      extra: { label: t('account.deleteCopy'), go: () => { setSure(null); download(askDelete) } },
      yes: t('account.deleteYes'),
      danger: true,
      go: () => leave('delete', deleteAccount),
    })
  }

  async function download(after) {
    if (busy) return
    setBusy('export')
    let shared = false
    try {
      const all = await exportAll()
      const res = await shareShelf(all)
      if (res?.action !== Share.dismissedAction) {
        try { localStorage.setItem('did-i-last-copy', new Date().toISOString()) } catch {}
        setCopied(Date.now())
        shared = true
      }
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error?.name !== 'AbortError') confirmMiss(t('confirm.exportMiss'))
    }
    setBusy('')
    if (shared) after?.()
  }

  async function loadBackup() {
    if (busy) return
    setBusy('load')
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] })
      if (picked.canceled || !picked.assets?.[0]?.uri) return
      const response = await fetch(picked.assets[0].uri)
      const parsed = JSON.parse(await response.text())
      const plan = planBackupLoad(readShelf(), parsed)
      if (plan.miss === 'cap') return confirmMiss(t('hang.cap'))
      if (plan.miss) return confirmMiss(t('settings.loadMiss'))
      if (!plan.q && !plan.a) return confirmDone(t('settings.loadSame'))
      setSure({
        title: t('account.loadSureTitle'),
        body: t('account.loadSureBody', { q: plan.q, a: plan.a }),
        yes: t('account.loadSureYes'),
        go: () => {
          const now = planBackupLoad(readShelf(), parsed)
          if (now.miss === 'cap') return confirmMiss(t('hang.cap'))
          if (now.miss) return confirmMiss(t('settings.loadMiss'))
          onImport?.(now.merged)
          confirmDone(t('settings.loadOkBoth', { q: now.q, a: now.a }))
        },
      })
    } catch {
      confirmMiss(t('settings.loadMiss'))
    } finally {
      setBusy('')
    }
  }

  // Forgetting a phone: one at a time, and a failure says so.
  async function forgetRun(run, doneKey) {
    if (busy) return
    setBusy('forget')
    try {
      const out = await run()
      if (out?.miss) return confirmMiss(t('confirm.miss'))
      const rows = await listDevices()
      if (rows) setDevices(rows)
      confirmDone(t(doneKey))
    } catch {
      confirmMiss(t('confirm.miss'))
    } finally {
      setBusy('')
    }
  }

  async function syncNow() {
    if (busy) return
    setBusy('sync')
    try {
      // pullAndMerge never throws: null means no client, no session, or an error.
      const merged = await pullAndMerge()
      if (!merged) throw new Error('sync')
      confirmDone(t('account.syncJust'))
    } catch {
      confirmMiss(t('tonight.syncMiss'))
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
    if (busy) return
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
      danger: true,
      go: () => forgetRun(() => forgetDevice(row.device_key), 'confirm.phoneForgot'),
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
        <SetRow colors={colors} icon="collection" label={t('account.cheer')} value={cheerName} chevron last onPress={() => goHash('/kit', { id: 'cheers' })} />
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
          dim={Boolean(busy)} onPress={busy ? undefined : () => setSure({ title: t('account.outSureTitle'), body: t('account.outSureBody'), yes: t('account.out'), go: () => leave('out', signOutHere) })}
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
          icon="eye"
          label={t('account.privacyRow')}
          sub={t('account.privacySub')}
          chevron={!dataOpen}
          last
          onPress={() => setDataOpen((open) => !open)}
        />
      </SetCard>
      {sync.how === 'miss' && sync.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">{tMiss(sync.miss)}</Text>
      ) : null}
      {dataOpen ? (
        <Reveal>
      <SetCap colors={colors}>{t('account.syncPhonesCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="globe"
          label={t('account.syncNow')}
          sub={syncNote}
          value={busy === 'sync' ? t('app.loading') : undefined}
          dim={Boolean(busy)} onPress={busy ? undefined : syncNow}
        />
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
            try {
              const rows = await listDevices()
              if (rows) setDevices(rows)
            } catch {
              confirmMiss(t('confirm.miss'))
            }
          }}
        />
      ) : null}
      {others.length > 1 ? (
        <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="trash"
          danger
          last
          label={t('account.forgetOthers', { n: others.length })}
          dim={Boolean(busy)}
          value={busy === 'forget' ? t('app.loading') : undefined}
          onPress={busy ? undefined : () =>
            setSure({
              title: t('account.forgetOthersTitle'),
              body: t('account.forgetOthersBody'),
              yes: t('account.forgetYes'),
              danger: true,
              go: () => forgetRun(forgetOtherDevices, 'confirm.phonesForgot'),
            })
          }
        />
        </SetCard>
      ) : null}
        </Reveal>
      ) : null}
      <SetCap colors={colors}>{t('account.data')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="note" label={t('account.export')} sub={lastCopyLine(copied) ? `${t('account.exportSub')}
${lastCopyLine(copied)}` : t('account.exportSub')} value={busy === 'export' ? t('app.loading') : undefined} chevron dim={Boolean(busy)} onPress={busy ? undefined : () => download()} />
        <SetRow colors={colors} icon="inbox" label={t('account.loadFile')} sub={t('account.loadFileSub')} value={busy === 'load' ? t('app.loading') : undefined} chevron last dim={Boolean(busy)} onPress={busy ? undefined : loadBackup} />
      </SetCard>

      <SetCap colors={colors}>{t('account.leaveCap')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="logout"
          label={t('account.outAll')}
          dim={Boolean(busy)}
          onPress={busy ? undefined : () =>
            setSure({
              title: t('account.outAllTitle'),
              body: t('account.outAllBody'),
              yes: t('account.outAllYes'),
              danger: true,
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
          dim={Boolean(busy)}
          onPress={busy ? undefined : askDelete}
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

export function AccountScreen({ book, onChange, onImport }) {
  const account = useAccount()
  if (account.user) {
    return <AccountSignedIn book={book} email={account.email} onChange={onChange} onImport={onImport} />
  }
  return <AccountSignedOut on={account.on} />
}

const styles = StyleSheet.create({
  firstTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroNumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calKey: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  // Year cells are small squares, so the key is too.
  calSquare: { borderRadius: 2 },
  calKeyText: { fontSize: 12, marginRight: 10 },
  accountHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  headCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 20 },
  dataGap: { height: 20 },
  recentClear: { marginBottom: 12 },
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
  openGap: { height: 10 },
  lastFolder: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  folderLine: { flexDirection: 'row', alignItems: 'center' },
  folderMain: { flex: 1 },
  moveRows: { gap: 8 },
  moveBtn: { minWidth: 44, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
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
  quietRow: { alignSelf: 'stretch', marginTop: 8 },
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
  weekNameHit: { minHeight: 44, justifyContent: 'center' },
  weekNameText: { fontFamily: fonts.ui, fontSize: 13 },
  weekPer: { fontFamily: fonts.ui, fontSize: 11 },
  weekCellHit: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekPager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekShiftBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekShift: { fontSize: 20 },
  weekRange: { fontFamily: fonts.ui, fontSize: 12.5 },
  weekHeadCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekDow: { fontFamily: fonts.mono, fontSize: 11 },
  weekDay: { fontFamily: fonts.mono, fontSize: 11 },
  weekCell: { width: 14, height: 14, borderRadius: 4 },
  weekDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  weekOff: { height: 2, borderRadius: 1, marginVertical: 6 },
  tileHalf: { flexBasis: '45%' },
})
