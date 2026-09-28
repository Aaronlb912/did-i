import { useMemo, useRef } from 'react'
import { Animated, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { activeLook } from '../../src/lib/active-look.js'
import { hallHour } from '../../src/lib/hall-feel.js'
import { useTheme } from '../../src/lib/prefs.js'
import { isGemLook, mergePurses, normalizePurse } from '../../src/lib/purse.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { useHeaderInset } from '../hooks/useHeaderSpace.js'
import { hallColors } from '../theme.js'
import { gemFrameStyle } from '../lib/gem-look-tone.js'
import { HallAmbient } from './HallAmbient.jsx'
import { AppHeader } from './AppHeader.jsx'
import { MastMenuRoot } from './MastMenu.jsx'

export function BoardShell({
  book,
  boards = [],
  now,
  title,
  look,
  back,
  sit,
  heat,
  hour,
  showCogs = true,
  showAdd = true,
  colors: colorsIn,
  children,
  scroll = true,
}) {
  const { bottom: bottomPad } = useAppInsets()
  const headerInset = useHeaderInset()
  const scrollY = useRef(new Animated.Value(0)).current
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  )
  const theme = useTheme()
  const clock = now || new Date()
  const coat = look || activeLook(book)
  const colors = colorsIn || hallColors(coat, theme)
  const shelf = boards.length ? boards : book ? [book] : []
  const purse = shelf.length ? mergePurses(shelf) : normalizePurse(book)
  const feelHour = hour ?? hallHour(clock)
  const feelSit = sit || 'ask'
  const halo = isGemLook(coat)
  const gemFrame = gemFrameStyle(coat, theme)
  const shellBg = useMemo(
    () => (halo ? { backgroundColor: 'transparent' } : { backgroundColor: colors.bg }),
    [colors.bg, halo],
  )

  const body = (
    <View style={[styles.page, { paddingBottom: bottomPad }]}>
      {children}
    </View>
  )

  // iOS lays the page out under the navigation bar and insets it itself, so the
  // bar can go from clear to material as the page scrolls under it.
  const inner = scroll ? (
    <KeyboardAvoidingView
      style={styles.scroll}
      behavior="padding"
      keyboardVerticalOffset={headerInset}
    >
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.content, styles.scroll, { paddingTop: headerInset }]}>
      <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
    </View>
  )

  const header = (
    <AppHeader
      colors={colors}
      title={title || book?.title || 'Did I'}
      back={back ?? 'auto'}
      purse={showCogs ? purse : undefined}
      menu={showCogs}
      scrollY={scrollY}
    />
  )

  // The scroll view comes first in the tree: that is the one iOS watches.
  const frame = (
    <View pointerEvents="box-none" style={[styles.frame, { backgroundColor: colors.bg }, gemFrame]}>
      <View pointerEvents="box-none" style={[styles.aboveHalo, { backgroundColor: halo ? 'transparent' : colors.bg }]}>
        {Platform.OS === 'ios' ? inner : null}
        {header}
        {Platform.OS === 'ios' ? null : inner}
      </View>
      <HallAmbient heat={heat} hour={feelHour} hallOn={feelSit === 'on'} accent={colors.on} />
    </View>
  )

  if (!showCogs) return frame

  return (
    <MastMenuRoot colors={colors} showAdd={showAdd}>
      {frame}
    </MastMenuRoot>
  )
}

const styles = StyleSheet.create({
  frame: { flex: 1, position: 'relative' },
  aboveHalo: { flex: 1, zIndex: 2, position: 'relative' },
  scroll: { flex: 1 },
  shell: { flex: 1, position: 'relative' },
  sitOn: {},
  page: { gap: 12 },
  content: { paddingHorizontal: 16, flexGrow: 1 },
})
