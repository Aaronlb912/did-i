import { useEffect, useRef } from 'react'
import { onSocialLive } from '../../src/lib/social-live.js'

// Read the screen again when someone else changes what it shows (a live ping
// of one of these kinds, supabase/social-live.sql and live-more.sql), so an
// open screen never waits for the 5 minute check.
export function useLiveReload(kinds, load) {
  const latest = useRef(load)
  latest.current = load
  const key = kinds.join(',')
  useEffect(() => {
    const wanted = key.split(',')
    return onSocialLive((seen) => {
      if (wanted.some((kind) => seen.has(kind))) latest.current()
    })
  }, [key])
}
