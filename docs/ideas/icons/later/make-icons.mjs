// App icons, the Android adaptive layer and the splash Iffy, from one drawing:
// three glossy question marks on slate, the middle one is Iffy. Light from the top left.
// Run: node scripts/make-icons.mjs
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url))
const Q = 'M64 76 C64 30 136 30 136 76 C136 104 100 106 100 130' // the hook, 200-unit space
const W = 36 // stroke

// One question mark in 200-unit space; `face` adds Iffy's eyes.
function mark(id, face) {
  return `
  <g>
    <ellipse cx="102" cy="190" rx="34" ry="7" fill="#05070c" opacity=".55" filter="url(#soft6)"/>
    <path d="${Q}" fill="none" stroke="url(#deep)" stroke-width="${W}" stroke-linecap="round"/>
    <path d="${Q}" transform="translate(-2.4 -3)" fill="none" stroke="url(#body)" stroke-width="${W - 5}" stroke-linecap="round" filter="url(#soft1)"/>
    <path d="${Q}" transform="translate(5 6)" fill="none" stroke="#e8ff9a" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" mask="url(#rim-${id})"/>
    <path d="M71 82 C68 66 72 52 84 44" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round" filter="url(#soft2)"/>
    <path d="M73 74 C72 66 74 59 79 53" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M118 40 C126 44 131 50 133 58" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round" filter="url(#soft2)"/>
    <circle cx="101.5" cy="170" r="18" fill="url(#deep)"/>
    <circle cx="100" cy="168" r="17" fill="url(#sphere)"/>
    <ellipse cx="93" cy="161" rx="5.5" ry="4" fill="#fff" opacity=".8" filter="url(#soft1)"/>
    <circle cx="92" cy="160" r="1.8" fill="#fff"/>
    ${face ? eyes() : ''}
  </g>`
}

// Iffy's eyes, looking up a little: shaded whites, pupils with depth, two catchlights.
function eyes() {
  const one = (x) => `
    <circle cx="${x}" cy="45" r="11.5" fill="#0d1a05" opacity=".35" filter="url(#soft1)" transform="translate(0.8 1.6)"/>
    <circle cx="${x}" cy="44" r="11.2" fill="url(#white)"/>
    <circle cx="${x}" cy="44" r="11.2" fill="none" stroke="#3d5410" stroke-opacity=".45" stroke-width="1.1"/>
    <circle cx="${x + 1}" cy="40.5" r="5.6" fill="url(#pupil)"/>
    <circle cx="${x + 3}" cy="38.4" r="1.9" fill="#fff"/>
    <circle cx="${x - 0.6}" cy="43" r="0.9" fill="#fff" opacity=".8"/>`
  return one(88) + one(112)
}

const DEFS = `<defs>
    <radialGradient id="bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#454c62"/><stop offset=".6" stop-color="#343a4c"/><stop offset="1" stop-color="#232837"/></radialGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c9f24d" stop-opacity=".22"/><stop offset="1" stop-color="#c9f24d" stop-opacity="0"/></radialGradient>
    <linearGradient id="body" x1=".15" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#f1ff9e"/><stop offset=".35" stop-color="#d9fb5e"/><stop offset=".75" stop-color="#bde640"/><stop offset="1" stop-color="#a6d02e"/></linearGradient>
    <linearGradient id="deep" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#9cc52a"/><stop offset="1" stop-color="#5f7d12"/></linearGradient>
    <radialGradient id="sphere" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#f4ffb0"/><stop offset=".45" stop-color="#cdf250"/><stop offset=".85" stop-color="#93bb22"/><stop offset="1" stop-color="#7a9c18"/></radialGradient>
    <radialGradient id="white" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".75" stop-color="#f3f5f0"/><stop offset="1" stop-color="#d9decf"/></radialGradient>
    <radialGradient id="pupil" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#3a3f4a"/><stop offset=".6" stop-color="#14161b"/><stop offset="1" stop-color="#050608"/></radialGradient>
    <radialGradient id="vig" cx=".5" cy=".45" r=".72"><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <filter id="soft1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.8"/></filter>
    <filter id="soft2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="soft6" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="5"/></filter>
    ${['l', 'm', 'r'].map((id) => `<mask id="rim-${id}"><rect x="0" y="0" width="200" height="200" fill="#000"/><path d="M120 60 L200 60 L200 200 L90 200 Z" fill="#fff"/></mask>`).join('')}
  </defs>`

