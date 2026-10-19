import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { CardFrame } from '../components/frames/CardFrame.jsx'
import { useFrameActive } from '../components/frames/index.js'
import { keepEarnedFrames, takeFramesToAnnounce, wearFrame, wornFrame } from '../../src/lib/frames.js'
import { nightProgress } from '../../src/lib/night-progress.js'
import { addDaysIso } from '../../src/lib/recurrence.js'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { publishSheet, sheetIsUp } from '../components/SheetHost.jsx'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { AppState, Platform, Pressable,ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { firstPullWaiting, pullAndMerge, useSync } from '../../src/lib/cloud-sync.js'
import { activeBuddy, activeLook } from '../../src/lib/active-look.js'
import { BuddyHang } from '../components/Cosmetic.jsx'
import {
  clockWords,
  graceExplained,
  isRecapNight,
  markGraceExplained,
  markWeekRecapSeen,
  recapLine,
  recapShareText,
  tomorrowPreview,
  weekRecap,
  weekRecapDue,
  weekStripNights,
} from '../../src/lib/hall-pages.js'
import { passAlong } from '../../src/lib/native.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { keptButMissing } from '../lib/kept-send.js'
import { feelTap } from '../../src/lib/native.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { fireCheer, isGemLook, mergePurses, wishGoal, wishLine } from '../../src/lib/purse.js'
import { usePrefs, useTheme } from '../../src/lib/prefs.js'
import { answerFor, isEvery } from '../../src/lib/recurrence.js'
import { lastTimeLine, sendLastLine, sharedLastLine } from '../../src/lib/every-copy.js'
import { UNDO_MS, useTonightStack } from '../../src/lib/useTonightStack.js'
import { DidButton, KeyButton, LateMeta } from '../components/ui.jsx'
import { dueByUrgency, mustSwipeDeadline, shelfTopics } from '../../src/lib/board-json.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { Jewel } from '../components/Jewel.jsx'
import { JewelKey, jewelKeyNight, jewelKeySeen } from '../components/JewelKey.jsx'
import { markSwipeIntroSeen, SwipeIntro, swipeIntroSeen } from '../components/SwipeIntro.jsx'
import { CELEBRATE_MS, CardSettle, NightWeek, StreakCount, tomorrowLine } from '../components/DoneCard.jsx'
import { openNightWhy } from '../components/NightSheets.jsx'
import { FreezeChip, openFreezeHow, useFreezeToasts } from '../components/FreezeBits.jsx'
import { bestShelfStreak, freezeState } from '../../src/lib/hall-feel.js'
import { TonightNote, openAnswerNote } from '../components/NightNotes.jsx'
import { useHoldMarks } from '../lib/mark-hold.js'
import { useAnswerButtons } from '../lib/swipe-wheels.js'
import { dropToast, showToast, useUndoToast } from '../lib/toast-queue.js'
import { TOAST_ROOM } from '../components/ToastHost.jsx'
import { useShakeUndo } from '../hooks/useShakeUndo.js'
import { useOnline } from '../hooks/useOnline.js'
import { HolePlate } from '../components/HolePlate.jsx'
import { AppHeader, headerTitleStyle } from '../components/AppHeader.jsx'
import { MastMenuRoot } from '../components/MastMenu.jsx'
import { NightMeter } from '../components/NightMeter.jsx'
import { NightStrip } from '../components/NightStrip.jsx'
import { WaitPlate } from '../components/WaitPlate.jsx'
import { StarterPicks } from '../components/StarterPicks.jsx'
import { SwipeCardHost } from '../components/SwipeCardHost.jsx'
import { flyBackNext } from '../components/SwipeCard.jsx'
import { SwipeFlyHost } from '../components/SwipeFly.jsx'
import { StillOpen } from '../components/StillOpen.jsx'
import { DropLine } from '../components/DropLine.jsx'
import { RateCard } from '../components/RateCard.jsx'
import { TagFilter } from '../components/TagFilter.jsx'
import { goHash } from '../navigation/hash.js'
import { EditPen } from '../components/SwipeFace.jsx'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { useHeaderInset } from '../hooks/useHeaderSpace.js'
import { gemFrameStyle, gemGlowHostStyle, gemPanelStyle } from '../lib/gem-look-tone.js'
import { fonts } from '../theme.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { HallAmbient } from '../components/HallAmbient.jsx'
import { NightSky, useSkyClock } from '../components/NightSky.jsx'
import { isDaytime } from '../lib/night-sky.js'
import { Slot } from '../components/Slot.jsx'
import { answerFamilyLamp, answerSend, listInbox, personName, useFamilyTonight } from '../../src/lib/people.js'
import { peopleTonightItems, peopleWaitingLine } from '../../src/lib/people-tonight.js'
import { WeAnswered, WePausedRow, WeSwipeCard, useWeAnswer, weOpenForMe } from '../components/WeTonight.jsx'
import { FriendsRow } from '../components/FriendsRow.jsx'
import { pickSocialLine } from '../../src/lib/social-line.js'
import { buildTogetherWidgetProps, onTogetherSaved, readTogetherPeople } from '../../src/lib/together-widget.js'
import { weOpenOn } from '../../src/lib/we-nights.js'
import { didStatusForRow, graceFirst, graceNightIso } from '../../src/lib/recurrence.js'
import { saveWeReminders, saveWeWidgetLine, takeWeBoth, takeWeFinishes, useWeTonight, weClaim, weInFilter, weMine, weShort, weStats } from '../../src/lib/did-we.js'
import { shelfMarks, weMarksFor } from '../../src/lib/achievements.js'
import { armLampPings } from '../../src/lib/notify.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { syncTonightWidget } from '../widget-sync.js'
import { cloudSetUp } from '../../src/lib/cloud.js'
import {
  countWidgetTipDay,
  isNewShelf,
  isNightOne,
  markNightOneSeen,
  markSignInNudgeSeen,
  nightOneSeen,
  readMorningAsk,
  readWidgetTip,
  shouldShowMorningAsk,
  shouldShowWidgetTip,
  showSignInNudge,
  signInNudgeSeen,
  takeMorningFocus,
  writeMorningAsk,
  writeWidgetTip,
} from '../../src/lib/first-run.js'
import { addMorning, isTodayOnce, morningCount, morningOpen, todayLabel } from '../../src/lib/morning-ask.js'
import { commitBook } from '../../src/lib/achievements.js'
import { MorningAsk } from '../components/MorningAsk.jsx'
import { pinWidget, showWidgetTip, widgetPlaced } from '../lib/widget-pin.js'

// Where the stack has no card of your own to swipe, so a Did we can have it.
const WE_SWIPE_OVER = new Set(['hall', 'finish', 'rest', 'off', 'waiting'])

// A kept did you says who sent it next to its tag.
function cardKicker(row, fallback) {
  const from = row.lamp?.fromName ? t('inbox.from', { name: row.lamp.fromName }) : ''
  const today = isTodayOnce(row.lamp, row.dateIso) ? todayLabel(row.lamp) : ''
  const tag = row.tag || (from || today ? '' : fallback)
  return [today, tag, from].filter(Boolean).join(' · ')
}

function useMinuteNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval
    const wait = 60000 - (Date.now() % 60000)
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60000)
    }, wait)
    // Timers stall in the background, so catch up when the app comes back.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date())
    })
    return () => {
      sub.remove()
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])
  return now
}

// The worn frame for Tonight's cards, or null. Every static card reads it.
const CardFrameProps = createContext(null)
// The evening as 0 (5 pm) to 1 (midnight), for frames that follow it. After
// midnight it stays at 1; before 5 pm at 0.
function eveningShare(clock) {
  const d = clock instanceof Date ? clock : new Date()
  const h = d.getHours() + d.getMinutes() / 60
  return h < 5 ? 1 : Math.min(1, Math.max(0, (h - 17) / 7))
}
// The earliest evening reminder among tonight's questions on the same scale, 9 pm if none.
function remindShare(due) {
  const times = (due || []).map((row) => String(row.lamp?.askAfter || '')).filter((v) => /^\d{2}:\d{2}$/.test(v)).sort()
  const at = times.find((v) => v >= '17:00') || '21:00'
  const [hh, mm] = at.split(':').map(Number)
  return Math.min(1, Math.max(0, (hh + mm / 60 - 17) / 7))
}
// Room around a framed card, so the frame never sits on the week dots or the pills.
const FRAME_GAP = 8

