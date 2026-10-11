import { useEffect, useRef } from 'react'
import { Keyboard } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { publishSheet } from './SheetHost.jsx'

// A picker that rises from the bottom (When, How it counts) on every form
// with a schedule. It draws through SheetHost, in the page's own tree, so it
// also works inside Add when Add is a native sheet on iPhone. The rows inside
// stay live: each render hands SheetHost the current children.
export function PickSheet({ open, title, onClose, colors, children }) {
  const shown = useRef(false)

  useEffect(() => {
    if (open && !shown.current) Keyboard.dismiss()
  }, [open])

  useEffect(() => {
    if (!open) return
    shown.current = true
    publishSheet({
      bottom: true,
      title,
      content: children,
      goLabel: t('tags.done'),
      onGo: onClose,
      onClose,
      noClose: true,
      colors,
    })
  })

  useEffect(() => {
    if (open || !shown.current) return
    shown.current = false
    publishSheet(null)
  }, [open])

  // Leaving the form never leaves its sheet behind.
  useEffect(
    () => () => {
      if (shown.current) publishSheet(null)
    },
    [],
  )

  return null
}
