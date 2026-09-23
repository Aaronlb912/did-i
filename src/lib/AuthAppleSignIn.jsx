import { t } from './i18n.js'

export function AuthAppleSignIn({ auth, disabled }) {
  if (!auth.showApple || auth.step !== 'start') return null

  return (
    <div className="di-auth-apple">
      <p className="di-auth-apple-or" aria-hidden="true">{t('auth.appleOr')}</p>
      <button
        className="di-auth-apple-btn"
        type="button"
        disabled={disabled || auth.busy}
        onClick={() => auth.signInApple()}
      >
        {t('auth.apple')}
      </button>
    </div>
  )
}
