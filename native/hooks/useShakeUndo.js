import { useEffect, useRef, useState } from 'react'
import { emptyShake, shakeStep } from '../../src/lib/shake-undo.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

const QUIET_MS = 1500

function loadAccelerometer() {
  try {
    const mod = require('expo-sensors')
    const sensor = mod && (mod.Accelerometer || mod.default?.Accelerometer)
    if (!sensor || typeof sensor.isAvailableAsync !== 'function') return null
    return sensor
  } catch (error) {
    global.__didISensorsError = String((error && error.message) || error)
    return null
  }
}

export function useShakeUndo(active, onUndo) {
  const reduce = useReduceMotion()
  const undoRef = useRef(onUndo)
  const motion = useRef(emptyShake())
  const [shakeOk, setShakeOk] = useState(false)
  undoRef.current = onUndo

  useEffect(() => {
    if (!active || reduce) {
      setShakeOk(false)
      return undefined
    }

    const Accelerometer = loadAccelerometer()
    if (!Accelerometer) {
      setShakeOk(false)
      return undefined
    }

    let sub = null
    let quiet = null
    let cancelled = false
    let heard = false
    motion.current = emptyShake()

    const ask =
      typeof Accelerometer.requestPermissionsAsync === 'function'
        ? Accelerometer.requestPermissionsAsync().catch(() => null)
        : Promise.resolve(null)

    ask
      .then(() => Accelerometer.isAvailableAsync())
      .then((ok) => {
        if (cancelled || !ok) {
          setShakeOk(false)
          return
        }
        setShakeOk(true)
        Accelerometer.setUpdateInterval(80)
        sub = Accelerometer.addListener((sample) => {
          heard = true
          const step = shakeStep(motion.current, sample, Date.now())
          motion.current = step
          if (step.hit) undoRef.current?.()
        })
        quiet = setTimeout(() => {
          if (!cancelled && !heard) setShakeOk(false)
        }, QUIET_MS)
      })
      .catch(() => {
        if (!cancelled) setShakeOk(false)
      })

    return () => {
      cancelled = true
      if (quiet) clearTimeout(quiet)
      sub?.remove()
      setShakeOk(false)
    }
  }, [active, reduce])

  return shakeOk
}
