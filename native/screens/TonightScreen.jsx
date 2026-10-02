import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { useSync } from '../../src/lib/cloud-sync.js'
import { activeBuddy, activeLook } from '../../src/lib/active-look.js'
import { BuddyHang } from '../components/Cosmetic.jsx'
import { clockWords, tomorrowPreview, weekStripNights } from '../../src/lib/hall-pages.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { fireCheer, isGemLook, mergePurses } from '../../src/lib/purse.js'
import { useTheme } from '../../src/lib/prefs.js'
import { answerFor } from '../../src/lib/recurrence.js'
import { UNDO_MS, useTonightStack } from '../../src/lib/useTonightStack.js'
import { AppTextInput, DidButton, KeyButton } from '../components/ui.jsx'
import { dueByUrgency, mustSwipeDeadline, shelfTopics } from '../../src/lib/board-json.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { Jewel } from '../components/Jewel.jsx'
import { JewelKey, jewelKeyNight, jewelKeySeen } from '../components/JewelKey.jsx'
import { CELEBRATE_MS, CardSettle, NightWeek, StreakCount, tomorrowLine } from '../components/DoneCard.jsx'
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
import { WeSwipeCard, useWeAnswer, weOpenForMe } from '../components/WeTonight.jsx'
import { saveWeReminders, saveWeWidgetLine, takeWeFinishes, useWeTonight, weInFilter, weStats } from '../../src/lib/did-we.js'
import { shelfMarks, weMarksFor } from '../../src/lib/achievements.js'
import { armLampPings } from '../../src/lib/notify.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { syncTonightWidget } from '../widget-sync.js'

