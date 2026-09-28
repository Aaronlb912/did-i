import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { markText } from '../../src/lib/achievements.js'
import { t } from '../../src/lib/i18n.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { KeyButton } from './ui.jsx'
import { fonts } from '../theme.js'

// A beat before a mark shows, so whatever just happened (an answer, the
// night's celebration) can claim the moment first.
const SETTLE_MS = 350

export function MarkToast({ mark: next, onClose, colors }) {
  const { overlayBottom: bottom } = useAppInsets()
  const [mark, setMark] = useState(null)

  useEffect(() => {
    setMark(null)
    if (!next) return undefined
    const timer = setTimeout(() => setMark(next), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [next])

  useEffect(() => {
    if (!mark) return undefined
    const timer = setTimeout(() => onClose?.(), 5200)
    return () => clearTimeout(timer)
  }, [mark, onClose])

  if (!mark) return null

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom }]}>
      <View style={[styles.toast, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
        <View style={styles.copy} accessibilityLiveRegion="polite">
          <Text style={[styles.kicker, { color: colors.on }]}>{t('marks.new')}</Text>
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {t(markText(mark.id, 'name'))}
          </Text>
          {mark.id ? (
            <Text style={[styles.line, { color: colors.inkSoft }]} numberOfLines={2}>
              {t(markText(mark.id, 'line'))}
            </Text>
          ) : null}
        </View>
        <KeyButton label={t('marks.ok')} colors={colors} onPress={onClose} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 90,
    elevation: 26,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 416,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
  },
  copy: { flex: 1, gap: 2 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '700' },
  line: { fontFamily: fonts.ui, fontSize: 13 },
})
