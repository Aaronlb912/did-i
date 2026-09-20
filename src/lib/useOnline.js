import { useEffect, useState } from 'react'

// Your own questions work with no signal at all. Anything with other
// people in it does not, and a screen that just sits there looks broken.

export function useOnline() {
  const [on, setOn] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  )

  useEffect(() => {
    function look() {
      setOn(navigator.onLine !== false)
    }
    window.addEventListener('online', look)
    window.addEventListener('offline', look)
    return () => {
      window.removeEventListener('online', look)
      window.removeEventListener('offline', look)
    }
  }, [])

  return on
}
