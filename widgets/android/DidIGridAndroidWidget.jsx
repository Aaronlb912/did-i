import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'

// The last 12 weeks as day squares. Props come from buildGridWidgetProps
// (src/lib/widget-grid.js) plus look colours. weeks: 12 strings of 7
// characters, oldest first: y = Did, n = Not yet, . = no mark, space = ahead.

const FALLBACK = {
  bg: '#0e1014',
  panel: '#16191f',
  ink: '#f4f6fa',
  inkSoft: '#99a1b0',
  on: '#c9f24d',
  skip: '#7d8694',
  miss: '#2b3140',
  line: '#2b3140',
  gem: false,
}

const GAP = 2

// Square height from the widget height, so seven rows fit under the title.
function cellHeight(widgetInfo) {
  const h = widgetInfo?.height || 0
  if (!h) return 9
  return Math.max(5, Math.min(16, Math.floor((h - 64 - GAP * 6) / 7)))
}

export function renderDidIGridAndroidWidget(props, widgetInfo) {
  const p = props || {}
  const C = p.colors ? { ...FALLBACK, ...p.colors } : FALLBACK
  const weeks = Array.isArray(p.weeks) ? p.weeks.map((w) => String(w || '')) : []
  const anyDay = weeks.some((w) => /[yn]/.test(w))
  const uri = p.openUri || 'didi://open/calendar'
  const cell = cellHeight(widgetInfo)
  const compact = (widgetInfo?.height || 0) > 0 && widgetInfo.height < 170
  const radius = compact ? 16 : 22

  const colorOf = (ch) => (ch === 'y' ? C.on : ch === 'n' ? C.miss : ch === ' ' ? C.panel : C.line)

  const body = anyDay ? (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row' }}>
      {weeks.map((week, w) => (
        <FlexWidget key={`w${w}`} style={{ flex: 1, flexDirection: 'column', marginLeft: w ? GAP : 0 }}>
          {Array.from({ length: 7 }, (_, d) => (
            <FlexWidget
              key={`d${d}`}
              style={{
                width: 'match_parent',
                height: cell,
                borderRadius: 2,
                backgroundColor: colorOf(week.charAt(d) || ' '),
                ...(w === p.todayWeek && d === p.todayRow ? { borderWidth: 1, borderColor: C.on } : {}),
                marginTop: d ? GAP : 0,
              }}
            />
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  ) : (
    <TextWidget
      text={p.emptyLabel || 'Your days fill in here as you answer.'}
      style={{ fontSize: 13, fontWeight: '500', color: C.inkSoft, textAlign: 'center', width: 'match_parent' }}
      maxLines={3}
    />
  )

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.gem ? C.bg : C.panel,
        padding: compact ? 8 : 10,
        borderRadius: radius,
        overflow: 'hidden',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
    >
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          backgroundColor: C.on,
          borderRadius: radius,
          padding: 2,
          overflow: 'hidden',
        }}
      >
        <FlexWidget
          style={{
            height: 'match_parent',
            width: 'match_parent',
            backgroundColor: C.panel,
            borderRadius: compact ? 14 : 20,
            paddingHorizontal: compact ? 10 : 14,
            paddingVertical: compact ? 8 : 12,
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <TextWidget
            text={String(p.title || 'Last 12 weeks').toUpperCase()}
            style={{ fontSize: 11, fontWeight: '700', color: C.on, textAlign: 'center', width: 'match_parent' }}
            maxLines={1}
          />
          {p.countLine ? (
            <TextWidget
              text={p.countLine}
              style={{ fontSize: 11, fontWeight: '500', color: C.inkSoft, textAlign: 'center', width: 'match_parent' }}
              maxLines={1}
            />
          ) : null}
          <FlexWidget
            style={{
              flex: 1,
              width: 'match_parent',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 4,
              overflow: 'hidden',
            }}
          >
            {body}
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  )
}
