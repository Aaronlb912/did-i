import { Pressable, StyleSheet, Text } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { t } from '../../src/lib/i18n.js'
import { stampOpacity, swipePull } from '../../src/lib/swipe-face.js'
import { BuddyHang } from './Cosmetic.jsx'
import { MenuIcon } from './MenuIcon.jsx'
import { faceCardStyles } from '../lib/face-card.js'

/** What a Tonight card shows. The stamps follow the card's x as it moves. */
export function SwipeFace({ x, kicker, title, stampDid, stampNope, buddy, onEdit, colors, children }) {
  const didStyle = useAnimatedStyle(() => ({ opacity: stampOpacity(swipePull(x.value), 'did') }))
  const nopeStyle = useAnimatedStyle(() => ({ opacity: stampOpacity(swipePull(x.value), 'nope') }))
  const kickerStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(swipePull(x.value)) }))
  return (
    <>
      <BuddyHang id={buddy} alive />
      {onEdit ? <EditPen onPress={onEdit} colors={colors} beside={Boolean(buddy)} /> : null}
      <Animated.Text style={[faceCardStyles.stampDid, { color: colors.on }, didStyle]}>{stampDid}</Animated.Text>
      <Animated.Text style={[faceCardStyles.stampNope, { color: colors.skip }, nopeStyle]}>{stampNope}</Animated.Text>
      {kicker ? (
        <Animated.Text style={[faceCardStyles.kicker, { color: colors.on }, kickerStyle]}>{kicker}</Animated.Text>
      ) : null}
      <Text style={[faceCardStyles.title, { color: colors.ink }]}>{title}</Text>
      {children}
    </>
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
})
