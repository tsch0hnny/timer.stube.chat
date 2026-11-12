// Generates the spike's PNG icons with no dependencies (node:zlib only).
// Orange ring + hand on black, so the spike icon is never confused with the real app.
// Usage: node spike/tools/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

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
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const SS = 4 // 4x4 supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb] = draw((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)
          r += pr; g += pg; b += pb
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = Math.round(r / SS / SS)
      raw[o + 1] = Math.round(g / SS / SS)
      raw[o + 2] = Math.round(b / SS / SS)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: RGB (opaque, as iOS wants for apple-touch-icon)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const ORANGE = [255, 159, 10]
const BLACK = [0, 0, 0]
// Everything stays inside the central 80% so the 512 icon is also a valid maskable icon.
function spikeIcon(u, v) {
  const dx = u - 0.5, dy = v - 0.5
  const d = Math.hypot(dx, dy)
  if (Math.abs(d - 0.33) < 0.045) return ORANGE // ring
  if (Math.abs(dx) < 0.03 && dy < 0 && dy > -0.24) return ORANGE // hand pointing to 12
  if (d < 0.05) return ORANGE // hub
  return BLACK
}

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  writeFileSync(join(outDir, name), png(size, spikeIcon))
  console.log('wrote', join('spike/public/icons', name))
}
