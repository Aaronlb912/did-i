import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { markText } from '../../src/lib/achievements.js'
import { t } from '../../src/lib/i18n.js'
import { KeyButton } from './ui.jsx'
import { fonts } from '../theme.js'

export function MarkToast({ mark, onClose, colors }) {
  useEffect(() => {
    if (!mark) return undefined
    const timer = setTimeout(() => onClose?.(), 5200)
    return () => clearTimeout(timer)
  }, [mark, onClose])

  if (!mark) return null

  return (
    <View
      style={[styles.toast, { backgroundColor: colors.panel2, borderColor: colors.line }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.copy, { color: colors.ink }]} numberOfLines={2}>
        {t(markText(mark.id, 'name'))}
        {mark.id ? ` · ${t(markText(mark.id, 'line'))}` : ''}
      </Text>
      <KeyButton label={t('marks.ok')} colors={colors} onPress={onClose} />
    </View>
  )
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 999,
  },
  copy: { flex: 1, fontFamily: fonts.ui, fontSize: 13 },
})
