/**
 * Generates the PWA launcher icons (192 + 512) without any image dependency:
 * a valid PNG encoder on top of node:zlib. Design: full-bleed brand indigo
 * (maskable-safe) with a white open-book mark whose pages dip toward the spine.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const iconsDir = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'public',
  'icons',
)
mkdirSync(iconsDir, { recursive: true })

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function png(size, pixelAt) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = [79, 70, 229, 255] // #4F46E5
const FG = [255, 255, 255, 255]

/** White open book: two page slabs meeting in a V at the spine. */
function inGlyph(x, y, size) {
  const cx = size / 2
  const gap = size * 0.03
  const pageW = size * 0.225
  const top = size * 0.32
  const bottom = size * 0.72
  const drop = size * 0.06

  if (y < top || y > bottom + drop) return false
  const innerL = cx - gap / 2
  const innerR = cx + gap / 2
  if (x >= innerL && x <= innerR) return false // spine

  let p // 0 at the spine, 1 at the outer edge
  if (x < innerL) {
    if (x < innerL - pageW) return false
    p = (innerL - x) / pageW
  } else {
    if (x > innerR + pageW) return false
    p = (x - innerR) / pageW
  }
  const dip = drop * (1 - p)
  return y >= top + dip && y <= bottom + dip
}

function makeIcon(size) {
  return png(size, (x, y) => (inGlyph(x, y, size) ? FG : BG))
}

for (const size of [512, 192]) {
  const file = path.join(iconsDir, `icon-${size}.png`)
  writeFileSync(file, makeIcon(size))
  console.log(`wrote ${file} (${writeFileSync.length ? '' : ''}${size}x${size})`)
}
