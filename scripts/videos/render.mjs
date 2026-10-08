// Renders the short videos in video.html to MP4 (1080x1920, 30 fps, no sound).
// Run: node scripts/videos/render.mjs [meds,stove,door]   (needs ffmpeg on PATH)
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(here, '../../docs/videos')
const ICON = 'data:image/png;base64,' + fs.readFileSync(path.join(here, '../../public/icon-512.png')).toString('base64')
const FPS = 30
const SECONDS = 13
const which = (process.argv[2] || 'meds,stove,door').split(',')

fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const v of which) {
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), `did-i-${v}-`))
  await page.goto(pathToFileURL(path.join(here, 'video.html')).href + `?v=${v}`, { waitUntil: 'networkidle' })
  await page.evaluate((src) => (document.getElementById('icon').src = src), ICON)
  await page.evaluate(() => document.fonts.ready)
  for (let f = 0; f < FPS * SECONDS; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS)
    await page.screenshot({ path: path.join(frames, `f${String(f).padStart(4, '0')}.png`) })
  }
  const file = path.join(OUT, `did-i-${v}.mp4`)
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', file], { stdio: 'inherit' })
  fs.rmSync(frames, { recursive: true, force: true })
  if (ff.status !== 0) throw new Error('ffmpeg failed for ' + v)
  console.log('made', file)
}
await browser.close()
