import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../../src/lib/account.js'
import {
  befriendByLink,
  didYouAsk,
  claimPendingDidYous,
  dropPendingDidYou,
  isWeLinkCode,
  joinWeLink,
  lookUpDidYouLink,
  lookUpWeLink,
  onPendingDidYou,
  peekPendingDidYou,
  saveDidYouClaim,
  saveLinkFriend,
} from '../../src/lib/did-you-links.js'
import { t } from '../../src/lib/i18n.js'
import { refreshWeNights } from '../../src/lib/we-nights.js'
import { goHash } from '../navigation/hash.js'
import { showToast } from '../lib/toast-queue.js'
import { publishSheet } from './SheetHost.jsx'

const WE_MISS = { gone: 'didYouLink.bad', full: 'weLink.full', blocked: 'weLink.blocked', cap: 'weLink.cap' }

// A did-i.app/d/CODE link opened on this phone (or picked up on first
// launch). A Did you asks before it goes on tonight; a Did we (12 letter
// code) asks before joining. Both offer to add whoever made the link as a
// friend, and only do it on that tap. A Did you works signed out (the add
// and the friend wait for sign-in); a Did we waits for sign-in.
export function DidYouLinkHost({ colors, onKeep }) {
  const account = useAccount()
  const userId = account.user?.id || ''
  const [tick, setTick] = useState(0)
  const keep = useRef(onKeep)
  keep.current = onKeep

  useEffect(() => onPendingDidYou(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    if (userId) claimPendingDidYous().catch(() => {})
  }, [userId])

  useEffect(() => {
    const code = peekPendingDidYou()
    if (!code) return undefined
    const we = isWeLinkCode(code)
    if (we && !userId) {
      // Kept until they sign in.
      showToast({ id: 'did-you-link', text: t('weLink.signIn'), ms: 5200 })
      return undefined
    }
    let alive = true
    ;(we ? lookUpWeLink(code) : lookUpDidYouLink(code)).then((found) => {
      if (!alive) return
      if (found?.miss) {
        // Kept for the next open.
        showToast({ id: 'did-you-link', kind: 'error', text: t('didYouLink.reach'), ms: 5200 })
        return
      }
      dropPendingDidYou(code)
      const next = () => {
        publishSheet(null)
        setTick((n) => n + 1)
      }
      if (!found || found.full) {
        showToast({ id: 'did-you-link', kind: 'error', text: t(found?.full ? 'weLink.full' : 'didYouLink.bad'), ms: 5200 })
        setTick((n) => n + 1)
        return
      }

      if (we) {
        const name = found.name || t('weLink.someone')
        const join = async (addFriend) => {
          publishSheet(null)
          const out = await joinWeLink(code, addFriend)
          if (out.miss) {
            showToast({ id: 'did-you-link', kind: 'error', text: t(WE_MISS[out.miss] || 'didYouLink.reach'), ms: 5200 })
          } else {
            refreshWeNights()
            showToast({ id: 'did-you-link', text: t('weLink.joined'), ms: 3200 })
            goHash('/we', { id: out.card })
          }
          setTick((n) => n + 1)
        }
        publishSheet({
          kicker: t('we.title'),
          title: t('weLink.asked', { name }),
          quote: didYouAsk(found.question, t('people.sendWhat')),
          body: t('weLink.people', { n: found.people }),
          goLabel: found.name ? t('weLink.joinAdd', { name }) : t('weLink.joinPlain'),
          moreLabel: t('weLink.join'),
          closeLabel: t('didYouLink.no'),
          colors,
          onClose: next,
          onGo: () => join(Boolean(found.name)),
          ...(found.name ? { onMore: () => join(false) } : {}),
        })
        return
      }

      // A Did you. A link from Did I itself has no one to add.
      const name = found.name || 'Did I'
      const add = (addFriend) => {
        keep.current({ question: found.question, person: { display_name: name } })
        saveDidYouClaim(code)
        if (addFriend) {
          if (userId) befriendByLink(code).catch(() => {})
          else saveLinkFriend(code)
        }
        claimPendingDidYous().catch(() => {})
        showToast({ id: 'did-you-link', text: t(addFriend ? 'didYouLink.addedFriend' : 'didYouLink.added', { name }), ms: 3200 })
        next()
      }
      publishSheet({
        kicker: t('didYouLink.kicker'),
        title: t('didYouLink.asked', { name }),
        quote: didYouAsk(found.question, t('people.sendWhat')),
        goLabel: found.name ? t('didYouLink.addFriend', { name }) : t('didYouLink.add'),
        moreLabel: t('didYouLink.justKeep'),
        closeLabel: t('didYouLink.no'),
        colors,
        onClose: next,
        onGo: () => add(Boolean(found.name)),
        ...(found.name ? { onMore: () => add(false) } : {}),
      })
    })
    return () => {
      alive = false
    }
    // colors only styles the sheet.
  }, [tick, userId])

  return null
}
