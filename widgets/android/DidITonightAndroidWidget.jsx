import React from 'react'
import { FlexWidget, OverlapWidget, TextWidget } from 'react-native-android-widget'

const COAT = {
  cat: { body: '#f0a64a', belly: '#ffe8c8', ear: '#f0a64a' },
  dog: { body: '#c68b52', belly: '#f3ddc4', ear: '#9a6538' },
  rabbit: { body: '#b8b8c8', belly: '#e8e8f0', ear: '#f0b8c8' },
  owl: { body: '#8b6b4a', belly: '#d4c4a8', ear: '#6b5038' },
}

function BuddyMark({ id, compact }) {
  const coat = COAT[id]
  if (!coat) return null
  const eye = id === 'owl' ? '#f0e080' : '#2d241c'
  const tall = id === 'rabbit'
  const mark = compact ? 28 : 36
  const earPad = compact ? 3 : 4
  const bodyW = mark - 8
  const bodyH = compact ? 14 : 18
  return (
    <OverlapWidget style={{ width: mark + 10, height: mark + 14 }}>
      {tall ? (
        <>
          <FlexWidget
            style={{
              width: compact ? 5 : 7,
              height: compact ? 12 : 16,
              borderRadius: earPad,
              backgroundColor: coat.body,
              marginLeft: compact ? 6 : 8,
            }}
          />
          <FlexWidget
            style={{
              width: compact ? 5 : 7,
              height: compact ? 12 : 16,
              borderRadius: earPad,
              backgroundColor: coat.body,
              marginLeft: compact ? 17 : 21,
            }}
          />
        </>
      ) : (
        <>
          <FlexWidget
            style={{
              width: compact ? 7 : 10,
              height: compact ? 7 : 10,
              borderRadius: compact ? 4 : 5,
              backgroundColor: coat.ear,
              marginLeft: compact ? 2 : 4,
              marginTop: compact ? 4 : 6,
            }}
          />
          <FlexWidget
            style={{
              width: compact ? 7 : 10,
              height: compact ? 7 : 10,
              borderRadius: compact ? 4 : 5,
              backgroundColor: coat.ear,
              marginLeft: compact ? 18 : 22,
              marginTop: compact ? 4 : 6,
            }}
          />
        </>
      )}
      <FlexWidget
        style={{
          width: bodyW,
          height: bodyH,
          borderRadius: bodyH / 2,
          backgroundColor: coat.body,
          marginLeft: compact ? 3 : 4,
          marginTop: compact ? 10 : 14,
        }}
      />
      <FlexWidget
        style={{
          width: compact ? 12 : 16,
          height: compact ? 9 : 12,
          borderRadius: compact ? 6 : 8,
          backgroundColor: coat.belly,
          marginLeft: compact ? 8 : 10,
          marginTop: compact ? 15 : 20,
        }}
      />
      <FlexWidget
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: eye,
          marginLeft: compact ? 9 : 11,
          marginTop: compact ? 15 : 20,
        }}
      />
      <FlexWidget
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: eye,
          marginLeft: compact ? 16 : 20,
          marginTop: compact ? 15 : 20,
        }}
      />
    </OverlapWidget>
  )
}

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

function palette(props) {
  return props?.colors ? { ...FALLBACK, ...props.colors } : FALLBACK
}

function leadItem(p) {
  const items = p.items || []
  const hasOpen = items.some((item) => item.status === 'open')
  const id = String(p.leadLampId || '').trim()
  if (id) {
    const hit = items.find(
      (item) =>
        item.lampId === id && (item.status === 'open' || (!hasOpen && item.status === 'skip')),
    )
    if (hit) return hit
  }
  return items.find((item) => item.status === 'open') || items.find((item) => item.status === 'skip') || null
}

function questionLine(p, lead) {
  if (lead) {
    const fromLead = String(lead.question || '').trim() || String(lead.label || '').trim()
    if (fromLead) return fromLead
  }
  const top = String(p.question || '').trim()
  if (top) return top
  return String(p.footer || p.openLabel || '').trim()
}

function widgetSize(widgetInfo) {
  const h = widgetInfo?.height || 0
  const w = widgetInfo?.width || 0
  const short = h > 0 && h < 170
  const compact = short || (h > 0 && h < 150 && (w === 0 || w < 280))
  const tight = h > 0 && h < 132
  const large = !compact && (h >= 200 || (w >= 320 && h >= 160))
  return { compact, tight, large, h, w }
}

