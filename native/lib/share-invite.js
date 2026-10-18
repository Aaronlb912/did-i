import { t } from '../../src/lib/i18n.js'
import { inviteLink } from '../../src/lib/invite-link.js'
import { copyText, passAlong } from '../../src/lib/native.js'
import { myInvite } from '../../src/lib/people.js'

// The invite as a message. The link does the work: it carries the code into
// the app on install, so nobody has to type it.
export function inviteMessage(code) {
  return t('people.inviteLine', { code, link: inviteLink(code) })
}

// One tap from anywhere: fetch your code if it is not at hand and open the
// share sheet. 'shared', 'copied', or '' when it could not.
export async function shareInvite(code) {
  const mine = code || (await myInvite().catch(() => ''))
  if (!mine) return ''
  return (await passAlong(inviteMessage(mine), t('people.invite'))) || ''
}

export async function copyInviteLink(code) {
  if (!code) return false
  return copyText(inviteLink(code))
}
