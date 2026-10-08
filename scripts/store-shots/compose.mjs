// Store screenshots: caption on top, the app screen in a phone frame below.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
const DIR = fileURLToPath(new URL('./raw/', import.meta.url))
const OUT = fileURLToPath(new URL('../../docs/store-shots/', import.meta.url))
const ICON = fileURLToPath(new URL('../../public/icon-512.png', import.meta.url))
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')

const SHOTS = [
  { kicker: 'Did I', big: ['Remember it.', 'Then remember doing it.'], small: 'One question at a time, every night.', screen: 'raw_tonight.png', lime: false },
  { kicker: 'Swipe', big: ['Swipe right', 'for Did.'], small: 'Left for Not yet. That’s the whole app.', screen: 'raw_swipe.png', lime: true },
  { kicker: 'Widgets', big: ['Your home screen', 'remembers.'], small: 'Widgets show what’s done tonight.', widget: true, lime: false },
  { kicker: 'Questions', big: ['Meds, water,', 'texting back.'], small: 'Ask yourself anything.', screen: 'raw_lamps.png', lime: true },
  { kicker: 'Streaks', big: ['Streaks that', 'stay honest.'], small: 'Every night on one calendar.', screen: 'raw_calendar.png', lime: false },
  { kicker: 'Shop', big: ['Make it', 'yours.'], small: 'Frames, looks and a little buddy.', screen: 'raw_shop_buddies.png', lime: true },
]

// The home screen with the real widget layout (widgets/DidITonightWidget.tsx):
// panel card, lime border, tag, question, Not yet and Did.
function widgetScreen() {
  const app = (c) => `<div class="app" style="background:${c}"></div>`
  const apps = ['#2b3140', '#3a2f4f', '#25403a', '#4a3a28', '#283a52', '#3d2a33', '#2f3a2a', '#40303f']
  return `<div class="home">
    <div class="wmed">
      <div class="wk">People</div>
      <div class="wq">Did I text them back?</div>
      <div class="wb"><span class="no">Not yet</span><span class="did">Did</span></div>
    </div>
    <div class="row">
      <div class="wsm"><div class="wk">Health</div><div class="wq sm">Did I take my meds?</div><div class="wb sm"><span class="no">Not yet</span><span class="did">Did</span></div></div>
      <div class="grid4">${apps.slice(0, 3).map(app).join('')}<div class="app icon"><img src="${b64(ICON)}"></div></div>
    </div>
    <div class="grid8">${apps.map(app).join('')}</div>
  </div>`
}

