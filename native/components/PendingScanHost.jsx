import { useEffect } from 'react'
import { useAccount } from '../../src/lib/account.js'
import { takePendingScan } from '../../src/lib/qr-links.js'
import { goHash } from '../navigation/hash.js'

// A friend or family code scanned before sign-in (or before install, through
// the did-i.app page) opens Connect once the person is signed in.
export function PendingScanHost() {
  const account = useAccount()
  const userId = account.user?.id || ''
  useEffect(() => {
    if (!userId) return
    const id = takePendingScan()
    if (id) goHash('/people/connect', { id })
  }, [userId])
  return null
}
