import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'

// Friends and family, and who has finished tonight. Props come from
// buildTogetherWidgetProps (src/lib/together-widget.js) plus look colours.

const FALLBACK = {
  bg: '#0e1014',
  panel: '#16191f',
  ink: '#f4f6fa',
  inkSoft: '#99a1b0',
  on: '#c9f24d',
  skip: '#7d8694',
  miss: '#ff6f61',
  line: '#2b3140',
  gem: false,
}

function widgetSize(widgetInfo) {
  const h = widgetInfo?.height || 0
  const w = widgetInfo?.width || 0
  const compact = h > 0 && h < 170
  const large = !compact && h >= 260
  const narrow = w > 0 && w < 250
  return { compact, large, narrow }
}

function Avatar({ person, size, C }) {
  return (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: person.done ? C.on : C.bg,
        borderWidth: 1.5,
        borderColor: person.done ? C.on : C.line,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={person.initials || '?'}
        style={{
          fontSize: Math.round(size * 0.38),
          fontWeight: '700',
          color: person.done ? C.bg : person.shared ? C.ink : C.inkSoft,
        }}
        maxLines={1}
      />
    </FlexWidget>
  )
}

function Row({ person, size, C }) {
  return (
    <FlexWidget
      style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
    >
      <Avatar person={person} size={size} C={C} />
      <TextWidget
        text={person.name || person.initials || '?'}
        style={{
          flex: 1,
          marginLeft: 6,
          fontSize: 13,
          fontWeight: '600',
          color: person.shared ? C.ink : C.inkSoft,
        }}
        maxLines={1}
        truncate="END"
      />
      <TextWidget text={person.done ? '✓' : ' '} style={{ fontSize: 13, fontWeight: '700', color: C.on, marginLeft: 4 }} />
    </FlexWidget>
  )
}

function Cell({ person, C }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
      <Avatar person={person} size={30} C={C} />
      <TextWidget text={person.done ? '✓' : ' '} style={{ fontSize: 10, fontWeight: '700', color: C.on }} />
    </FlexWidget>
  )
}

export function renderDidITogetherAndroidWidget(props, widgetInfo) {
  const p = props || {}
  const C = p.colors ? { ...FALLBACK, ...p.colors } : FALLBACK
  const { compact, large, narrow } = widgetSize(widgetInfo)
  const people = Array.isArray(p.people) ? p.people.filter((item) => item && typeof item === 'object') : []
  const grid = compact || narrow
  const shown = people.slice(0, large && !narrow ? 14 : 6)
  const half = Math.ceil(shown.length / 2)
  const uri = p.openUri || 'didi://open/friends'
  const radius = compact ? 16 : large ? 24 : 22

  let body
  if (!shown.length) {
    body = (
      <TextWidget
        text={p.emptyLabel || 'Add friends or family in Did I.'}
        style={{ fontSize: 13, fontWeight: '500', color: C.inkSoft, textAlign: 'center', width: 'match_parent' }}
        maxLines={4}
      />
    )
  } else if (grid) {
    const rows = [shown.slice(0, 3), shown.slice(3, 6)].filter((r) => r.length)
    body = (
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <FlexWidget key={`r${i}`} style={{ width: 'match_parent', flexDirection: 'row', marginBottom: 2 }}>
            {r.map((person) => (
              <Cell key={person.id} person={person} C={C} />
            ))}
          </FlexWidget>
        ))}
      </FlexWidget>
    )
  } else {
    body = (
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row' }}>
        {[shown.slice(0, half), shown.slice(half)].map((col, i) => (
          <FlexWidget key={`c${i}`} style={{ flex: 1, flexDirection: 'column', marginLeft: i ? 10 : 0 }}>
            {col.map((person) => (
              <Row key={person.id} person={person} size={large ? 26 : 22} C={C} />
            ))}
          </FlexWidget>
        ))}
      </FlexWidget>
    )
  }

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
            borderRadius: compact ? 14 : large ? 22 : 20,
            paddingHorizontal: compact ? 10 : 14,
            paddingVertical: compact ? 8 : 12,
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <TextWidget
            text={String(p.title || 'Together today').toUpperCase()}
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
