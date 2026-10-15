import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { REVIEWER_HOLD_MS } from '../../src/lib/reviewer-flag.js'
import { fonts } from '../theme.js'

/**
 * The sign-in mark and tagline, above the form. While the reviewer switch is
 * on, a 3 second hold on the title opens reviewer sign-in (also a VoiceOver
 * action). Off, the title is plain text.
 */
export function AuthMark({ colors, onMarkLongPress }) {
  const on = Boolean(onMarkLongPress)
  return (
    <View style={styles.mark}>
      <Pressable
        onLongPress={onMarkLongPress}
        delayLongPress={REVIEWER_HOLD_MS}
        disabled={!on}
        accessibilityRole="text"
        accessibilityActions={on ? [{ name: 'reviewer', label: t('auth.reviewer') }] : undefined}
        onAccessibilityAction={on ? (event) => event.nativeEvent.actionName === 'reviewer' && onMarkLongPress() : undefined}
      >
        <Text style={[styles.mastTitle, { color: colors.ink }]}>{t('tonight.didI')}</Text>
      </Pressable>
      <Text style={[styles.tagline, { color: colors.inkSoft }]}>{t('auth.tagline')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  mark: {
    paddingTop: 8,
  },
  mastTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.ui,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
})
