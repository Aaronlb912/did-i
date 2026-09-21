// Screenshot web vs native fixtures at 390px and pixel-diff them.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { VISUAL_TARGETS, VISUAL_URL } from './targets.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '../..')
const outDir = path.join(__dirname, 'output')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // retry
    }
    await sleep(500)
  }
  throw new Error(`visual server did not start: ${url}`)
}

function startVite() {
  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteBin, '--config', 'vite.visual.config.js', '--host', '127.0.0.1', '--port', '48743'], {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, VITE_WEB_APP_PUBLIC: 'true' },
  })
  child.stdout?.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk))
  return child
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file))
}

function writeDiff(a, b, outPath) {
  const width = Math.max(a.width, b.width)
  const height = Math.max(a.height, b.height)
  const left = new PNG({ width, height })
  const right = new PNG({ width, height })
  const diff = new PNG({ width, height })
  left.data.fill(0)
  right.data.fill(0)
  PNG.bitblt(a, left, 0, 0, a.width, a.height, 0, 0)
  PNG.bitblt(b, right, 0, 0, b.width, b.height, 0, 0)
  const mismatched = pixelmatch(left.data, right.data, diff.data, width, height, {
    threshold: 0.12,
    includeAA: true,
  })
  fs.writeFileSync(outPath, PNG.sync.write(diff))
  return mismatched / (width * height)
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const vite = startVite()
  let failed = 0

  try {
    await waitForServer(VISUAL_URL)
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
    await page.goto(VISUAL_URL, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.documentElement.getAttribute('data-visual-ready') === '1')
    await page.evaluate(() => document.fonts.ready)

    for (const target of VISUAL_TARGETS) {
      const webPath = path.join(outDir, `${target.id}-web.png`)
      const nativePath = path.join(outDir, `${target.id}-native.png`)
      const diffPath = path.join(outDir, `${target.id}-diff.png`)

      await page.locator(target.web).screenshot({ path: webPath })
      await page.locator(target.native).screenshot({ path: nativePath })

      const ratio = writeDiff(readPng(webPath), readPng(nativePath), diffPath)
      const ok = ratio <= target.maxDiffRatio
      const pct = (ratio * 100).toFixed(2)
      const cap = (target.maxDiffRatio * 100).toFixed(0)
      if (ok) {
        console.log(`ok   ${target.id} ${pct}% diff (cap ${cap}%)`)
      } else {
        failed += 1
        console.error(`FAIL ${target.id} ${pct}% diff exceeds ${cap}% — see ${diffPath}`)
      }
    }

    await browser.close()
  } finally {
    vite.kill('SIGTERM')
  }

  if (failed) process.exit(1)
  console.log(`\n${VISUAL_TARGETS.length - failed} of ${VISUAL_TARGETS.length} fixtures matched`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