export function renderDidITonightAndroidWidget(props, widgetInfo) {
  const raw = props || {
    tagTitle: 'Did I',
    question: '',
    items: [],
    footer: '',
    didLabel: 'Did',
    nopeLabel: 'Did not',
    openLabel: 'Tonight',
    left: 0,
    openUri: 'didi://tonight',
  }
  const p = raw
  const C = palette(p)
  const tonightUri = p.openUri || 'didi://tonight'
  const { compact, tight, large } = widgetSize(widgetInfo)
  const gem = Boolean(C.gem)
  const lead = leadItem(p)
  const buddyId = String(p.buddyId || '')
  const showBuddy = Boolean(buddyId) && !tight
  const question = questionLine(p, lead)
  const radius = compact ? 16 : large ? 24 : 22
  const titleSize = lead
    ? tight
      ? 15
      : compact
        ? 18
        : large
          ? 28
          : 24
    : compact
      ? 13
      : 14
  const questionLines = lead ? (tight ? 2 : compact ? 3 : 4) : 2
  const panelPadH = compact ? 12 : large ? 16 : 14
  const panelPadV = tight ? 8 : compact ? 10 : large ? 14 : 12
  const actionGap = tight ? 6 : 8
  const ringPad = 2
  const outerPad = compact ? 8 : 10

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: gem ? C.bg : C.panel,
        flexDirection: 'column',
        padding: outerPad,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          backgroundColor: C.on,
          borderRadius: radius,
          padding: ringPad,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <OverlapWidget
          style={{
            width: 'match_parent',
            height: '100%',
          }}
        >
          <FlexWidget
            style={{
              height: '100%',
              width: 'match_parent',
              backgroundColor: C.panel,
              borderRadius: compact ? 14 : large ? 22 : 20,
              paddingHorizontal: panelPadH,
              paddingVertical: panelPadV,
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <TextWidget
              text={String(p.tagTitle || 'Did I').toUpperCase()}
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: C.on,
                textAlign: 'center',
                width: 'match_parent',
              }}
              maxLines={1}
            />
            <FlexWidget
              style={{
                flex: 1,
                width: 'match_parent',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: showBuddy ? (compact ? 28 : 34) : 4,
                marginTop: tight ? 2 : 4,
                marginBottom: lead ? actionGap : 0,
                overflow: 'hidden',
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: tonightUri }}
            >
              <TextWidget
                text={lead ? question : p.footer || p.openLabel}
                style={{
                  fontSize: titleSize,
                  fontWeight: lead ? '700' : '500',
                  color: lead ? C.ink : C.inkSoft,
                  textAlign: 'center',
                  width: 'match_parent',
                }}
                maxLines={questionLines}
              />
            </FlexWidget>
            {lead ? (
              <FlexWidget
                style={{
                  flexDirection: 'row',
                  width: 'match_parent',
                  marginTop: actionGap,
                }}
              >
                <FlexWidget
                  style={{
                    flex: 1,
                    backgroundColor: C.skip,
                    borderRadius: 12,
                    paddingVertical: tight ? 5 : compact ? 6 : 8,
                    marginRight: 6,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  clickAction="ANSWER"
                  clickActionData={{ lampId: lead.lampId, kind: 'nope', night: String(lead.periodKey || '') }}
                >
                  <TextWidget
                    text={p.nopeLabel || 'Did not'}
                    style={{ fontSize: compact ? 13 : 15, fontWeight: '700', color: C.ink, textAlign: 'center' }}
                    maxLines={1}
                  />
                </FlexWidget>
                <FlexWidget
                  style={{
                    flex: 1,
                    backgroundColor: C.on,
                    borderRadius: 12,
                    paddingVertical: tight ? 5 : compact ? 6 : 8,
                    marginLeft: 6,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  clickAction="ANSWER"
                  clickActionData={{ lampId: lead.lampId, kind: 'did', night: String(lead.periodKey || '') }}
                >
                  <TextWidget
                    text={p.didLabel || 'Did'}
                    style={{ fontSize: compact ? 13 : 15, fontWeight: '700', color: C.bg, textAlign: 'center' }}
                    maxLines={1}
                  />
                </FlexWidget>
              </FlexWidget>
            ) : (
              <TextWidget
                text={p.openLabel}
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: C.on,
                  textAlign: 'center',
                  width: 'match_parent',
                  marginTop: actionGap,
                }}
                maxLines={1}
                clickAction="OPEN_URI"
                clickActionData={{ uri: tonightUri }}
              />
            )}
          </FlexWidget>
          {showBuddy ? (
            <FlexWidget
              style={{
                width: 'match_parent',
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-end',
                paddingTop: panelPadV + ringPad,
                paddingRight: panelPadH + ringPad,
              }}
            >
              <BuddyMark id={buddyId} compact={compact} />
            </FlexWidget>
          ) : null}
        </OverlapWidget>
      </FlexWidget>
    </FlexWidget>
  )
}
