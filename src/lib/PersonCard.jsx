import { useState } from 'react'
import { t } from './i18n.js'
import { personInitials } from './people.js'

/** Initials in a rounded tile, lit when they are done tonight. */
export function Avatar({ person, done, big }) {
  const names = ['di-avatar', done ? 'is-done' : '', big ? 'is-big' : ''].filter(Boolean).join(' ')
  return (
    <span className={names} aria-hidden="true">
      {personInitials(person)}
    </span>
  )
}

/**
 * One person: avatar, name, a line under it, quick actions, and an optional
 * fold with the rarer ones (switches, remove, block).
 */
export function PersonCard({ person, name, line, done, pill, pillOn, extra, actions, more, highlight, cardRef }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={highlight ? 'di-person is-lit' : 'di-person'} ref={cardRef}>
      <div className="di-person-top">
        <Avatar person={person} done={done} />
        <span className="di-person-who">
          <strong>{name}</strong>
          {line ? <em>{line}</em> : null}
        </span>
        {pill ? <span className={pillOn ? 'di-person-pill is-on' : 'di-person-pill'}>{pill}</span> : null}
      </div>
      {extra}
      {actions || more ? (
        <div className="di-person-actions">
          {actions}
          {more ? (
            <button
              className="di-key di-person-more"
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((live) => !live)}
            >
              {open ? t('people.less') : t('people.more')}
            </button>
          ) : null}
        </div>
      ) : null}
      {more && open ? <div className="di-person-fold">{more}</div> : null}
    </div>
  )
}

/** Section heading with an optional count and a link on the right. */
export function SectionHead({ label, count, link, onLink, onAdd, addLabel }) {
  return (
    <div className="di-person-head">
      <span>
        {label}
        {count ? ` · ${count}` : ''}
      </span>
      <span className="di-person-head-right">
        {onAdd ? (
          <button type="button" className="di-person-head-add" onClick={onAdd} aria-label={addLabel} title={addLabel}>
            +
          </button>
        ) : null}
        {link ? (
          <button type="button" className="di-person-head-link" onClick={onLink}>
            {link}
          </button>
        ) : null}
      </span>
    </div>
  )
}

/** What an empty section says, and the one thing to do about it. */
export function EmptyCard({ title, body, children }) {
  return (
    <div className="di-person di-person-empty">
      {title ? <strong>{title}</strong> : null}
      {body ? <p className="di-set-note">{body}</p> : null}
      {children}
    </div>
  )
}
