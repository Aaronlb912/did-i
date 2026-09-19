import { leftoverOn } from './tags.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

export function TagRail({ boards, tagId, onTag, now }) {
  usePrefs()
  if (!boards || boards.length < 2) return null
  const clock = now || new Date()
  const allLeft = leftoverOn(boards, clock, '')
  return (
    <div className="di-tags" role="tablist" aria-label={t('tags.aria')}>
      <button
        className={tagId ? 'di-tag' : 'di-tag is-on'}
        type="button"
        role="tab"
        aria-selected={!tagId}
        onClick={() => onTag('')}
      >
        {t('tags.all')}
        {allLeft ? <em>{allLeft}</em> : null}
      </button>
      {boards.map((book) => {
        const left = leftoverOn(boards, clock, book.id)
        const on = tagId === book.id
        return (
          <button
            key={book.id}
            className={on ? 'di-tag is-on' : 'di-tag'}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onTag(book.id)}
          >
            {book.title}
            {left ? <em>{left}</em> : null}
          </button>
        )
      })}
    </div>
  )
}
