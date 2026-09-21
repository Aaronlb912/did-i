import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { useSavableField } from '../../src/lib/useSavableField.js'
import { fonts } from '../theme.js'
import { Field, KeyButton } from './ui.jsx'

export function SavableField({ colors, label, value, savedValue, onSave, onChangeText, ...rest }) {
  const { dirty, flash, save } = useSavableField({ value, saved: savedValue, onSave })

  return (
    <View style={styles.wrap}>
      <Field
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
      <View style={styles.foot}>
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
    marginBottom: 4,
  },
  foot: {
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: -2,
    marginBottom: 6,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'right',
  },
  saved: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
})
