// Reanimated 4 calls into worklets + native code as soon as it is imported.
// If that throws, the store build aborts before any screen exists.

const { Text, View } = require('react-native')
const { loadPinned } = require('./pin-module.cjs')

function shared(initial) {
  return { value: initial }
}

function pass(value) {
  return value
}

function readNum(value) {
  if (value && typeof value === 'object' && 'value' in value) return value.value
  return value
}

function interpolate(value, inputRange, outputRange) {
  const v = readNum(value)
  if (!Array.isArray(inputRange) || !Array.isArray(outputRange) || inputRange.length < 2) {
    return outputRange?.[0] ?? v
  }
  let i = 0
  for (; i < inputRange.length - 1; i++) {
    if (v <= inputRange[i + 1]) break
  }
  const i0 = Math.max(0, Math.min(i, inputRange.length - 2))
  const inMin = inputRange[i0]
  const inMax = inputRange[i0 + 1]
  const outMin = outputRange[i0]
  const outMax = outputRange[i0 + 1] ?? outMin
  if (inMax === inMin) return outMin
  const t = (v - inMin) / (inMax - inMin)
  return outMin + t * (outMax - outMin)
}

function buildFallback() {
  const Animated = {
    View,
    Text,
    createAnimatedComponent(Component) {
      return Component
    },
  }

  const Easing = {
    linear: pass,
    ease: pass,
    quad: pass,
    cubic: pass,
    bezier() {
      return pass
    },
    in: pass,
    out: pass,
    inOut: pass,
  }

  return {
    __esModule: true,
    default: Animated,
    Animated,
    Easing,
    cancelAnimation() {},
    runOnJS(fn) {
      return (...args) => {
        if (typeof fn === 'function') fn(...args)
      }
    },
    useAnimatedReaction() {},
    useAnimatedStyle(fn) {
      try {
        return typeof fn === 'function' ? fn() : {}
      } catch {
        return {}
      }
    },
    useSharedValue: shared,
    useDerivedValue(fn) {
      try {
        return shared(typeof fn === 'function' ? fn() : undefined)
      } catch {
        return shared(undefined)
      }
    },
    withDelay(_delay, animation) {
      return animation
    },
    withRepeat(animation) {
      return animation
    },
    withSequence(...items) {
      return items[0]
    },
    withSpring: pass,
    withTiming: pass,
    interpolate,
    makeMutable: shared,
  }
}

function reanimatedOk(mod) {
  if (!mod || typeof mod !== 'object') return false
  if (typeof mod.useSharedValue === 'function') return true
  const def = mod.default
  return Boolean(def && (def.View || typeof def.createAnimatedComponent === 'function'))
}

module.exports = loadPinned(
  () => require('react-native-reanimated'),
  reanimatedOk,
  buildFallback,
  '__didIReanimatedError',
)
