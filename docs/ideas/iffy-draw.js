// Iffy drawing system, shared by mascot-sheet.html and iffy-in-app.html.
const LIME = '#c9f24d'
const DEEP = '#7fa21a'
const fillOf = (c) => (c === LIME ? 'url(#huhBody)' : c)
const dotOf = (c) => (c === LIME ? 'url(#huhDot)' : c)
const shadeOf = (c) => (c === LIME ? DEEP : 'rgba(0,0,0,.28)')

// Big eyes only. No mouth, no cheeks: the body does the rest of the acting.
// Local units: eyes 17 apart, white r8, pupil r4 with a shine.
function face({ e = 'normal' }) {
  const eye = (x) => {
    const W = (r = 8) => `<circle cx="${x}" cy="0" r="${r}" fill="#fff"/>`
    const P = (dx = 0, dy = 0, r = 4) => `<circle cx="${x + dx}" cy="${dy}" r="${r}" fill="#111"/><circle cx="${x + dx + 1.5}" cy="${dy - 1.6}" r="1.4" fill="#fff"/>`
    const arc = (up) => `<path d="M${x - 7} ${up ? 2 : -1} q7 ${up ? -9 : 7} 14 0" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round"/>`
    // Heavy lids: the top of the eye is covered by the body color.
    // The lid is the top half of the eye's own circle, so it never pokes out.
    const lid = () => `<path d="M${x - 8.4} 0.5 A8.4 8.4 0 0 1 ${x + 8.4} 0.5 Z" fill="#b9e43c"/><path d="M${x - 8} 0.5 H${x + 8}" stroke="#111" stroke-width="2.4" stroke-linecap="round"/>`
    switch (e) {
      case 'up': return W() + P(0.6, -3)
      case 'side': return W() + P(3.2, 0)
      case 'down': return W() + P(0, 3)
      case 'wide': return W(9.5) + P(0, 0, 3.6)
      case 'happy': return arc(true)
      case 'closed': return arc(false)
      case 'wink': return x < 0 ? W() + P(1, 0) : arc(true)
      case 'half': return W() + P(0, 3.2) + lid()
      case 'worried': return W() + P(0, 2.5) + `<path d="M${x < 0 ? x - 8 : x + 8} -13 L${x < 0 ? x + 6 : x - 6} -9.5" stroke="#111" stroke-width="2.8" stroke-linecap="round"/>`
      default: return W() + P(0.8, -0.5)
    }
  }
  return eye(-8.5) + eye(8.5)
}

// A shape: its stroke path, width, optional dot, the face anchor and a gloss path.
function draw({ d, w, dot, anchor, gloss, color = LIME, e, m, blush, tilt = 0, dx = 0, shadow = [100, 186, 38], extra = '', joinRound = true }) {
  const [ax, ay, aa, sc = 1] = anchor
  const j = joinRound ? ' stroke-linejoin="round"' : ''
  const dotSvg = dot ? `<circle cx="${dot[0] + 2.5}" cy="${dot[1] + 3.5}" r="${dot[2]}" fill="${shadeOf(color)}"/><circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2]}" fill="${dotOf(color)}"/><circle cx="${dot[0] - dot[2] * 0.32}" cy="${dot[1] - dot[2] * 0.36}" r="${dot[2] * 0.26}" fill="#fff" opacity=".6"/>` : ''
  return `<svg viewBox="0 0 200 200"><ellipse cx="${shadow[0] + dx}" cy="${shadow[1]}" rx="${shadow[2]}" ry="6" fill="#000" opacity=".35"/>
  <g transform="translate(${dx} 0) rotate(${tilt} 100 120)">
    <path d="${d}" transform="translate(2.5 4)" fill="none" stroke="${shadeOf(color)}" stroke-width="${w}" stroke-linecap="round"${j}/>
    <path d="${d}" fill="none" stroke="${fillOf(color)}" stroke-width="${w}" stroke-linecap="round"${j}/>
    ${gloss ? `<path d="${gloss}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4.5" stroke-linecap="round"/>` : ''}
    ${dotSvg}
    <g transform="translate(${ax} ${ay}) rotate(${aa}) scale(${sc})">${face({ e, m, blush })}</g>
  </g>${extra}</svg>`
}

// The shapes. Face anchors sit on the widest straight-ish part of each.
const SHAPES = {
  q: { d: 'M64 76 C64 30 136 30 136 76 C136 104 100 106 100 130', w: 36, dot: [100, 168, 18], anchor: [100, 45, 0, 1.4], gloss: 'M72 88 C68 70 70 58 77 50' },
  check: { d: 'M40 108 L80 148 L160 58', w: 38, anchor: [126, 94, 0, 1.3], gloss: 'M50 101 L72 123' },
  flat: { d: 'M28 146 L62 172 L162 146', w: 36, anchor: [128, 155, 0, 1.15], gloss: 'M38 140 L58 156', shadow: [96, 190, 64] },
  swing: { d: 'M68 84 C70 42 142 38 140 78 C140 108 102 112 98 140', w: 36, dot: [97, 174, 17], anchor: [104, 47, 4, 1.4], gloss: 'M76 96 C72 76 76 62 84 54' },
  straighten: { d: 'M54 112 Q72 136 86 152 Q118 104 154 64', w: 37, dot: [66, 176, 13], anchor: [125, 100, 0, 1.25] },
  joins: { d: 'M42 110 L81 149 L158 60', w: 38, dot: [50, 158, 9], anchor: [126, 95, 0, 1.3] },
  // Body language: the shape changes with the mood.
  curl: { d: 'M74 86 C74 54 126 54 126 86 C126 106 100 108 100 124', w: 36, dot: [100, 156, 17], anchor: [100, 62, 0, 1.3], gloss: 'M80 94 C78 80 80 70 86 64', shadow: [100, 180, 30] },
  tall: { d: 'M64 66 C64 16 136 16 136 66 C136 102 100 110 100 138', w: 34, dot: [100, 174, 17], anchor: [100, 33, 0, 1.35], gloss: 'M72 80 C68 58 70 46 77 38' },
  hop: { d: 'M64 60 C64 14 136 14 136 60 C136 88 100 90 100 114', w: 36, dot: [100, 172, 18], anchor: [100, 29, 0, 1.4], gloss: 'M72 72 C68 54 70 42 77 34', shadow: [100, 192, 26] },
  proud: { d: 'M36 112 L78 156 L170 34', w: 38, anchor: [132, 87, 0, 1.3], gloss: 'M46 105 L68 128', shadow: [100, 190, 46] },
}
const q = (o = {}) => draw({ ...SHAPES.q, ...o })
const c = (o = {}) => draw({ ...SHAPES.check, m: 'smile', ...o })
const sparkle = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -12 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 l9 -3z" fill="#ffd166"/>`
const moon = '<circle cx="160" cy="40" r="17" fill="#fff4cf"/><circle cx="168" cy="34" r="15" fill="#16191f"/>'
const zz = '<text x="104" y="118" font-family="Inter" font-weight="800" font-size="20" fill="#a3abb8">z</text><text x="120" y="100" font-family="Inter" font-weight="800" font-size="26" fill="#a3abb8">z</text>'
const sleep = draw({ ...SHAPES.flat, e: 'closed', m: 'none', extra: moon + zz })

