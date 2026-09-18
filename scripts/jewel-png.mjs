import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function crc(buf) {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tag, data) {
  const body = Buffer.concat([Buffer.from(tag), data])
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc(body), 8 + data.length)
  return out
}

function png(width, height, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const rows = []
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]))
    rows.push(pixels.subarray(y * width * 4, (y + 1) * width * 4))
  }
  const raw = Buffer.concat(rows)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function fillCircle(buf, size, cx, cy, radius, color) {
  const r2 = radius * radius
  for (let y = Math.floor(cy - radius); y <= cy + radius; y += 1) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= r2) {
        const i = (y * size + x) * 4
        buf[i] = color[0]
        buf[i + 1] = color[1]
        buf[i + 2] = color[2]
        buf[i + 3] = 255
      }
    }
  }
}

function jewel(size) {
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 0x1c
    buf[i + 1] = 0x14
    buf[i + 2] = 0x10
    buf[i + 3] = 255
  }
  const c = size / 2
  fillCircle(buf, size, c, c, size * 0.38, [0x2a, 0x24, 0x1c])
  fillCircle(buf, size, c, c, size * 0.3, [0xe6, 0xa2, 0x3c])
  fillCircle(buf, size, c - size * 0.08, c - size * 0.08, size * 0.1, [0xf6, 0xc8, 0x6a])
  return png(size, size, buf)
}

mkdirSync(PUBLIC, { recursive: true })
writeFileSync(join(PUBLIC, 'icon-192.png'), jewel(192))
writeFileSync(join(PUBLIC, 'icon-512.png'), jewel(512))
writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), jewel(180))
writeFileSync(join(PUBLIC, 'icon-1024.png'), jewel(1024))
console.log('wrote hall jewels')
