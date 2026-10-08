// The visual page renders static fixtures on react-native-web, where the real
// Reanimated cannot load. Animated styles resolve once to their initial value.
import { View } from 'react-native'

export const Easing = {
  out: (fn) => fn,
  in: (fn) => fn,
  inOut: (fn) => fn,
  bezier: () => (v) => v,
  cubic: (v) => v,
  quad: (v) => v,
  ease: (v) => v,
}
export const useSharedValue = (value) => ({ value })
export const useAnimatedStyle = (fn) => fn()
export const withSequence = (...steps) => steps[steps.length - 1]
export const withSpring = (value) => value
export const withTiming = (value) => value
export const withDelay = (_ms, value) => value
export const withRepeat = (value) => value
export const runOnJS = (fn) => fn
export const cancelAnimation = () => {}

// Layout animations (entering / exiting / layout props) chain like FadeInDown.duration(200).
const chain = new Proxy({}, { get: () => () => chain })
export const FadeIn = chain
export const FadeInDown = chain
export const FadeOut = chain
export const LinearTransition = chain

export default { View }
