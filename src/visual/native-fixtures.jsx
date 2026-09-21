import { View } from 'react-native'
import { t } from '../lib/i18n.js'
import { Jewel } from '../../native/components/Jewel.jsx'
import { HolePlate } from '../../native/components/HolePlate.jsx'
import { WaitPlate } from '../../native/components/WaitPlate.jsx'
import { SetCard, SetRow } from '../../native/components/SetBits.jsx'
import { faceCardStyle, faceCardStyles } from '../../native/lib/face-card.js'
import { hallColors } from '../../native/theme.js'
import { Text } from 'react-native'
import { FIXTURE_LAMP, FIXTURE_PERIOD, FIXTURE_WAIT_ROW } from './fixture-data.js'

const colors = hallColors('lime', 'dark')
const shell = { width: 390, padding: 16 }

export function NativeFixtures() {
  return (
    <View style={shell}>
      <View nativeID="native-jewel" style={{ marginBottom: 16, flexDirection: 'row', gap: 8 }}>
        <Jewel label="Door" on face filament={2} colors={colors} onPress={() => {}} />
        <Jewel label="Pills" hole colors={colors} onPress={() => {}} />
      </View>

      <View nativeID="native-face" style={{ marginBottom: 16 }}>
        <View style={faceCardStyle(colors)}>
          <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.didI')}</Text>
          <Text style={[faceCardStyles.title, { color: colors.ink }]}>{FIXTURE_LAMP.question}</Text>
        </View>
      </View>

      <View nativeID="native-hole" style={{ marginBottom: 16 }}>
        <HolePlate lamp={FIXTURE_LAMP} periodKey={FIXTURE_PERIOD} colors={colors} onLate={() => {}} onSkip={() => {}} />
      </View>

      <View nativeID="native-wait" style={{ marginBottom: 16 }}>
        <WaitPlate row={FIXTURE_WAIT_ROW} colors={colors} onClose={() => {}} />
      </View>

      <View nativeID="native-settings">
        <SetCard colors={colors}>
          <SetRow colors={colors} label={t('settings.theme')} value={t('theme.dark')} chevron />
          <SetRow colors={colors} label={t('settings.language')} value={t('lang.en')} chevron />
        </SetCard>
      </View>
    </View>
  )
}
