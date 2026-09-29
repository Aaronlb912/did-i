import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

/** The sign-in mark and tagline, above the form. Long-press opens reviewer sign-in. */
export function AuthMark({ colors, onMarkLongPress }) {
  return (
    <View style={styles.mark}>
      <Pressable
        onLongPress={onMarkLongPress}
        disabled={!onMarkLongPress}
        accessibilityRole={onMarkLongPress ? 'button' : 'text'}
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
