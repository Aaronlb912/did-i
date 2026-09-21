import { useEffect } from 'react'
import { goHash } from '../site/hash.js'

// Web-only keyboard shortcuts for Tonight. Native uses swipe and hardware back.
export function useTonightKeys(stack) {
  useEffect(() => {
    function onKey(event) {
      if (event.target.closest('input, textarea, select')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        stack.closePlates()
        return
      }
      if (event.key === 'u' && stack.undo) {
        event.preventDefault()
        stack.applyUndo()
        return
      }
      if (stack.holePick || stack.waitPick || stack.pillPick) return
      if (event.key === 'n') {
        event.preventDefault()
        goHash('/add')
        return
      }
      if (stack.onFinish) {
        if (event.key === ' ' || event.key === 'Enter' || event.key === 'y') {
          event.preventDefault()
          stack.continueStack()
        }
        if (event.key === 's' || event.key === 'Escape') {
          event.preventDefault()
          stack.restStack()
        }
        return
      }
      if (!stack.faceRow) return
      if (event.key === 'y' || event.key === ' ') {
        event.preventDefault()
        stack.mark(stack.faceRow, 'yes')
        return
      }
      if (event.key === 's') {
        event.preventDefault()
        stack.mark(stack.faceRow, 'skip')
        return
      }
      if (event.key === 'j' || event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault()
        stack.moveFace(1)
      }
      if (event.key === 'k' || event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault()
        stack.moveFace(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
}
