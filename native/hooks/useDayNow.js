import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { boardDate } from '../../src/lib/recurrence.js'

// A clock that moves only when the day turns over, so a screen left open past
// midnight (or brought back the next morning) shows the new day.
export function useDayNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const check = () => setNow((was) => (boardDate(new Date()) === boardDate(was) ? was : new Date()))
    const interval = setInterval(check, 60000)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check()
    })
    return () => {
      sub.remove()
      clearInterval(interval)
    }
  }, [])
  return now
}
