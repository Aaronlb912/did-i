import { Linking, Platform } from 'react-native'
import { feedbackMailto, feedbackStateLines } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { t } from '../../src/lib/i18n.js'
import { copyText } from '../../src/lib/native.js'
import { sessionUser } from '../../src/lib/account.js'
import { readSync } from '../../src/lib/cloud-sync.js'
import { appVersionLines } from '../components/AppVersion.jsx'
import { confirmMiss } from './confirm.js'

// Each part is allowed to fail: a half-loaded app still sends the mail.
async function bodyLines(extra) {
  const lines = []
  try {
    lines.push(...appVersionLines())
  } catch {
    // The version lines are a nicety.
  }
  lines.push(`${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.constants?.Release ?? Platform.Version}`)
  try {
    lines.push(...feedbackStateLines(await sessionUser(), readSync()))
  } catch {
    // Same.
  }
  return [...lines, ...extra]
}

// Opens the mail with the app and OS version, the sign-in type and the last
// sync in the body, plus any extra lines (the crash screen adds what broke).
// Never throws. False when no mail app took it.
export async function openFeedbackMail(extra = []) {
  try {
    const url = feedbackMailto(await bodyLines(extra))
    if (!url) return false
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

// The feedback email. With no mail app, the address is copied and shown so
// the tap is never dead.
export async function sendFeedback() {
  const email = legalEmail()
  if (!email) return confirmMiss(t('confirm.miss'))
  if (await openFeedbackMail()) return
  const copied = await copyText(email)
  confirmMiss(`${t('feedback.noMail', { email })}${copied ? ` ${t('people.copied')}` : ''}`)
}
