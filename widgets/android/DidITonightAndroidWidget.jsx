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
  const top = String(p.question || '').trim()
  if (top) return top
  if (lead) {
    const fromLead = String(lead.question || '').trim() || String(lead.label || '').trim()
    if (fromLead) return fromLead
  }
  return String(p.footer || p.openLabel || '').trim()
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
  const h = widgetInfo?.height || 0
  const w = widgetInfo?.width || 0
  const compact = h > 0 && h < 150 && (w === 0 || w < 280)
  const gem = Boolean(C.gem)
  const lead = leadItem(p)
  const buddyId = String(p.buddyId || '')
  const question = questionLine(p, lead)
  const radius = compact ? 16 : 22
  const titleSize = lead ? (compact ? 18 : 26) : 14

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: gem ? C.bg : C.panel,
        flexDirection: 'column',
        padding: compact ? 8 : 10,
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
          padding: 2,
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <OverlapWidget
          style={{
            flex: 1,
            width: 'match_parent',
            overflow: 'hidden',
          }}
        >
          <FlexWidget
            style={{
              flex: 1,
              width: 'match_parent',
              backgroundColor: C.panel,
              borderRadius: compact ? 14 : 20,
              padding: compact ? 10 : 14,
              flexDirection: 'column',
              justifyContent: 'space-between',
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
                paddingHorizontal: 4,
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
                maxLines={compact ? 3 : 4}
              />
            </FlexWidget>
            {lead ? (
              <FlexWidget
                style={{
                  flexDirection: 'row',
                  width: 'match_parent',
                  justifyContent: 'space-between',
                }}
              >
                <FlexWidget
                  style={{
                    flex: 1,
                    backgroundColor: C.skip,
                    borderRadius: 12,
                    paddingVertical: compact ? 6 : 8,
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
                    paddingVertical: compact ? 6 : 8,
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
                style={{ fontSize: 12, fontWeight: '600', color: C.on, textAlign: 'center', width: 'match_parent' }}
                maxLines={1}
                clickAction="OPEN_URI"
                clickActionData={{ uri: tonightUri }}
              />
            )}
          </FlexWidget>
          {buddyId ? (
            <FlexWidget
              style={{
                flex: 1,
                width: 'match_parent',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-end',
                paddingTop: compact ? 4 : 6,
                paddingRight: compact ? 2 : 4,
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
