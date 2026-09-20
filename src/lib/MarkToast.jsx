import { useEffect } from 'react'
import { markText } from './achievements.js'
import { t } from './i18n.js'

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
        {t(markText(mark.id, 'name'))}
        {mark.id ? ` · ${t(markText(mark.id, 'line'))}` : ''}
      </span>
      <button className="di-key" type="button" onClick={onClose}>
        {t('marks.ok')}
      </button>
    </p>
  )
}
