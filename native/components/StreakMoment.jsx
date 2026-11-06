import { useEffect, useState } from 'react'
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { boardDate } from '../../src/lib/recurrence.js'
import { markStreakSeen, takePendingStreakMoment } from '../../src/lib/streak-moments.js'
import { gentleOn } from '../../src/lib/prefs.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { COME_BACK_DAYS, cameBack } from '../../src/lib/come-back.js'
import { isNewShelf } from '../../src/lib/first-run.js'
import { shelfStreak } from '../../src/lib/hall-feel.js'

// Back after a real gap, Today's welcome back sheet owns the return (it has the
// gentle mode offer). A second Welcome back card on top would stack.
function todayOwns(moment) {
  if (moment?.kind !== 'back') return false
  const boards = readShelf()?.boards || []
  return shelfStreak(boards, new Date()) === 0 && cameBack(boards, boardDate(new Date()), isNewShelf(boards) ? 2 : COME_BACK_DAYS)
}
import { t } from '../../src/lib/i18n.js'
import { streakHitCopy } from '../../src/lib/streak-copy.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { fonts } from '../theme.js'
import { DidButton } from './ui.jsx'

function copy(moment) {
  if (moment.kind === 'hit') {
    return {
      kicker: t('streak.hitKicker'),
      ...streakHitCopy(moment.n),
      yes: t('streak.hitOk'),
    }
  }
  if (moment.kind === 'back') {
    return {
      kicker: t('streak.backKicker'),
      title: t('streak.backTitle'),
      body: t('streak.backBody'),
      yes: t('streak.missOk'),
    }
  }
  return {
    kicker: t('streak.missKicker'),
    title: t('streak.missTitle'),
    body: t('streak.missBody', { was: moment.was || 0 }),
    yes: t('streak.missOk'),
  }
}

export function StreakMomentHost({ now }) {
  const colors = useHallColors()
  const [moment, setMoment] = useState(null)
  const clock = now || new Date()
  const dateIso = boardDate(clock)

  useEffect(() => {
    const pending = takePendingStreakMoment()
    // Gentle mode: no streak cards, so no count and no broken-streak note.
    if (pending && (gentleOn() || todayOwns(pending))) markStreakSeen(pending.kind, pending.dateIso || boardDate(new Date()))
    else if (pending) setMoment(pending)
  }, [])

  useEffect(() => {
    function onStreak(event) {
      const detail = event?.detail
      if (!detail?.kind) return
      // A night cleared with the app open is celebrated on Tonight's done
      // card; a second card on top of it would only crowd the moment.
      if (detail.kind === 'hit' || gentleOn() || todayOwns(detail)) {
        markStreakSeen(detail.kind, detail.dateIso || boardDate(new Date()))
        return
      }
      setMoment(detail)
    }
    globalThis.window?.addEventListener?.('did-i-streak', onStreak)
    return () => globalThis.window?.removeEventListener?.('did-i-streak', onStreak)
  }, [])

  useEffect(() => {
    if (moment) AccessibilityInfo.announceForAccessibility(copy(moment).title)
  }, [moment])

  if (!moment) return null
  const text = copy(moment)

  function close() {
    markStreakSeen(moment.kind, moment.dateIso || dateIso)
    setMoment(null)
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={close}>
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.kicker, { color: colors.on }]}>{text.kicker}</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{text.title}</Text>
          <Text style={[styles.body, { color: colors.inkSoft }]}>{text.body}</Text>
          <View style={styles.row}>
            <DidButton small label={text.yes} onPress={close} colors={colors} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 10 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', marginTop: 6 },
})
