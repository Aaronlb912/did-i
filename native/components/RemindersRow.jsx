import { Pressable, Text } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

// A quiet line on Today while the phone's reminders are off. Tapping asks
// again, or opens the phone's settings once it has said no.
export function RemindersRow({ colors, label, onAsk }) {
  if (!onAsk || (label !== 'pings.state.ask' && label !== 'pings.state.blocked')) return null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('pings.rowOff')}, ${t('pings.turnOn')}`}
      onPress={onAsk}
      hitSlop={4}
      style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, marginBottom: 6, paddingHorizontal: 14, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: colors.inkSoft, textAlign: 'center' }}>
        {t('pings.rowOff')} · <Text style={{ fontFamily: fonts.uiSemi, color: colors.on }}>{t('pings.turnOn')}</Text>
      </Text>
      {label === 'pings.state.blocked' ? <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.inkSoft, textAlign: 'center' }}>{t('pings.rowBlocked')}</Text> : null}
    </Pressable>
  )
}
