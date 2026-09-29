// The visual page renders static fixtures on react-native-web, where the real
// Reanimated cannot load. Animated styles resolve once to their initial value.
import { View } from 'react-native'

export const Easing = { out: (fn) => fn, cubic: (v) => v, quad: (v) => v, ease: (v) => v }
export const useSharedValue = (value) => ({ value })
export const useAnimatedStyle = (fn) => fn()
export const withSequence = (...steps) => steps[steps.length - 1]
export const withSpring = (value) => value
export const withTiming = (value) => value

export default { View }
