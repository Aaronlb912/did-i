import { useEffect, useRef, useState } from 'react'
import { useBackDismiss } from '../site/nav.js'
import { leftoverOn } from './tags.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

// One button instead of a row of them. With a handful of tags the rail ate
// the top of every screen, and most nights you are only on one of them.
export function TagRail({ boards, tagId, onTag, now }) {
  usePrefs()
  const wrap = useRef(null)
  const [open, setOpen] = useState(false)
  const live = (boards || []).filter((book) => !book.archived)

  useBackDismiss(open, () => setOpen(false))

  useEffect(() => {
    if (!open) return undefined
    function away(event) {
      if (!wrap.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [tagId])

  if (live.length < 2) return null

  const clock = now || new Date()
  const allLeft = leftoverOn(live, clock, '')
  const picked = tagId ? live.find((book) => book.id === tagId) : null
  const label = picked ? picked.title : t('tags.all')
  const count = picked ? leftoverOn(live, clock, picked.id) : allLeft

  function pick(id) {
    setOpen(false)
    onTag(id)
  }

  return (
    <div className="di-tagbox" ref={wrap}>
      <button
        className={tagId ? 'di-tagpick is-on' : 'di-tagpick'}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('tags.pick', { name: label })}
        onClick={() => setOpen((was) => !was)}
      >
        <i className="di-tagpick-bars" aria-hidden="true" />
        <span className="di-tagpick-name">{label}</span>
        {count ? <em>{count}</em> : null}
      </button>

      {open ? (
        <div className="di-tagmenu" role="menu" aria-label={t('tags.aria')}>
          <button
            className={tagId ? 'di-tagmenu-row' : 'di-tagmenu-row is-on'}
            type="button"
            role="menuitemradio"
            aria-checked={!tagId}
            onClick={() => pick('')}
          >
            <span>{t('tags.all')}</span>
            {allLeft ? <em>{allLeft}</em> : null}
          </button>
          {live.map((book) => {
            const left = leftoverOn(live, clock, book.id)
            const on = tagId === book.id
            return (
              <button
                key={book.id}
                className={on ? 'di-tagmenu-row is-on' : 'di-tagmenu-row'}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => pick(book.id)}
              >
                <span>{book.title}</span>
                {left ? <em>{left}</em> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
