import { useCallback, useEffect, useState } from 'react'
import { INVITE_CODE_LEN, claimInvites, cleanInvite, inviteOwner, invitePayoutNote, readMine, useInvite } from './people.js'
import { applyInvitePayout } from './purse.js'
import { t, tMiss } from './i18n.js'

export function useReferralCode({ book, onChange, start = '' }) {
  const [draft, setDraft] = useState(() => cleanInvite(start))
  // Whose code the draft is, once it is whole: a name ('' for none yet), or
  // null when it is not known (no such code, or the server cannot say).
  const [owner, setOwner] = useState(null)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [locked, setLocked] = useState(null)
  const [gemsPaid, setGemsPaid] = useState(0)
  const [joined, setJoined] = useState(0)
  // While a code is being checked, so a second tap does not send it twice.
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const who = await readMine()
    setLocked(Boolean(who?.invited_by))
    setGemsPaid(Number(who?.invite_gems_paid) || 0)
    const won = await claimInvites()
    setJoined(won.joined)
    if (won.gems > 0) {
      const again = await readMine()
      setGemsPaid(Number(again?.invite_gems_paid) || 0)
    }
    return who
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    setOwner(null)
    if (draft.length !== INVITE_CODE_LEN) return undefined
    let alive = true
    inviteOwner(draft)
      .then((name) => {
        if (alive) setOwner(name)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [draft])

  function note(words) {
    setMiss('')
    setSaid(words)
  }

  // What it said once the code is used, or '' when it was not.
  async function redeem() {
    if (busy) return ''
    setBusy(true)
    try {
      return (await redeemNow()) || ''
    } finally {
      setBusy(false)
    }
  }

  async function redeemNow() {
    const { miss: why } = await useInvite(draft)
    if (why === 'code') return setMiss(t('people.inviteShort'))
    if (why === 'nobody') return setMiss(t('people.noInvite'))
    if (why === 'self') return setMiss(t('people.ownInvite'))
    if (why === 'used') return setMiss(t('people.inviteUsed'))
    if (why) return setMiss(tMiss(why))
    setDraft('')
    const won = await claimInvites()
    const next = applyInvitePayout(book, won)
    if (onChange && next !== book) onChange(next)
    await refresh()
    const words = invitePayoutNote(won) || t('people.inviteOk')
    note(words)
    return words
  }

  return {
    draft,
    setDraft: (value) => {
      setMiss('')
      setDraft(cleanInvite(value))
    },
    owner,
    miss,
    said,
    locked,
    gemsPaid,
    joined,
    busy,
    redeem,
    refresh,
    note,
  }
}
