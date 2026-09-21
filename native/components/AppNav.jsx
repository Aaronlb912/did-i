import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { showBottomNav } from '../../src/lib/app-nav.js'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { NAV_GAP, NAV_PAD, NAV_TAB_HEIGHT } from '../hooks/useAppInsets.js'
import { fonts } from '../theme.js'

const TABS = [
  { path: '/tonight', labelKey: 'nav.home', match: ['/', '/home', '/tonight', '/later'] },
  { path: '/lamps', labelKey: 'nav.questions', match: ['/lamps'] },
]

const SPRING = { damping: 20, stiffness: 280, mass: 0.8 }

function tabIndex(path) {
  const i = TABS.findIndex((tab) => tab.match.includes(path))
  return i < 0 ? -1 : i
}

export function AppNav({ path, colors }) {
  const insets = useSafeAreaInsets()
  const at = tabIndex(path)
  const [barWidth, setBarWidth] = useState(0)
  const [live, setLive] = useState(false)
  const slot = useSharedValue(at >= 0 ? at : 0)
  const showPip = useSharedValue(at >= 0 ? 1 : 0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLive(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    slot.value = withSpring(at >= 0 ? at : 0, SPRING)
    showPip.value = withSpring(at >= 0 ? 1 : 0, SPRING)
  }, [at, slot, showPip])

  const gap = 2
  const pad = NAV_PAD
  const tabW = barWidth > 0 ? (barWidth - pad * 2 - gap * (TABS.length - 1)) / TABS.length : 0

  const pipStyle = useAnimatedStyle(() => ({
    opacity: showPip.value,
    transform: [{ translateX: slot.value * (tabW + gap) }],
  }))

  if (!showBottomNav(path)) return null

  return (
    <View pointerEvents="box-none" style={[styles.navWrap, { paddingBottom: insets.bottom + NAV_GAP }]}>
      <View
        style={[styles.navBar, { backgroundColor: colors.panel2, borderColor: colors.line }]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {tabW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pip,
              live && styles.pipLive,
              { backgroundColor: colors.on, width: tabW, left: pad },
              pipStyle,
            ]}
          />
        ) : null}
        {TABS.map((tab, index) => {
          const on = index === at
          return (
            <Pressable key={tab.path} onPress={() => goHash(tab.path)} style={styles.tab}>
              <Text style={[styles.tabText, { color: on ? colors.bg : colors.inkSoft }]}>{t(tab.labelKey)}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 416,
    borderWidth: 1,
    borderRadius: 999,
    padding: NAV_PAD,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pip: {
    position: 'absolute',
    top: NAV_PAD,
    bottom: NAV_PAD,
    borderRadius: 999,
  },
  pipLive: {},
  tab: {
    flex: 1,
    minHeight: NAV_TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    zIndex: 1,
  },
  tabText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    fontWeight: '600',
  },
})
