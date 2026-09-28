import { Platform } from 'react-native'
import * as Application from 'expo-application'
import { inviteFromText, savePendingInvite } from '../src/lib/invite-link.js'

// First launch after an invite link (did-i.app/i/CODE). Android gets the code
// from the Play install referrer. iPhone has no referrer and no referrer-style
// API, so it relies on the universal link opening the app directly
// (native/deep-link.js) instead of reading the clipboard, which used to make
// iOS show its "Allow Paste" prompt on every fresh install. Existing installs
// never look.
export async function captureInviteOnFirstLaunch() {
  if (!globalThis.__didIFreshInstall) return
  globalThis.__didIFreshInstall = false
  if (Platform.OS !== 'android') return
  try {
    const referrer = await Application.getInstallReferrerAsync()
    savePendingInvite(inviteFromText(referrer))
  } catch {
    // No invite is fine.
  }
}
