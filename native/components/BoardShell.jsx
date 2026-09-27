import { useMemo } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { activeLook } from '../../src/lib/dit-board.js'
import { hallHour } from '../../src/lib/hall-feel.js'
import { useTheme } from '../../src/lib/prefs.js'
import { isGemLook, mergePurses, normalizePurse } from '../../src/lib/purse.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { useHeaderSpace } from '../hooks/useHeaderSpace.js'
import { hallColors } from '../theme.js'
import { gemFrameStyle } from '../lib/gem-look-tone.js'
import { HallHalo } from './HallHalo.jsx'
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
  const insets = useSafeAreaInsets()
  const { bottom: bottomPad } = useAppInsets()
  const headerSpace = useHeaderSpace()
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

  const inner = scroll ? (
    <KeyboardAvoidingView
      style={styles.scroll}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: headerSpace, paddingHorizontal: 16, flexGrow: 1 }}
        scrollIndicatorInsets={{ top: headerSpace - insets.top }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={{ flex: 1, paddingTop: headerSpace, paddingHorizontal: 16 }}>
      <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
    </View>
  )

  const frame = (
    <View pointerEvents="box-none" style={[styles.frame, { backgroundColor: colors.bg }, gemFrame]}>
      {halo ? <HallHalo look={coat} /> : null}
      <HallAmbient heat={heat} hour={feelHour} hallOn={feelSit === 'on'} accent={colors.on} />
      <View pointerEvents="box-none" style={[styles.aboveHalo, { backgroundColor: halo ? 'transparent' : colors.bg }]}>
        {inner}
        <AppHeader
          colors={colors}
          title={title || book?.title || 'Did I'}
          back={back ?? 'auto'}
          purse={showCogs ? purse : undefined}
          menu={showCogs}
        />
      </View>
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
})
