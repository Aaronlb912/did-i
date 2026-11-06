import { Linking, Platform } from 'react-native'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { t } from '../../src/lib/i18n.js'
import { copyText } from '../../src/lib/native.js'
import { appVersionLines } from '../components/AppVersion.jsx'
import { confirmMiss } from './confirm.js'

// The feedback email, with the app and OS version in the body. With no mail
// app, the address is copied and shown so the tap is never dead.
export async function sendFeedback() {
  const email = legalEmail()
  if (!email) return confirmMiss(t('confirm.miss'))
  const lines = [...appVersionLines(), `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.constants?.Release ?? Platform.Version}`]
  try {
    await Linking.openURL(feedbackMailto(lines))
  } catch {
    const copied = await copyText(email)
    confirmMiss(`${t('feedback.noMail', { email })}${copied ? ` ${t('people.copied')}` : ''}`)
  }
}
