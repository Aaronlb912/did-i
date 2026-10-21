import { Pressable, StyleSheet, Text } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { t } from '../../src/lib/i18n.js'
import { stampOpacity, swipePull } from '../../src/lib/swipe-face.js'
import { BuddyHang } from './Cosmetic.jsx'
import { MenuIcon } from './MenuIcon.jsx'
import { faceCardStyles } from '../lib/face-card.js'
import { pillStatusLabel } from '../../src/lib/pill-status.js'
import { fonts } from '../theme.js'

/** What a Tonight card shows. The stamps follow the card's x as it moves. */
export function SwipeFace({ x, head, kicker, title, stampDid, stampNope, buddy, onEdit, colors, children }) {
  const didStyle = useAnimatedStyle(() => ({ opacity: stampOpacity(swipePull(x.value), 'did') }))
  const nopeStyle = useAnimatedStyle(() => ({ opacity: stampOpacity(swipePull(x.value), 'nope') }))
  const kickerStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(swipePull(x.value)) }))
  return (
    <>
      <BuddyHang id={buddy} alive />
      {onEdit ? <EditPen onPress={onEdit} colors={colors} beside={Boolean(buddy)} /> : null}
      <Animated.Text style={[faceCardStyles.stampDid, { color: colors.on }, didStyle]}>{stampDid}</Animated.Text>
      <Animated.Text style={[faceCardStyles.stampNope, { color: colors.skip }, nopeStyle]}>{stampNope}</Animated.Text>
      {head}
      {kicker ? (
        <Animated.Text style={[faceCardStyles.kicker, { color: colors.on }, kickerStyle]}>{kicker}</Animated.Text>
      ) : null}
      <Text style={[faceCardStyles.title, { color: colors.ink }]}>{title}</Text>
      {children}
    </>
  )
}

// How a picked card is marked, as a stamp in its bottom-right corner, so it
// reads at a glance. status: 'yes', 'late' or 'skip'; nothing when open.
export function MarkStamp({ status, colors }) {
  if (status !== 'yes' && status !== 'late' && status !== 'skip') return null
  const did = status !== 'skip'
  const tint = did ? colors.on : colors.skip
  return (
    <Text
      accessibilityLabel={pillStatusLabel(status)}
      style={[styles.mark, { color: tint, borderColor: tint }]}
    >
      {t(did ? 'tonight.swipeDid' : 'tonight.swipeNope')}
    </Text>
  )
}

// The pen in a card's top-right corner that opens the question's edit screen.
// A buddy hangs from that corner, so the pen moves in beside it.
export function EditPen({ onPress, colors, beside = false }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('hang.edit')}
      style={({ pressed }) => [styles.pen, beside && styles.penBeside, { opacity: pressed ? 0.6 : 1 }]}
    >
      <MenuIcon name="pen" color={colors.inkDim} size={18} stroke />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // 18 + 2 * 13 padding = a 44pt target; the icon still sits 18 in from the corner.
  pen: { position: 'absolute', top: 5, right: 5, zIndex: 3, padding: 13 },
  penBeside: { right: 47 },
  mark: {
    alignSelf: 'flex-end',
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    transform: [{ rotate: '-8deg' }],
  },
})
