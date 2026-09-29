import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { useSavableField } from '../../src/lib/useSavableField.js'
import { fonts } from '../theme.js'
import { KeyButton } from './ui.jsx'
import { SetField } from './SetBits.jsx'

export function SavableSetField({ colors, label, value, savedValue, onSave, onChangeText, ...rest }) {
  const { dirty, flash, save } = useSavableField({ value, saved: savedValue, onSave })

  return (
    <View style={styles.wrap}>
      <SetField
        colors={colors}
        label={label}
        value={value}
        onChangeText={onChangeText}
        onEndEditing={() => {
          save()
        }}
        onSubmitEditing={() => {
          save()
        }}
        returnKeyType="done"
        blurOnSubmit
        {...rest}
      />
      <View style={[styles.foot, { borderBottomColor: colors.lineSoft }]}>
        {dirty ? (
          <KeyButton colors={colors} label={t('settings.save')} onPress={() => save()} />
        ) : flash ? (
          <Text style={[styles.saved, { color: colors.on }]}>{t('settings.saved')}</Text>
        ) : (
          <Text style={[styles.hint, { color: colors.inkDim }]}>{t('settings.fieldHint')}</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  foot: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'right',
  },
  saved: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
})