function GemFaceShell({ look, theme, style, buddy = '', children }) {
  const glow = look ? gemGlowHostStyle(look, theme) : null
  const frame = useContext(CardFrameProps)
  // On Android the look's ring is a border. Put it on the card itself, so the
  // card has one outline, not its own plus the ring around it.
  const ringOnCard = Boolean(glow) && Platform.OS === 'android'
  const card = (
    <View style={ringOnCard ? [style, glow] : style}>
      <BuddyHang id={buddy} alive />
      {children}
    </View>
  )
  const body = frame ? (
    <CardFrame {...frame} style={frameStyles.gap}>
      {card}
    </CardFrame>
  ) : card
  if (!glow || ringOnCard) return body
  return (
    <View style={[faceCardStyles.gemShell, glow]}>
      {body}
    </View>
  )
}

export function TonightScreen({ book, boards, tagId, onTag, onChange, onKeep, focusLampId, focusKey }) {
  const theme = useTheme()
  const look = activeLook(book)
  const colors = useHallColors(book)
  const skyNow = useSkyClock()
  const account = useAccount()
  const [together, setTogether] = useState(() => readTogetherPeople())
  useEffect(() => onTogetherSaved(() => setTogether(readTogetherPeople())), [])
  const sync = useSync()
  const now = useMinuteNow()
  const [topicPicks, setTopicPicks] = useState([])
  const [keySeen, setKeySeen] = useState(() => jewelKeySeen())
  // Account prefs land after a reinstall; seen there hides it too.
  const prefsSeen = usePrefs().jewelKeySeen === true
  const gentle = usePrefs().gentle === true
  const topics = useMemo(() => shelfTopics(boards && boards.length ? boards : [book]), [boards, book])
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const stack = useTonightStack({ value: book, boards, tagId, topics: picks, onTag, onChange, focusLampId, focusKey, now })
  useFreezeToasts(colors, stack.shelf, stack.clock)
  const freezesHeld = stack.shelf ? freezeState(stack.shelf, stack.clock).held : 0
  const we = useWeTonight(account.user)
  const weAns = useWeAnswer(we.reload, book)
  const [graceWeLeft, setGraceWeLeft] = useState([])
  // Family questions and Did you asks from friends: cards after your own.
  const family = useFamilyTonight(account.user)
  const [asks, setAsks] = useState([])
  const [peopleGone, setPeopleGone] = useState([])
  // A read that lands after a sign out or account switch is the old account's.
  const userIdRef = useRef(account.user?.id)
  userIdRef.current = account.user?.id
  // Same asks again keep the old array, so a wake with nothing new does not redraw tonight.
  const asksKey = useRef('[]')
  const loadAsks = useCallback(async () => {
    const keep = (next) => {
      const key = JSON.stringify(next)
      if (key === asksKey.current) return
      asksKey.current = key
      setAsks(next)
    }
    if (!account.user) return keep([])
    const who = account.user.id
    try {
      const rows = await listInbox()
      if (userIdRef.current !== who) return
      // A failed read keeps the cards we had.
      if (!rows.miss) keep(rows)
    } catch {
      // Offline: the cards wait for the next look.
    }
  }, [account.user])
  useEffect(() => {
    loadAsks()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') loadAsks()
    })
    return () => sub.remove()
  }, [loadAsks])
  // A Did we pill tapped: its card comes up to swipe, ahead of your own.
  const [wePick, setWePick] = useState('')
  // Keep the widget's Did we line in step with what Tonight knows.
  useEffect(() => {
    // A failed load kept old cards: leave the widget line and reminders as they were.
    if (!account.user || we.miss) return
    if (saveWeWidgetLine(we.cards)) syncTonightWidget(readShelf()).catch(() => {})
    // Did we reminders ride along with your own; set them again when they change.
    if (saveWeReminders(we.cards)) armLampPings(readShelf().boards).catch(() => {})
    // Did we achievements come from the shared cards, so they unlock here.
    const earned = weMarksFor(shelfMarks(boards && boards.length ? boards : [book]), weStats(we.cards))
    if (earned.length) onChange({ ...book, unlocked: [...(book.unlocked || []), ...earned] })
    // Someone else's did finished a card: play their cheer here, once.
    const [first, ...more] = takeWeFinishes(we.cards)
    // Streak coins are claimed by each member; a repeat claim pays nothing.
    if (first) {
      Promise.all([first, ...more].map((done) => weClaim(done.card.id).catch(() => ({ coins: 0 })))).then((paid) => {
        const coins = paid.reduce((sum, out) => sum + (out.coins || 0), 0)
        if (coins <= 0) return
        showToast({ id: 'we-coins', kind: 'we', text: t('we.coins', { n: coins }), ms: 3600 })
        pullAndMerge().catch(() => {})
      })
    }
    if (!first) {
      // You and someone else both said did: a small moment, once a night.
      const both = takeWeBoth(we.cards)
      if (both) {
        showToast({
          id: `we-both:${both.id}`,
          kind: 'we',
          cardId: both.id,
          text: t(both.total > 2 ? 'we.allDid' : 'we.bothDid'),
          ms: 3600,
        })
      }
      return
    }
    fireCheer(first.cheer, first.stage)
    showToast({
      id: `we-finish:${first.card.id}`,
      kind: 'we',
      cardId: first.card.id,
      text: more.length
        ? t('we.finishedMany', { n: more.length + 1 })
        : t('we.finishedBy', { name: first.name || t('people.someone'), question: first.card.question }),
      ms: 5200,
    })
  }, [account.user, we.cards])
  const purse = mergePurses(stack.shelf)
  const wish = wishLine(wishGoal(purse))
  // Focus comes from navigation events, not useIsFocused: that re-rendered
  // this whole screen as a page opened over it and again as it came back,
  // both mid-transition.
  const navigation = useNavigation()
  // Back on tonight (or back on this screen, or a pill gone): the pill row
  // starts at the left again, so the filter chip is in view.
  const pillScroll = useRef(null)
  const pillPicked = Boolean(stack.pillPick || stack.waitPick || wePick)
  const pillPickedNow = useRef(pillPicked)
  pillPickedNow.current = pillPicked
  const pillCount = stack.dueWithWait.length
  useEffect(() => {
    if (!pillPicked && navigation.isFocused()) pillScroll.current?.scrollTo?.({ x: 0, animated: false })
  }, [navigation, pillPicked, pillCount])
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        if (!pillPickedNow.current) pillScroll.current?.scrollTo?.({ x: 0, animated: false })
      }),
    [navigation],
  )
  // A picked card keeps the height it had before its answer, so the rows under it stay put.
  const pickKey = stack.pillPick ? stack.rowKey(stack.pillPick) : ''
  const [pickTall, setPickTall] = useState({ key: '', h: 0 })
  const onPickLayout = (event) => {
    if (!pickKey) return
    const h = Math.ceil(event.nativeEvent.layout.height)
    setPickTall((prev) => (prev.key === pickKey && prev.h >= h ? prev : { key: pickKey, h }))
  }
  const pickMinH = pickKey && pickTall.key === pickKey ? pickTall.h : 0
  const frozen = stack.shelf ? freezeState(stack.shelf, stack.clock).frozen : null
  // Best run ever, so a streak reached before frames shipped still earns them.
  const bestEver = useMemo(() => (stack.shelf ? bestShelfStreak(stack.shelf, stack.clock) : 0), [stack.shelf, stack.dateIso]) // eslint-disable-line react-hooks/exhaustive-deps
  const frameCtx = { bestStreak: Math.max(stack.streak, bestEver), streak: stack.streak, everFrozen: Boolean(frozen && frozen.size), today: stack.dateIso }
  const wornId = wornFrame(purse, frameCtx)
  // The toast's Wear it runs later, so it reads the book as it is then.
  const bookNow = useRef(book)
  bookNow.current = book
  const frameCtxNow = useRef(frameCtx)
  frameCtxNow.current = frameCtx
  const onChangeNow = useRef(onChange)
  onChangeNow.current = onChange
  // Card frame: the top card animates only while this screen is in front
  // (useFrameActive holds the battery rules); cards behind stay still. Only
  // a worn frame follows focus, so no frame means no extra renders.
  const framed = Boolean(wornId)
  const [focused, setFocused] = useState(true)
  useEffect(() => {
    if (!framed) return undefined
    setFocused(navigation.isFocused())
    const offFocus = navigation.addListener('focus', () => setFocused(true))
    const offBlur = navigation.addListener('blur', () => setFocused(false))
    return () => {
      offFocus()
      offBlur()
    }
  }, [navigation, framed])
  const frameAwake = useFrameActive(framed && focused)
  const weekLit = useMemo(
    () => (wornId && stack.shelf ? weekStripNights(stack.shelf, stack.clock, tagId).map((night) => Boolean(night.on)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wornId, stack.shelf, stack.dateIso, tagId],
  )
  const progress = nightProgress(stack.due, stack.weTonight)
  const cardFrame = wornId
    ? {
        id: wornId,
        colors,
        active: frameAwake,
        streak: stack.streak,
        answered: progress.answered,
        total: progress.total,
        weekLit,
        frozenRecently: Boolean(frozen && stack.dateIso && frozen.has(addDaysIso(stack.dateIso, -1))),
        date: stack.dateIso,
        skipped: (stack.due || []).filter((row) => row.answer?.status === 'skip').length,
        evening: eveningShare(stack.clock),
        remind: remindShare(stack.due),
        buddy: activeBuddy(book),
      }
    : null
  // An earned frame is kept once reached, so a streak that ends later does not take it back.
  useEffect(() => {
    const next = keepEarnedFrames(book, frameCtx)
    if (next === book) return
    onChange(next)
    // A frame just earned gets a cheer and a toast, once on this phone.
    // Frames another folder already holds are not new, only new to this folder.
    const fresh = takeFramesToAnnounce([...(book.frames || []), ...(purse.frames || [])], next.frames)
    if (!fresh.length) return
    feelTap('did')
    if (purse.cheerOn) fireCheer(purse.cheerOn, 3)
    for (const id of fresh) {
      showToast({
        id: `frame:${id}`,
        kind: 'frame',
        frameId: id,
        ms: 6000,
        onWear: () => {
          const now = bookNow.current
          if (String(now?.frame || '') === id) return
          const worn = wearFrame(now, id, frameCtxNow.current)
          if (!worn.miss) onChangeNow.current(worn.book)
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.streak, frameCtx.everFrozen])
  const { bottom: bottomPad } = useAppInsets()
  const headerInset = useHeaderInset()
  const mastTitle = tagId && !tagId.includes(',') ? book.title : t('tonight.didI')
  const premium = isGemLook(look)
  const gemCard = gemPanelStyle(look, theme)
  const gemFrame = gemFrameStyle(look, theme)
  const staticCardStyle = [...faceCardStyle(colors, gemCard)]
  // A card drawn by another component (HolePlate, WaitPlate) in the same look and frame.
  const staticWrap = (body) => (
    <GemFaceShell look={premium ? look : ''} theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
      {body}
    </GemFaceShell>
  )
  // The question sits in the middle of the card, picked or not (owner call, 2026-10-06).
  const pickedPanel = gemCard || {}
  // Folders and topics are the first chip of the question row, not a row of their own.
  const showChips = (stack.dueWithWait.length > 0 || we.cards.some((card) => card.myState === 'in' && card.due)) && !stack.holePick && !stack.waitPick
  // The folder name under each chip only helps when the chips come from more than one folder.
  const tagsMixed = new Set(stack.dueWithWait.map((row) => row.tag || '')).size > 1
  // The dot legend waits for a later night, and never shows over the payoff.
  const keyNight = jewelKeyNight(stack.dateIso, stack.dueWithWait.some((row) => row.answer))
  // How to swipe, once, the first time a card is up. The dots key waits until after it.
  const introSeen = swipeIntroSeen(usePrefs())
  const answerButtons = useAnswerButtons()
  const showIntro = !introSeen && !answerButtons && stack.bodyKind === 'face' && !stack.nightDone && !stack.cheer
  // The first answer while the hint is up means the swipe is learned.
  const answeredNow = stack.dueWithWait.filter((row) => row.answer).length
  const answeredAtStart = useRef(answeredNow)
  useEffect(() => {
    if (!introSeen && answeredNow > answeredAtStart.current) markSwipeIntroSeen()
  }, [introSeen, answeredNow])
  const showKey = introSeen && !keySeen && !prefsSeen && keyNight && showChips && !stack.nightDone
  // The done card's night summary: the week behind and the night ahead.
  const summary = useMemo(
    () =>
      stack.nightDone
        ? (() => {
            const week = weekStripNights(stack.shelf, stack.clock, tagId)
            // Sunday night closes the week: a small recap rides on the done card.
            const recap = isRecapNight(stack.dateIso) ? weekRecap(stack.shelf, week, tagId) : null
            return { week, recap, tomorrow: tomorrowPreview(stack.shelf, stack.clock, tagId) }
          })()
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stack.shelf, stack.dateIso, tagId, stack.nightDone],
  )
  // New people see Did and Nope buttons and a swipe hint until they have
  // answered on 3 different nights. Read from the shelf, nothing stored.
  const isNew = useMemo(() => isNewShelf(stack.shelf), [stack.shelf])
  // Night one: the first cleared night gets a bigger moment, once ever.
  const [nightOne, setNightOne] = useState(false)
  useEffect(() => {
    if (!stack.nightDone || nightOneSeen() || !isNightOne(stack.shelf, stack.dateIso)) return
    markNightOneSeen()
    setNightOne(true)
    // A bigger cheer on top of the usual one. CheerBurst skips it under reduced motion.
    if (purse.cheerOn) fireCheer(purse.cheerOn, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.nightDone, stack.dateIso])
  // The widget tip: counts each day the app is opened, then from day 2 asks
  // once (twice after a Not now) to put the questions on the home screen.
  const hasQuestion = (stack.shelf || []).some((item) => (item.lamps || []).length > 0)
  const nightOneRef = useRef(nightOne)
  nightOneRef.current = nightOne
  useEffect(() => {
    if (!hasQuestion) return undefined
    let timer
    const check = () => {
      clearTimeout(timer)
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      writeWidgetTip(countWidgetTipDay(readWidgetTip(), today))
      // A beat after the screen settles, so it never lands on another sheet.
      timer = setTimeout(async () => {
        const placed = await widgetPlaced()
        const state = readWidgetTip()
        if (placed && !state.done) writeWidgetTip({ ...state, done: true })
        const busy = sheetIsUp() || nightOneRef.current || navigation.isFocused?.() === false
        if (!shouldShowWidgetTip({ state, today, hasQuestion: true, widgetPlaced: placed, busy })) return
        writeWidgetTip({ ...state, shown: (state.shown || 0) + 1, shownDay: today })
        showWidgetTip(colors, () => writeWidgetTip({ ...readWidgetTip(), done: true }))
      }, 2500)
    }
    check()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check()
    })
    return () => {
      clearTimeout(timer)
      sub.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuestion])
  // The morning ask: before noon, a card to add one-day questions for today.
  // After an add it stays until Tonight is left; Not today hides it for the day.
  const morningOn = usePrefs().morningAsk !== false
  const [morningState, setMorningState] = useState(readMorningAsk)
  const [morningHere, setMorningHere] = useState(false)
  const [morningFocus, setMorningFocus] = useState(() => (takeMorningFocus() ? 1 : 0))
  useEffect(() => {
    const look = () => {
      setMorningState(readMorningAsk())
      if (takeMorningFocus()) setMorningFocus((n) => n + 1)
    }
    const offFocus = navigation.addListener('focus', look)
    const offBlur = navigation.addListener('blur', () => {
      setMorningHere(false)
      setMorningFocus(0)
    })
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') look()
      else setMorningHere(false)
    })
    return () => {
      offFocus()
      offBlur()
      sub.remove()
    }
  }, [navigation])
  const showMorning = shouldShowMorningAsk({
    state: morningState,
    today: stack.dateIso,
    on: morningOn,
    open: morningOpen(now),
    busy: nightOne || !hasQuestion,
    addedHere: morningHere,
  })
  const morningN = showMorning ? morningCount(stack.shelf || [book], stack.dateIso) : 0
  const addMorningQuestion = (text, at) => {
    // The shelf's copy holds a Did tapped a moment ago that the prop may not have yet.
    const live = (stack.shelf || []).find((item) => item.id === book.id) || book
    const out = addMorning(live, stack.shelf || [book], text, new Date(), at)
    if (out.error) return out.error === 'empty' ? '' : out.error
    try {
      onChange(commitBook(out.book, new Date()))
    } catch {
      return 'failed'
    }
    const next = { ...readMorningAsk(), addedDay: stack.dateIso }
    writeMorningAsk(next)
    setMorningState(next)
    setMorningHere(true)
    return ''
  }
  const morningNotToday = () => {
    const next = { ...readMorningAsk(), offDay: stack.dateIso }
    writeMorningAsk(next)
    setMorningState(next)
    setMorningHere(false)
  }
  // After a cleared night, one card asks to sign in. Dismissed stays dismissed.
  const [nudgeGone, setNudgeGone] = useState(signInNudgeSeen)
  const signInNudge = showSignInNudge({
    signedIn: Boolean(account.user),
    cloud: cloudSetUp(),
    nightDone: stack.nightDone,
    dismissed: nudgeGone,
  })
  const dropNudge = () => {
    markSignInNudgeSeen()
    setNudgeGone(true)
  }
  // Marks wait while the night's celebration plays, then come one at a time.
  useHoldMarks(Boolean(stack.cheer), CELEBRATE_MS)
  // Undo joins the one toast line above the tab bar. Shake undo is off (see useShakeUndo).
  // Undo sends the card back the way it left.
  const applyUndo = stack.applyUndo
  const undoAnswer = useCallback(() => {
    flyBackNext()
    applyUndo()
  }, [applyUndo])
  // The toast's label says what was saved (Marked Did, nope or late).
  // After a Did on your own question, the toast also offers a note for it.
  // The sheet reads colors and onChange when tapped, so a new render never re-arms the toast.
  const undoNow = stack.undo
  const noteDeps = useRef({ colors, onChange })
  noteDeps.current = { colors, onChange }
  const undoToast = useMemo(() => {
    if (!undoNow || (undoNow.status !== 'yes' && undoNow.status !== 'late')) return undoNow
    const target = { boardId: undoNow.book?.id, lampId: undoNow.lampId, periodKey: undoNow.periodKey }
    return { ...undoNow, extra: { label: t('note.addShort'), onPress: () => openAnswerNote({ ...target, ...noteDeps.current }) } }
  }, [undoNow])
  useUndoToast('tonight', undoToast, undoAnswer, UNDO_MS, t('tonight.undoTap'), stack.holdUndo)
  useShakeUndo(Boolean(stack.undo), undoAnswer)
  // An answer saved with no signal says where it is, once per offline stretch.
  const online = useOnline()
  // It waits for the undo toast to clear so undo stays on screen, and only says so when signed in.
  const offlineNoted = useRef(false)
  const offlineAnswered = useRef(false)
  useEffect(() => {
    if (online) {
      offlineNoted.current = false
      offlineAnswered.current = false
      return
    }
    if (undoNow) {
      offlineAnswered.current = true
      return
    }
    if (!account.user || !offlineAnswered.current || offlineNoted.current) return
    offlineNoted.current = true
    showToast({ id: 'offline-saved', kind: 'done', text: t('tonight.offlineSaved'), ms: 4200 })
  }, [online, undoNow, account.user])
  // A sync that cannot reach the account says so once, in the same line.
  const syncMiss = account.user && sync.how === 'miss' ? (sync.miss ? tMiss(sync.miss) : t('tonight.syncMiss')) : ''
  useEffect(() => {
    if (!syncMiss) {
      dropToast('sync-miss')
      return
    }
    // Tap to try now rather than wait for the next wake.
    showToast({ id: 'sync-miss', kind: 'error', text: `${syncMiss} ${t('toast.tapRetry')}`, ms: 5200, onPress: () => pullAndMerge() })
  }, [syncMiss])
  useEffect(() => {
    if (!stack.cheer) return undefined
    const timer = setTimeout(stack.cheered, CELEBRATE_MS)
    return () => clearTimeout(timer)
  }, [stack.cheer, stack.cheered])
  // The folder and topic filters apply to Did we cards the same way.
  const folderTitles = tagId
    ? (boards || [])
        .filter((item) => tagId.split(',').includes(item.id))
        .map((item) => item.title)
    : []
  const weCards = we.cards.filter((card) => weInFilter(card, folderTitles, picks))
  // At most one line about other people: a Did we waiting on you, or a
  // friend still going once you are done.
  const social = pickSocialLine({
    weCards,
    people: account.user ? buildTogetherWidgetProps(together).people : [],
    nightDone: stack.nightDone,
  })
  // Did wes asked tonight that you are on, for the pills.
  const wePills = weCards.filter((card) => card.myState === 'in' && card.due)
  const pickedWe = wePick ? weOpenForMe(weCards, new Date(), { early: true }).find((card) => card.id === wePick) : null
  const answerWe = (card, status) => {
    setWePick('')
    return weAns.answer(card, status)
  }
  // Your own questions come first. Once none is left to swipe, an unanswered
  // Did we takes the card's place.
  const weSwipe =
    WE_SWIPE_OVER.has(stack.bodyKind) &&
    !stack.cheer &&
    !(stack.bodyKind === 'finish' && stack.stillOpen.length) ? (
      <WeSwipeCard
        cards={weCards}
        colors={colors}
        onAnswer={weAns.answer}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        buddy={activeBuddy(book)}
        frame={cardFrame}
      />
    ) : null
  // After your own and Did we: family questions, then Did you asks. A swiped
  // card leaves at once; a failed save brings it back with a toast.
  // People cards have no undo, so a family answer says it was saved instead.
  const peopleAnswer = async (key, save, reload, kind, refresh) => {
    setPeopleGone((keys) => [...keys, key])
    feelTap(kind === 'skip' ? 'skip' : 'did')
    let why = ''
    try {
      why = (await save()).miss
    } catch {
      why = 'off'
    }
    if (why === 'sent.gone') {
      // Taken back before you answered: the card stays gone, say why.
      showToast({ id: `people-miss:${key}`, kind: 'error', text: t('sent.gone'), ms: 5200 })
      // Only refresh: the success steps (keep, confirm) must not run.
      refresh?.()
      return
    }
    if (why) {
      setPeopleGone((keys) => keys.filter((k) => k !== key))
      showToast({ id: `people-miss:${key}`, kind: 'error', text: t('tonight.peopleMiss'), ms: 5200 })
      return
    }
    reload()
  }
  const peopleItems = peopleTonightItems({
    familyRows: family.rows,
    asks,
    night: stack.dateIso,
    gone: peopleGone,
  }).map((item) => {
    const { row } = item
    if (item.kind === 'family') {
      const save = (status) => () =>
        peopleAnswer(
          item.key,
          () => answerFamilyLamp(row.family.id, row.lamp.id, row.night, status),
          () => {
            confirmDone(t('tonight.familySaved', { name: row.family.name }))
            family.reload()
          },
          status,
          family.reload,
        )
      return {
        ...item,
        kicker: row.family.name,
        line: row.lamp.cadence === 'every' ? sharedLastLine(row.last, row.night, row.lastName) : '',
        onDid: save('yes'),
        onNope: save('skip'),
      }
    }
    const save = (keep) => () => {
      let already = false
      let lost = false
      const send = async () => {
        const res = await answerSend(row.id, keep)
        already = !!res?.already
        lost = keptButMissing(res, row.id)
        return res
      }
      return peopleAnswer(item.key, send, () => {
        // Answered elsewhere already: no second keep or toast, unless the
        // kept question never landed on this shelf.
        if (already) {
          if (keep && lost && row.kind === 'todo' && onKeep) onKeep(row)
          return loadAsks()
        }
        // Like Keep in the inbox: a kept ask joins your own questions.
        if (keep && row.kind === 'todo' && onKeep) onKeep(row)
        confirmDone(keep ? t('didYouLink.added') : t('confirm.passed'))
        loadAsks()
      }, keep ? 'yes' : 'skip', loadAsks)
    }
    return {
      ...item,
      kicker: t('tonight.peopleFrom', { name: personName(row.person) || t('people.someone') }),
      line: sendLastLine(row.repeat, row.last_did_on, stack.dateIso),
      onDid: save(true),
      onNope: save(false),
    }
  })
  const peopleTop = peopleItems[0] || null
  const peopleSwipe =
    weSwipe && peopleTop ? (
      <SwipeCardHost
        key="people"
        cardKey={peopleTop.key}
        colors={colors}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        kicker={peopleTop.kicker}
        title={peopleTop.title}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        behind={peopleItems.slice(1).map((item) => ({ key: item.key, kicker: item.kicker, title: item.title }))}
        onDid={peopleTop.onDid}
        onNope={peopleTop.onNope}
        buddy={activeBuddy(book)}
        frame={cardFrame}
      >
        {peopleTop.line ? (
          <Text style={[styles.everyLine, { color: colors.inkSoft }]}>{peopleTop.line}</Text>
        ) : null}
      </SwipeCardHost>
    ) : null
  // The grace period for the previous night: first until 5am, then after
  // tonight's own cards until 9am.
  // Your own open questions from last night, then last night's open Did wes.
  const graceNight = graceNightIso()
  const graceWeOpen = graceNight ? weOpenOn(graceNight) : new Set()
  const graceItems = [
    ...stack.graceOpen.map((row) => ({
      key: `grace:${stack.rowKey(row)}:${row.periodKey}`,
      title: row.lamp.question,
      late: didStatusForRow(row) === 'late',
      onDid: () => stack.markGrace(row, 'yes'),
      onNope: () => stack.markGrace(row, 'skip'),
      buddy: activeBuddy(stack.bookOf(row)),
    })),
    ...weCards
      .filter((card) => graceWeOpen.has(card.id) && !graceWeLeft.includes(card.id))
      .map((card) => ({
        key: `grace-we:${card.id}`,
        title: card.question,
        onDid: () => weAns.answer(card, 'did', graceNight),
        onNope: () => {
          setGraceWeLeft((ids) => [...ids, card.id])
          return weAns.answer(card, 'nope', graceNight)
        },
        buddy: activeBuddy(book),
      })),
  ]
  const graceKicker = t('tonight.graceKicker', { time: clockWords('09:00') })
  const graceTop = graceItems[0] || null
  const graceCard = graceTop ? (
    <SwipeCardHost
      key="grace"
      cardKey={graceTop.key}
      colors={colors}
      panelStyle={gemCard}
      gemLook={premium ? look : ''}
      kicker={graceKicker}
      title={graceTop.title}
      stampDid={t('tonight.swipeDid')}
      stampNope={t('tonight.swipeNope')}
      behind={graceItems.slice(1).map((item) => ({ key: item.key, kicker: graceKicker, title: item.title }))}
      onDid={graceTop.onDid}
      onNope={graceTop.onNope}
      buddy={graceTop.buddy}
      frame={cardFrame}
    >
      {graceTop.late ? (
        <Text style={[faceCardStyles.meta, styles.graceLate, { color: colors.inkSoft }]}>{t('tonight.graceLate')}</Text>
      ) : null}
    </SwipeCardHost>
  ) : null
  const graceFirstNow = graceItems.length > 0 && graceFirst()
  const graceShowing = Boolean(
    graceCard && !stack.cheer && (graceFirstNow ? stack.bodyKind === 'face' || WE_SWIPE_OVER.has(stack.bodyKind) : WE_SWIPE_OVER.has(stack.bodyKind)),
  )
  // The first time a grace card shows, say what the grace period is.
  useEffect(() => {
    if (!graceShowing || graceExplained()) return
    markGraceExplained()
    publishSheet({
      title: t('grace.title'),
      body: t('grace.body', { time: clockWords('09:00') }),
      closeLabel: t('grace.gotIt'),
      colors,
      onClose: () => publishSheet(null),
    })
  }, [graceShowing, colors])
  // First open of a new week: last week's recap, once. Sunday's done card counts as seen.
  useEffect(() => {
    if (summary?.recap && isRecapNight(stack.dateIso)) {
      markWeekRecapSeen(stack.dateIso)
      return
    }
    if (graceShowing || stack.cheer || !stack.dateIso) return
    const sunday = weekRecapDue(stack.dateIso)
    if (!sunday) return
    markWeekRecapSeen(sunday)
    const [y, m, d] = sunday.split('-').map(Number)
    const recap = weekRecap(stack.shelf, weekStripNights(stack.shelf, new Date(y, m - 1, d, 12), tagId), tagId)
    // Nothing answered last week (or a new phone): nothing to show.
    if (!recap.dids && !recap.cleared) return
    publishSheet({
      kicker: t('recap.lastWeek'),
      title: t('recap.cleared', { cleared: recap.cleared, n: recap.nights }),
      body: recapLine(recap, gentle),
      goLabel: t('recap.shareBtn'),
      closeLabel: t('settings.close'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const how = await passAlong(recapShareText(recap, gentle), t('recap.lastWeek'))
        if (how === 'copied') confirmDone(t('recap.copied'))
        else if (!how) confirmMiss(t('confirm.shareMiss'))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.dateIso, graceShowing, Boolean(stack.cheer), Boolean(summary?.recap)])
  const pullWait = Boolean(account.user) && firstPullWaiting(sync) && !stack.cheer && stack.bodyKind !== 'face'
  let face = null
  // The done card grows (note, sign-in, recap). Centred in a fixed slot it
  // spilled under the meter and the tab bar, so it scrolls instead.
  let doneFace = false
  // Did and Not yet buttons under the card, only for a screen reader.
  let answerBar = null
  const withAnswerButtons = (card, onDid, onNope) => {
    if (!answerButtons) return card
    answerBar = (
    <View style={styles.answerBar}>
      <View style={styles.answerRow}>
        {onNope ? (
          <View style={styles.answerCell}>
            <KeyButton label={t('tonight.answerNope')} colors={colors} onPress={onNope} />
          </View>
        ) : null}
        <View style={styles.answerCell}>
          <DidButton small label={t('tonight.answerDid')} colors={colors} onPress={onDid} />
        </View>
      </View>
    </View>
    )
    return card
  }
  if (pullWait) {
    // Just signed in and the account's shelf is still on its way: loading
    // rows, never a blank card or "That is everything for tonight".
    face = <LateMeta colors={colors}>{t('app.loading')}</LateMeta>
  } else if (graceCard && !stack.cheer && (graceFirstNow ? stack.bodyKind === 'face' || WE_SWIPE_OVER.has(stack.bodyKind) : WE_SWIPE_OVER.has(stack.bodyKind))) {
    face = graceTop ? withAnswerButtons(graceCard, graceTop.onDid, graceTop.onNope) : graceCard
  } else if (pickedWe && !stack.cheer) {
    face = (
      <WeSwipeCard
        cards={[pickedWe]}
        colors={colors}
        onAnswer={answerWe}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        buddy={activeBuddy(book)}
        frame={cardFrame}
      />
    )
  } else if (weSwipe && weOpenForMe(weCards, new Date(), { early: true }).length) {
    face = weSwipe
  } else if (peopleSwipe) {
    face = withAnswerButtons(peopleSwipe, peopleTop.onDid, peopleTop.onNope)
  } else if (stack.bodyKind === 'finish' && stack.stillOpen.length) {
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <StillOpen
          rows={stack.stillOpen}
          rowKey={stack.rowKey}
          colors={colors}
          onLate={stack.lateFromList}
          onLeave={stack.leaveFromList}
        />
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'face' && stack.faceRow) {
    const faceRow = stack.faceRow
    const faceBook = stack.bookOf(faceRow)
    const stripKeys = stack.recentPeriodKeys(faceRow.lamp, stack.dateIso, 7)
    const hasHistory = stripKeys.some((key) => answerFor(faceBook, faceRow.lamp.id, key))
    // One stack for the night: cards keep their identity by row, so the card
    // behind is the one that grows into the face.
    const cardKeyOf = (row) => `${stack.rowKey(row)}:${row.periodKey}`
    face = (
      <SwipeCardHost
        key="face"
        cardKey={cardKeyOf(faceRow)}
        colors={colors}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        kicker={cardKicker(faceRow, '')}
        title={faceRow.lamp.question}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        behind={stack.upNext.map((row) => ({
          key: cardKeyOf(row),
          kicker: cardKicker(row, t('tonight.didI')),
          title: row.lamp.question,
        }))}
        onDid={() => stack.mark(faceRow, 'yes')}
        onNope={() => stack.mark(faceRow, 'skip')}
        buddy={activeBuddy(faceBook)}
        onEdit={() => goHash('/hang', { id: faceRow.lamp.id })}
        frame={cardFrame}
      >
        {isEvery(faceRow.lamp) ? (
          <Text style={[styles.everyLine, { color: colors.inkSoft }]}>{lastTimeLine(faceBook, faceRow.lamp, stack.dateIso)}</Text>
        ) : null}
        {hasHistory ? (
          <NightStrip
            book={faceBook}
            lamp={faceRow.lamp}
            keys={stripKeys}
            colors={colors}
            onPickHole={(lamp, key) => stack.pickHole(lamp, key, faceRow)}
          />
        ) : null}
      </SwipeCardHost>
    )
    face = withAnswerButtons(face, () => stack.mark(faceRow, 'yes'), () => stack.mark(faceRow, 'skip'))
  } else if (stack.bodyKind === 'hall' && stack.nightDone) {
    doneFace = true
    face = (
      <CardSettle play={Boolean(stack.cheer)}>
        <GemFaceShell look={premium ? look : ''}
          theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
          <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.doneKicker')}</Text>
          <Text style={[faceCardStyles.title, { color: colors.ink }]}>
            {nightOne ? t('nightOne.title') : t(isDaytime(skyNow) ? 'tonight.doneTitle' : 'tonight.doneTitleNight')}
          </Text>
          {nightOne ? (
            <>
              <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t(gentle ? 'nightOne.bodyGentle' : 'nightOne.body')}</Text>
              <View style={styles.actions}>
                <DidButton small label={t('nightOne.widget')} colors={colors} onPress={() => pinWidget(colors)} />
              </View>
            </>
          ) : null}
          {stack.streak > 0 && !gentle ? (
            <View style={styles.streakRow}>
            <Pressable
              onPress={() => goHash('/stats')}
              accessibilityRole="button"
              accessibilityHint={t('stats.title')}
              style={styles.streakTap}
            >
              <StreakCount n={stack.streak} from={stack.cheer ? stack.cheer.from : null} colors={colors} />
              <Text style={[styles.streakChevron, { color: colors.inkDim }]}>›</Text>
            </Pressable>
            <View style={styles.streakChip}>
              <FreezeChip colors={colors} held={freezesHeld} onPress={() => openFreezeHow(colors, stack.shelf, stack.clock)} />
            </View>
            </View>
          ) : null}
          {summary ? (
            <NightWeek
              nights={summary.week}
              colors={colors}
              onNight={(iso) =>
                openNightWhy({ colors, boards: stack.shelf, iso, now: stack.clock, tagId, onCalendar: () => goHash('/calendar') })
              }
            />
          ) : null}
          <View style={styles.tomorrowRow}>
            {summary ? (
              <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{tomorrowLine(summary.tomorrow)}</Text>
            ) : null}
            <TonightNote quiet rows={stack.dueWithWait} bookOf={stack.bookOf} colors={colors} onChange={onChange} />
          </View>
          {wish ? (
            <Pressable accessibilityRole="link" accessibilityHint={t('shop.wishTitle')} onPress={() => goHash('/kit', { id: 'wish' })} hitSlop={8}>
              <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>
                {t(wish.key, { n: wish.n, name: t(wish.nameKey) })} <Text style={{ color: colors.on }}>›</Text>
              </Text>
            </Pressable>
          ) : null}
          {signInNudge && !nightOne ? (
            <View style={[styles.nudge, { borderTopColor: colors.lineSoft }]}>
              <Text style={[faceCardStyles.meta, { color: colors.ink }]}>{t('signInNudge.title')}</Text>
              <View style={styles.actions}>
                <DidButton small label={t('signInNudge.go')} colors={colors} onPress={() => goHash('/account')} />
                <KeyButton label={t('signInNudge.later')} colors={colors} onPress={dropNudge} />
              </View>
            </View>
          ) : null}
        </GemFaceShell>
      </CardSettle>
    )
  } else if (stack.bodyKind === 'rest' || stack.bodyKind === 'finish') {
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.restKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>
          {stack.finishCount === 1 ? t('tonight.restOne') : t('tonight.restTitle', { n: stack.finishCount })}
        </Text>
        <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t('tonight.restHint', { time: clockWords('09:00') })}</Text>
        <View style={styles.actions}>
          <DidButton label={t('tonight.restChange')} colors={colors} small onPress={stack.reopenStillOpen} />
        </View>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'waiting') {
    const next = stack.nextOpenTime(stack.waiting)
    // While new, a question that waits for its time can be answered now.
    const firstWaiting = stack.dueWithWait.find((row) => row.waiting && !row.answer)
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.waitKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.waitTitle')}</Text>
        {isNew && firstWaiting ? (
          <View style={styles.actions}>
            <DidButton small label={t('tonight.answerEarly')} colors={colors} onPress={() => stack.jewelClick(firstWaiting)} />
          </View>
        ) : null}
        <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>
          {next
            ? t('tonight.waitOpens', {
                name: stack.shortLabel(next.lamp),
                time: clockWords(next.lamp.askAfter),
              })
            : t('tonight.waitLater')}
        </Text>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'empty') {
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.emptyKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.emptyTitle')}</Text>
        <StarterPicks book={book} onChange={onChange} colors={colors} />
        <DidButton label={t('tonight.write')} colors={colors} small onPress={() => goHash('/add')} />
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'hole' && stack.holePick) {
    face = (
      <HolePlate
        lamp={stack.holePick.lamp}
        periodKey={stack.holePick.periodKey}
        wasSkip={stack.holeWasSkip}
        colors={colors}
        onLate={() =>
          stack.mark(
            { lamp: stack.holePick.lamp, periodKey: stack.holePick.periodKey, book: stack.bookOf(stack.holePick) },
            'late',
          )
        }
        onSkip={
          stack.holeWasSkip
            ? null
            : () =>
                stack.mark(
                  { lamp: stack.holePick.lamp, periodKey: stack.holePick.periodKey, book: stack.bookOf(stack.holePick) },
                  'skip',
                )
        }
        onClose={() => stack.closePlates()}
        wrap={staticWrap}
      />
    )
  } else if (stack.bodyKind === 'wait' && stack.waitPick) {
    face = (
      <WaitPlate
        row={stack.waitPick}
        colors={colors}
        onDid={() => stack.mark(stack.waitPick, 'yes')}
        wrap={staticWrap}
        penBeside={Boolean(activeBuddy(book))}
      />
    )
  } else if (stack.bodyKind === 'pillView' && stack.pillPick) {
    const pillRow = stack.pillPick
    const pillBook = stack.bookOf(pillRow)
    const status = pillRow.answer?.status || ''
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={faceCardStyle(colors, pickedPanel)} buddy={activeBuddy(pillBook)}>
        <EditPen
          onPress={() => goHash('/hang', { id: pillRow.lamp.id })}
          colors={colors}
          beside={Boolean(activeBuddy(pillBook))}
        />
        {pillRow.tag ? <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{pillRow.tag}</Text> : null}
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{pillRow.lamp.question}</Text>
        <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{pillStatusLabel(status)}</Text>
        {/* Only while new: after a few nights people know a DID stays. */}
        {isNew && (status === 'yes' || status === 'late') ? (
          <Text style={[faceCardStyles.meta, { color: colors.inkDim }]}>{t('pill.doneFinal')}</Text>
        ) : null}
        <View style={styles.actions}>
          <TonightNote rows={[pillRow]} bookOf={stack.bookOf} colors={colors} onChange={onChange} />
        </View>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'pill' && stack.pillPick) {
    const pillRow = stack.pillPick
    const pillBook = stack.bookOf(pillRow)
    const status = pillRow.answer?.status || ''
    const isDid = status === 'yes' || status === 'late'
    const pillKey = `${stack.rowKey(pillRow)}:${status || 'open'}`
    const pillKeys = stack.recentPeriodKeys(pillRow.lamp, stack.dateIso, 7)
    const pillHistory = pillKeys.some((key) => answerFor(pillBook, pillRow.lamp.id, key))
    const pillMeta =
      pillRow.dateIso && !mustSwipeDeadline(pillRow.lamp, pillRow.dateIso)
        ? t('tonight.deadlineOptional', { date: formatBoardDate(pillRow.lamp.dueBy) })
        : ''
    face = (
      <SwipeCardHost
        key={`pill:${pillKey}`}
        cardKey={pillKey}
        colors={colors}
        panelStyle={pickedPanel}
        gemLook={premium ? look : ''}
        kicker={cardKicker(pillRow, '')}
        title={pillRow.lamp.question}
        meta={pillMeta}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        blockDid={isDid}
        blockNope={status === 'skip' || isDid}
        onDid={() => stack.mark(pillRow, 'yes')}
        onNope={() => stack.mark(pillRow, 'skip')}
        buddy={activeBuddy(pillBook)}
        onEdit={() => goHash('/hang', { id: pillRow.lamp.id })}
        frame={cardFrame}
      >
        {pillMeta ? <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{pillMeta}</Text> : null}
        {/* A not yet still takes a swipe right to Did (late); say where it stands. */}
        {status === 'skip' ? (
          <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{`${pillStatusLabel(status)} · ${t('tonight.nopedChange', { time: clockWords('09:00') })}`}</Text>
        ) : null}
        {pillHistory ? (
          <NightStrip
            book={pillBook}
            lamp={pillRow.lamp}
            keys={pillKeys}
            colors={colors}
            onPickHole={(lamp, key) => stack.pickHole(lamp, key, pillRow)}
          />
        ) : null}
      </SwipeCardHost>
    )
    // Picked from the pills: the same Did and Nope as the stack. A noped one
    // can still take a Did (late), never a second nope.
    face = withAnswerButtons(face, () => stack.mark(pillRow, 'yes'), status === 'skip' ? null : () => stack.mark(pillRow, 'skip'))
  } else if (stack.bodyKind === 'off') {
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.offKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.offTitle')}</Text>
        <View style={styles.actions}>
          <DidButton label={t('home.add')} colors={colors} small onPress={() => goHash('/add')} />
          <KeyButton label={t('tonight.seeAll')} colors={colors} onPress={() => goHash('/lamps')} />
        </View>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'idle') {
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.waitTitle')}</Text>
      </GemFaceShell>
    )
  }

  const tagFilter = (
    <TagFilter
      boards={stack.shelf}
      tagId={tagId}
      onTag={onTag}
      now={stack.clock}
      colors={colors}
      topics={topics}
      topicPicks={picks}
      onTopics={setTopicPicks}
      inline={showChips}
    />
  )

  // Rename lives in Settings > Folders; the title is only a title here.
  const titleSlot = (
    <View style={styles.titleHit}>
      <Text style={[headerTitleStyle, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
        {mastTitle}
      </Text>
    </View>
  )

  return (
    <CardFrameProps.Provider value={cardFrame}>
    <MastMenuRoot colors={colors} showAdd>
    <View pointerEvents="box-none" style={[styles.frame, { backgroundColor: colors.bg }, gemFrame]}>
      <AppHeader colors={colors} titleSlot={titleSlot} back={false} purse={purse} menu clear={premium} />
      <Slot>
        <HallAmbient heat={stack.heat} hour={stack.hour} hallOn={stack.nightDone} accent={colors.on} />
      </Slot>
      <View
        pointerEvents="box-none"
        style={[
          styles.shell,
          premium && styles.aboveHalo,
          { paddingTop: headerInset, paddingBottom: bottomPad, backgroundColor: premium ? 'transparent' : colors.bg },
          stack.nightDone && styles.sitOn,
        ]}
      >
      <Slot>
        <NightMeter due={stack.due} we={stack.weTonight} colors={colors} hallOn={stack.nightDone} gemLook={premium ? look : ''} celebrate={Boolean(stack.cheer)} waiting={peopleWaitingLine(peopleItems)} />
      </Slot>

      {showMorning ? (
        <MorningAsk colors={colors} count={morningN} focus={morningFocus} onAdd={addMorningQuestion} onOff={morningNotToday} />
      ) : null}

      {showChips ? (
        <FadeScroll scrollRef={pillScroll} fade={colors.bg} style={styles.jewels} contentContainerStyle={styles.jewelsIn}>
          <Slot>{tagFilter}</Slot>
          {/* The filter picks a folder; each pill after the line opens one question. */}
          {(stack.shelf || []).filter((item) => !item.archived).length >= 2 || topics.length > 0 ? (
            <View style={[styles.jewelsRule, { backgroundColor: colors.line }]} />
          ) : null}
          {stack.dueWithWait.map((row) => {
            const on = row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
            const skip = row.answer?.status === 'skip'
            const late = row.answer?.status === 'late'
            const isFace = wePick
              ? false
              : stack.pillPick
              ? stack.rowKey(row) === stack.rowKey(stack.pillPick)
              : Boolean(stack.faceRow) && stack.rowKey(row) === stack.rowKey(stack.faceRow)
            const bookOf = stack.bookOf(row)
            const dueUrgency = !on && !skip ? dueByUrgency(row.lamp, stack.dateIso) : ''
            return (
              <Jewel
                key={stack.rowKey(row)}
                label={stack.shortLabel(row.lamp)}
                tag={isTodayOnce(row.lamp, row.dateIso) ? todayLabel(row.lamp) : row.tag && tagsMixed ? row.tag : ''}
                on={on}
                skip={skip}
                late={late}
                waiting={row.waiting}
                optional={row.optionalDeadline}
                dueToday={dueUrgency === 'today'}
                dueSoon={dueUrgency === 'soon'}
                face={isFace}
                sit={stack.nightDone && on}
                filament={on ? stack.filamentLevel(bookOf, row.lamp.id) : 0}
                colors={colors}
                onPress={() => {
                  setWePick('')
                  stack.jewelClick(row)
                }}
              />
            )
          })}
          {wePills.map((card) => {
            const mine = weMine(card)?.status || ''
            return (
              <Jewel
                key={`we:${card.id}`}
                label={weShort(card.question)}
                tag={t('we.title')}
                on={mine === 'did'}
                skip={mine === 'nope'}
                face={wePick === card.id}
                colors={{ ...colors, on: colors.we || colors.on }}
                onPress={() => {
                  if (mine || card.done) return goHash('/we', { id: card.id })
                  stack.closePlates()
                  return setWePick(wePick === card.id ? '' : card.id)
                }}
              />
            )
          })}
        </FadeScroll>
      ) : null}

      {showIntro ? <SwipeIntro colors={colors} /> : null}
      {showKey ? (
        <JewelKey colors={colors} onDone={() => setKeySeen(true)} />
      ) : null}

      {showChips ? null : <Slot>{tagFilter}</Slot>}

      {/* A picked card stays put after its answer, so these rows stay too. */}
      {stack.cheer && !pickKey ? null : <DropLine colors={colors} />}
      {stack.cheer && !pickKey ? null : <RateCard colors={colors} nightDone={stack.nightDone} dateIso={stack.dateIso} />}

      {stack.pillPick || stack.waitPick || pickedWe ? (
        <Pressable
          onPress={() => {
            setWePick('')
            stack.closePlates()
          }}
          hitSlop={10}
          accessibilityRole="button"
          style={[styles.back, { borderColor: colors.line, backgroundColor: colors.panel2 }]}
        >
          <Text style={[styles.backText, { color: colors.ink }]}>‹  {t('tonight.backToStack')}</Text>
        </Pressable>
      ) : null}

      {/* The card sits in the middle of the space between the chips and the buttons (owner call, 2026-10-06). */}
      <SwipeFlyHost style={styles.slot}>
        {stack.bodyKind === 'hall' && stack.nightDone && !pullWait ? (
          <Slot>
            <DoneIn style={StyleSheet.absoluteFill}>
              <NightSky colors={colors} now={skyNow} />
            </DoneIn>
          </Slot>
        ) : null}
        {doneFace ? (
          <DoneScroll fade={colors.bg}>
            <Slot>
              <DoneIn>{face}</DoneIn>
            </Slot>
          </DoneScroll>
        ) : (
          <Slot>
            {/* flex: 1 because the card fills this box; without it the card collapses to no height. */}
            <View onLayout={onPickLayout} style={[styles.pickBox, pickMinH ? { minHeight: pickMinH } : null]}>
              {/* Loading to the real card eases in, never a hard swap. */}
              <DoneIn key={pullWait ? 'wait' : 'card'} style={styles.pickBox}>
                {face}
              </DoneIn>
            </View>
          </Slot>
        )}
        <Slot>
          <WePausedRow cards={weCards} colors={colors} reload={we.reload} />
        </Slot>
        <Slot>
          {stack.cheer ? null : <WeAnswered cards={weCards} colors={colors} />}
        </Slot>
        <Slot>
          {social?.kind === 'we' && face !== weSwipe && !(peopleSwipe && face === peopleSwipe) &&!pickedWe ? (
            <Pressable
              onPress={() => goHash('/we', { id: social.id })}
              accessibilityRole="button"
              hitSlop={6}
              style={[styles.weTurn, { borderColor: colors.we || colors.on, backgroundColor: colors.panel }]}
            >
              <Text style={[styles.weTurnText, { color: colors.ink }]} numberOfLines={2}>
                {t('home.weYourTurn', { name: social.name || t('people.someone') })}
              </Text>
              <Text style={[styles.weTurnGo, { color: colors.we || colors.on }]}>{t('home.weAnswerGo')} ›</Text>
            </Pressable>
          ) : null}
        </Slot>
        <Slot>
          <FriendsRow colors={colors} cheer={social?.kind === 'cheer' ? social : null} />
        </Slot>
      </SwipeFlyHost>
      {answerBar}
      {/* Toasts show in this room, so they never cover a card and nothing jumps. */}
      {/* The done card has no answer buttons to keep clear, so it takes this room too. */}
      {doneFace ? null : <View style={styles.toastRoom} pointerEvents="none" />}
    </View>
    </View>
    </MastMenuRoot>
    </CardFrameProps.Provider>
  )
}

const frameStyles = StyleSheet.create({
  gap: { margin: FRAME_GAP },
})

// The done card settles in: a short fade and a small scale, no confetti.
// Reduced motion shows it as it is.
const DONE_FADE = [0.2, 0.45, 0.7, 0.9]

// The done card scrolls when it is taller than the room. With more below, the
// bottom edge fades out instead of stopping at a hard line, so it reads as "scroll".
function DoneScroll({ fade, children }) {
  const [box, setBox] = useState(0)
  const [inner, setInner] = useState(0)
  const [y, setY] = useState(0)
  const more = inner - box - y > 4
  return (
    <View style={styles.doneScroll}>
      <ScrollView
        contentContainerStyle={styles.doneScrollIn}
        scrollEnabled={inner > box + 4}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={inner > box + 4}
        scrollEventThrottle={32}
        onScroll={(e) => setY(e.nativeEvent.contentOffset.y)}
        onLayout={(e) => setBox(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setInner(h)}
      >
        {children}
      </ScrollView>
      {more ? (
        <View pointerEvents="none" style={styles.doneFade}>
          {DONE_FADE.map((opacity) => (
            <View key={opacity} style={[styles.doneFadeStep, { backgroundColor: fade, opacity }]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function DoneIn({ children, style: box }) {
  const reduce = useReduceMotion()
  const grow = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!reduce) grow.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })
  }, [grow, reduce])
  const style = useAnimatedStyle(() => ({
    // Starts mostly visible, so a stalled frame never leaves the card unreadable.
    opacity: 0.6 + grow.value * 0.4,
    transform: [{ scale: 0.97 + grow.value * 0.03 }],
  }))
  if (reduce) return box ? <View style={box}>{children}</View> : children
  return <Animated.View style={[box, style]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  everyLine: { fontFamily: fonts.ui, fontSize: 14, marginTop: 6 },
  frame: { flex: 1, position: 'relative' },
  aboveHalo: { flex: 1, zIndex: 2, position: 'relative' },
  shell: { flex: 1, paddingHorizontal: 16, position: 'relative' },
  sitOn: {},
  titleHit: { alignSelf: 'flex-start', maxWidth: '100%' },
  graceLate: { marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  tomorrow: { marginTop: 16 },
  tomorrowRow: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', rowGap: 10, columnGap: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakChip: { marginTop: 14 },
  streakTap: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  streakChevron: { fontSize: 22, marginTop: 10 },
  nudge: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  social: { marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  weTurn: {
    alignSelf: 'center',
    maxWidth: '100%',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cheerKey: { alignSelf: 'flex-start', marginTop: 8 },
  weTurnGo: { fontFamily: fonts.uiSemi, fontSize: 13 },
  weTurnText: { fontFamily: fonts.uiSemi, fontSize: 14, textAlign: 'center', flexShrink: 1 },
  answerBar: { paddingBottom: 12 },
  toastRoom: { height: TOAST_ROOM, flexShrink: 0 },
  answerRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  answerCell: { flex: 1 },
  jewels: { flexGrow: 0, marginBottom: 12 },
  jewelsRule: { width: StyleSheet.hairlineWidth * 2, height: 24, marginHorizontal: 2 },
  jewelsIn: { gap: 8, paddingRight: 8, alignItems: 'center' },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 6,
  },
  backText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  slot: { flex: 1, justifyContent: 'center', minHeight: 120, position: 'relative', overflow: 'visible' },
  // The height of Back to tonight (36 + its 6 below), so both cards start on one line.
  // Centered, so the cards that do not swipe (waiting, nothing right now, rest) sit mid-screen too.
  pickBox: { flex: 1, justifyContent: 'center' },
  doneScroll: { flexGrow: 0, flexShrink: 1, position: 'relative' },
  doneFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 36 },
  doneFadeStep: { flex: 1 },
  doneScrollIn: { flexGrow: 1, justifyContent: 'center', paddingVertical: 8 },
})
