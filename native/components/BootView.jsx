import { useEffect, useRef } from 'react'
import { Animated, Easing, Image, View } from 'react-native'
import { useTheme } from '../../src/lib/prefs.js'
import { hallColors } from '../palette.js'
import { motionOff } from '../lib/motion.jsx'

const ICON = require('../../public/icon-512.png')

// Shown only while fonts and the first frame are not ready. Home replaces it
// on the same render that readiness flips, so it never adds a wait.
export function BootView() {
  const theme = useTheme()
  const colors = hallColors('lime', theme === 'light' ? 'light' : 'dark')
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (motionOff()) return undefined
    const ease = Easing.inOut(Easing.quad)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 700, easing: ease, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: ease, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: pulse }}>
        <Image source={ICON} style={{ width: 96, height: 96, borderRadius: 22 }} accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  )
}
