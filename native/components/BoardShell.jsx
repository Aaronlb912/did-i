import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsFocused } from '@react-navigation/native'
import { Animated, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { activeLook } from '../../src/lib/active-look.js'
import { hallHour } from '../../src/lib/hall-feel.js'
import { useTheme } from '../../src/lib/prefs.js'
import { isGemLook, mergePurses, normalizePurse } from '../../src/lib/purse.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { useHeaderInset } from '../hooks/useHeaderSpace.js'
import { hallColors } from '../theme.js'
import { HallAmbient } from './HallAmbient.jsx'
import { AppHeader, HeaderLargeTitle } from './AppHeader.jsx'
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
  showPurse = false,
  showAdd = true,
  colors: colorsIn,
  children,
  scroll = true,
}) {
  const { bottom: bottomPad } = useAppInsets()
  const headerInset = useHeaderInset()
  const scrollY = useRef(new Animated.Value(0)).current
  // KeyboardAvoidingView repositions the page, but a form shorter than the
  // full screen has no content to scroll past the keyboard on its own. This
  // adds scroll room for whatever part of the scroll view the keyboard still
  // covers once KeyboardAvoidingView has done its share.
  const scrollRef = useRef(null)
  const [keyboardTop, setKeyboardTop] = useState(null)
  const [scrollBottom, setScrollBottom] = useState(null)
  const focused = useIsFocused()
  useEffect(() => {
    if (!scroll || !focused) {
      setKeyboardTop(null)
      return undefined
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const onShow = (event) => setKeyboardTop(event?.endCoordinates?.screenY ?? null)
    const onHide = () => setKeyboardTop(null)
    const subs = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)]
    return () => subs.forEach((sub) => sub.remove())
  }, [scroll, focused])
  const onScrollLayout = useCallback(() => {
    scrollRef.current?.measureInWindow?.((x, y, width, height) => setScrollBottom(y + height))
  }, [])
  const keyboardPad =
    scroll && keyboardTop != null && scrollBottom != null ? Math.max(0, Math.round(scrollBottom - keyboardTop)) : 0
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
  const barTitle = title || book?.title || 'Did I'
  const feelHour = hour ?? hallHour(clock)
  const feelSit = sit || 'ask'
  const halo = isGemLook(coat)
  const pageBg = useMemo(() => ({ backgroundColor: colors.bg }), [colors.bg])
  const shellBg = useMemo(
    () => (halo ? { backgroundColor: 'transparent' } : { backgroundColor: colors.bg }),
    [colors.bg, halo],
  )

  const body = (
    <View style={[styles.page, { paddingBottom: bottomPad + keyboardPad }]}>
      {children}
    </View>
  )

  // Gem looks show the hall's mood through the page. It is a flat wash, so it
  // can ride inside the scroll view and reach past both ends of the page.
  const ambient = halo ? (
    <View pointerEvents="none" style={scroll ? styles.ambientScroll : StyleSheet.absoluteFill}>
      <HallAmbient heat={heat} hour={feelHour} hallOn={feelSit === 'on'} accent={colors.on} />
    </View>
  ) : null

  // iOS lays the page out under the navigation bar and insets it itself, so the
  // bar can go from clear to material, and the large title can shrink into it.
  // That also means the page's frame already starts at the top of the screen,
  // so the avoiding view needs no header offset; one would pad the header twice.
  const inner = scroll ? (
    <KeyboardAvoidingView style={styles.scroll} behavior="padding">
      <Animated.ScrollView
        ref={scrollRef}
        onLayout={onScrollLayout}
        style={[styles.scroll, pageBg]}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {ambient}
        <HeaderLargeTitle colors={colors} title={barTitle} />
        <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.content, styles.scroll, pageBg, { paddingTop: headerInset }]}>
      {ambient}
      <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
    </View>
  )

  const header = (
    <AppHeader
      colors={colors}
      title={barTitle}
      back={back ?? 'auto'}
      purse={showCogs && showPurse ? purse : undefined}
      menu={showCogs}
      large={scroll}
      scrollY={scrollY}
    />
  )

  // UIKit only finds the scroll view it tracks a few views down a chain of
  // first subviews. So on iOS the scroll view leads, and this wrapper paints
  // nothing and sets no zIndex, which lets Fabric flatten it away.
  const frame = (
    <View style={styles.frame}>
      {Platform.OS === 'ios' ? inner : header}
      {Platform.OS === 'ios' ? header : inner}
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
  frame: { flex: 1 },
  ambientScroll: { position: 'absolute', top: -2000, bottom: -2000, left: 0, right: 0 },
  scroll: { flex: 1 },
  shell: { flex: 1, position: 'relative' },
  sitOn: {},
  page: { gap: 12 },
  content: { paddingHorizontal: 16, flexGrow: 1 },
})
