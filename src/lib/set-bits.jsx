import { t } from './i18n.js'

export function SetCard({ children }) {
  return <div className="di-set-card">{children}</div>
}

export function SetCap({ children }) {
  return <p className="di-set-cap">{children}</p>
}

export function SetRow({ label, value, sub, onClick, chevron, danger }) {
  const className = danger ? 'di-set-row is-miss' : 'di-set-row'
  const guts = (
    <>
      <span className="di-set-copy">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className="di-set-end">
        {value ? <span className="di-set-val">{value}</span> : null}
        {chevron ? <i className="di-set-chev" aria-hidden="true" /> : null}
      </span>
    </>
  )
  if (!onClick) return <div className={`${className} is-flat`}>{guts}</div>
  return (
    <button className={className} type="button" onClick={onClick}>
      {guts}
    </button>
  )
}

export function SetSwitch({ label, sub, on, onClick }) {
  return (
    <button className="di-set-row" type="button" role="switch" aria-checked={on} onClick={onClick}>
      <span className="di-set-copy">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className={on ? 'di-set-switch is-on' : 'di-set-switch'} aria-hidden="true">
        <i />
      </span>
    </button>
  )
}

export function SetField({ label, ...inputProps }) {
  return (
    <label className="di-set-row di-set-field">
      <span>{label}</span>
      <input {...inputProps} />
    </label>
  )
}

export function SetPick({ label, on, onClick }) {
  return (
    <button className={on ? 'di-set-row is-on' : 'di-set-row'} type="button" aria-pressed={on} onClick={onClick}>
      <span>{label}</span>
      {on ? (
        <span className="di-set-check" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </button>
  )
}

export function SetSheet({ title, onClose, still, children }) {
  return (
    <div className="di-set-veil" role="presentation" onClick={onClose}>
      <div
        className={still ? 'di-set-sheet is-still' : 'di-set-sheet'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="di-set-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="di-set-sheet-bar">
          <p id="di-set-sheet-title" className="di-set-sheet-title">
            {title}
          </p>
          <button
            className="di-set-x"
            type="button"
            onClick={onClose}
            aria-label={t('settings.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
