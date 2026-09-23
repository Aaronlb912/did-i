import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAccount } from '../../src/lib/account.js'
import { useSync } from '../../src/lib/cloud-sync.js'
import { activeBuddy, activeLook } from '../../src/lib/dit-board.js'
import { BuddyHang } from '../components/Cosmetic.jsx'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { isGemLook, mergePurses } from '../../src/lib/purse.js'
import { useTheme } from '../../src/lib/prefs.js'
import { answerFor } from '../../src/lib/recurrence.js'
import { useTonightStack } from '../../src/lib/useTonightStack.js'
import { UndoToast } from '../components/UndoToast.jsx'
import { DidButton, KeyButton } from '../components/ui.jsx'
import { dueByUrgency, mustSwipeDeadline } from '../../src/lib/board-json.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { Jewel } from '../components/Jewel.jsx'
import { HallHalo } from '../components/HallHalo.jsx'
import { HolePlate } from '../components/HolePlate.jsx'
import { MastMenuCog, MastMenuRoot } from '../components/MastMenu.jsx'
import { NightMeter } from '../components/NightMeter.jsx'
import { NightStrip } from '../components/NightStrip.jsx'
import { WaitPlate } from '../components/WaitPlate.jsx'
import { PurseLine } from '../components/PurseLine.jsx'
import { StarterPicks } from '../components/StarterPicks.jsx'
import { SwipeCardHost } from '../components/SwipeCardHost.jsx'
import { TagFilter } from '../components/TagFilter.jsx'
import { FamilyTonight } from '../components/FamilyTonight.jsx'
import { goHash } from '../navigation/hash.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { gemFrameStyle, gemGlowHostStyle, gemPanelStyle } from '../lib/gem-look-tone.js'
import { hallColors, fonts } from '../theme.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { HallAmbient } from '../components/HallAmbient.jsx'
import { Slot } from '../components/Slot.jsx'

function useMinuteNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval
    const wait = 60000 - (Date.now() % 60000)
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60000)
    }, wait)
    return () => {
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
      <BuddyHang id={buddy} />
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

export function TonightScreen({ book, boards, tagId, onTag, onChange, focusLampId }) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const look = activeLook(book)
  const colors = hallColors(look, theme)
  const account = useAccount()
  const sync = useSync()
  const now = useMinuteNow()
  const stack = useTonightStack({ value: book, boards, tagId, onTag, onChange, focusLampId, now })
  const purse = mergePurses(stack.shelf)
  const { bottom: bottomPad } = useAppInsets()
  const mastTitle = tagId ? book.title : t('tonight.didI')
  const premium = isGemLook(look)
  const gemCard = gemPanelStyle(look, theme)
  const gemFrame = gemFrameStyle(look, theme)
  const staticCardStyle = [...faceCardStyle(colors, gemCard)]
  let face = null
  if (stack.bodyKind === 'finish') {
    face = (
      <SwipeCardHost
        key="finish"
        cardKey="finish"
        colors={colors}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        kicker={t('tonight.finishKicker')}
        title={
          stack.finishCount === 1
            ? t('tonight.finishOne')
            : t('tonight.finishTitle', { n: stack.finishCount })
        }
        stampDid={t('tonight.finishKeep')}
        stampNope={t('tonight.finishLeave')}
        onDid={stack.continueStack}
        onNope={stack.restStack}
        buddy={activeBuddy(book)}
      />
    )
  } else if (stack.bodyKind === 'face' && stack.faceRow) {
    const faceRow = stack.faceRow
    const faceBook = stack.bookOf(faceRow)
    const stripKeys = stack.recentPeriodKeys(faceRow.lamp, stack.dateIso, 7)
    const hasHistory = stripKeys.some((key) => answerFor(faceBook, faceRow.lamp.id, key))
    const faceKey = `${stack.rowKey(faceRow)}:${faceRow.periodKey}:${faceRow.answer?.status || 'open'}`
    face = (
      <SwipeCardHost
        key={`face:${faceKey}`}
        cardKey={faceKey}
        colors={colors}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        kicker={faceRow.tag || t('tonight.didI')}
        title={faceRow.lamp.question}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        onDid={() => stack.mark(faceRow, 'yes')}
        onNope={() => stack.mark(faceRow, 'skip')}
        buddy={activeBuddy(faceBook)}
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
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.doneKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.doneTitle')}</Text>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'rest') {
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(book)}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.restKicker')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>
          {stack.finishCount === 1 ? t('tonight.restOne') : t('tonight.restTitle', { n: stack.finishCount })}
        </Text>
        <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{t('tonight.restHint')}</Text>
        <View style={styles.actions}>
          <DidButton label={t('tonight.finishKeep')} colors={colors} small onPress={stack.continueStack} />
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
    const status = pillRow.answer?.status || ''
    face = (
      <GemFaceShell look={premium ? look : ''}
        theme={theme} style={staticCardStyle} buddy={activeBuddy(stack.bookOf(pillRow))}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{pillRow.tag || t('tonight.didI')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{pillRow.lamp.question}</Text>
        <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>{pillStatusLabel(status)}</Text>
      </GemFaceShell>
    )
  } else if (stack.bodyKind === 'pill' && stack.pillPick) {
    const pillRow = stack.pillPick
    const status = pillRow.answer?.status || ''
    const isDid = status === 'yes' || status === 'late'
    const pillKey = `${stack.rowKey(pillRow)}:${status || 'open'}`
    face = (
      <SwipeCardHost
        key={`pill:${pillKey}`}
        cardKey={pillKey}
        colors={colors}
        panelStyle={gemCard}
        gemLook={premium ? look : ''}
        kicker={pillRow.tag || t('tonight.didI')}
        title={pillRow.lamp.question}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        blockDid={isDid}
        blockNope={status === 'skip' || isDid}
        onDid={() => stack.mark(pillRow, 'yes')}
        onNope={() => stack.mark(pillRow, 'skip')}
        buddy={activeBuddy(stack.bookOf(pillRow))}
      >
        {pillRow.dateIso && !mustSwipeDeadline(pillRow.lamp, pillRow.dateIso) ? (
          <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>
            {t('tonight.deadlineOptional', { date: formatBoardDate(pillRow.lamp.dueBy) })}
          </Text>
        ) : null}
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
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.didI')}</Text>
        <Text style={[faceCardStyles.title, { color: colors.ink }]}>{t('tonight.waitTitle')}</Text>
      </GemFaceShell>
    )
  }

  return (
    <MastMenuRoot colors={colors} showAdd>
    <View pointerEvents="box-none" style={[styles.frame, { backgroundColor: colors.bg }, gemFrame]}>
      {premium ? (
        <Slot>
          <HallHalo look={look} />
        </Slot>
      ) : null}
      <Slot>
        <HallAmbient heat={stack.heat} hour={stack.hour} hallOn={stack.hallOn} accent={colors.on} />
      </Slot>
      <View
        pointerEvents="box-none"
        style={[
          styles.shell,
          premium && styles.aboveHalo,
          { paddingTop: insets.top, paddingBottom: bottomPad, backgroundColor: premium ? 'transparent' : colors.bg },
          stack.hallOn && styles.sitOn,
        ]}
      >
      <View style={styles.mast} collapsable={false}>
        <View style={styles.mastMain}>
          {stack.titleEdit ? (
            <TextInput
              value={stack.titleDraft}
              onChangeText={stack.setTitleDraft}
              onBlur={stack.saveTitle}
              onSubmitEditing={stack.saveTitle}
              style={[styles.titleInput, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panel2 }]}
              accessibilityLabel={t('tonight.boardName')}
              autoFocus
            />
          ) : (
            <Pressable onPress={() => stack.setTitleEdit(true)} style={styles.titleHit}>
              <Text style={[styles.mastTitle, { color: colors.ink }]} numberOfLines={1}>
                {mastTitle}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.mastActions}>
          <Slot>
            <PurseLine purse={purse} colors={colors} gemsLink mast />
          </Slot>
          <Slot>
            <MastMenuCog />
          </Slot>
        </View>
      </View>

      {account.user && sync.how === 'miss' ? (
        <Text style={[styles.syncNote, { color: colors.inkSoft }]}>{t('tonight.syncMiss')}</Text>
      ) : null}

      <Slot>
        <NightMeter due={stack.due} colors={colors} hallOn={stack.hallOn} gemLook={premium ? look : ''} />
      </Slot>

      {stack.dueWithWait.length > 0 && !stack.holePick && !stack.waitPick ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jewels} contentContainerStyle={styles.jewelsIn}>
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

      <Slot>
        <TagFilter boards={stack.shelf} tagId={tagId} onTag={onTag} now={stack.clock} colors={colors} />
      </Slot>

      {stack.catchUp.length > 0 && !stack.holePick && !stack.waitPick ? (
        <View style={styles.holes} accessibilityLabel={t('tonight.holesAria')}>
          <Text style={[styles.holesLabel, { color: colors.inkSoft }]}>{t('tonight.lastNight')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jewelsIn}>
            {stack.catchUp.map((row) => (
              <Jewel
                key={stack.rowKey(row)}
                label={stack.shortLabel(row.lamp)}
                hole
                colors={colors}
                onPress={() => stack.pickHole(row.lamp, row.periodKey, row)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.slot} pointerEvents="box-none">
        <Slot>{face}</Slot>
        <Slot>
          <UndoToast undo={stack.undo} onUndo={stack.applyUndo} colors={colors} />
        </Slot>
      </View>

      <Slot>
        <FamilyTonight colors={colors} />
      </Slot>

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
  mast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    minHeight: 36,
    zIndex: 20,
  },
  mastMain: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minWidth: 0, gap: 2 },
  mastActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, zIndex: 21 },
  titleHit: { maxWidth: '46%' },
  titleInput: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 120,
    maxWidth: '46%',
  },
  mastTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  syncNote: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  jewels: { maxHeight: 52, marginBottom: 10 },
  holes: { marginBottom: 10, gap: 6 },
  holesLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  jewelsIn: { gap: 8, paddingRight: 8 },
  slot: { flex: 1, justifyContent: 'center', minHeight: 120, position: 'relative', overflow: 'visible' },
})
