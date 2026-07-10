'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

const D_MODELS = [256, 512, 1024]
const HEAD_OPTIONS = [1, 2, 4, 8, 16, 32]

interface Stage {
  id: string
  label: (d: number, h: number, dh: number) => string
  blurb: (d: number, h: number, dh: number, g: number) => string
}

const STAGES: Stage[] = [
  { id: 'input', label: d => `input  n × ${d}`, blurb: d => `One ${d}-dim vector per token — the residual stream reading this layer.` },
  { id: 'wqkv', label: d => `W_Q, W_K, W_V  each ${d} × ${d}`, blurb: (d, h) => `Three big learned matrices. "${h} heads" does not mean ${h} separate networks — each head owns a ${d}/${h}-column slice of these same matrices.` },
  { id: 'split', label: (d, h, dh) => `split → ${h} heads × (n × ${dh})`, blurb: (d, h, dh) => `Reshape, not computation: the ${d}-dim projections are viewed as ${h} independent ${dh}-dim subspaces. Each head attends in its own low-rank world.` },
  { id: 'scores', label: (d, h) => `scores  ${h} × (n × n)`, blurb: (d, h) => `Every head builds its own n×n attention pattern — ${h} different relationship-detectors running in parallel (module 2's Multi-Head Lab).` },
  { id: 'concat', label: d => `concat → n × ${d}`, blurb: () => 'Head outputs are stacked back side by side into one vector per token.' },
  { id: 'wo', label: d => `W_O  ${d} × ${d}`, blurb: () => 'The output projection: mixes the concatenated head outputs so heads can write to shared directions of the residual stream. Without it, heads would live in sealed silos.' },
  { id: 'kv', label: () => 'KV cache (decoding)', blurb: (d, h, dh, g) => `At generation time, every past token's K and V are cached: 2 × ${g} K/V heads × ${dh} dims per token per layer. Shrinking g (keeping all ${h} query heads) is exactly GQA — module 3.` },
]

const fmt = (x: number) => x.toLocaleString('en-US')

export default function HeadMatrixLab() {
  const [dIdx, setDIdx] = useState(1)   // 512
  const [hIdx, setHIdx] = useState(3)   // 8 heads
  const [gIdx, setGIdx] = useState(3)   // 8 K/V heads (= h → plain MHA)
  const [stage, setStage] = useState('wqkv')

  const d = D_MODELS[dIdx]
  const h = HEAD_OPTIONS[hIdx]
  const g = Math.min(HEAD_OPTIONS[gIdx], h)
  const dh = d / h
  const attnParams = 4 * d * d
  // fp16 KV cache: 2 (K and V) · g · dh values · 2 bytes · 8192 ctx · 32 layers
  const kvGb = (2 * g * dh * 2 * 8192 * 32) / 1e9
  const sel = STAGES.find(st => st.id === stage)!

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Head Matrix Lab</span>
        <span className={s.widgetHint}>click a stage; drag the sliders</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {D_MODELS.map((dm, i) => (
            <button key={dm} type="button" className={`${s.chip} ${dIdx === i ? s.chipOn : ''}`} onClick={() => setDIdx(i)}>
              d_model = {dm}
            </button>
          ))}
        </div>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>heads h</span>
          <input type="range" min={0} max={5} step={1} value={hIdx} onChange={e => { setHIdx(Number(e.target.value)); setGIdx(gi => Math.min(gi, Number(e.target.value))) }} className={s.slider} aria-label="number of heads" />
          <span className={s.labStat}>h = {h} → <span className={s.labStatValue}>d_head = {dh}</span></span>
        </div>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>K/V heads g</span>
          <input type="range" min={0} max={5} step={1} value={gIdx} onChange={e => setGIdx(Number(e.target.value))} className={s.slider} aria-label="K/V heads (GQA preview)" />
          <span className={s.labStat}>g = {g}{g === h ? ' (plain MHA)' : ' (GQA!)'}</span>
        </div>
        <svg viewBox="0 0 480 168" className={s.labCanvas} role="img" aria-label="Tensor shapes flowing through multi-head attention">
          {STAGES.map((st, i) => {
            const col = i % 4, row = Math.floor(i / 4)
            const x = 8 + col * 119, y = 12 + row * 74
            return (
              <g key={st.id} onClick={() => setStage(st.id)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={110} height={44} rx={4} fill={st.id === 'kv' ? '#fbe7d4' : '#d8e3f5'} stroke={stage === st.id ? '#0a246a' : '#8898a8'} strokeWidth={stage === st.id ? 2.5 : 1} />
                <text x={x + 55} y={y + 26} textAnchor="middle" fontSize={9.5} fontFamily="Tahoma, sans-serif" fontWeight={stage === st.id ? 'bold' : 'normal'}>
                  {st.label(d, h, dh)}
                </text>
                {i < STAGES.length - 1 && col < 3 && <line x1={x + 110} y1={y + 22} x2={x + 119} y2={y + 22} stroke="#777" strokeWidth={1.5} />}
              </g>
            )
          })}
        </svg>
        <div className={`${s.feedback} ${s.feedbackCorrect}`}>
          <span className={s.feedbackIcon}>▸</span>
          <span>{sel.blurb(d, h, dh, g)}</span>
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>attention params/layer <span className={s.labStatValue}>4·d² = {fmt(attnParams)}</span></span>
          <span className={s.labStat}>KV cache @ 8k ctx × 32 layers (fp16) <span className={s.labStatValue}>{kvGb.toFixed(2)} GB</span></span>
        </div>
        <p className={s.labNote}>
          Drag <strong>h</strong>: d_head shrinks but the parameter count doesn&apos;t move — heads are a{' '}
          <strong>slicing</strong> of the same four ${'{'}d×d{'}'} matrices (W_Q, W_K, W_V, W_O), trading subspace
          size for pattern count. Drag <strong>g</strong> below h and you&apos;ve invented GQA: fewer K/V heads
          shared across query heads, shrinking the KV cache that dominates decoding memory — the story module 3
          picks up.
        </p>
      </div>
    </div>
  )
}
