import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../../src/lib/account.js'
import {
  claimPendingDidYous,
  dropPendingDidYou,
  lookUpDidYouLink,
  onPendingDidYou,
  peekPendingDidYou,
  saveDidYouClaim,
} from '../../src/lib/did-you-links.js'
import { t } from '../../src/lib/i18n.js'
import { showToast } from '../lib/toast-queue.js'
import { publishSheet } from './SheetHost.jsx'

// A did-i.app/d/CODE link opened on this phone (or picked up on first
// launch): asks before it goes on tonight. Works signed out; the add is
// counted on the link once the person is signed in.
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
    let alive = true
    lookUpDidYouLink(code).then((found) => {
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
      if (!found) {
        showToast({ id: 'did-you-link', kind: 'error', text: t('didYouLink.bad'), ms: 5200 })
        setTick((n) => n + 1)
        return
      }
      const name = found.name || 'Did I'
      publishSheet({
        kicker: t('didYouLink.kicker'),
        title: t('didYouLink.asked', { name }),
        quote: found.question,
        goLabel: t('didYouLink.add'),
        closeLabel: t('didYouLink.no'),
        colors,
        onClose: next,
        onGo: () => {
          keep.current({ question: found.question, person: { display_name: name } })
          saveDidYouClaim(code)
          claimPendingDidYous().catch(() => {})
          showToast({ id: 'did-you-link', text: t('didYouLink.added'), ms: 3200 })
          next()
        },
      })
    })
    return () => {
      alive = false
    }
    // colors only styles the sheet.
  }, [tick, userId])

  return null
}
