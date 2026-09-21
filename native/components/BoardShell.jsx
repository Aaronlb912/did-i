import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { activeLook } from '../../src/lib/dit-board.js'
import { hallHour } from '../../src/lib/hall-feel.js'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { isGemLook, mergePurses, normalizePurse } from '../../src/lib/purse.js'
import { canGoBack, goBack, onRoute } from '../navigation/hash.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { hallColors, fonts } from '../theme.js'
import { gemFrameStyle } from '../lib/gem-look-tone.js'
import { HallHalo } from './HallHalo.jsx'
import { MastMenuCog, MastMenuRoot } from './MastMenu.jsx'
import { PurseLine } from './PurseLine.jsx'

export function BoardShell({
  book,
  boards = [],
  now,
  title,
  date,
  look,
  back,
  sit,
  heat,
  hour,
  showCogs = true,
  showAdd = false,
  colors: colorsIn,
  children,
  scroll = true,
}) {
  const insets = useSafeAreaInsets()
  const { bottom: bottomPad } = useAppInsets()
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
  const [showBack, setShowBack] = useState(() => back !== false && canGoBack())

  useEffect(() => {
    if (back === false) {
      setShowBack(false)
      return undefined
    }
    const sync = () => setShowBack(back === true || canGoBack())
    sync()
    return onRoute(sync)
  }, [back])

  const shellBg = useMemo(
    () => (halo ? { backgroundColor: 'transparent' } : { backgroundColor: colors.bg }),
    [colors.bg, halo],
  )

  const mast = (
    <View style={styles.mast}>
      <View style={styles.mastTop}>
        {showBack ? (
          <Pressable onPress={() => goBack()} style={styles.back} accessibilityLabel={t('nav.back')}>
            <Text style={[styles.backText, { color: colors.ink }]}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backPad} />
        )}
        <View style={styles.mastCopy}>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
            {title || book?.title || 'Did I'}
          </Text>
          {date ? <Text style={[styles.date, { color: colors.inkDim }]}>{date}</Text> : null}
        </View>
        {showCogs ? (
          <View style={styles.actions}>
            <PurseLine purse={purse} colors={colors} gemsLink mast />
            <MastMenuCog />
          </View>
        ) : null}
      </View>
    </View>
  )

  const body = (
    <View style={[styles.page, { paddingBottom: bottomPad }]}>
      {mast}
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
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
      <View style={[styles.shell, shellBg, feelSit === 'on' && styles.sitOn]}>{body}</View>
    </View>
  )

  const frame = (
    <View pointerEvents="box-none" style={[styles.frame, { backgroundColor: colors.bg }, gemFrame]}>
      {halo ? <HallHalo look={coat} /> : null}
      <View pointerEvents="box-none" style={[styles.aboveHalo, { backgroundColor: colors.bg }]}>
        {inner}
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
  mast: { marginBottom: 4 },
  mastTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  backPad: { width: 32 },
  backText: { fontFamily: fonts.ui, fontSize: 28, lineHeight: 30 },
  mastCopy: { flex: 1, gap: 2, minWidth: 0 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  date: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  actions: { alignItems: 'flex-end', gap: 6, zIndex: 21 },
})
