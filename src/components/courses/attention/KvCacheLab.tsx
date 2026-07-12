'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// Decoding stepper: watch the KV cache earn its existence, then size it for real models.
const GEN = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred']

const PRESETS = [
  { name: 'GPT-2 small', layers: 12, kvHeads: 12, dHead: 64 },
  { name: 'Llama-3-8B', layers: 32, kvHeads: 8, dHead: 128 },
  { name: 'Llama-3-70B', layers: 80, kvHeads: 8, dHead: 128 },
]
const CTX = [1024, 4096, 8192, 32768, 131072]
const HBM_GB = 80

export default function KvCacheLab() {
  const [t, setT] = useState(3)          // tokens generated so far
  const [cache, setCache] = useState(true)
  const [preset, setPreset] = useState(1) // Llama-3-8B
  const [ctxIdx, setCtxIdx] = useState(2) // 8192

  const projections = cache ? t : (t * (t + 1)) / 2
  const p = PRESETS[preset]
  const ctx = CTX[ctxIdx]
  const gb = (2 * p.layers * p.kvHeads * p.dHead * 2 * ctx) / 1e9

  const slot = 480 / GEN.length

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>KV Cache Lab</span>
        <span className={s.widgetHint}>decode token by token; watch what must be remembered</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setT(v => Math.min(GEN.length, v + 1))} disabled={t >= GEN.length}>
            generate next token →
          </button>
          <button type="button" className={s.btn} onClick={() => setT(1)} disabled={t <= 1}>restart</button>
          <button type="button" className={`${s.chip} ${cache ? s.chipOn : ''}`} onClick={() => setCache(c => !c)}>
            KV cache {cache ? 'ON' : 'off'}
          </button>
        </div>
        <svg viewBox="0 0 480 132" className={s.labCanvas} role="img" aria-label="Generated tokens with their cached or recomputed K and V projections">
          {GEN.slice(0, t).map((tok, i) => {
            const isNew = i === t - 1
            const recomputes = t - i // token i's K/V computed at steps i+1..t without a cache
            return (
              <g key={i}>
                <rect x={i * slot + 4} y={10} width={slot - 8} height={22} rx={3} fill={isNew ? '#f0d98c' : '#fff'} stroke={isNew ? '#9a7a1a' : '#7f9db9'} strokeWidth={isNew ? 2 : 1} />
                <text x={i * slot + slot / 2} y={25} textAnchor="middle" fontSize={9.5} fontFamily="Tahoma, sans-serif">{tok}</text>
                {isNew && (
                  <>
                    <rect x={i * slot + 8} y={38} width={slot - 16} height={16} rx={2} fill="#cfe0f5" stroke="#2b6fd0" />
                    <text x={i * slot + slot / 2} y={50} textAnchor="middle" fontSize={8.5}>Q (fresh)</text>
                  </>
                )}
                <rect x={i * slot + 8} y={60} width={slot - 16} height={16} rx={2}
                  fill={cache ? '#e3f6e3' : '#fbe7d4'} stroke={cache ? '#6a9a6a' : '#c86018'} />
                <text x={i * slot + slot / 2} y={72} textAnchor="middle" fontSize={8.5}>
                  K,V {cache ? (isNew ? 'new' : 'cached') : `×${recomputes}`}
                </text>
              </g>
            )
          })}
          <text x={4} y={100} fontSize={9.5} fill="#333">
            step {t}: the new token&apos;s Q must score against EVERY past token&apos;s K — then blend their V.
          </text>
          <text x={4} y={116} fontSize={9.5} fill={cache ? '#2f8e2f' : '#c86018'}>
            {cache
              ? 'cache: each K,V computed once, stored, reused at every later step'
              : 'no cache: every step reprojects the whole history — the orange ×counts add up quadratically'}
          </text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>
            K/V projections computed so far{' '}
            <span className={s.labStatValue}>
              {projections} — {cache ? 'once per token, then reused' : 'every past token reprojected each step: t(t+1)/2'}
            </span>
          </span>
        </div>
        <div className={s.chipRow}>
          {PRESETS.map((pr, i) => (
            <button key={pr.name} type="button" className={`${s.chip} ${preset === i ? s.chipOn : ''}`} onClick={() => setPreset(i)}>
              {pr.name}
            </button>
          ))}
          <span className={s.sliderLabel}>context length</span>
          <input type="range" min={0} max={4} step={1} value={ctxIdx} onChange={e => setCtxIdx(Number(e.target.value))} className={s.slider} aria-label="context length" />
          <span className={s.labStat}>{ctx.toLocaleString('en-US')} tokens</span>
        </div>
        <div className={s.gapChart}>
          <div className={s.gapRow}>
            <div className={s.gapLabel}>
              <span>KV cache — 2 × {p.layers} layers × {p.kvHeads} K/V heads × {p.dHead} dims × 2 bytes × context</span>
              <span className={s.gapSub}>{gb.toFixed(2)} GB of {HBM_GB} GB HBM</span>
            </div>
            <div className={s.gapTrack}>
              <div className={s.gapFill} style={{ width: `${Math.min(100, (gb / HBM_GB) * 100)}%`, background: gb > HBM_GB * 0.5 ? '#c86018' : '#2b6fd0' }} />
            </div>
          </div>
        </div>
        <p className={s.labNote}>
          The cache is pure trade: memory for compute. It turns each decode step from &quot;reproject the whole
          history&quot; into &quot;project one token, read the rest&quot; — but the reading is the new tax. Every generated
          token must stream the <em>entire</em> cache through the GPU&apos;s compute units, so long-context decoding
          is <strong>memory-bound</strong>: the bar above, re-read per token. That number is what modules 3.1–3.2
          (shrink it), 3.3 (move bytes smarter), and 3.4 (score fewer pairs) are all attacking.
        </p>
      </div>
    </div>
  )
}
