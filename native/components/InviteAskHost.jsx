import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { isNewAccount, onInviteJoined, readPendingInvite, takeInviteJoined } from '../../src/lib/invite-link.js'
import { readMine } from '../../src/lib/people.js'
import { confirmDone } from '../lib/confirm.js'
import { goHash } from '../navigation/hash.js'
import { InviteCodeSection } from './InviteCodeSection.jsx'
import { publishSheet, sheetIsUp } from './SheetHost.jsx'

// A new account is asked once, on Today, whether someone invited it: that is
// when the friend's code is at hand. An account made from an invite link
// never is; it is told whose invite it joined with instead.
const TODAY = new Set(['/', '/home', '/tonight'])

function askedKey(userId) {
  return `did-i-invite-asked:${userId}`
}

function markAsked(userId) {
  try {
    localStorage.setItem(askedKey(userId), '1')
  } catch {
    // Asked again next time is fine.
  }
}

function wasAsked(userId) {
  try {
    return Boolean(localStorage.getItem(askedKey(userId)))
  } catch {
    return true
  }
}

function showJoined(name, colors) {
  publishSheet({
    kicker: t('invite.cardTitle'),
    title: name ? t('invite.joinedTitle', { name }) : t('invite.joinedAny'),
    body: t('invite.joinedBody'),
    goLabel: t('invite.joinedGo'),
    closeLabel: t('invite.joinedOk'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      goHash('/people/connect')
    },
  })
}

function showAsk(colors, book, onChange) {
  publishSheet({
    title: t('invite.askTitle'),
    body: t('invite.askBody'),
    content: (
      <View>
        <InviteCodeSection
          colors={colors}
          book={book}
          onChange={onChange}
          hideBar
          label={t('invite.codeLabel')}
          onUsed={(words) => {
            publishSheet(null)
            confirmDone(words)
          }}
        />
      </View>
    ),
    closeLabel: t('invite.askSkip'),
    colors,
    onClose: () => publishSheet(null),
  })
}

export function InviteAskHost({ colors, book, onChange, path }) {
  const account = useAccount()
  const user = account.user
  const userId = user?.id || ''
  const [joinedTick, setJoinedTick] = useState(0)

  useEffect(() => onInviteJoined(() => setJoinedTick((n) => n + 1)), [])

  // Whose invite a link's code was used for, once, when nothing else is up.
  useEffect(() => {
    if (!userId || !TODAY.has(path) || sheetIsUp()) return undefined
    const timer = setTimeout(() => {
      if (sheetIsUp()) return
      const joined = takeInviteJoined()
      if (joined) {
        markAsked(userId)
        showJoined(joined.name, colors)
      }
    }, 900)
    return () => clearTimeout(timer)
  }, [userId, path, joinedTick])

  useEffect(() => {
    if (!userId || !TODAY.has(path) || !isNewAccount(user) || wasAsked(userId)) return undefined
    let alive = true
    // After the first sync has had its turn with a link's code.
    const timer = setTimeout(async () => {
      if (!alive || sheetIsUp() || readPendingInvite() || wasAsked(userId)) return
      const mine = await readMine().catch(() => null)
      if (!alive || !mine || sheetIsUp() || wasAsked(userId)) return
      markAsked(userId)
      if (mine.invited_by) return
      showAsk(colors, book, onChange)
    }, 2500)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [userId, path])

  return null
}
