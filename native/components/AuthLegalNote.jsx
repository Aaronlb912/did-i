import { StyleSheet, Text } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

export function AuthLegalNote({ colors, leadKey = 'legal.signInLead' }) {
  return (
    <Text style={[styles.note, { color: colors.inkDim }]}>
      {t(leadKey)}{' '}
      <Text style={styles.link} onPress={() => goHash('/terms')}>
        {t('legal.termsShort')}
      </Text>
      {t('legal.linksAnd')}{' '}
      <Text style={styles.link} onPress={() => goHash('/privacy')}>
        {t('legal.privacyShort')}
      </Text>
      .
    </Text>
  )
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fonts.ui,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.7,
  },
  link: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
})
