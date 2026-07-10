'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

interface Preset {
  name: string
  d: number
  layers: number
  dff: number
  vocab: number
  /** SwiGLU has three FFN matrices; GELU-style has two. */
  gated: boolean
  /** K/V heads × d_head (for GQA models K/V projections are smaller than d²). */
  kvDim: number
  /** Untied models pay for the unembedding matrix separately. */
  tiedEmb: boolean
}

const PRESETS: Preset[] = [
  { name: 'GPT-2 small', d: 768, layers: 12, dff: 3072, vocab: 50257, gated: false, kvDim: 768, tiedEmb: true },
  { name: 'Llama-3-8B', d: 4096, layers: 32, dff: 14336, vocab: 128256, gated: true, kvDim: 1024, tiedEmb: false },
]

function components(p: Preset) {
  const emb = p.vocab * p.d * (p.tiedEmb ? 1 : 2)
  // Q and O are d×d; K and V are d×kvDim (kvDim = d for plain MHA, smaller under GQA)
  const attn = (2 * p.d * p.d + 2 * p.d * p.kvDim) * p.layers
  const ffnPerLayer = (p.gated ? 3 : 2) * p.d * p.dff
  const ffn = ffnPerLayer * p.layers
  return { emb, attn, ffn, ffnPerLayer }
}

const fmt = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${Math.round(n / 1e6)}M`)

const MOE_EXPERTS = 8
const MOE_TOPK = 2

export default function ParamBudgetLab() {
  const [presetIdx, setPresetIdx] = useState(0)
  const [moe, setMoe] = useState(false)

  const p = PRESETS[presetIdx]
  const { emb, attn, ffn, ffnPerLayer } = components(p)
  const ffnTotal = moe ? ffn * MOE_EXPERTS : ffn
  const total = emb + attn + ffnTotal
  const active = emb + attn + (moe ? ffnPerLayer * MOE_TOPK * p.layers : ffn)
  const ffnShare = Math.round((ffnTotal / (attn + ffnTotal)) * 100)

  const rows = [
    { label: `embeddings${p.tiedEmb ? ' (tied in/out)' : ' + unembedding'}`, v: emb, color: '#9ab48c' },
    { label: `attention (Q,K,V,O × ${p.layers} layers${p.kvDim < p.d ? ', GQA-shrunk K/V' : ''})`, v: attn, color: '#2b6fd0' },
    { label: `FFN (${p.gated ? 'SwiGLU, 3' : 'GELU, 2'} matrices × ${p.layers} layers${moe ? ` × ${MOE_EXPERTS} experts` : ''})`, v: ffnTotal, color: '#c86018' },
  ]
  const max = Math.max(...rows.map(r => r.v))

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Parameter Budget Lab</span>
        <span className={s.widgetHint}>where the weights actually live</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {PRESETS.map((pr, i) => (
            <button key={pr.name} type="button" className={`${s.chip} ${presetIdx === i ? s.chipOn : ''}`} onClick={() => { setPresetIdx(i); setMoe(false) }}>
              {pr.name}
            </button>
          ))}
          <button type="button" className={`${s.chip} ${moe ? s.chipOn : ''}`} onClick={() => setMoe(m => !m)}>
            mixture-of-experts ({MOE_EXPERTS} experts, top-{MOE_TOPK})
          </button>
        </div>
        <div className={s.gapChart}>
          {rows.map(r => (
            <div key={r.label} className={s.gapRow}>
              <div className={s.gapLabel}>
                <span>{r.label}</span>
                <span className={s.gapSub}>{fmt(r.v)} · {Math.round((r.v / total) * 100)}%</span>
              </div>
              <div className={s.gapTrack}>
                <div className={s.gapFill} style={{ width: `${(r.v / max) * 100}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>total ≈ <span className={s.labStatValue}>{fmt(total)}</span></span>
          {moe && <span className={s.labStat}>active/token ≈ <span className={s.labStatValue}>{fmt(active)}</span></span>}
          <span className={s.labStat}>FFN share of block params <span className={s.labStatValue}>{ffnShare}%</span></span>
        </div>
        <p className={s.labNote}>
          These are the real formulas, and they land on the real sizes: vocab·d for embeddings, (2d² + 2d·d_kv)
          per layer for attention, {`${'{'}2 or 3${'}'}`}·d·d_ff per layer for the FFN — GPT-2 small comes out at
          124M and Llama-3-8B at 8.0B from nothing but the table above. The FFN&apos;s ~⅔ share of block parameters
          is module 2&apos;s &quot;attention communicates, the FFN computes&quot; made quantitative. Toggle{' '}
          <strong>mixture-of-experts</strong>: {MOE_EXPERTS}× the FFN weights exist, but each token is routed
          through only {MOE_TOPK} experts — parameters scale, per-token FLOPs don&apos;t (Mixtral, DeepSeek-V3).
        </p>
      </div>
    </div>
  )
}