// bg: the slate square with glow and vignette. scale: pull the marks toward the
// middle (Android adaptive icons only promise the center 66%). solo: Iffy alone.
// marks: false leaves only the background (the adaptive icon's back layer).
function icon({ bg = true, scale = 1, solo = false, marks = true, round = false } = {}) {
  const k = (1 - scale) * 512
  const sides = solo
    ? ''
    : `<svg x="70" y="372" width="360" height="360" viewBox="0 0 200 200" overflow="visible"><g transform="rotate(-14 100 120)" opacity=".96">${mark('l', false)}</g></svg>
  <svg x="594" y="372" width="360" height="360" viewBox="0 0 200 200" overflow="visible"><g transform="rotate(16 100 120)" opacity=".96">${mark('r', false)}</g></svg>`
  const box = solo ? 'x="112" y="70" width="800" height="800"' : 'x="262" y="262" width="500" height="500"'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  ${DEFS}
  ${round ? '<clipPath id="round"><circle cx="512" cy="512" r="512"/></clipPath><g clip-path="url(#round)">' : ''}
  ${bg ? '<rect width="1024" height="1024" fill="url(#bg)"/><circle cx="512" cy="470" r="330" fill="url(#glow)"/>' : ''}
  ${marks ? `<g transform="translate(${k} ${k}) scale(${scale})">${sides}<svg ${box} viewBox="0 0 200 200" overflow="visible">${mark('m', true)}</svg></g>` : ''}
  ${bg ? '<rect width="1024" height="1024" fill="url(#vig)"/>' : ''}
  ${round ? '</g>' : ''}
</svg>`
}

const OUTPUTS = [
  ['native/assets/icon.png', 1024, icon()],
  ['native/assets/adaptive-icon.png', 1024, icon({ bg: false, scale: 0.62 })],
  ['native/assets/adaptive-bg.png', 1024, icon({ marks: false })],
  ['native/assets/splash-iffy.png', 512, icon({ bg: false, solo: true })],
  ['public/icon-1024.png', 1024, icon()],
  ['public/icon-512.png', 512, icon()],
  ['public/icon-192.png', 192, icon()],
  ['public/apple-touch-icon.png', 180, icon()],
]

// The committed android/ project: launcher icons (PNG data in .webp names, as
// prebuild left them), the adaptive layers and the splash logo per density.
const RES = 'android/app/src/main/res/'
for (const [dpi, n] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
  OUTPUTS.push(
    [`${RES}mipmap-${dpi}/ic_launcher.webp`, 48 * n, icon()],
    [`${RES}mipmap-${dpi}/ic_launcher_round.webp`, 48 * n, icon({ round: true })],
    [`${RES}mipmap-${dpi}/ic_launcher_foreground.webp`, 108 * n, icon({ bg: false, scale: 0.62 })],
    [`${RES}mipmap-${dpi}/ic_launcher_background.webp`, 108 * n, icon({ marks: false })],
    [`${RES}drawable-${dpi}/splashscreen_logo.png`, 288 * n, icon({ bg: false, solo: true, scale: 0.6 })],
  )
}

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, px, svg] of OUTPUTS) {
  await page.setViewportSize({ width: px, height: px })
  await page.setContent(`<html><body style="margin:0;background:transparent;width:${px}px;height:${px}px">${svg}</body></html>`)
  await page.screenshot({ path: ROOT + file, clip: { x: 0, y: 0, width: px, height: px }, omitBackground: true })
  console.log('made', file)
}
await browser.close()
