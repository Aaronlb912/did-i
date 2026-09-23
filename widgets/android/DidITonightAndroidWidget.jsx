import React from 'react'
import { FlexWidget, OverlapWidget, TextWidget } from 'react-native-android-widget'

const COAT = {
  cat: { body: '#f0a64a', belly: '#ffe8c8', ear: '#f0a64a' },
  dog: { body: '#c68b52', belly: '#f3ddc4', ear: '#9a6538' },
  rabbit: { body: '#b8b8c8', belly: '#e8e8f0', ear: '#f0b8c8' },
  owl: { body: '#8b6b4a', belly: '#d4c4a8', ear: '#6b5038' },
}

function BuddyMark({ id }) {
  const coat = COAT[id]
  if (!coat) return null
  const eye = id === 'owl' ? '#f0e080' : '#2d241c'
  const tall = id === 'rabbit'
  return (
    <OverlapWidget style={{ width: 36, height: 44 }}>
      {tall ? (
        <>
          <FlexWidget style={{ width: 7, height: 16, borderRadius: 4, backgroundColor: coat.body, marginLeft: 8 }} />
          <FlexWidget style={{ width: 7, height: 16, borderRadius: 4, backgroundColor: coat.body, marginLeft: 21 }} />
        </>
      ) : (
        <>
          <FlexWidget style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: coat.ear, marginLeft: 4, marginTop: 6 }} />
          <FlexWidget style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: coat.ear, marginLeft: 22, marginTop: 6 }} />
        </>
      )}
      <FlexWidget style={{ width: 28, height: 22, borderRadius: 14, backgroundColor: coat.body, marginLeft: 4, marginTop: 14 }} />
      <FlexWidget style={{ width: 16, height: 12, borderRadius: 8, backgroundColor: coat.belly, marginLeft: 10, marginTop: 20 }} />
      <FlexWidget style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: eye, marginLeft: 11, marginTop: 20 }} />
      <FlexWidget style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: eye, marginLeft: 20, marginTop: 20 }} />
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
  const id = String(p.leadLampId || '').trim()
  if (id) {
    const hit = (p.items || []).find((item) => item.lampId === id && item.status === 'open')
    if (hit) return hit
  }
  return (p.items || []).find((item) => item.status === 'open') || null
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
  const h = widgetInfo?.height || 120
  const compact = h < 130
  const gem = Boolean(C.gem)
  const lead = leadItem(p)
  const buddyId = String(p.buddyId || '')
  const question =
    String(p.question || '').trim() || lead?.label || p.footer || p.openLabel

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: gem ? C.bg : C.panel,
        flexDirection: 'column',
        padding: gem ? 8 : 0,
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: C.panel,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: C.on,
          padding: compact ? 12 : 16,
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <FlexWidget style={{ width: buddyId ? 36 : 0, height: 1 }} />
          <TextWidget
            text={String(p.tagTitle || 'Did I').toUpperCase()}
            style={{ fontSize: 11, fontWeight: '700', color: C.on, textAlign: 'center', flex: 1 }}
            maxLines={1}
          />
          {buddyId ? <BuddyMark id={buddyId} /> : <FlexWidget style={{ width: 0, height: 1 }} />}
        </FlexWidget>
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: tonightUri }}
        >
          <TextWidget
            text={lead ? question : p.footer || p.openLabel}
            style={{
              fontSize: lead ? (compact ? 16 : 22) : 14,
              fontWeight: lead ? '700' : '500',
              color: lead ? C.ink : C.inkSoft,
              textAlign: 'center',
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
                paddingVertical: 8,
                marginRight: 6,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              clickAction="ANSWER"
              clickActionData={{ lampId: lead.lampId, kind: 'nope' }}
            >
              <TextWidget
                text={p.nopeLabel || 'Did not'}
                style={{ fontSize: 14, fontWeight: '700', color: C.ink, textAlign: 'center' }}
                maxLines={1}
              />
            </FlexWidget>
            <FlexWidget
              style={{
                flex: 1,
                backgroundColor: C.on,
                borderRadius: 12,
                paddingVertical: 8,
                marginLeft: 6,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              clickAction="ANSWER"
              clickActionData={{ lampId: lead.lampId, kind: 'did' }}
            >
              <TextWidget
                text={p.didLabel || 'Did'}
                style={{ fontSize: 14, fontWeight: '700', color: C.bg, textAlign: 'center' }}
                maxLines={1}
              />
            </FlexWidget>
          </FlexWidget>
        ) : (
          <TextWidget
            text={p.openLabel}
            style={{ fontSize: 12, fontWeight: '600', color: C.on, textAlign: 'center' }}
            maxLines={1}
            clickAction="OPEN_URI"
            clickActionData={{ uri: tonightUri }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  )
}
