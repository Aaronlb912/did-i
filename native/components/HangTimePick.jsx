import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  DEFAULT_TIME,
  HOUR_OPTIONS,
  HOUR_OPTIONS_24,
  joinTime,
  minuteOptions,
  timeParts,
} from '../../src/lib/hang-time.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs, uses24h } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'
import { HangSelect } from './HangSelect.jsx'
import { KeyButton } from './ui.jsx'

const QUICK_TIMES = ['08:00', '12:00', '18:00', '20:00', '21:00']

export function HangTimePick({ value, onChange, colors, noneLabel = '' }) {
  const [openMenu, setOpenMenu] = useState(null)
  usePrefs()
  const h24 = uses24h()
  const timed = Boolean(value)
  const { hour, minute, meridiem } = timeParts(value, h24)
  const minutes = useMemo(() => minuteOptions(minute), [minute])
  const meridiemOptions = useMemo(
    () => [
      { value: 'am', label: t('hang.am') },
      { value: 'pm', label: t('hang.pm') },
    ],
    [],
  )

  function setPart(part, next) {
    const bits = timeParts(value || DEFAULT_TIME, h24)
    bits[part] = next
    onChange(joinTime(bits, h24))
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        <KeyButton label={noneLabel || t('hang.askAny')} colors={colors} picked={!timed} onPress={() => onChange('')} />
        <KeyButton
          label={t('hang.askAt')}
          colors={colors}
          picked={timed}
          onPress={() => onChange(value || DEFAULT_TIME)}
        />
      </View>
      <View style={styles.chips}>
        {QUICK_TIMES.map((time) => (
          <KeyButton
            key={time}
            label={clockWords(time)}
            accessibilityLabel={t('hang.askAt') + ' ' + clockWords(time)}
            colors={colors}
            picked={value === time}
            onPress={() => onChange(time)}
          />
        ))}
      </View>
      {timed ? (
        <View style={styles.picks}>
          <View style={styles.col}>
            <Text style={[styles.cap, { color: colors.inkDim }]}>{t('hang.timeHour')}</Text>
            <HangSelect
              ariaLabel={t('hang.timeHour')}
              value={hour}
              onChange={(next) => setPart('hour', next)}
              options={h24 ? HOUR_OPTIONS_24 : HOUR_OPTIONS}
              colors={colors}
              open={openMenu === 'hour'}
              onOpenChange={(next) => setOpenMenu(next ? 'hour' : null)}
            />
          </View>
          <View style={styles.col}>
            <Text style={[styles.cap, { color: colors.inkDim }]}>{t('hang.timeMin')}</Text>
            <HangSelect
              ariaLabel={t('hang.timeMin')}
              value={minute}
              onChange={(next) => setPart('minute', next)}
              options={minutes}
              colors={colors}
              open={openMenu === 'minute'}
              onOpenChange={(next) => setOpenMenu(next ? 'minute' : null)}
            />
          </View>
          {h24 ? null : (
          <View style={[styles.col, styles.colDay]}>
            <Text style={[styles.cap, { color: colors.inkDim }]}>{t('hang.timeDaypart')}</Text>
            <HangSelect
              ariaLabel={t('hang.timeDaypart')}
              value={meridiem}
              onChange={(next) => setPart('meridiem', next)}
              options={meridiemOptions}
              colors={colors}
              open={openMenu === 'meridiem'}
              onOpenChange={(next) => setOpenMenu(next ? 'meridiem' : null)}
            />
          </View>
          )}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  picks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  colDay: {
    flex: 0.95,
  },
  cap: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
})
