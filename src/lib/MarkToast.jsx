import { useEffect } from 'react'

export function MarkToast({ mark, onClose }) {
  useEffect(() => {
    if (!mark) return undefined
    const timer = window.setTimeout(() => onClose?.(), 5200)
    return () => window.clearTimeout(timer)
  }, [mark, onClose])

  if (!mark) return null

  return (
    <p className="di-undo di-mark-toast di-screws-print-hide" role="status">
      <span>
        {mark.name}
        {mark.line ? ` · ${mark.line}` : ''}
      </span>
      <button className="di-key" type="button" onClick={onClose}>
        Ok
      </button>
    </p>
  )
}
