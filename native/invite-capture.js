import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import * as Application from 'expo-application'
import * as Clipboard from 'expo-clipboard'
import { inviteFromText, savePendingInvite } from '../src/lib/invite-link.js'
import { savePendingScan, scanFromText } from '../src/lib/qr-links.js'

// First launch after an invite link (did-i.app/i/CODE). Android gets the code
// from the Play install referrer. iPhone has no referrer, so the link page
// copies the invite link. We first ask iOS whether the pasteboard holds a web
// link (modules/pasteboard-probe, which shows no prompt) and read it only
// then, so only people who just copied a link see the "Allow Paste" prompt.
// A didi://invite/CODE link still works too (native/deep-link.js). Existing
// installs never look.
export async function captureInviteOnFirstLaunch() {
  if (!globalThis.__didIFreshInstall) return
  globalThis.__didIFreshInstall = false
  try {
    if (Platform.OS === 'android') {
      const referrer = await Application.getInstallReferrerAsync()
      savePendingInvite(inviteFromText(referrer))
      savePendingScan(scanFromText(referrer))
      return
    }
    if (Platform.OS !== 'ios') return
    const probe = requireOptionalNativeModule('PasteboardProbe')
    if (!probe || !(await probe.hasWebUrlAsync())) return
    const text = await Clipboard.getStringAsync()
    if (/did-i\.app\/i\//i.test(text)) savePendingInvite(inviteFromText(text))
    // A friend or family QR page (did-i.app/f/ID, /j/CODE) copies its link the same way.
    savePendingScan(scanFromText(text))
  } catch {
    // No invite is fine.
  }
}
