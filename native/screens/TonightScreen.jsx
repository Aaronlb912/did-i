import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { activeBuddy, activeLook } from '../../src/lib/dit-board.js'
import { BuddyHang } from '../components/Cosmetic.jsx'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { mergePurses } from '../../src/lib/purse.js'
import { useTheme } from '../../src/lib/prefs.js'
import { useTonightStack } from '../../src/lib/useTonightStack.js'
import { DidButton, KeyButton } from '../components/ui.jsx'
import { Jewel } from '../components/Jewel.jsx'
import { NightMeter } from '../components/NightMeter.jsx'
import { StarterPicks } from '../components/StarterPicks.jsx'
import { SwipeCard } from '../components/SwipeCard.jsx'
import { TagFilter } from '../components/TagFilter.jsx'
import { FamilyTonight } from '../components/FamilyTonight.jsx'
import { WeekStrip } from '../components/WeekStrip.jsx'
import { goHash } from '../navigation/hash.js'
import { hallColors, fonts } from '../theme.js'

export function TonightScreen({ book, boards, tagId, onTag, onChange, focusLampId }) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const look = activeLook(book)
  const colors = hallColors(look, theme)
  const stack = useTonightStack({ value: book, boards, tagId, onTag, onChange, focusLampId })
  const purse = mergePurses(stack.shelf)

  let face = null
  if (stack.bodyKind === 'finish') {
    face = (
      <SwipeCard
        colors={colors}
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
    face = (
      <SwipeCard
        colors={colors}
        kicker={stack.faceRow.tag || t('tonight.didI')}
        title={stack.faceRow.lamp.question}
        stampDid={t('tonight.swipeDid')}
        stampNope={t('tonight.swipeNope')}
        onDid={() => stack.mark(stack.faceRow, 'yes')}
        onNope={() => stack.mark(stack.faceRow, 'skip')}
        buddy={activeBuddy(stack.bookOf(stack.faceRow))}
      />
    )
  } else if (stack.bodyKind === 'hall') {
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('tonight.doneKicker')}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>{t('tonight.doneTitle')}</Text>
      </View>
    )
  } else if (stack.bodyKind === 'rest') {
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('tonight.restKicker')}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {stack.finishCount === 1 ? t('tonight.restOne') : t('tonight.restTitle', { n: stack.finishCount })}
        </Text>
        <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('tonight.restHint')}</Text>
        <View style={styles.actions}>
          <DidButton label={t('tonight.finishKeep')} colors={colors} small onPress={stack.continueStack} />
        </View>
      </View>
    )
  } else if (stack.bodyKind === 'waiting') {
    const next = stack.nextOpenTime(stack.waiting)
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('tonight.waitKicker')}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>{t('tonight.waitTitle')}</Text>
        <Text style={[styles.meta, { color: colors.inkSoft }]}>
          {next
            ? t('tonight.waitOpens', {
                name: stack.shortLabel(next.lamp),
                time: clockWords(next.lamp.askAfter),
              })
            : t('tonight.waitLater')}
        </Text>
      </View>
    )
  } else if (stack.bodyKind === 'empty') {
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('tonight.emptyKicker')}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>{t('tonight.emptyTitle')}</Text>
        <StarterPicks book={book} onChange={onChange} colors={colors} />
        <DidButton label={t('tonight.write')} colors={colors} small onPress={() => goHash('/add')} />
      </View>
    )
  } else if (stack.bodyKind === 'hole' && stack.holePick) {
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>
          {stack.holeWasSkip ? t('hole.nopeKicker') : t('hole.kicker')}
        </Text>
        <Text style={[styles.title, { color: colors.ink }]}>{stack.holePick.lamp.question}</Text>
        <View style={styles.actions}>
          <DidButton
            label={t('hole.late')}
            colors={colors}
            small
            onPress={() =>
              stack.mark(
                { lamp: stack.holePick.lamp, periodKey: stack.holePick.periodKey, book: stack.bookOf(stack.holePick) },
                'late',
              )
            }
          />
          {!stack.holeWasSkip ? (
            <KeyButton
              label={t('tonight.swipeNope')}
              colors={colors}
              onPress={() =>
                stack.mark(
                  { lamp: stack.holePick.lamp, periodKey: stack.holePick.periodKey, book: stack.bookOf(stack.holePick) },
                  'skip',
                )
              }
            />
          ) : null}
        </View>
        <KeyButton label={t('hole.leave')} colors={colors} onPress={() => stack.closePlates()} />
      </View>
    )
  } else if (stack.bodyKind === 'wait' && stack.waitPick) {
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('wait.kicker')}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>{stack.waitPick.lamp.question}</Text>
        <KeyButton label={t('wait.sit')} colors={colors} onPress={() => stack.closePlates()} />
      </View>
    )
  } else if (stack.bodyKind === 'pill' && stack.pillPick) {
    const status = stack.pillPick.answer?.status || ''
    const isDid = status === 'yes' || status === 'late'
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>
          {status === 'skip' ? t('pill.nope') : status === 'late' ? t('pill.late') : status === 'yes' ? t('pill.done') : t('pill.open')}
        </Text>
        <Text style={[styles.title, { color: colors.ink }]}>{stack.pillPick.lamp.question}</Text>
        <View style={styles.actions}>
          <DidButton label={t('tonight.swipeDid')} colors={colors} small disabled={isDid} onPress={() => stack.mark(stack.pillPick, 'yes')} />
          <KeyButton label={t('tonight.swipeNope')} colors={colors} disabled={status === 'skip'} onPress={() => stack.mark(stack.pillPick, 'skip')} />
        </View>
        <View style={styles.actions}>
          <KeyButton label={t('pill.edit')} colors={colors} onPress={() => goHash('/lamp', { id: stack.pillPick.lamp.id })} />
          <KeyButton label={t('settings.neverMind')} colors={colors} onPress={() => stack.closePlates()} />
        </View>
      </View>
    )
  } else if (stack.bodyKind === 'off') {
    face = (
      <View style={[styles.staticCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('tonight.offKicker')}</Text>
        <Text style={[styles.title, { color: colors.ink }]}>{t('tonight.offTitle')}</Text>
        <View style={styles.actions}>
          <DidButton label={t('home.add')} colors={colors} small onPress={() => goHash('/add')} />
          <KeyButton label={t('tonight.seeAll')} colors={colors} onPress={() => goHash('/lamps')} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.shell, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.mast}>
        <View style={styles.mastRow}>
          <Text style={[styles.mastTitle, { color: colors.ink }]}>{tagId ? book.title : t('tonight.didI')}</Text>
          <Pressable onPress={() => goHash('/shop')} style={[styles.cog, { borderColor: colors.line }]}>
            <Text style={{ color: colors.inkSoft }}>◎</Text>
          </Pressable>
        </View>
        <Text style={[styles.mastDate, { color: colors.inkDim }]}>{stack.formatBoardDate(stack.dateIso)}</Text>
        <Pressable onPress={() => goHash('/shop')}>
          <Text style={[styles.purse, { color: colors.inkSoft }]}>
            {purse.coins} · {purse.gems}
          </Text>
        </Pressable>
      </View>

      <TagFilter boards={stack.shelf} tagId={tagId} onTag={onTag} now={stack.clock} colors={colors} />
      <FamilyTonight colors={colors} />
      <NightMeter due={stack.due} colors={colors} />

      {stack.dueWithWait.length > 0 && !stack.holePick && !stack.waitPick ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jewels} contentContainerStyle={styles.jewelsIn}>
          {stack.dueWithWait.map((row) => {
            const on = row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
            const skip = row.answer?.status === 'skip'
            const late = row.answer?.status === 'late'
            const isFace = stack.pillPick
              ? stack.rowKey(row) === stack.rowKey(stack.pillPick)
              : Boolean(stack.faceRow) && row.lamp.id === stack.faceRow?.lamp.id
            return (
              <Jewel
                key={stack.rowKey(row)}
                label={stack.shortLabel(row.lamp)}
                tag={row.tag && stack.shelf.length > 1 ? row.tag : ''}
                on={on}
                skip={skip}
                late={late}
                waiting={row.waiting}
                face={isFace}
                colors={colors}
                onPress={() => stack.jewelClick(row)}
              />
            )
          })}
        </ScrollView>
      ) : null}

      <View style={styles.slot}>{face}</View>

      {stack.undo ? (
        <View style={styles.undoRow}>
          <Text style={[styles.undo, { color: colors.inkSoft }]}>{stack.undo.label}</Text>
          <KeyButton label={t('tonight.undo')} colors={colors} onPress={stack.applyUndo} />
        </View>
      ) : null}

      <WeekStrip boards={stack.shelf} tagId={tagId} now={stack.clock} colors={colors} />

      {activeBuddy(book) && stack.bodyKind !== 'face' && stack.bodyKind !== 'finish' ? (
        <View style={styles.buddyFoot}>
          <BuddyHang id={activeBuddy(book)} inline />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, paddingHorizontal: 16 },
  mast: { marginBottom: 10, gap: 2 },
  mastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mastTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', flex: 1 },
  cog: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  mastDate: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  purse: { fontFamily: fonts.mono, fontSize: 11, marginTop: 4 },
  jewels: { maxHeight: 52, marginBottom: 10 },
  jewelsIn: { gap: 8, paddingRight: 8 },
  slot: { flex: 1, justifyContent: 'center', paddingBottom: 24 },
  staticCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 168,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  meta: { fontFamily: fonts.ui, fontSize: 14, marginTop: 10, lineHeight: 20 },
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  undo: { fontFamily: fonts.ui, fontSize: 13 },
  buddyFoot: { alignItems: 'center', marginBottom: 8, minHeight: 52 },
})
