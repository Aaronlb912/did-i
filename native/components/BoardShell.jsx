import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsFocused, useRoute } from '@react-navigation/native'
import { Animated, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native'
import { activeLook } from '../../src/lib/active-look.js'
import { hallHour } from '../../src/lib/hall-feel.js'
import { isGemLook, mergePurses, normalizePurse } from '../../src/lib/purse.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { lifts, onFieldMoved } from '../lib/keyboard-follow.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { useHeaderInset } from '../hooks/useHeaderSpace.js'
import { useLookColors } from '../hooks/useHallColors.js'
import { HallAmbient } from './HallAmbient.jsx'
import { AppHeader, HeaderLargeTitle, LARGE_TITLE } from './AppHeader.jsx'
import { MastMenuRoot } from './MastMenu.jsx'
import { TileWindow, tileScrolled } from './frames/FramePreview.jsx'
// Room under the last row so it never sits against the home indicator or nav bar.
const END_ROOM = 24

export function BoardShell({
  book,
  boards = [],
  now,
  title,
  look,
  back,
  leftAction,
  rightAction,
  sit,
  heat,
  hour,
  showCogs = true,
  showPurse = false,
  showAdd = true,
  colors: colorsIn,
  children,
  scroll = true,
  // Add forms: no page title at all; the card says what it is.
  noTitle = false,
  // Optional ref that gets the page's scroll view, for a form that scrolls a field into view.
  scrollHandle,
  // Optional Animated.Value to share the scroll offset with bars pinned over the page.
  scrollY: scrollYIn,
  // Optional bar pinned under the page (first run: Continue stays in view).
  footer = null,
}) {
  const { bottom: bottomPad } = useAppInsets()
  const headerInset = useHeaderInset()
  const ownScrollY = useRef(new Animated.Value(0)).current
  const scrollY = scrollYIn || ownScrollY
  // KeyboardAvoidingView repositions the page, but a form shorter than the
  // full screen has no content to scroll past the keyboard on its own. This
  // adds scroll room for whatever part of the scroll view the keyboard still
  // covers once KeyboardAvoidingView has done its share.
  const scrollRef = useRef(null)
  const [keyboardTop, setKeyboardTop] = useState(null)
  const [scrollBottom, setScrollBottom] = useState(null)
  const focused = useIsFocused()
  // Opened again from the menu while still open further back: start at the
  // top, so a tap meant for the top of the page never lands on an old row.
  const menuAt = useRoute()?.params?.menuAt
  useEffect(() => {
    if (!menuAt) return
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
    scrollY.setValue(0)
  }, [menuAt, scrollY])
  useEffect(() => {
    if (!scroll || !focused) {
      setKeyboardTop(null)
      return undefined
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const onShow = (event) => setKeyboardTop(event?.endCoordinates?.screenY ?? null)
    const onHide = () => setKeyboardTop(null)
    const subs = [
      Keyboard.addListener(showEvent, onShow),
      Keyboard.addListener(hideEvent, onHide),
      // Once the keyboard is up (and the page has made room), and whenever a
      // box gains focus or grows, scroll the box being typed in above it.
      Keyboard.addListener('keyboardDidShow', () => followField.current()),
    ]
    const offField = onFieldMoved(() => followField.current())
    return () => {
      subs.forEach((sub) => sub.remove())
      offField()
      clearTimeout(followTimer.current)
    }
  }, [scroll, focused])
  // Scrolls just far enough that the focused box ends above the keyboard. A
  // box on another screen, in a sheet or one its screen lifts itself fails the
  // measureLayout against this page and is left alone. A box taller than the
  // room left shows its foot, where the typing is.
  const reduce = useReduceMotion()
  const followTimer = useRef(null)
  const followField = useRef(() => {})
  followField.current = () => {
    clearTimeout(followTimer.current)
    // After the room for the keyboard lays out.
    followTimer.current = setTimeout(() => {
      const scroller = scrollRef.current
      const inner = scroller?.getInnerViewRef?.()
      const field = TextInput.State?.currentlyFocusedInput?.()
      const keyTop = Keyboard.metrics?.()?.screenY
      if (!Keyboard.isVisible?.() || !keyTop || !inner || !field?.measureLayout || lifts(field)) return
      field.measureLayout(
        inner,
        (_x, top) => {
          field.measureInWindow((_fx, winTop, _fw, winH) => {
            scroller.measureInWindow?.((_sx, viewTop) => {
              const need = winTop + winH + 16 - keyTop
              if (need <= 0) return
              const now = top - (winTop - viewTop)
              scroller.scrollTo({ y: Math.max(0, now + need), animated: !reduce })
            })
          })
        },
        () => {},
      )
    }, 80)
  }
  // When the page gets shorter (Select ends, rows go), the scroll view clamps
  // its offset without an onScroll event, so the small bar title could stay up
  // over the big one. Clamp our copy of the offset the same way.
  const lastY = useRef(0)
  const viewH = useRef(0)
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      lastY.current = value
      tileScrolled()
    })
    return () => scrollY.removeListener(id)
  }, [scrollY])
  const onContentSize = useCallback(
    (w, h) => {
      const most = Math.max(0, h - viewH.current)
      if (viewH.current && lastY.current > most) scrollY.setValue(most)
    },
    [scrollY],
  )
  const onScrollLayout = useCallback((event) => {
    viewH.current = event?.nativeEvent?.layout?.height || viewH.current
    scrollRef.current?.measureInWindow?.((x, y, width, height) => setScrollBottom(y + height))
    // The page shrinks for the keyboard after it shows: follow the box again.
    if (Keyboard.isVisible?.()) followField.current()
  }, [])
  const keyboardPad =
    scroll && keyboardTop != null && scrollBottom != null ? Math.max(0, Math.round(scrollBottom - keyboardTop)) : 0
  const [largeHeight, setLargeHeight] = useState(LARGE_TITLE)
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  )
  const clock = now || new Date()
  const coat = look || activeLook(book)
  const own = useLookColors(coat)
  const colors = colorsIn || own
  const shelf = boards.length ? boards : book ? [book] : []
  const purse = shelf.length ? mergePurses(shelf) : normalizePurse(book)
  const barTitle = noTitle ? '' : title || book?.title || 'Did I'
  const feelHour = hour ?? hallHour(clock)
  const feelSit = sit || 'ask'
  const halo = isGemLook(coat)
  // Android draws its own bar above the page, so a gem look's wash has to sit
  // behind both or the bar shows as a dark strip over the colour.
  const washUnderBar = halo && Platform.OS === 'android'
  const pageBg = useMemo(
    () => ({ backgroundColor: washUnderBar ? 'transparent' : colors.bg }),
    [colors.bg, washUnderBar],
  )
  const shellBg = useMemo(
    () => (halo ? { backgroundColor: 'transparent' } : { backgroundColor: colors.bg }),
    [colors.bg, halo],
  )

  const body = (
    <View style={[styles.page, { paddingBottom: (footer ? 0 : bottomPad) + (scroll ? END_ROOM : 0) + keyboardPad }]}>
      <TileWindow.Provider value={Boolean(scroll)}>{children}</TileWindow.Provider>
    </View>
  )

  // Gem looks show the hall's mood through the page. It is a flat wash, so it
  // can ride inside the scroll view and reach past both ends of the page.
  const ambient = halo && !washUnderBar ? (
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
        ref={(node) => {
          scrollRef.current = node
          if (scrollHandle) scrollHandle.current = node
        }}
        onLayout={onScrollLayout}
        onContentSizeChange={onContentSize}
        style={[styles.scroll, pageBg]}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {ambient}
        {noTitle ? null : <HeaderLargeTitle colors={colors} title={barTitle} onHeight={setLargeHeight} />}
        <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
      </Animated.ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bg, borderTopColor: colors.lineSoft, paddingBottom: keyboardTop != null ? 12 : Math.max(bottomPad, 12) },
          ]}
        >
          {footer}
        </View>
      ) : null}
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
      leftAction={leftAction}
      rightAction={rightAction}
      purse={showCogs && showPurse ? purse : undefined}
      menu={showCogs}
      large={scroll && !noTitle}
      largeHeight={largeHeight}
      scrollY={scrollY}
      clear={washUnderBar}
    />
  )

  // UIKit only finds the scroll view it tracks a few views down a chain of
  // first subviews. So on iOS the scroll view leads, and this wrapper paints
  // nothing and sets no zIndex, which lets Fabric flatten it away.
  const frame = (
    <View style={[styles.frame, washUnderBar && { backgroundColor: colors.bg }]}>
      {washUnderBar ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <HallAmbient heat={heat} hour={feelHour} hallOn={feelSit === 'on'} accent={colors.on} />
        </View>
      ) : null}
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
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
})
