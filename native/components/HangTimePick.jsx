import { View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { ChipRow, Field } from './ui.jsx'

const PRESETS = ['08:00', '12:00', '17:00', '20:00', '21:00']

export function HangTimePick({ value, onChange, colors }) {
  const items = [
    { id: '', label: t('hang.askAny') },
    ...PRESETS.map((time) => ({ id: time, label: time })),
  ]
  const pick = PRESETS.includes(value) ? value : value ? '__custom' : ''

  return (
    <View style={{ gap: 8 }}>
      <ChipRow
        items={items}
        value={pick === '__custom' ? '' : pick}
        onPick={(id) => onChange(id)}
        colors={colors}
      />
      <Field
        colors={colors}
        label={t('hang.askAfter')}
        value={value || ''}
        onChangeText={onChange}
        placeholder="20:00"
      />
    </View>
  )
}