// Where the stack has no card of your own to swipe, so a Did we can have it.
const WE_SWIPE_OVER = new Set(['hall', 'finish', 'rest', 'off', 'waiting'])

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
  const [keySeen, setKeySeen] = useState(jewelKeySeen)
  const topics = shelfTopics(boards && boards.length ? boards : [book])
  const picks = topicPicks.filter((pick) => topics.includes(pick))
  const stack = useTonightStack({ value: book, boards, tagId, topics: picks, onTag, onChange, focusLampId, focusKey, now })
  const we = useWeTonight(account.user)
  const weAns = useWeAnswer(we.reload, book)
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
    if (!first) return
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
  const { bottom: bottomPad } = useAppInsets()
  const headerInset = useHeaderInset()
  const mastTitle = tagId && !tagId.includes(',') ? book.title : t('tonight.didI')
  const premium = isGemLook(look)
  const gemCard = gemPanelStyle(look, theme)
  const gemFrame = gemFrameStyle(look, theme)
  const staticCardStyle = [...faceCardStyle(colors, gemCard)]
  // Folders and topics are the first chip of the question row, not a row of their own.
  const showChips = stack.dueWithWait.length > 0 && !stack.holePick && !stack.waitPick
  // The dot legend waits for a later night, and never shows over the payoff.
  const keyNight = jewelKeyNight(stack.dateIso, stack.dueWithWait.some((row) => row.answer))
  const showKey = !keySeen && keyNight && showChips && !stack.hallOn
  // The done card's night summary: the week behind and the night ahead.
  const summary = useMemo(
    () =>
      stack.hallOn
        ? { week: weekStripNights(stack.shelf, stack.clock, tagId), tomorrow: tomorrowPreview(stack.shelf, stack.clock, tagId) }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stack.shelf, stack.dateIso, tagId, stack.hallOn],
  )
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
  useUndoToast('tonight', stack.undo, undoAnswer, UNDO_MS, t('tonight.undoTap'))
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
  let face = null
  if (weSwipe && weOpenForMe(weCards).length) {
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
        kicker={faceRow.tag || ''}
        title={faceRow.lamp.question}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        behind={stack.upNext.map((row) => ({
          key: cardKeyOf(row),
          kicker: row.tag || t('tonight.didI'),
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
  } else if (stack.bodyKind === 'hall') {
    face = (
      <CardSettle play={Boolean(stack.cheer)}>
        <GemFaceShell look={premium ? look : ''}
          theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
          <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.doneKicker')}</Text>
          <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.doneTitle')}</Text>
          {stack.streak > 0 ? (
            <StreakCount n={stack.streak} from={stack.cheer ? stack.cheer.from : null} colors={colors} />
          ) : null}
          {summary ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tonight.openCalendar')}
              onPress={() => goHash('/calendar')}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <NightWeek nights={summary.week} colors={colors} />
            </Pressable>
          ) : null}
          {summary ? (
            <Text style={[faceCardStyles.meta, styles.tomorrow, { color: colors.inkSoft }]}>{tomorrowLine(summary.tomorrow)}</Text>
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
        <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t('tonight.restHint')}</Text>
        <View style={styles.actions}>
          <DidButton label={t('tonight.finishKeep')} colors={colors} small onPress={stack.reopenStillOpen} />
        </View>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'waiting') {
    const next = stack.nextOpenTime(stack.waiting)
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.waitKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.waitTitle')}</Text>
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
    face = <WaitPlate row={stack.waitPick} colors={colors} onClose={() => stack.closePlates()} />
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
        kicker={pillRow.tag || ''}
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
    />
  )

  const titleSlot = stack.titleEdit ? (
    <AppTextInput
      colors={colors}
      value={stack.titleDraft}
      onChangeText={stack.setTitleDraft}
      onBlur={stack.saveTitle}
      onSubmitEditing={stack.saveTitle}
      returnKeyType="done"
      style={[styles.titleInput, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panel }]}
      accessibilityLabel={t('tonight.boardName')}
      autoFocus
    />
  ) : (
    <Pressable onPress={() => stack.setTitleEdit(true)} style={styles.titleHit}>
      <Text style={[headerTitleStyle, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
        {mastTitle}
      </Text>
    </Pressable>
  )

  return (
    <MastMenuRoot colors={colors} showAdd>
    <View pointerEvents="box-none" style={[styles.frame, { backgroundColor: colors.bg }, gemFrame]}>
      <AppHeader colors={colors} titleSlot={titleSlot} back={false} purse={purse} menu />
      <Slot>
        <HallAmbient heat={stack.heat} hour={stack.hour} hallOn={stack.hallOn} accent={colors.on} />
      </Slot>
      <View
        pointerEvents="box-none"
        style={[
          styles.shell,
          premium && styles.aboveHalo,
          { paddingTop: headerInset, paddingBottom: bottomPad, backgroundColor: premium ? 'transparent' : colors.bg },
          stack.hallOn && styles.sitOn,
        ]}
      >
      <Slot>
        <NightMeter due={stack.due} colors={colors} hallOn={stack.hallOn} gemLook={premium ? look : ''} celebrate={Boolean(stack.cheer)} />
      </Slot>

      {showChips ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jewels} contentContainerStyle={styles.jewelsIn}>
          <Slot>{tagFilter}</Slot>
          {stack.dueWithWait.map((row) => {
            const on = row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
            const skip = row.answer?.status === 'skip'
            const late = row.answer?.status === 'late'
            const isFace = stack.pillPick
              ? stack.rowKey(row) === stack.rowKey(stack.pillPick)
              : Boolean(stack.faceRow) && stack.rowKey(row) === stack.rowKey(stack.faceRow)
            const bookOf = stack.bookOf(row)
            const dueUrgency = !on && !skip ? dueByUrgency(row.lamp, stack.dateIso) : ''
            return (
              <Jewel
                key={stack.rowKey(row)}
                label={stack.shortLabel(row.lamp)}
                tag={row.tag && stack.shelf.length > 1 ? row.tag : ''}
                on={on}
                skip={skip}
                late={late}
                waiting={row.waiting}
                optional={row.optionalDeadline}
                dueToday={dueUrgency === 'today'}
                dueSoon={dueUrgency === 'soon'}
                face={isFace}
                sit={stack.hallOn && on}
                filament={on ? stack.filamentLevel(bookOf, row.lamp.id) : 0}
                colors={colors}
                onPress={() => stack.jewelClick(row)}
              />
            )
          })}
        </ScrollView>
      ) : null}

      {showKey ? (
        <JewelKey colors={colors} onDone={() => setKeySeen(true)} />
      ) : null}

      {showChips ? null : <Slot>{tagFilter}</Slot>}

      {stack.pillPick || stack.waitPick ? (
        <Pressable
          onPress={() => stack.closePlates()}
          hitSlop={10}
          accessibilityRole="button"
          style={[styles.back, { borderColor: colors.line, backgroundColor: colors.panel2 }]}
        >
          <Text style={[styles.backText, { color: colors.ink }]}>‹  {t('tonight.backToStack')}</Text>
        </Pressable>
      ) : null}

      <SwipeFlyHost style={styles.slot}>
        {stack.bodyKind === 'hall' ? (
          <Slot>
            <NightSky colors={colors} />
          </Slot>
        ) : null}
        <Slot>{face}</Slot>
        <Slot>
          <FamilyTonight colors={colors} />
        </Slot>
      </SwipeFlyHost>
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
  titleInput: {
    ...headerTitleStyle,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  tomorrow: { marginTop: 16 },
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
