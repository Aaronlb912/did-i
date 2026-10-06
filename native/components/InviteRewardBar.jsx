import { StyleSheet, Text, View } from 'react-native'
import { inviteNextFriendGems, inviteRewardProgress } from '../../src/lib/invite-reward.js'
import { t } from '../../src/lib/i18n.js'
import { fonts, radius } from '../theme.js'

export function InviteRewardBar({ colors, gemsPaid = 0, joined = 0 }) {
  const prog = inviteRewardProgress(gemsPaid)
  const next = inviteNextFriendGems(joined, gemsPaid)
  const note = prog.full
    ? t('people.inviteGemFull', { max: prog.cap })
    : next > 0
      ? next === 1 ? t('people.inviteGemNextOne') : t('people.inviteGemNext', { gems: next })
      : t('people.inviteGemWait')

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: prog.cap, now: prog.paid }}
      accessibilityLabel={t('people.inviteGemAria', { paid: prog.paid, max: prog.cap })}
    >
      <View style={styles.top}>
        <Text style={[styles.count, { color: colors.on }]}>{prog.paid}</Text>
        <Text style={[styles.label, { color: colors.inkSoft }]}>{t('people.inviteGemOf', { max: prog.cap })}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.open }]}>
        <View style={[styles.fill, { backgroundColor: colors.on, width: `${prog.pct}%` }]} />
      </View>
      <Text style={[styles.note, { color: colors.inkSoft }]}>{note}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 12,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  count: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  note: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 18,
  },
})
