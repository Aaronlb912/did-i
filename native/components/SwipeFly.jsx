import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { cardTilt, flyPath } from '../lib/swipe-motion.js'
import { faceCardStyle } from '../lib/face-card.js'
import { SwipeFace } from './SwipeFace.jsx'

const FlyContext = createContext(null)
const NO_STAMP = { stampDid: '', stampNope: '' }

export function useSwipeFly() {
  return useContext(FlyContext)
}

/**
 * The part of Tonight an answered card flies across. The card is handed up
 * here when it is let go, so it keeps flying while the stack below moves on,
 * even when it was the last card and the stack is gone.
 */
export function SwipeFlyHost({ style, children }) {
  // Cards measure themselves against this view: it holds both the stack and
  // the fly layer, which fills it, so the numbers carry over as they are.
  const host = useRef(null)
  const [flying, setFlying] = useState([])
  const add = useCallback((card) => setFlying((list) => [...list, card]), [])
  const gone = useCallback((id) => setFlying((list) => list.filter((card) => card.id !== id)), [])
  const fly = useMemo(() => ({ host: () => host.current, add }), [add])
  return (
    <FlyContext.Provider value={fly}>
      <View ref={host} style={style} pointerEvents="box-none" collapsable={false}>
        {children}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {flying.map((card) => (
            <FlyCard key={card.id} card={card} onGone={gone} />
          ))}
        </View>
      </View>
    </FlyContext.Provider>
  )
}

function FlyCard({ card, onGone }) {
  const { id, frame, from, way, reduce, winW, face, colors, panelStyle, glowStyle, line } = card
  const x = useSharedValue(from.x)
  const y = useSharedValue(from.y)
  const fade = useSharedValue(1)

  useEffect(() => {
    // The timer, not the animation callback, lets go of the card, so a
    // fallback without native animation never leaves one behind.
    if (reduce) {
      fade.value = withTiming(0, { duration: 160 })
      const timer = setTimeout(() => onGone(id), 240)
      return () => clearTimeout(timer)
    }
    const path = flyPath(from.x, from.y, from.vx, from.vy, way, winW)
    const easing = Easing.out(Easing.quad)
    y.value = withTiming(path.y, { duration: path.duration, easing })
    x.value = withTiming(path.x, { duration: path.duration, easing })
    const timer = setTimeout(() => onGone(id), path.duration + 80)
    return () => clearTimeout(timer)
  }, [])

  const moving = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${reduce ? 0 : cardTilt(x.value, winW, from.grab)}deg` },
    ],
  }))

  return (
    <Animated.View
      style={[styles.card, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }, glowStyle, moving]}
    >
      <View style={[...faceCardStyle(colors, panelStyle), styles.fill, { borderWidth: 1, borderColor: line }]}>
        {/* Under reduced motion the card fades where it is, with no Did or not yet stamp. */}
        <SwipeFace x={x} colors={colors} {...face} {...(reduce ? NO_STAMP : null)} />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // Same pivot as the face in the stack, so the handover does not jump.
  card: { position: 'absolute', transformOrigin: 'bottom' },
  fill: { flex: 1, minHeight: 0 },
})
