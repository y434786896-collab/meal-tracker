/**
 * 生成 tabBar 用的骰子图标（tab-random.png / tab-random-active.png）
 * 纯 Node 实现 PNG 编码（RGBA + 4x 超采样抗锯齿），无需第三方依赖
 * 运行：node scripts/gen-tab-icons.js
 */
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

// ---------- 最小 PNG 编码器 ----------
const crcTable = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------- 形状 SDF ----------
function roundedRectSDF(x, y, cx, cy, hx, hy, r) {
  const qx = Math.abs(x - cx) - (hx - r)
  const qy = Math.abs(y - cy) - (hy - r)
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

function circleSDF(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r
}

// ---------- 画骰子（4x 超采样） ----------
function drawDice(rgb) {
  const SIZE = 81
  const S = 4 // 超采样倍数
  const W = SIZE * S
  const px = Buffer.alloc(W * W * 4) // 透明底

  const C = 40.5 * S          // 中心
  const HALF = 27 * S         // 骰子半边长
  const RADIUS = 12 * S       // 圆角
  const STROKE = 5 * S        // 描边宽
  const DOT_R = 5.5 * S       // 点半径
  const DOT_OFF = 14 * S      // 点偏离中心距离

  const setPx = (x, y, a) => {
    const i = (y * W + x) * 4
    px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]
    px[i + 3] = Math.max(px[i + 3], a)
  }

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      // 外框（圆角矩形描边）：外 SDF <= 0 且 内 SDF >= -stroke
      const outer = roundedRectSDF(x, y, C, C, HALF, HALF, RADIUS)
      const inner = roundedRectSDF(x, y, C, C, HALF, HALF, RADIUS) + STROKE
      let inside = outer <= 0 && inner >= 0

      // 五个点（⚄ 五点排布）
      if (!inside) {
        const dots = [
          [C, C],
          [C - DOT_OFF, C - DOT_OFF], [C + DOT_OFF, C - DOT_OFF],
          [C - DOT_OFF, C + DOT_OFF], [C + DOT_OFF, C + DOT_OFF]
        ]
        inside = dots.some(([dx, dy]) => circleSDF(x, y, dx, dy, DOT_R) <= 0)
      }

      if (inside) setPx(x, y, 255)
    }
  }

  // 4x4 盒式降采样（抗锯齿）
  const out = Buffer.alloc(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const i = ((y * S + sy) * W + (x * S + sx)) * 4
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3]
        }
      }
      const n = S * S
      const o = (y * SIZE + x) * 4
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n)
    }
  }
  return encodePNG(SIZE, SIZE, out)
}

// ---------- 生成两个状态 ----------
const outDir = path.join(__dirname, '..', 'src', 'static')
fs.writeFileSync(path.join(outDir, 'tab-random.png'), drawDice([153, 153, 153]))        // #999999 未选中
fs.writeFileSync(path.join(outDir, 'tab-random-active.png'), drawDice([76, 175, 80]))     // #4CAF50 选中
console.log('已生成 tab-random.png / tab-random-active.png')
