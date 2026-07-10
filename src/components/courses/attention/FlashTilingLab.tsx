'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

const N = 16
const TILE = 4
const TILES_PER_SIDE = N / TILE // 4 → 16 tiles, processed row-major

export default function FlashTilingLab() {
  const [flash, setFlash] = useState(false)
  const [done, setDone] = useState(0) // tiles fully processed

  const total = TILES_PER_SIDE * TILES_PER_SIDE
  const cell = 480 / N / 2 // draw matrix at 240px wide, leave room for panel
  const doneRow = Math.floor(done / TILES_PER_SIDE)
  const doneCol = done % TILES_PER_SIDE

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Flash Tiling Lab</span>
        <span className={s.widgetHint}>same math, radically less memory traffic</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${!flash ? s.chipOn : ''}`} onClick={() => { setFlash(false); setDone(0) }}>
            naive attention
          </button>
          <button type="button" className={`${s.chip} ${flash ? s.chipOn : ''}`} onClick={() => { setFlash(true); setDone(0) }}>
            FlashAttention (tiled)
          </button>
          {flash && (
            <>
              <button type="button" className={s.btn} onClick={() => setDone(d => Math.min(total, d + 1))} disabled={done >= total}>
                process next tile →
              </button>
              <button type="button" className={s.btn} onClick={() => setDone(0)} disabled={done === 0}>reset</button>
            </>
          )}
        </div>
        <svg viewBox="0 0 480 260" className={s.labCanvas} role="img" aria-label="The n-by-n attention score matrix, naive versus tiled">
          {Array.from({ length: N }, (_, q) =>
            Array.from({ length: N }, (_, k) => {
              const tileIdx = Math.floor(q / TILE) * TILES_PER_SIDE + Math.floor(k / TILE)
              const isDone = flash && tileIdx < done
              const isCurrent = flash && tileIdx === done && done < total
              return (
                <rect
                  key={`${q}-${k}`}
                  x={8 + k * cell} y={8 + q * cell}
                  width={cell - 1} height={cell - 1}
                  fill={!flash ? '#c86018' : isCurrent ? '#f0d98c' : isDone ? '#dfe8df' : '#f7f5ec'}
                  opacity={!flash ? 0.75 : 1}
                  stroke={isCurrent ? '#9a7a1a' : '#e0dcc8'}
                  strokeWidth={isCurrent ? 1.5 : 0.4}
                />
              )
            })
          )}
          <text x={8} y={256} fontSize={9} fill="#666">
            {N}×{N} score matrix S = QKᵀ {flash ? '— only the gold tile exists at any moment, in on-chip SRAM' : '— fully materialized, written to and read back from HBM'}
          </text>
          <text x={270} y={30} fontSize={11} fontFamily="Tahoma, sans-serif" fontWeight="bold">GPU memory hierarchy</text>
          <rect x={270} y={40} width={200} height={34} fill="#fbe7d4" stroke="#b88a5a" />
          <text x={370} y={54} textAnchor="middle" fontSize={9.5}>HBM: tens of GB, ~2 TB/s</text>
          <text x={370} y={67} textAnchor="middle" fontSize={9.5}>{!flash ? 'S written + read here ✗' : 'only Q, K, V, O touch this ✓'}</text>
          <rect x={270} y={84} width={200} height={34} fill="#e3f6e3" stroke="#6a9a6a" />
          <text x={370} y={98} textAnchor="middle" fontSize={9.5}>on-chip SRAM: ~20 MB, ~19 TB/s</text>
          <text x={370} y={111} textAnchor="middle" fontSize={9.5}>{flash ? 'score tiles live and die here' : '(barely used by naive attention)'}</text>
          {flash && done > 0 && done < total && (
            <text x={270} y={150} fontSize={9.5} fill="#333">
              tile {done}/{total}: rows {doneRow * TILE}–{doneRow * TILE + TILE - 1} × cols {doneCol * TILE}–{doneCol * TILE + TILE - 1}
            </text>
          )}
          {flash && done >= total && (
            <text x={270} y={150} fontSize={9.5} fill="#2f8e2f" fontWeight="bold">all tiles processed — output identical to naive</text>
          )}
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>scores materialized in HBM <span className={s.labStatValue}>{flash ? '0 scores' : `${N * N} scores (written, then read back)`}</span></span>
          <span className={s.labStat}>peak score memory <span className={s.labStatValue}>{flash ? `one ${TILE}×${TILE} tile` : `${N}×${N}`}</span></span>
        </div>
        {flash && (
          <div className={`${s.feedback} ${s.feedbackCorrect}`}>
            <span className={s.feedbackIcon}>▸</span>
            <span>
              {done === 0
                ? 'Press "process next tile": load a block of Q rows and K columns into SRAM, compute that tile of scores, and fold it into the output immediately.'
                : done < total
                  ? `Processing tile ${done}/${total}: scores computed in SRAM; the running max and running denominator (online softmax) are updated so earlier tiles' contributions stay exactly correct; the output block is rescaled and accumulated; the tile is discarded.`
                  : 'Every pair was scored — the same FLOPs as naive — but the n×n matrix never existed in HBM. Exact attention, several times faster, because the bottleneck was memory movement.'}
            </span>
          </div>
        )}
        <p className={s.labNote}>
          Softmax normally needs a whole row before it can normalize — the reason naive kernels materialize S.
          The <strong>online softmax</strong> trick maintains a <strong>running max</strong> and running
          denominator per row, correcting previously accumulated output whenever a new tile raises the max. That
          single algebraic identity is what lets attention stream through {TILE}×{TILE} tiles of fast on-chip
          SRAM instead of round-tripping an n×n matrix through HBM.
        </p>
      </div>
    </div>
  )
}