function page(s, W, H) {
  const k = W / 1290
  const phoneW = Math.round(W * 0.74)
  const screen = s.widget ? widgetScreen() : `<img class="shot" src="${b64(DIR + s.screen)}">`
  const bg = s.lime ? '#c9f24d' : '#0e1014'
  const ink = s.lime ? '#0e1014' : '#f4f6fa'
  const soft = s.lime ? 'rgba(14,16,20,.72)' : '#a3abb8'
  const accent = s.lime ? '#0e1014' : '#c9f24d'
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=JetBrains+Mono:wght@700&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${bg}}
body{font-family:Inter,sans-serif;color:${ink};position:relative}
.glow{position:absolute;inset:0;background:${s.lime ? 'radial-gradient(900px 700px at 80% 0%,rgba(255,255,255,.35),transparent 60%)' : 'radial-gradient(900px 700px at 20% 0%,rgba(201,242,77,.16),transparent 60%)'}}
.top{position:absolute;left:${96 * k}px;right:${96 * k}px;top:${150 * k}px}
.kick{display:inline-block;font:700 ${30 * k}px 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;border:${3 * k}px solid ${accent};color:${accent};border-radius:999px;padding:${10 * k}px ${26 * k}px}
h1{font-weight:800;font-size:${124 * k}px;line-height:1.02;letter-spacing:-.025em;margin-top:${44 * k}px}
h1 .a{color:${accent};${s.lime ? `text-decoration:underline;text-decoration-thickness:${10 * k}px;text-underline-offset:${14 * k}px` : ''}}
p{font-weight:500;font-size:${48 * k}px;line-height:1.3;color:${soft};margin-top:${36 * k}px}
.phone{position:absolute;left:50%;transform:translateX(-50%);top:${H * 0.37}px;width:${phoneW}px;height:${phoneW * 2.16}px;border-radius:${110 * k}px;background:#05060a;border:${14 * k}px solid #1d222d;box-shadow:0 ${40 * k}px ${120 * k}px rgba(0,0,0,.45);overflow:hidden}
.bar{height:${120 * k}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${70 * k}px;color:#f4f6fa;font:700 ${38 * k}px Inter;background:#0e1014}
.island{width:${230 * k}px;height:${64 * k}px;background:#000;border-radius:99px}
.shot{width:100%;display:block}
.home{height:100%;padding:${40 * k}px ${44 * k}px;background:radial-gradient(1200px 900px at 30% 10%,#2a2350,transparent 60%),radial-gradient(900px 900px at 90% 80%,#14324a,transparent 60%),#0b0d14;display:flex;flex-direction:column;gap:${40 * k}px}
.wmed{border-radius:${56 * k}px;background:#16191f;border:${5 * k}px solid #c9f24d;padding:${40 * k}px;display:flex;flex-direction:column;align-items:center;gap:${22 * k}px;height:${430 * k}px;justify-content:space-between}
.wk{font:700 ${30 * k}px Inter;letter-spacing:.06em;text-transform:uppercase;color:#c9f24d}
.wq{font:800 ${62 * k}px Inter;text-align:center;color:#f4f6fa;line-height:1.1}
.wq.sm{font-size:${40 * k}px}
.wb{display:flex;gap:${20 * k}px;width:100%}
.wb span{flex:1;text-align:center;border-radius:${26 * k}px;padding:${22 * k}px 0;font:800 ${38 * k}px Inter}
.wb.sm span{font-size:${24 * k}px;padding:${14 * k}px 0;border-radius:${18 * k}px}
.no{background:#3a3f4b;color:#f4f6fa}.did{background:#c9f24d;color:#0e1014}
.row{display:flex;gap:${40 * k}px}
.wsm{flex:1;aspect-ratio:1;border-radius:${56 * k}px;background:#16191f;border:${5 * k}px solid #c9f24d;padding:${30 * k}px;display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.wdone{font:800 ${30 * k}px Inter;color:#0e1014;background:#c9f24d;border-radius:99px;padding:${10 * k}px ${30 * k}px}
.grid4{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:${34 * k}px;padding:${16 * k}px}
.grid8{display:grid;grid-template-columns:repeat(4,1fr);gap:${40 * k}px;padding:0 ${16 * k}px}
.app{aspect-ratio:1;border-radius:${40 * k}px;opacity:.9}
.app.icon{overflow:hidden;opacity:1}.app.icon img{width:100%;height:100%;display:block}
</style></head><body><div class="glow"></div>
<div class="top"><span class="kick">${s.kicker}</span><h1>${s.big[0]}<br><span class="a">${s.big[1]}</span></h1><p>${s.small}</p></div>
<div class="phone"><div class="bar"><span>9:41</span><span class="island"></span><span>●●●</span></div>${screen}</div>
</body></html>`
}

const browser = await chromium.launch()
for (const [dir, W, H] of [['ios', 1290, 2796], ['play', 1080, 2160]]) {
  fs.mkdirSync(OUT + dir, { recursive: true })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  for (const [i, s] of SHOTS.entries()) {
    await p.setContent(page(s, W, H), { waitUntil: 'networkidle' })
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: `${OUT}${dir}/${String(i + 1).padStart(2, '0')}.png` })
  }
  await ctx.close()
  console.log('done', dir)
}
await browser.close()
