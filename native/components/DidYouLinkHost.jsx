import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../../src/lib/account.js'
import {
  befriendByLink,
  deadDidYouLinkKey,
  didYouAsk,
  claimPendingDidYous,
  dropPendingDidYou,
  isWeLinkCode,
  joinWeLink,
  linkMakerIsFriend,
  lookUpDidYouLink,
  lookUpWeLink,
  onPendingDidYou,
  peekPendingDidYou,
  reportDidYouLink,
  saveDidYouClaim,
  saveLinkFriend,
} from '../../src/lib/did-you-links.js'
import { t } from '../../src/lib/i18n.js'
import { readMine } from '../../src/lib/people.js'
import { refreshWeNights } from '../../src/lib/we-nights.js'
import { goHash } from '../navigation/hash.js'
import { showToast } from '../lib/toast-queue.js'
import { nameFirst } from './NameFirstSheet.jsx'
import { publishSheet, sheetIsUp, whenNoSheet } from './SheetHost.jsx'

// Shown once each: what happens after the first Did you kept from a link,
// and after the first Did we joined from one.
function firstTime(key) {
  try {
    if (localStorage.getItem(key)) return false
    localStorage.setItem(key, '1')
    return true
  } catch {
    return false
  }
}

function guide(kind, name, colors) {
  publishSheet({
    kicker: t(kind === 'we' ? 'we.title' : 'didYouLink.kicker'),
    title: t(`${kind}Guide.title`),
    body: t(`${kind}Guide.body`, { name }),
    goLabel: t('linkGuide.ok'),
    noClose: true,
    colors,
    onClose: () => publishSheet(null),
    onGo: () => publishSheet(null),
  })
}

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
  // The Did we code we last asked to sign in for, so a new one is asked too.
  const askedSignIn = useRef('')
  keep.current = onKeep

  useEffect(() => onPendingDidYou(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    if (userId) claimPendingDidYous().catch(() => {})
  }, [userId])

  useEffect(() => {
    // Until the session is read, signed in looks like signed out.
    if (!account.ready) return undefined
    // A Did we link waits for sign-in; a Did you link behind it still opens.
    const code = peekPendingDidYou(userId ? null : isWeLinkCode)
    if (!code) return undefined
    // Another sheet is open (an earlier link, the tour, a buy): wait for it, never replace it.
    if (sheetIsUp()) {
      let waiting = true
      whenNoSheet().then(() => {
        if (waiting) setTick((n) => n + 1)
      })
      return () => {
        waiting = false
      }
    }
    const we = isWeLinkCode(code)
    if (we && !userId) {
      // Kept until they sign in. Asked once; Not now only closes the sheet, the link still runs after sign-in.
      if (askedSignIn.current === code) return undefined
      askedSignIn.current = code
      publishSheet({
        title: t('people.outTitle'),
        body: t('weLink.signIn'),
        goLabel: t('we.signIn'),
        closeLabel: t('account.stay'),
        colors,
        onClose: () => publishSheet(null),
        onGo: () => {
          publishSheet(null)
          goHash('/account')
        },
      })
      return undefined
    }
    let alive = true
    Promise.all([we ? lookUpWeLink(code) : lookUpDidYouLink(code), linkMakerIsFriend(code).catch(() => false)]).then(([raw, friends]) => {
      if (!alive) return
      // Already friends: nothing to add, so the name is only for the title.
      const found = raw && !raw.miss && friends ? { ...raw, friends: true } : raw
      if (found?.miss === 'off') {
        // No cloud on this build: asking again next open will not help.
        dropPendingDidYou(code)
        return
      }
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
      if (!found && !we) {
        // Stopped by whoever made it, or never right.
        deadDidYouLinkKey(code).then((key) => showToast({ id: 'did-you-link', kind: 'error', text: t(key), ms: 5200 }))
        setTick((n) => n + 1)
        return
      }
      if (!found || found.full) {
        showToast({ id: 'did-you-link', kind: 'error', text: t(found?.full ? 'weLink.full' : 'didYouLink.bad'), ms: 5200 })
        setTick((n) => n + 1)
        return
      }

      // Report sits under both sheets. Asks first: a report also blocks
      // whoever made the link.
      const reportFoot = (name) => ({
        footLabel: t('didYouLink.report'),
        onFoot: () => {
          if (!userId) {
            showToast({ id: 'did-you-link', text: t('didYouLink.reportSignIn'), ms: 5200 })
            return
          }
          publishSheet({
            title: t('didYouLink.reportTitle'),
            body: t('didYouLink.reportBody', { name }),
            quote: didYouAsk(found.question, t('people.sendWhat')),
            goLabel: t('gift.reportGo'),
            danger: true,
            colors,
            onClose: next,
            onGo: async () => {
              publishSheet(null)
              const out = await reportDidYouLink(code)
              const miss = out.miss === 'signIn' ? 'didYouLink.reportSignIn' : out.miss
              showToast({ id: 'did-you-link', kind: miss ? 'error' : undefined, text: t(miss || 'we.reported'), ms: 4200 })
              setTick((n) => n + 1)
            },
          })
        },
      })

      if (we) {
        const name = found.name || t('weLink.someone')
        const join = async (wantsFriend) => {
          publishSheet(null)
          // No name: ask for one, or join without the friend request.
          const addFriend = wantsFriend && (await nameFirst(colors))
          const out = await joinWeLink(code, addFriend)
          if (out.miss) {
            showToast({ id: 'did-you-link', kind: 'error', text: t(WE_MISS[out.miss] || 'didYouLink.reach'), ms: 5200 })
          } else {
            refreshWeNights()
            // Straight to tonight, where the Did we now waits, every tag showing.
            goHash('/tonight', { tag: 'all' })
            if (firstTime('did-i-guide-we')) guide('we', name, colors)
            else showToast({ id: 'did-you-link', text: t('weLink.joined'), ms: 3200 })
          }
          setTick((n) => n + 1)
        }
        publishSheet({
          kicker: t('we.title'),
          title: t('weLink.asked', { name }),
          quote: didYouAsk(found.question, t('people.sendWhat')),
          body: t('weLink.people', { n: found.people }),
          goLabel: found.name && !found.friends ? t('weLink.joinAdd', { name }) : t('weLink.joinPlain'),
          moreLabel: t('weLink.join'),
          closeLabel: t('didYouLink.no'),
          colors,
          onClose: next,
          onGo: () => join(Boolean(found.name) && !found.friends),
          ...(found.name && !found.friends ? { onMore: () => join(false) } : {}),
          ...(found.name ? reportFoot(name) : {}),
        })
        return
      }

      // A Did you. A link from Did I itself has no one to add.
      const name = found.name || 'Did I'
      const add = async (wantsFriend) => {
        // Signed in with no name: ask for one, or keep it without the request.
        // Signed out, the request waits for sign-in and is retried until it goes.
        const addFriend = wantsFriend && (!userId || (await nameFirst(colors)))
        const ids = keep.current({ question: found.question, person: { display_name: name } }) || []
        saveDidYouClaim(code)
        if (addFriend) {
          if (userId) {
            // A failed ask waits with the signed-out ones and is tried again.
            befriendByLink(code)
              .then((out) => {
                if (out.miss) saveLinkFriend(code)
              })
              .catch(() => saveLinkFriend(code))
          } else saveLinkFriend(code)
        }
        claimPendingDidYous().catch(() => {})
        next()
        // Open tonight on the new question, every tag showing, so it is the
        // first thing they see.
        goHash('/tonight', { tag: 'all', ...(ids[0] ? { face: ids[0] } : {}) })
        if (firstTime('did-i-guide-link')) guide('link', name, colors)
        else showToast({ id: 'did-you-link', text: t(addFriend ? 'didYouLink.askedFriend' : 'didYouLink.added', { name }), ms: 3200 })
        // With no name, the sender only sees "someone". Ask once, after the guide.
        if (userId && found.name) {
          readMine()
            .then((mine) => {
              if (mine?.display_name?.trim()) return
              setTimeout(() => {
                publishSheet({
                  title: t('didYouLink.nameTitle', { name }),
                  body: t('didYouLink.nameBody', { name }),
                  goLabel: t('didYouLink.nameGo'),
                  closeLabel: t('settings.neverMind'),
                  colors,
                  onClose: () => publishSheet(null),
                  onGo: () => {
                    publishSheet(null)
                    goHash('/people')
                  },
                })
              }, 1200)
            })
            .catch(() => {})
        }
      }
      publishSheet({
        kicker: t('didYouLink.kicker'),
        title: t('didYouLink.asked', { name }),
        quote: didYouAsk(found.question, t('people.sendWhat')),
        goLabel: found.name && !found.friends ? t('didYouLink.addFriend', { name }) : t('didYouLink.add'),
        moreLabel: t('didYouLink.justKeep'),
        closeLabel: t('didYouLink.no'),
        colors,
        onClose: next,
        onGo: () => add(Boolean(found.name) && !found.friends),
        ...(found.name && !found.friends ? { onMore: () => add(false) } : {}),
        ...reportFoot(name),
      })
    })
    return () => {
      alive = false
    }
    // colors only styles the sheet.
  }, [tick, userId, account.ready])

  return null
}
