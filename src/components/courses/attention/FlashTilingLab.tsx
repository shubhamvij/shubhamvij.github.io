'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'
import {
  ACTS, GRID, TILE, TILES_PER_SIDE, SRAM_MB,
  NAIVE_TOTAL_MB, FLASH_TOTAL_MB, TRAFFIC_RATIO, ATTN_GFLOP,
  NAIVE_US, FLASH_US, fmtMb, type Step, type Visual,
} from './flashTilingScript'

const M = 208 // matrix draw size (px), left of the memory boxes
const cell = M / GRID
const tileOf = (r: number, c: number) => Math.floor(r / TILE) * TILES_PER_SIDE + Math.floor(c / TILE)

// Score-matrix cell color for the current visual state.
function cellFill(v: Visual, r: number, c: number): string {
  switch (v.kind) {
    case 'hw':
    case 'verdict':
      return '#f7f5ec'
    case 'naiveFill':
    case 'naiveOut':
      return '#c86018'
    case 'naiveSoftmax':
      return r === 8 ? '#f0d98c' : '#c86018' // one row lit = row-wise normalize
    case 'flashTile': {
      const t = tileOf(r, c)
      return t === v.tile ? '#f0d98c' : t < v.tile ? '#dfe8df' : '#f7f5ec'
    }
    case 'flashDone':
      return '#dfe8df'
  }
}

// Small labeled block glyph inside a memory box.
function Block({ x, y, w, label, fill, stroke }: { x: number; y: number; w: number; label: string; fill: string; stroke: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={16} fill={fill} stroke={stroke} />
      <text x={x + w / 2} y={y + 11} textAnchor="middle" fontSize={8.5}>{label}</text>
    </>
  )
}

