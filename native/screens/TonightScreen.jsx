import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { publishSheet } from '../components/SheetHost.jsx'
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { useSync } from '../../src/lib/cloud-sync.js'
import { activeBuddy, activeLook } from '../../src/lib/active-look.js'
import { BuddyHang } from '../components/Cosmetic.jsx'
import {
  clockWords,
  graceExplained,
  isRecapNight,
  markGraceExplained,
  markWeekRecapSeen,
  recapShareText,
  tomorrowPreview,
  weekRecap,
  weekRecapDue,
  weekStripNights,
} from '../../src/lib/hall-pages.js'
import { passAlong } from '../../src/lib/native.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { WeekRecap } from '../components/WeekRecap.jsx'
import { t, tMiss } from '../../src/lib/i18n.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { fireCheer, isGemLook, mergePurses, wishGoal, wishLine } from '../../src/lib/purse.js'
import { usePrefs, useTheme } from '../../src/lib/prefs.js'
import { answerFor } from '../../src/lib/recurrence.js'
import { UNDO_MS, useTonightStack } from '../../src/lib/useTonightStack.js'
import { DidButton, KeyButton } from '../components/ui.jsx'
import { dueByUrgency, mustSwipeDeadline, shelfTopics } from '../../src/lib/board-json.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { Jewel } from '../components/Jewel.jsx'
import { JewelKey, jewelKeyNight, jewelKeySeen } from '../components/JewelKey.jsx'
import { CELEBRATE_MS, CardSettle, NightWeek, StreakCount, tomorrowLine } from '../components/DoneCard.jsx'
import { openNightWhy } from '../components/NightSheets.jsx'
import { TonightNote } from '../components/NightNotes.jsx'
import { useHoldMarks } from '../lib/mark-hold.js'
import { dropToast, showToast, useUndoToast } from '../lib/toast-queue.js'
import { useShakeUndo } from '../hooks/useShakeUndo.js'
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
import { NightSky } from '../components/NightSky.jsx'
import { Slot } from '../components/Slot.jsx'
import { FamilyTonight } from '../components/FamilyTonight.jsx'
import { WePausedRow, WeSwipeCard, useWeAnswer, weOpenForMe } from '../components/WeTonight.jsx'
import { FriendsRow } from '../components/FriendsRow.jsx'
import { weOpenOn } from '../../src/lib/we-nights.js'
import { didStatusForRow, graceFirst, graceNightIso } from '../../src/lib/recurrence.js'
import { saveWeReminders, saveWeWidgetLine, takeWeBoth, takeWeFinishes, useWeTonight, weInFilter, weMine, weStats } from '../../src/lib/did-we.js'
import { shelfMarks, weMarksFor } from '../../src/lib/achievements.js'
import { armLampPings } from '../../src/lib/notify.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { syncTonightWidget } from '../widget-sync.js'
import { cloudSetUp } from '../../src/lib/cloud.js'
import {
  isNewShelf,
  isNightOne,
  markNightOneSeen,
  markSignInNudgeSeen,
  nightOneSeen,
  showSignInNudge,
  signInNudgeSeen,
} from '../../src/lib/first-run.js'
import { pinWidget } from '../lib/widget-pin.js'

// Where the stack has no card of your own to swipe, so a Did we can have it.
const WE_SWIPE_OVER = new Set(['hall', 'finish', 'rest', 'off', 'waiting'])

