// Generates StageTimer's PNG icons into public/ with no dependencies (node:zlib only):
// a white countdown ring on black whose last sixth is red (overtime). Everything sits inside
// the central 80%, so the 512 icon is also a valid maskable icon.
// iOS never updates an installed app's icon, so change this before the band installs it.
// Usage: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, draw) {
  const stride = size * 3 + 1
  const raw = Buffer.alloc(size * stride)
  const SS = 4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const [pr, pg, pb] = draw((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)
        r += pr; g += pg; b += pb
      }
      const o = y * stride + 1 + x * 3
      raw[o] = Math.round(r / SS / SS); raw[o + 1] = Math.round(g / SS / SS); raw[o + 2] = Math.round(b / SS / SS)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const WHITE = [255, 255, 255]
const RED = [255, 69, 58]
const BLACK = [0, 0, 0]
const R = 0.31, W = 0.075 // ring radius and stroke width (outer edge 0.3475 < 0.4 safe zone)
const GAP = 0.035 // radians of black between the white and red parts

function icon(u, v) {
  const dx = u - 0.5, dy = v - 0.5
  const d = Math.hypot(dx, dy)
  if (Math.abs(d - R) > W / 2) return BLACK
  let a = Math.atan2(dx, -dy) // 0 at 12 o'clock, clockwise
  if (a < 0) a += 2 * Math.PI
  const redStart = (5 / 6) * 2 * Math.PI
  if (a < GAP || (a > redStart - GAP && a < redStart + GAP)) return BLACK
  return a > redStart ? RED : WHITE
}

for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(join(outDir, name), png(size, icon))
  console.log('wrote', join('public', name))
}
