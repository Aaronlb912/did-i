import { Platform } from 'react-native'
import * as Application from 'expo-application'
import * as Clipboard from 'expo-clipboard'
import { inviteFromText, savePendingInvite } from '../src/lib/invite-link.js'

// First launch after an invite link (did-i.app/i/CODE). Android gets the code
// from the Play install referrer. iPhone has no referrer, so the link page
// copies "Did I invite CODE" and we read the clipboard once; iOS shows its
// paste prompt for that one read. Existing installs never look.
export async function captureInviteOnFirstLaunch() {
  if (!globalThis.__didIFreshInstall) return
  globalThis.__didIFreshInstall = false
  try {
    if (Platform.OS === 'android') {
      const referrer = await Application.getInstallReferrerAsync()
      savePendingInvite(inviteFromText(referrer))
      return
    }
    if (Platform.OS === 'ios' && (await Clipboard.hasStringAsync())) {
      savePendingInvite(inviteFromText(await Clipboard.getStringAsync()))
    }
  } catch {
    // No invite is fine.
  }
}
