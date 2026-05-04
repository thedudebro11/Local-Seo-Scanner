/**
 * Generates build/icon.ico (Windows), build/icon.icns (macOS), and
 * build/icon.png (Linux) from a programmatic 1024×1024 source image.
 *
 * Run once before packaging:  node scripts/build-icons.cjs
 *
 * Replace the pixel-drawing section below with your real logo once you have
 * a designer-provided PNG — just swap in that file's buffer instead.
 */

const { Jimp } = require('jimp')
const png2icons = require('png2icons')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const BUILD_DIR = path.join(ROOT, 'build')

const BRAND    = 0x4f46e5ff   // indigo-600
const DARK     = 0x0f172aff   // slate-900
const WHITE    = 0xffffffff

const SIZE = 1024
const CX   = SIZE / 2
const CY   = SIZE / 2

async function main() {
  fs.mkdirSync(BUILD_DIR, { recursive: true })

  // ── Build the source image ─────────────────────────────────────────────────
  const img = new Jimp({ width: SIZE, height: SIZE, color: BRAND })

  // Dark rounded-square inset (inner card feel)
  const INSET = 160
  const RADIUS = 120
  img.scan((x, y) => {
    const inBox =
      x >= INSET && x < SIZE - INSET &&
      y >= INSET && y < SIZE - INSET

    if (!inBox) return

    // Corner rounding
    const cx = x < INSET + RADIUS ? INSET + RADIUS : x > SIZE - INSET - RADIUS ? SIZE - INSET - RADIUS : x
    const cy = y < INSET + RADIUS ? INSET + RADIUS : y > SIZE - INSET - RADIUS ? SIZE - INSET - RADIUS : y
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

    if (dist <= RADIUS || (x >= INSET + RADIUS && x <= SIZE - INSET - RADIUS) || (y >= INSET + RADIUS && y <= SIZE - INSET - RADIUS)) {
      img.setPixelColor(DARK, x, y)
    }
  })

  // White "signal bars" — three rectangles of increasing height (SEO/ranking motif)
  const barW  = 80
  const barGap = 32
  const barMaxH = 300
  const barsY = CY + 60
  const bars = [
    { h: barMaxH * 0.45 },
    { h: barMaxH * 0.75 },
    { h: barMaxH * 1.00 },
  ]
  const totalW = bars.length * barW + (bars.length - 1) * barGap
  let bx = CX - totalW / 2

  for (const bar of bars) {
    const top = barsY - bar.h
    for (let px = Math.round(bx); px < Math.round(bx + barW); px++) {
      for (let py = Math.round(top); py < Math.round(barsY); py++) {
        if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
          img.setPixelColor(WHITE, px, py)
        }
      }
    }
    bx += barW + barGap
  }

  // White circle (magnifying glass head) above the bars
  const mR = 110
  const mX = CX
  const mY = CY - 130
  const strokeW = 22
  img.scan((x, y) => {
    const d = Math.sqrt((x - mX) ** 2 + (y - mY) ** 2)
    if (d >= mR - strokeW && d <= mR) {
      img.setPixelColor(WHITE, x, y)
    }
  })
  // Handle
  const handleLen = 90
  const handleAngle = Math.PI / 4   // 45°
  for (let t = mR; t <= mR + handleLen; t++) {
    for (let s = -strokeW / 2; s <= strokeW / 2; s++) {
      const hx = Math.round(mX + t * Math.cos(handleAngle) + s * Math.cos(handleAngle + Math.PI / 2))
      const hy = Math.round(mY + t * Math.sin(handleAngle) + s * Math.sin(handleAngle + Math.PI / 2))
      if (hx >= 0 && hx < SIZE && hy >= 0 && hy < SIZE) {
        img.setPixelColor(WHITE, hx, hy)
      }
    }
  }

  // ── Save PNG (Linux icon + source) ────────────────────────────────────────
  const pngPath = path.join(BUILD_DIR, 'icon.png')
  await img.write(pngPath)
  console.log('✓ icon.png written')

  // ── Convert to ICO (Windows) ───────────────────────────────────────────────
  const pngBuffer = await img.getBuffer('image/png')
  const ico = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, true, true)
  if (!ico) throw new Error('png2icons: ICO conversion failed')
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico)
  console.log('✓ icon.ico written')

  // ── Convert to ICNS (macOS) ────────────────────────────────────────────────
  const icns = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0)
  if (!icns) throw new Error('png2icons: ICNS conversion failed')
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.icns'), icns)
  console.log('✓ icon.icns written')

  console.log('\nDone. Replace build/icon.png with your real logo and re-run to regenerate.')
}

main().catch((err) => { console.error(err); process.exit(1) })
