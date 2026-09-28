import { Text } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { stampOpacity, swipePull } from '../../src/lib/swipe-face.js'
import { BuddyHang } from './Cosmetic.jsx'
import { faceCardStyles } from '../lib/face-card.js'

/** What a Tonight card shows. The stamps follow the card's x as it moves. */
export function SwipeFace({ x, kicker, title, stampDid, stampNope, buddy, colors, children }) {
  const didStyle = useAnimatedStyle(() => ({ opacity: stampOpacity(swipePull(x.value), 'did') }))
  const nopeStyle = useAnimatedStyle(() => ({ opacity: stampOpacity(swipePull(x.value), 'nope') }))
  const kickerStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(swipePull(x.value)) }))
  return (
    <>
      <BuddyHang id={buddy} />
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
