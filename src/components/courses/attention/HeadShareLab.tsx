'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// 8 query heads, d_head = 64 throughout; what varies is how many K/V heads serve them.
const D_HEAD = 64
const N_Q = 8

interface Mode {
  key: string
  kvHeads: number // 0 = MLA latent
  quality: string
  dots: string
  blurb: string
}

const MODES: Mode[] = [
  { key: 'MHA', kvHeads: 8, quality: 'baseline', dots: '●●●●', blurb: 'Every query head owns a private K/V head — maximum expressivity, maximum cache.' },
  { key: 'GQA-4', kvHeads: 4, quality: '≈ baseline', dots: '●●●◐', blurb: 'Pairs of query heads share a K/V head. Llama-style sweet spot: half the cache, near-zero quality loss.' },
  { key: 'GQA-2', kvHeads: 2, quality: 'slight drop', dots: '●●●○', blurb: 'Groups of four share. More savings, still close to baseline on most benchmarks.' },
  { key: 'MQA', kvHeads: 1, quality: 'measurable drop', dots: '●●○○', blurb: 'All eight query heads read ONE K/V head — 8× cache saving, but quality and training stability pay.' },
  { key: 'MLA', kvHeads: 0, quality: '≈ baseline (or better)', dots: '●●●●', blurb: 'DeepSeek-V2: cache neither K nor V — cache one low-rank latent vector per token and up-project per-head K/V from it at use time (a small decoupled key carries RoPE). GQA-level memory, MHA-level quality.' },
]

// cache values per token per layer: 2 (K and V) · kvHeads · d_head; MLA caches d_c + d_R
const cacheValues = (m: Mode) => (m.kvHeads > 0 ? 2 * m.kvHeads * D_HEAD : 4 * D_HEAD + D_HEAD / 2)

export default function HeadShareLab() {
  const [modeIdx, setModeIdx] = useState(0)
  const m = MODES[modeIdx]
  const vals = cacheValues(m)
  const maxVals = cacheValues(MODES[0])

  const qw = 480 / N_Q
  const kvCount = m.kvHeads > 0 ? m.kvHeads : 1
  const kvw = 480 / kvCount

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Head Sharing Lab</span>
        <span className={s.widgetHint}>8 query heads — how many K/V heads serve them?</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {MODES.map((mo, i) => (
            <button key={mo.key} type="button" className={`${s.chip} ${modeIdx === i ? s.chipOn : ''}`} onClick={() => setModeIdx(i)}>
              {mo.key}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 480 150" className={s.labCanvas} role="img" aria-label="Query heads wired to shared K/V heads">
          {Array.from({ length: N_Q }, (_, i) => (
            <g key={`q${i}`}>
              <rect x={i * qw + 4} y={10} width={qw - 8} height={26} rx={3} fill="#cfe0f5" stroke="#8898a8" />
              <text x={i * qw + qw / 2} y={27} textAnchor="middle" fontSize={10} fontFamily="Tahoma, sans-serif">Q{i + 1}</text>
              <line
                x1={i * qw + qw / 2} y1={36}
                x2={m.kvHeads > 0 ? Math.floor(i / (N_Q / m.kvHeads)) * kvw + kvw / 2 : 240} y2={96}
                stroke="#777" strokeWidth={1.2} strokeDasharray={m.kvHeads === 0 ? '4 3' : undefined}
              />
            </g>
          ))}
          {m.kvHeads > 0 ? (
            Array.from({ length: m.kvHeads }, (_, i) => (
              <g key={`kv${i}`}>
                <rect x={i * kvw + 6} y={96} width={kvw - 12} height={28} rx={3} fill="#e3f6e3" stroke="#6a9a6a" />
                <text x={i * kvw + kvw / 2} y={114} textAnchor="middle" fontSize={10} fontFamily="Tahoma, sans-serif">K/V {i + 1}</text>
              </g>
            ))
          ) : (
            <g>
              <rect x={150} y={96} width={180} height={28} rx={3} fill="#f6ecd8" stroke="#b8860b" />
              <text x={240} y={114} textAnchor="middle" fontSize={10} fontFamily="Tahoma, sans-serif">latent cᵗ (d_c = 4·d_head) + RoPE key</text>
            </g>
          )}
          <text x={240} y={144} textAnchor="middle" fontSize={9} fill="#666">
            {m.kvHeads > 0 ? `${m.kvHeads} K/V head${m.kvHeads > 1 ? 's' : ''} cached per token` : 'one low-rank latent cached per token; per-head K/V up-projected on the fly'}
          </text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>cache/token/layer <span className={s.labStatValue}>{vals} values</span></span>
          <span className={s.labStat}>vs MHA <span className={s.labStatValue}>{Math.round((vals / maxVals) * 100)}%</span></span>
          <span className={s.labStat}>quality <span className={s.labStatValue}>{m.dots} {m.quality}</span></span>
        </div>
        <div className={`${s.feedback} ${s.feedbackCorrect}`}>
          <span className={s.feedbackIcon}>▸</span>
          <span><strong>{m.key}:</strong> {m.blurb}</span>
        </div>
        <p className={s.labNote}>
          Query heads are recomputed fresh each step — only <strong>K and V get cached</strong>, so the K/V-head
          count is the entire memory story. MQA and GQA shrink it by sharing; <strong>MLA</strong> shrinks it by{' '}
          <strong>compression</strong>: cache a low-rank latent instead of any heads at all, and spend a little
          compute re-expanding it. Quality dots are qualitative summaries of the papers&apos; ablations.
        </p>
      </div>
    </div>
  )
}
