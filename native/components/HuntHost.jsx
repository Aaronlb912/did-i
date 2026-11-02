import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { claimFree } from '../../src/lib/coin-shop.js'
import { clearPendingHunt, huntAsked, markHuntAsked, onPendingHunt, readPendingHunt } from '../../src/lib/hunt-link.js'
import { t } from '../../src/lib/i18n.js'
import { isNewAccount } from '../../src/lib/invite-link.js'
import { HUNT_BUDDY, normalizePurse } from '../../src/lib/purse.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { tourActive } from '../lib/tour.js'
import { BuddyArt } from './BuddyArt.jsx'
import { publishSheet, sheetIsUp, whenNoSheet } from './SheetHost.jsx'
import { KeyButton } from './ui.jsx'

// The Product Hunt buddy. A link (did-i.app/hunt/claim) claims it; a new
// account is also asked once where it found Did I, and only "Product Hunt"
// claims it. Same sheet either way.
const TODAY = new Set(['/', '/home', '/tonight'])
const CHOICES = ['hunt', 'store', 'friend', 'other']

function owned(book) {
  return normalizePurse(book).buddies.includes(HUNT_BUDDY)
}

export function HuntHost({ colors, book, onChange, path }) {
  const account = useAccount()
  const user = account.user
  const userId = user?.id || ''
  const [tick, setTick] = useState(0)
  const live = useRef({ book, onChange })
  live.current = { book, onChange }

  useEffect(() => onPendingHunt(() => setTick((n) => n + 1)), [])

  async function claim() {
    const { book: now, onChange: save } = live.current
    if (owned(now)) {
      confirmDone(t('hunt.had'))
      return
    }
    const out = await claimFree(now, 'buddy', HUNT_BUDDY)
    if (out.miss) {
      confirmMiss(t(out.miss))
      return
    }
    if (out.book) save(out.book)
    publishSheet({
      kicker: t('hunt.gotKicker'),
      title: t('hunt.gotTitle'),
      body: t('hunt.gotBody'),
      content: (
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <BuddyArt id={HUNT_BUDDY} width={96} height={116} />
        </View>
      ),
      closeLabel: t('hunt.gotOk'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  // A claim link, once the app is up and nothing else is being read.
  useEffect(() => {
    if (!readPendingHunt()) return undefined
    let alive = true
    const timer = setTimeout(async () => {
      if (!alive || !readPendingHunt()) return
      clearPendingHunt()
      await whenNoSheet()
      if (alive) claim().catch(() => confirmMiss(t('shop.miss.buyFail')))
    }, 900)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [tick, userId])

  // A new account is asked once. After the invite ask has had its turn.
  useEffect(() => {
    if (!userId || !TODAY.has(path) || !isNewAccount(user) || huntAsked(userId) || owned(live.current.book)) return undefined
    let alive = true
    const timer = setTimeout(async () => {
      if (!alive || huntAsked(userId) || readPendingHunt() || tourActive() || owned(live.current.book)) return
      await whenNoSheet()
      if (!alive || huntAsked(userId) || sheetIsUp()) return
      markHuntAsked(userId)
      publishSheet({
        title: t('hunt.askTitle'),
        body: t('hunt.askBody'),
        content: (
          <View style={{ gap: 8 }}>
            {CHOICES.map((id) => (
              <KeyButton
                key={id}
                colors={colors}
                label={t(`hunt.src.${id}`)}
                onPress={() => {
                  publishSheet(null)
                  if (id === 'hunt') setTimeout(claim, 400)
                }}
              />
            ))}
          </View>
        ),
        closeLabel: t('settings.close'),
        colors,
        onClose: () => publishSheet(null),
      })
    }, 5000)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [userId, path])

  return null
}
