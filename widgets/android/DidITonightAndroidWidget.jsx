import React from 'react'
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget'

// The exact markup native/components/BuddyArt.jsx's `BuddyArt` renders (not
// the boxy `BuddyPlain` fallback) — SvgWidget draws real SVG, so the widget
// buddy can be pixel-identical to the in-app one instead of an approximation.
const BUDDY_SVG = {
  cat: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="30" rx="15" ry="14" fill="#f0a64a"/>
    <ellipse cx="24" cy="32" rx="11" ry="9" fill="#ffe8c8" opacity="0.85"/>
    <polygon points="10,18 14,8 18,19" fill="#f0a64a"/>
    <polygon points="30,19 34,8 38,18" fill="#f0a64a"/>
    <polygon points="11,17 14,10 16,18" fill="#ffd4a8"/>
    <polygon points="32,18 34,10 37,17" fill="#ffd4a8"/>
    <ellipse cx="18" cy="28" rx="2.2" ry="3" fill="#2d241c"/>
    <ellipse cx="30" cy="28" rx="2.2" ry="3" fill="#2d241c"/>
    <ellipse cx="18.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="30.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <path d="M24 31 L22 34 L26 34 Z" fill="#e07a8a"/>
    <line x1="14" y1="33" x2="6" y2="31" stroke="#5c4a3a" stroke-width="0.9"/>
    <line x1="14" y1="35" x2="6" y2="36" stroke="#5c4a3a" stroke-width="0.9"/>
    <line x1="34" y1="33" x2="42" y2="31" stroke="#5c4a3a" stroke-width="0.9"/>
    <line x1="34" y1="35" x2="42" y2="36" stroke="#5c4a3a" stroke-width="0.9"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#f0a64a"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#f0a64a"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#ffe8c8"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#ffe8c8"/>
  </svg>`,
  dog: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="30" rx="15" ry="14" fill="#c68b52"/>
    <ellipse cx="24" cy="34" rx="8" ry="6.5" fill="#f3ddc4"/>
    <ellipse cx="11" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(-18 11 24)"/>
    <ellipse cx="37" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(18 37 24)"/>
    <ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c"/>
    <ellipse cx="19" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="31" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9"/>
    <ellipse cx="24" cy="33.5" rx="3.2" ry="2.4" fill="#2d241c"/>
    <path d="M22 36 Q24 40 26 36" fill="#e07a8a"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#c68b52"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#c68b52"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#f3ddc4"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#f3ddc4"/>
  </svg>`,
  rabbit: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="17" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(-8 17 12)"/>
    <ellipse cx="31" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(8 31 12)"/>
    <ellipse cx="17" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(-8 17 12)"/>
    <ellipse cx="31" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(8 31 12)"/>
    <ellipse cx="24" cy="32" rx="14" ry="13" fill="#b8b8c8"/>
    <ellipse cx="24" cy="34" rx="9" ry="8" fill="#e8e8f0"/>
    <ellipse cx="18" cy="29" rx="2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="30" cy="29" rx="2" ry="2.8" fill="#2d241c"/>
    <ellipse cx="18.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <ellipse cx="30.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <ellipse cx="24" cy="33" rx="2" ry="1.5" fill="#f0b8c8"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#e8e8f0"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#e8e8f0"/>
  </svg>`,
  owl: `<svg viewBox="0 0 48 58" xmlns="http://www.w3.org/2000/svg">
    <polygon points="14,14 16,6 18,15" fill="#6b5038"/>
    <polygon points="30,15 32,6 34,14" fill="#6b5038"/>
    <ellipse cx="24" cy="32" rx="14" ry="13" fill="#8b6b4a"/>
    <ellipse cx="24" cy="30" rx="11" ry="10" fill="#d4c4a8"/>
    <ellipse cx="18" cy="28" rx="4" ry="4.5" fill="#f0e080"/>
    <ellipse cx="30" cy="28" rx="4" ry="4.5" fill="#f0e080"/>
    <ellipse cx="18" cy="28" rx="2" ry="2.5" fill="#2d241c"/>
    <ellipse cx="30" cy="28" rx="2" ry="2.5" fill="#2d241c"/>
    <ellipse cx="18.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <ellipse cx="30.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9"/>
    <polygon points="24,31 22,34 26,34" fill="#d4a040"/>
    <ellipse cx="24" cy="38" rx="7" ry="6" fill="#c4a882"/>
    <ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a"/>
    <ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a"/>
    <ellipse cx="17" cy="45" rx="3" ry="2" fill="#c4a882"/>
    <ellipse cx="31" cy="45" rx="3" ry="2" fill="#c4a882"/>
  </svg>`,
}

function BuddyMark({ id, compact }) {
  const svg = BUDDY_SVG[id]
  if (!svg) return null
  const boxW = compact ? 28 : 36
  const boxH = (boxW * 58) / 48
  return <SvgWidget svg={svg} style={{ width: boxW, height: boxH }} />
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

// Greedy word wrap estimate. Roboto bold averages about 0.5em per glyph.
function linesFor(text, fontSize, width) {
  const perLine = Math.max(4, Math.floor(width / (fontSize * 0.5)))
  let lines = 1
  let used = 0
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const len = word.length
    if (used === 0) used = len
    else if (used + 1 + len <= perLine) used += 1 + len
    else {
      lines += 1
      used = len
    }
    while (used > perLine) {
      lines += 1
      used -= perLine
    }
  }
  return lines
}

// Biggest size that fits the whole question in the room the card has, so it
// never cuts off mid-line. Falls back to the size cap when the widget size is
// unknown.
export function fitQuestion(text, max, width, height) {
  if (!(width > 0) || !(height > 0)) return { fontSize: max, lines: 3 }
  for (let size = max; size >= 12; size -= 1) {
    const lines = linesFor(text, size, width)
    if (lines * size * 1.2 <= height) return { fontSize: size, lines }
  }
  return { fontSize: 12, lines: Math.max(1, Math.floor(height / (12 * 1.2))) }
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
  const panelPadH = compact ? 12 : large ? 16 : 14
  const panelPadV = tight ? 8 : compact ? 10 : large ? 14 : 12
  const actionGap = tight ? 6 : 8
  const ringPad = 2
  const outerPad = compact ? 8 : 10
  // Next steps through open questions, or the did-nots once none are open.
  const items = p.items || []
  const openCount = items.filter((item) => item.status === 'open').length
  const browsable = openCount || items.filter((item) => item.status === 'skip').length
  const showNext = Boolean(lead) && browsable > 1 && !tight
  const { w, h } = widgetSize(widgetInfo)
  const buttonH = (tight ? 5 : compact ? 6 : 8) * 2 + (compact ? 13 : 15) * 1.35
  const roomW = w - 2 * (outerPad + ringPad + panelPadH) - 2 * (showBuddy ? (compact ? 28 : 34) : 4)
  const roomH =
    h -
    2 * (outerPad + ringPad + panelPadV) -
    15 -
    (tight ? 2 : 4) -
    (lead ? actionGap * 2 + buttonH : actionGap + 16)
  const fit = lead ? fitQuestion(question, titleSize, roomW, roomH) : { fontSize: titleSize, lines: 2 }
  const questionSize = fit.fontSize
  const questionLines = fit.lines

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
                paddingHorizontal: showNext ? (compact ? 50 : 56) : 0,
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
                  fontSize: questionSize,
                  fontWeight: lead ? '700' : '500',
                  color: lead ? C.ink : C.inkSoft,
                  textAlign: 'center',
                  width: 'match_parent',
                }}
                maxLines={questionLines}
              />
            </FlexWidget>
            {lead
              ? [
                  <FlexWidget
                    key="actions"
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
                  </FlexWidget>,
                ]
              : (
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
          {showNext ? (
            // Top-left, opposite the buddy. Browses the other open questions
            // tonight without answering one.
            <FlexWidget
              style={{
                width: 'match_parent',
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                paddingTop: panelPadV + ringPad - 3,
                paddingLeft: panelPadH + ringPad - 4,
              }}
            >
              <FlexWidget
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.bg,
                  borderWidth: 1,
                  borderColor: C.on,
                  borderRadius: 11,
                  paddingHorizontal: compact ? 7 : 9,
                  paddingVertical: compact ? 2 : 3,
                }}
                clickAction="PEEK"
                clickActionData={{ dir: 'next' }}
              >
                <TextWidget
                  text={`${p.nextLabel || 'Next'} ›`}
                  style={{ fontSize: compact ? 10 : 11, fontWeight: '700', color: C.on }}
                  maxLines={1}
                />
              </FlexWidget>
            </FlexWidget>
          ) : null}
        </OverlapWidget>
      </FlexWidget>
    </FlexWidget>
  )
}
