import { t } from './i18n.js'
export { kitTabDefault } from './kit-tab.js'

const TABS = [
  { id: 'looks', key: 'shop.looks' },
  { id: 'cheers', key: 'shop.cheers' },
  { id: 'buddies', key: 'shop.buddies' },
  { id: 'accessories', key: 'shop.accessories' },
]

export function KitTabs({ tab, onTab, counts }) {
  return (
    <div className="di-kit-tabs" role="tablist" aria-label={t('kit.title')}>
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          className={tab === item.id ? 'di-kit-tab is-on' : 'di-kit-tab'}
          onClick={() => onTab(item.id)}
        >
          <span>{t(item.key)}</span>
          <span className="di-kit-tab-n">{counts[item.id]}</span>
        </button>
      ))}
    </div>
  )
}

export function KitTile({ on, worn = false, label, children, onClick, ariaLabel }) {
  const cls = ['di-kit-tile', on && 'is-on', worn && 'is-worn'].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={on}
    >
      <span className="di-kit-tile-chip">{children}</span>
      <span className="di-kit-tile-name">{label}</span>
    </button>
  )
}

export function KitFocus({ children }) {
  return <div className="di-set-card di-kit-focus">{children}</div>
}
