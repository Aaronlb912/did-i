import { useEffect, useRef, useState } from 'react'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

const SHAKE_FORCE = 1.72
const SHAKE_GAP_MS = 900

export function useShakeUndo(active, onUndo) {
  const reduce = useReduceMotion()
  const lastShake = useRef(0)
  const undoRef = useRef(onUndo)
  const [shakeOk, setShakeOk] = useState(false)
  undoRef.current = onUndo

  useEffect(() => {
    if (!active || reduce) {
      setShakeOk(false)
      return undefined
    }

    let sub = null
    let cancelled = false

    import('expo-sensors/build/Accelerometer.js')
      .then(async (mod) => {
        if (cancelled) return
        const Accelerometer = mod.default
        const ok = await Accelerometer.isAvailableAsync()
        if (cancelled || !ok) {
          setShakeOk(false)
          return
        }
        setShakeOk(true)
        Accelerometer.setUpdateInterval(80)
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const force = Math.sqrt(x * x + y * y + z * z)
          if (force < SHAKE_FORCE) return
          const now = Date.now()
          if (now - lastShake.current < SHAKE_GAP_MS) return
          lastShake.current = now
          undoRef.current?.()
        })
      })
      .catch(() => {
        if (!cancelled) setShakeOk(false)
      })

    return () => {
      cancelled = true
      sub?.remove()
      setShakeOk(false)
    }
  }, [active, reduce])

  return shakeOk
}
