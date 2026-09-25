import { t } from './i18n.js'

export function AuthGoogleSignIn({ auth, disabled }) {
  if (!auth.showGoogle || auth.step !== 'start') return null

  return (
    <div className="di-auth-google">
      {auth.showApple ? null : <p className="di-auth-apple-or" aria-hidden="true">{t('auth.appleOr')}</p>}
      <button className="di-key di-auth-google-btn" type="button" disabled={disabled || auth.busy} onClick={() => auth.signInGoogle()}>
        {t('auth.google')}
      </button>
    </div>
  )
}
