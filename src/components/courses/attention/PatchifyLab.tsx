'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

const GRID = 16

// A 16x16 pixel landscape (a tiny homage to a certain rolling green hill).
function pixelColor(x: number, y: number): string {
  const sunDx = x - 12
  const sunDy = y - 3
  if (sunDx * sunDx + sunDy * sunDy <= 4) return '#f4d55a'
  const hillTop = 9 + Math.round(Math.sin(x / 3.2) * 1.6)
  if (y >= hillTop) {
    return (x + y) % 3 === 0 ? '#3d8b37' : '#4aa142'
  }
  const t = y / 10
  const blues = ['#7ec3ef', '#74b9ea', '#6aade4', '#5f9fdd', '#5591d5', '#4a84cd']
  return blues[Math.min(blues.length - 1, Math.floor(t * blues.length))]
}

const PIXELS: string[][] = Array.from({ length: GRID }, (_, y) =>
  Array.from({ length: GRID }, (_, x) => pixelColor(x, y))
)

const PATCH_SIZES = [2, 4, 8]

export default function PatchifyLab() {
  const [patch, setPatch] = useState(4)

  const tokens = useMemo(() => {
    const perSide = GRID / patch
    const list: string[][][] = []
    for (let py = 0; py < perSide; py++) {
      for (let px = 0; px < perSide; px++) {
        const rows: string[][] = []
        for (let y = 0; y < patch; y++) {
          rows.push(PIXELS[py * patch + y].slice(px * patch, px * patch + patch))
        }
        list.push(rows)
      }
    }
    return list
  }, [patch])

  const perSide = GRID / patch
  const nTokens = perSide * perSide
  const CELL = 10
  const IMG = GRID * CELL
  const shown = Math.min(tokens.length, 10)
  const THUMB = 26

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Patchify Lab</span>
        <span className={s.widgetHint}>an image is worth (16/p)² words</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {PATCH_SIZES.map(p => (
            <button key={p} type="button" className={`${s.chip} ${patch === p ? s.chipOn : ''}`} onClick={() => setPatch(p)}>
              {p}×{p} patches
            </button>
          ))}
        </div>
        <svg viewBox={`0 0 ${IMG + 250} ${IMG + 4}`} className={s.labCanvas} role="img" aria-label="Image cut into patches becoming a token sequence">
          {/* the image */}
          {PIXELS.map((row, y) =>
            row.map((c, x) => (
              <rect key={`${x}-${y}`} x={2 + x * CELL} y={2 + y * CELL} width={CELL} height={CELL} fill={c} />
            ))
          )}
          {/* patch grid overlay */}
          {Array.from({ length: perSide + 1 }, (_, i) => (
            <g key={i}>
              <line x1={2 + i * patch * CELL} y1={2} x2={2 + i * patch * CELL} y2={2 + IMG} stroke="#0a0d33" strokeWidth={1.4} />
              <line x1={2} y1={2 + i * patch * CELL} x2={2 + IMG} y2={2 + i * patch * CELL} stroke="#0a0d33" strokeWidth={1.4} />
            </g>
          ))}
          {/* arrow */}
          <text x={IMG + 22} y={IMG / 2 - 4} fontSize={16} fill="#555">→</text>
          {/* token sequence: CLS + patch thumbnails */}
          <g>
            <rect x={IMG + 44} y={IMG / 2 - THUMB - 8} width={THUMB} height={THUMB} rx={3} fill="#f0d98c" stroke="#9a7a1a" />
            <text x={IMG + 44 + THUMB / 2} y={IMG / 2 - THUMB / 2 - 4} fontSize={7.5} textAnchor="middle" fontWeight="bold">[CLS]</text>
            {tokens.slice(0, shown).map((tok, i) => {
              const tx = IMG + 44 + (i + 1) * (THUMB + 4)
              const mini = THUMB / tok.length
              return (
                <g key={i}>
                  <rect x={tx - 1} y={IMG / 2 - THUMB - 9} width={THUMB + 2} height={THUMB + 2} fill="none" stroke="#7f9db9" />
                  {tok.map((row, y) =>
                    row.map((c, x) => (
                      <rect key={`${x}-${y}`} x={tx + x * mini} y={IMG / 2 - THUMB - 8 + y * mini} width={mini} height={mini} fill={c} />
                    ))
                  )}
                </g>
              )
            })}
            {tokens.length > shown && (
              <text x={IMG + 44 + (shown + 1) * (THUMB + 4) + 4} y={IMG / 2 - THUMB / 2 - 2} fontSize={11} fill="#555">…</text>
            )}
            <text x={IMG + 44} y={IMG / 2 + 16} fontSize={9.5} fill="#333">
              sequence length: 1 + {perSide}×{perSide} = {nTokens + 1} tokens
            </text>
            <text x={IMG + 44} y={IMG / 2 + 32} fontSize={9} fill="#777">
              attention cost ∝ {nTokens + 1}² = {(nTokens + 1) * (nTokens + 1)} pairs
            </text>
          </g>
        </svg>
        <p className={s.labNote}>
          A Vision Transformer does no convolution: it <strong>cuts the image into patches, flattens each into a
          vector, adds a position embedding, prepends a learnable [CLS] token</strong> — and feeds the result to the
          exact block from module 2. The patch size is the whole trade: smaller patches → more tokens → finer
          detail but quadratic cost growth (count the pairs above). That tension is why Swin re-introduces{' '}
          <em>windowed</em> attention — module 3&apos;s masks, back already.
        </p>
      </div>
    </div>
  )
}
