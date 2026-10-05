import { t } from './i18n.js'
import { useSavableField } from './useSavableField.js'
import { SetField } from './set-bits.jsx'

export function SavableSetField({ label, value, savedValue, onSave, onChange, ...rest }) {
  const { flash, save } = useSavableField({ value, saved: savedValue, onSave })

  return (
    <div className="di-savable-field">
      <SetField
        label={label}
        value={value}
        onChange={onChange}
        onBlur={() => {
          save()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            save()
          }
        }}
        {...rest}
      />
      <div className="di-savable-field-foot">
        {flash ? (
          <p className="di-savable-field-saved">{t('settings.saved')}</p>
        ) : (
          <p className="di-savable-field-hint">{t('settings.fieldHint')}</p>
        )}
      </div>
    </div>
  )
}