// A kept did you says who sent it next to its tag.
function cardKicker(row, fallback) {
  const from = row.lamp?.fromName ? t('inbox.from', { name: row.lamp.fromName }) : ''
  const tag = row.tag || (from ? '' : fallback)
  return [tag, from].filter(Boolean).join(' · ')
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

function GemFaceShell({ look, theme, style, buddy = '', children }) {
  const glow = look ? gemGlowHostStyle(look, theme) : null
  const body = (
    <View style={style}>
      <BuddyHang id={buddy} alive />
      {children}
    </View>
  )
  if (!glow) return body
  return (
    <View style={[faceCardStyles.gemShell, glow]}>
      {body}
    </View>
  )
}

export function TonightScreen({ book, boards, tagId, onTag, onChange, focusLampId, focusKey }) {
  const theme = useTheme()
  const look = activeLook(book)
  const colors = useHallColors(book)
  const account = useAccount()
  const sync = useSync()
  const now = useMinuteNow()
  const [topicPicks, setTopicPicks] = useState([])
  const [keySeen, setKeySeen] = useState(() => jewelKeySeen())
  // Account prefs land after a reinstall; seen there hides it too.
  const prefsSeen = usePrefs().jewelKeySeen === true
  const topics = shelfTopics(boards && boards.length ? boards : [book])
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const stack = useTonightStack({ value: book, boards, tagId, topics: picks, onTag, onChange, focusLampId, focusKey, now })
  const we = useWeTonight(account.user)
  const weAns = useWeAnswer(we.reload, book)
  const [graceWeLeft, setGraceWeLeft] = useState([])
  // A Did we pill tapped: its card comes up to swipe, ahead of your own.
  const [wePick, setWePick] = useState('')
  // Keep the widget's Did we line in step with what Tonight knows.
  useEffect(() => {
    if (!account.user) return
    if (saveWeWidgetLine(we.cards)) syncTonightWidget(readShelf()).catch(() => {})
    // Did we reminders ride along with your own; set them again when they change.
    if (saveWeReminders(we.cards)) armLampPings(readShelf().boards).catch(() => {})
    // Did we achievements come from the shared cards, so they unlock here.
    const earned = weMarksFor(shelfMarks(boards && boards.length ? boards : [book]), weStats(we.cards))
    if (earned.length) onChange({ ...book, unlocked: [...(book.unlocked || []), ...earned] })
    // Someone else's did finished a card: play their cheer here, once.
    const [first, ...more] = takeWeFinishes(we.cards)
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
  const { bottom: bottomPad } = useAppInsets()
  const headerInset = useHeaderInset()
  const mastTitle = tagId && !tagId.includes(',') ? book.title : t('tonight.didI')
  const premium = isGemLook(look)
  const gemCard = gemPanelStyle(look, theme)
  const gemFrame = gemFrameStyle(look, theme)
  const staticCardStyle = [...faceCardStyle(colors, gemCard)]
  // Folders and topics are the first chip of the question row, not a row of their own.
  const showChips = (stack.dueWithWait.length > 0 || we.cards.some((card) => card.myState === 'in' && card.due)) && !stack.holePick && !stack.waitPick
  // The folder name under each chip only helps when the chips come from more than one folder.
  const tagsMixed = new Set(stack.dueWithWait.map((row) => row.tag || '')).size > 1
  // The dot legend waits for a later night, and never shows over the payoff.
  const keyNight = jewelKeyNight(stack.dateIso, stack.dueWithWait.some((row) => row.answer))
  const showKey = !keySeen && !prefsSeen && keyNight && showChips && !stack.nightDone
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
  // Questions made today earn no coins (coinsFor). Say when they start.
  const coinsTomorrow = useMemo(() => {
    if (!stack.nightDone) return false
    const rows = stack.due || []
    return rows.length > 0 && rows.every((row) => row.lamp?.createdOn && row.lamp.createdOn >= stack.dateIso)
  }, [stack.nightDone, stack.due, stack.dateIso])
  // Marks wait while the night's celebration plays, then come one at a time.
  useHoldMarks(Boolean(stack.cheer), CELEBRATE_MS)
  // Undo joins the one toast line above the tab bar. Shake still undoes where
  // the sensor works, but it was not reliable enough to promise.
  // Undo sends the card back the way it left.
  const applyUndo = stack.applyUndo
  const undoAnswer = useCallback(() => {
    flyBackNext()
    applyUndo()
  }, [applyUndo])
  // A Did on last night's card after its nope is saved as late; the toast says so.
  const lateNext = useRef(false)
  const lateUndo = useRef({ undo: null, late: false })
  if (stack.undo !== lateUndo.current.undo) {
    lateUndo.current = { undo: stack.undo, late: Boolean(stack.undo) && lateNext.current }
    lateNext.current = false
  }
  useUndoToast('tonight', stack.undo, undoAnswer, UNDO_MS, lateUndo.current.late ? t('tonight.undoLate') : t('tonight.undoTap'))
  useShakeUndo(Boolean(stack.undo), undoAnswer)
  // A sync that cannot reach the account says so once, in the same line.
  const syncMiss = account.user && sync.how === 'miss' ? (sync.miss ? tMiss(sync.miss) : t('tonight.syncMiss')) : ''
  useEffect(() => {
    if (!syncMiss) {
      dropToast('sync-miss')
      return
    }
    showToast({ id: 'sync-miss', kind: 'error', text: syncMiss, ms: 5200 })
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
      />
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
      onDid: () => {
        lateNext.current = didStatusForRow(row) === 'late'
        stack.markGrace(row, 'yes')
      },
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
      body: `${t('recap.dids', { n: recap.dids })} · ${t('recap.best', { n: recap.best })}`,
      goLabel: t('recap.shareBtn'),
      closeLabel: t('settings.close'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const how = await passAlong(recapShareText(recap), t('recap.lastWeek'))
        if (how === 'copied') confirmDone(t('recap.copied'))
        else if (!how) confirmMiss(t('confirm.shareMiss'))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.dateIso, graceShowing, Boolean(stack.cheer), Boolean(summary?.recap)])
  let face = null
  // Did and Nope buttons under the card, for anyone who would rather tap.
  let answerBar = null
  const withAnswerButtons = (card, onDid, onNope) => {
    answerBar = (
    <View style={styles.answerBar}>
      <View style={styles.answerRow}>
        <View style={styles.answerCell}>
          <KeyButton label={t('tonight.answerNope')} colors={colors} onPress={onNope} />
        </View>
        <View style={styles.answerCell}>
          <DidButton small label={t('tonight.answerDid')} colors={colors} onPress={onDid} />
        </View>
      </View>
      {isNew ? <Text style={[faceCardStyles.meta, styles.swipeHint, { color: colors.inkSoft }]}>{t('tonight.swipeHint')}</Text> : null}
    </View>
    )
    return card
  }
  if (graceCard && !stack.cheer && (graceFirstNow ? stack.bodyKind === 'face' || WE_SWIPE_OVER.has(stack.bodyKind) : WE_SWIPE_OVER.has(stack.bodyKind))) {
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
      />
    )
  } else if (weSwipe && weOpenForMe(weCards, new Date(), { early: true }).length) {
    face = weSwipe
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
      >
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
    face = (
      <CardSettle play={Boolean(stack.cheer)}>
        <GemFaceShell look={premium ? look : ''}
          theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
          <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.doneKicker')}</Text>
          <Text style={[faceCardStyles.title, { color: colors.ink }]}>
            {nightOne ? t('nightOne.title') : t('tonight.doneTitle')}
          </Text>
          {nightOne ? (
            <>
              <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t('nightOne.body')}</Text>
              <View style={styles.actions}>
                <DidButton small label={t('nightOne.widget')} colors={colors} onPress={() => pinWidget(colors)} />
              </View>
            </>
          ) : null}
          {stack.streak > 0 ? (
            <StreakCount n={stack.streak} from={stack.cheer ? stack.cheer.from : null} colors={colors} />
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
          {summary ? (
            <Text style={[faceCardStyles.meta, styles.tomorrow, { color: colors.inkSoft }]}>{tomorrowLine(summary.tomorrow)}</Text>
          ) : null}
          {summary?.recap ? <WeekRecap recap={summary.recap} colors={colors} /> : null}
          <View style={styles.actions}>
            <KeyButton label={t('stats.title')} colors={colors} onPress={() => goHash('/stats')} />
            <TonightNote rows={stack.dueWithWait} bookOf={stack.bookOf} colors={colors} onChange={onChange} />
          </View>
          {coinsTomorrow ? (
            <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t('tonight.coinsTomorrow')}</Text>
          ) : null}
          {wish ? (
            <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t(wish.key, { n: wish.n, name: t(wish.nameKey) })}</Text>
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
      />
    )
  } else if (stack.bodyKind === 'wait' && stack.waitPick) {
    face = (
      <WaitPlate
        row={stack.waitPick}
        colors={colors}
        onDid={() => stack.mark(stack.waitPick, 'yes')}
        onClose={() => stack.closePlates()}
      />
    )
  } else if (stack.bodyKind === 'pillView' && stack.pillPick) {
    const pillRow = stack.pillPick
    const pillBook = stack.bookOf(pillRow)
    const status = pillRow.answer?.status || ''
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(pillBook)}>
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
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'pill' && stack.pillPick) {
    const pillRow = stack.pillPick
    const pillBook = stack.bookOf(pillRow)
    const status = pillRow.answer?.status || ''
    const isDid = status === 'yes' || status === 'late'
    const pillKey = `${stack.rowKey(pillRow)}:${status || 'open'}`
    const pillMeta =
      pillRow.dateIso && !mustSwipeDeadline(pillRow.lamp, pillRow.dateIso)
        ? t('tonight.deadlineOptional', { date: formatBoardDate(pillRow.lamp.dueBy) })
        : ''
    face = (
      <SwipeCardHost
        key={`pill:${pillKey}`}
        cardKey={pillKey}
        colors={colors}
        panelStyle={gemCard}
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
      >
        {pillMeta ? <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{pillMeta}</Text> : null}
      </SwipeCardHost>
    )
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
      noCount
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
        <NightMeter due={stack.due} we={stack.weTonight} colors={colors} hallOn={stack.nightDone} gemLook={premium ? look : ''} celebrate={Boolean(stack.cheer)} />
      </Slot>

      {showChips ? (
        <FadeScroll fade={colors.bg} style={styles.jewels} contentContainerStyle={styles.jewelsIn}>
          <Slot>{tagFilter}</Slot>
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
                tag={row.tag && tagsMixed ? row.tag : ''}
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
                label={card.question.replace(/^did we\s+/i, '').replace(/\?$/, '')}
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

      {showKey ? (
        <JewelKey colors={colors} onDone={() => setKeySeen(true)} />
      ) : null}

      {showChips ? null : <Slot>{tagFilter}</Slot>}

      {stack.cheer ? null : <DropLine colors={colors} />}
      {stack.cheer ? null : <RateCard colors={colors} nightDone={stack.nightDone} dateIso={stack.dateIso} />}

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

      <SwipeFlyHost style={styles.slot}>
        {stack.bodyKind === 'hall' && stack.nightDone ? (
          <Slot>
            <NightSky colors={colors} />
          </Slot>
        ) : null}
        <Slot>{face}</Slot>
        <Slot>
          <FamilyTonight colors={colors} />
        </Slot>
        <Slot>
          <WePausedRow cards={weCards} colors={colors} reload={we.reload} />
        </Slot>
        <Slot>
          <FriendsRow colors={colors} />
        </Slot>
      </SwipeFlyHost>
      {answerBar}
    </View>
    </View>
    </MastMenuRoot>
  )
}

const styles = StyleSheet.create({
  frame: { flex: 1, position: 'relative' },
  aboveHalo: { flex: 1, zIndex: 2, position: 'relative' },
  shell: { flex: 1, paddingHorizontal: 16, position: 'relative' },
  sitOn: {},
  titleHit: { alignSelf: 'flex-start', maxWidth: '100%' },
  graceLate: { marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  tomorrow: { marginTop: 16 },
  nudge: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  answerBar: { paddingBottom: 12 },
  answerRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  answerCell: { flex: 1 },
  swipeHint: { textAlign: 'center', marginTop: 10 },
  jewels: { flexGrow: 0, marginBottom: 12 },
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
})