export default function FlashTilingLab() {
  const [act, setAct] = useState<1 | 2 | 3>(1)
  const [idx, setIdx] = useState(0)

  const steps = ACTS[act]
  const step: Step = steps[idx]
  const v = step.visual
  const flashResident = act === 2 && (v.kind === 'flashTile' || v.kind === 'flashDone')
  const gotoAct = (a: 1 | 2 | 3) => { setAct(a); setIdx(0) }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Flash Tiling Lab</span>
        <span className={s.widgetHint}>walk the memory, find the bottleneck</span>
      </div>
      <div className={s.widgetBody}>
        {/* Act breadcrumb tabs */}
        <div className={s.chipRow}>
          {([[1, '1 · naive'], [2, '2 · flash'], [3, '3 · verdict']] as const).map(([a, label]) => (
            <button key={a} type="button" className={`${s.chip} ${act === a ? s.chipOn : ''}`} onClick={() => gotoAct(a)}>
              {label}
            </button>
          ))}
        </div>

        <svg viewBox="0 0 480 250" className={s.labCanvas} role="img" aria-label="Attention score matrix and the GPU memory hierarchy, naive versus tiled">
          {/* score matrix (toy 16×16) */}
          {Array.from({ length: GRID }, (_, r) =>
            Array.from({ length: GRID }, (_, c) => (
              <rect key={`${r}-${c}`} x={8 + c * cell} y={8 + r * cell} width={cell - 0.6} height={cell - 0.6}
                fill={cellFill(v, r, c)} stroke="#e0dcc8" strokeWidth={0.4} />
            )),
          )}
          <text x={8} y={M + 22} fontSize={8.5} fill="#666">n×n scores S = QKᵀ {act === 1 ? '(shown 16×16; real n = 4096)' : '— only a tile exists at a time'}</text>

          {/* HBM box */}
          <text x={240} y={22} fontSize={10.5} fontFamily="Tahoma, sans-serif" fontWeight="bold">HBM · ~80 GB · 2 TB/s</text>
          <rect x={240} y={28} width={232} height={40} fill="#fbe7d4" stroke="#b88a5a" />
          <Block x={248} y={44} w={30} label="Q" fill="#fff" stroke="#b88a5a" />
          <Block x={282} y={44} w={30} label="K" fill="#fff" stroke="#b88a5a" />
          <Block x={316} y={44} w={30} label="V" fill="#fff" stroke="#b88a5a" />
          <Block x={350} y={44} w={30} label="O" fill="#fff" stroke="#b88a5a" />
          {step.hbmScores && <Block x={388} y={44} w={76} label="S 33.6 MB ✗" fill="#c86018" stroke="#8a3f10" />}

          {/* SRAM box */}
          <text x={240} y={92} fontSize={10.5} fontFamily="Tahoma, sans-serif" fontWeight="bold">on-chip SRAM · 20 MB · 19 TB/s</text>
          <rect x={240} y={98} width={232} height={40} fill="#e3f6e3" stroke="#6a9a6a" />
          {flashResident ? (
            <>
              <Block x={248} y={114} w={40} label="Q-blk" fill="#fff" stroke="#6a9a6a" />
              <Block x={292} y={114} w={44} label="K/V-blk" fill="#fff" stroke="#6a9a6a" />
              <Block x={340} y={114} w={40} label="tile" fill="#f0d98c" stroke="#9a7a1a" />
              <Block x={384} y={114} w={36} label="m, ℓ" fill="#fff" stroke="#6a9a6a" />
              <Block x={424} y={114} w={40} label="O-blk" fill="#fff" stroke="#6a9a6a" />
            </>
          ) : (
            <text x={356} y={122} textAnchor="middle" fontSize={9} fill="#6a9a6a">
              {act === 1 ? '(naive barely uses it)' : 'idle'}
            </text>
          )}

          {/* load/store arrow */}
          {step.arrow && (
            <text x={356} y={84} textAnchor="middle" fontSize={11} fill="#333" fontWeight="bold">
              {step.arrow === 'load' ? '↓ load into SRAM' : '↑ store to HBM'}
            </text>
          )}

          {/* online-softmax rescale beat */}
          {v.kind === 'flashTile' && v.rescale && (
            <text x={356} y={158} textAnchor="middle" fontSize={9} fill="#2f8e2f">running max rose → earlier output rescaled (exact)</text>
          )}
        </svg>

        {/* narration */}
        <div className={`${s.feedback} ${s.feedbackCorrect}`} aria-live="polite">
          <span className={s.feedbackIcon}>▸</span>
          <span><strong>{step.label}.</strong> {step.caption}</span>
        </div>

        {/* controls */}
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>← back</button>
          <button type="button" className={s.btn} onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))} disabled={idx >= steps.length - 1}>
            {act === 2 && step.label === 'next tile rescales' ? 'process remaining tiles →' : 'next →'}
          </button>
          <button type="button" className={s.btn} onClick={() => setIdx(0)} disabled={idx === 0}>restart act</button>
          <span className={s.labStat}>step <span className={s.labStatValue}>{idx + 1}/{steps.length}</span></span>
        </div>

        {/* live meters (Acts 1–2) or verdict panels (Act 3) */}
        {act === 3 ? (
          <VerdictPanels />
        ) : (
          <div className={s.gapChart}>
            <div className={s.gapRow}>
              <div className={s.gapLabel}>
                <span>HBM traffic so far</span>
                <span className={s.gapSub}>{fmtMb(step.odometer)} MB of {fmtMb(NAIVE_TOTAL_MB)} MB (naive total)</span>
              </div>
              <div className={s.gapTrack}>
                <div className={s.gapFill} style={{ width: `${Math.min(100, (step.odometer / NAIVE_TOTAL_MB) * 100)}%`, background: act === 1 ? '#c86018' : '#2b6fd0' }} />
              </div>
            </div>
            <div className={s.gapRow}>
              <div className={s.gapLabel}>
                <span>SRAM in use</span>
                <span className={s.gapSub}>{step.sramMb.toFixed(1)} MB of {SRAM_MB} MB</span>
              </div>
              <div className={s.gapTrack}>
                <div className={s.gapFill} style={{ width: `${Math.min(100, (step.sramMb / SRAM_MB) * 100)}%`, background: '#2f8e2f' }} />
              </div>
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>peak score memory <span className={s.labStatValue}>{act === 1 ? '16×16 = n² in HBM' : 'one 4×4 tile in SRAM'}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function bar(mb: number, maxMb: number) {
  return `${Math.min(100, (mb / maxMb) * 100)}%`
}

function VerdictPanels() {
  return (
    <div className={s.gapChart}>
      <div className={s.gapRow}>
        <div className={s.gapLabel}><span>bytes moved through HBM</span><span className={s.gapSub}>{TRAFFIC_RATIO.toFixed(0)}× less</span></div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(NAIVE_TOTAL_MB, NAIVE_TOTAL_MB), background: '#c86018' }} /></div>
        <div className={s.gapSub}>naive {fmtMb(NAIVE_TOTAL_MB)} MB</div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(FLASH_TOTAL_MB, NAIVE_TOTAL_MB), background: '#2b6fd0' }} /></div>
        <div className={s.gapSub}>flash {fmtMb(FLASH_TOTAL_MB)} MB</div>
      </div>
      <div className={s.gapRow}>
        <div className={s.gapLabel}><span>time (roofline estimate)</span><span className={s.gapSub}>{(NAIVE_US / FLASH_US).toFixed(1)}× faster</span></div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(NAIVE_US, NAIVE_US), background: '#c86018' }} /></div>
        <div className={s.gapSub}>naive {NAIVE_US.toFixed(0)} µs — memory-bound</div>
        <div className={s.gapTrack}><div className={s.gapFill} style={{ width: bar(FLASH_US, NAIVE_US), background: '#2b6fd0' }} /></div>
        <div className={s.gapSub}>flash {FLASH_US.toFixed(0)} µs — compute-bound</div>
      </div>
      <p className={s.labNote}>
        <strong>FLOPs: {ATTN_GFLOP.toFixed(1)} G — identical.</strong> Bytes: {fmtMb(NAIVE_TOTAL_MB)} MB → {fmtMb(FLASH_TOTAL_MB)} MB.
        You didn&apos;t do less math; you stopped commuting it through slow memory. This was one head, one layer —
        an 8B-class model runs about a thousand of these per forward pass. This toy uses 4 large tiles ({TRAFFIC_RATIO.toFixed(0)}× on paper);
        real kernels use smaller blocks limited by per-SM SRAM, so K/V re-stream more and the measured win is a few-fold —
        FlashAttention reports up to 9× fewer HBM accesses and up to 7.6× faster attention (~3× end-to-end on GPT-2),
        since real kernels also overlap compute with memory movement.
      </p>
    </div>
  )
}
