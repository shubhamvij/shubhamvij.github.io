'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type NType = 'user' | 'merchant' | 'device'
type EType = 'paid' | 'shares-device' | 'affiliated'

const NODES: { id: string; type: NType; x: number; y: number }[] = [
  { id: 'U1', type: 'user', x: 44, y: 44 },
  { id: 'U2', type: 'user', x: 44, y: 138 },
  { id: 'M1', type: 'merchant', x: 152, y: 30 },
  { id: 'M2', type: 'merchant', x: 152, y: 118 },
  { id: 'D1', type: 'device', x: 96, y: 188 },
]

const EDGES: { a: string; b: string; t: EType }[] = [
  { a: 'U1', b: 'M1', t: 'paid' },
  { a: 'U1', b: 'M2', t: 'paid' },
  { a: 'U2', b: 'M2', t: 'paid' },
  { a: 'U1', b: 'D1', t: 'shares-device' },
  { a: 'U2', b: 'D1', t: 'shares-device' },
  { a: 'M1', b: 'M2', t: 'affiliated' },
]

const E_COLORS: Record<EType, string> = { paid: '#2f8e2f', 'shares-device': '#c86018', affiliated: '#7a4ab8' }
const N_FILL: Record<NType, string> = { user: '#5a8fd0', merchant: '#e0a040', device: '#a879d8' }
const RAW_DIMS: Record<NType, number> = { user: 4, merchant: 6, device: 3 }

function softmax(logits: number[]): number[] {
  const m = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - m))
  const z = exps.reduce((p, q) => p + q, 0)
  return exps.map(e => e / z)
}

// Fixed toy attention logits for the focus node U1 (real softmax, fixed inputs).
const TCA_PAID = softmax([0.8, 0.3])            // over {M1, M2}
const TAA_ALL = softmax([0.5, 0.2, 0.6, 0.1])   // over sampled 2-hop {M1, M2, D1, U2}
// Fixed toy scores for the masked-link step (concat + MLP on fixed embeddings).
const LINK_SCORES: { pair: string; v: number }[] = [
  { pair: 'U2 — M2 (masked true edge)', v: 0.86 },
  { pair: 'U2 — M1', v: 0.41 },
  { pair: 'U2 — D1 (negative)', v: 0.12 },
]

const STEPS = [
  {
    title: '1 · Per-node-type projection',
    caption: 'per-node-type projection W_τ: user features are 4-dim, merchant 6-dim, device 3-dim — each node type has its OWN learned linear map into the shared hidden d. (The other wing of this bet — grouping features by kind (numerical/categorical/text) with one shared transform per group — is the TabFM lineage; GraphBFF describes it as related work and notes it can limit expressivity.)',
  },
  {
    title: '2 · TCA — type-conditioned attention',
    caption: 'one softmax per relation-type set, each with its own W_Q/W_K/W_V and edge bias, normalized only within that subset — then the per-set outputs are summed. Singleton sets recover strict per-relation attention. This is where about 85% of the parameters live.',
  },
  {
    title: '3 · TAA — type-agnostic attention',
    caption: 'one shared softmax over a sampled neighborhood (2 hops, up to 10 per hop in the paper), shared W_Q/W_K/W_V across all types — cheap cross-type information flow.',
  },
  {
    title: '4 · Fusion Φ',
    caption: 'learned combination: an FFN Φ takes (h_tca, h_taa) and produces the node update — then the standard residual + LayerNorm + block-FFN wrapper. Theorem 4.1: TCA + TAA together are strictly more expressive than either alone.',
  },
  {
    title: '5 · Masked-link head',
    caption: 'masked link prediction: sampled true edges are hidden from the input graph; concat the two node embeddings, score with a 2-layer MLP, train with BCE against 1:1 uniform negatives. That is the entire pretraining objective.',
  },
]

export default function BffAnatomyLab() {
  const [step, setStep] = useState(0)

  const focus = 'U1'
  const focusEdges = EDGES.filter(e => e.a === focus || e.b === focus)

  const edgeWeight = (e: { a: string; b: string; t: EType }): number | null => {
    if (step === 1) {
      if (!(e.a === focus || e.b === focus)) return null
      if (e.t === 'paid') return e.b === 'M1' || e.a === 'M1' ? TCA_PAID[0] : TCA_PAID[1]
      if (e.t === 'shares-device') return 1
      return null
    }
    if (step === 2) {
      const other = e.a === focus ? e.b : e.a
      const idx = ['M1', 'M2', 'D1', 'U2'].indexOf(other)
      return idx >= 0 && (e.a === focus || e.b === focus) ? TAA_ALL[idx] : null
    }
    return null
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>BFF Block Anatomy</span>
        <span className={s.widgetHint}>one forward pass, five stops</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 470 210" className={s.labCanvas} role="img" aria-label="GraphBFF block anatomy stepper">
          {/* left: the heterogeneous graph */}
          {EDGES.map((e, i) => {
            const a = NODES.find(n => n.id === e.a)!
            const b = NODES.find(n => n.id === e.b)!
            const w = edgeWeight(e)
            const masked = step === 4 && e.a === 'U2' && e.b === 'M2'
            return (
              <g key={i}>
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={E_COLORS[e.t]}
                  strokeWidth={w !== null ? 1.5 + 6 * w : 1.3}
                  strokeDasharray={masked ? '4 3' : undefined}
                  opacity={w !== null ? 0.95 : masked ? 0.9 : 0.45}
                />
                {w !== null && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fontSize={8} fontWeight="bold" textAnchor="middle" fill={E_COLORS[e.t]}>
                    {Math.round(w * 100)}%
                  </text>
                )}
                {masked && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fontSize={8} fontWeight="bold" textAnchor="middle" fill="#333">
                    masked
                  </text>
                )}
              </g>
            )
          })}
          {NODES.map(n => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={13} fill={N_FILL[n.type]} stroke={n.id === focus && step >= 1 && step <= 3 ? '#0a246a' : '#555'} strokeWidth={n.id === focus && step >= 1 && step <= 3 ? 2.5 : 1} />
              <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#fff">{n.id}</text>
            </g>
          ))}
          {/* right: per-step panel */}
          <g transform="translate(232, 8)">
            {step === 0 && (
              <g fontSize={8.5}>
                {(['user', 'merchant', 'device'] as NType[]).map((t, r) => (
                  <g key={t} transform={`translate(0, ${r * 52})`}>
                    {Array.from({ length: RAW_DIMS[t] }, (_, i) => (
                      <rect key={i} x={i * 13} y={4} width={11} height={11} fill={N_FILL[t]} opacity={0.5 + 0.07 * i} stroke="#666" strokeWidth={0.6} />
                    ))}
                    <text x={0} y={30} fill="#333">{t}: {RAW_DIMS[t]}-dim → <tspan fontWeight="bold">W_{t}</tspan> →</text>
                    {Array.from({ length: 4 }, (_, i) => (
                      <rect key={i} x={126 + i * 13} y={18} width={11} height={11} fill="#888" opacity={0.6 + 0.1 * i} stroke="#333" strokeWidth={0.6} />
                    ))}
                    <text x={126} y={44} fill="#555">d = 4</text>
                  </g>
                ))}
              </g>
            )}
            {step === 1 && (
              <g fontSize={8.5}>
                <rect x={0} y={0} width={190} height={30} rx={3} fill="#fff" stroke={E_COLORS.paid} strokeWidth={1.5} />
                <text x={7} y={12} fill={E_COLORS.paid} fontWeight="bold">W_Q W_K W_V — set {'{paid}'}</text>
                <text x={7} y={24} fill="#555">softmax over paid neighbors only: {Math.round(TCA_PAID[0] * 100)} / {Math.round(TCA_PAID[1] * 100)}</text>
                <rect x={0} y={38} width={190} height={30} rx={3} fill="#fff" stroke={E_COLORS['shares-device']} strokeWidth={1.5} />
                <text x={7} y={50} fill={E_COLORS['shares-device']} fontWeight="bold">W_Q W_K W_V — set {'{shares-device}'}</text>
                <text x={7} y={62} fill="#555">softmax over device neighbors only: 100</text>
                <text x={0} y={86} fill="#333">then: h_tca = Σ over sets</text>
              </g>
            )}
            {step === 2 && (
              <g fontSize={8.5}>
                <rect x={0} y={0} width={190} height={30} rx={3} fill="#fff" stroke="#667" strokeWidth={1.5} />
                <text x={7} y={12} fill="#333" fontWeight="bold">shared W_Q W_K W_V — all types</text>
                <text x={7} y={24} fill="#555">sampled 2-hop, ≤10 per hop</text>
                <text x={0} y={50} fill="#333">weights: M1 {Math.round(TAA_ALL[0] * 100)} · M2 {Math.round(TAA_ALL[1] * 100)} · D1 {Math.round(TAA_ALL[2] * 100)} · U2 {Math.round(TAA_ALL[3] * 100)}</text>
              </g>
            )}
            {step === 3 && (
              <g fontSize={9}>
                <rect x={0} y={4} width={62} height={22} rx={3} fill="#dceefb" stroke="#5a8fd0" />
                <text x={31} y={18} textAnchor="middle">h_tca</text>
                <rect x={0} y={34} width={62} height={22} rx={3} fill="#ffe9d6" stroke="#c86018" />
                <text x={31} y={48} textAnchor="middle">h_taa</text>
                <text x={72} y={34} fontSize={11}>→</text>
                <rect x={86} y={16} width={46} height={28} rx={3} fill="#efe9f8" stroke="#7a4ab8" strokeWidth={1.6} />
                <text x={109} y={34} textAnchor="middle" fontWeight="bold">Φ</text>
                <text x={140} y={34} fontSize={11}>→</text>
                <text x={156} y={34}>h&apos;</text>
              </g>
            )}
            {step === 4 && (
              <g fontSize={8.5}>
                {LINK_SCORES.map((l, i) => (
                  <g key={l.pair} transform={`translate(0, ${i * 26})`}>
                    <rect x={0} y={2} width={150 * l.v} height={12} fill="#0a246a" opacity={0.7} rx={2} />
                    <text x={0} y={26} fill="#333">{l.pair}: {l.v.toFixed(2)}</text>
                  </g>
                ))}
              </g>
            )}
          </g>
        </svg>
        {/* parameter meter — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 10, background: '#e4e0cf', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '85%', background: '#7a4ab8' }} />
            <div style={{ width: '15%', background: '#5a8fd0' }} />
          </div>
          <span>TCA ≈85% of 1.4B params (paper: &quot;about 85%&quot;) · rest: TAA + FFNs + heads</span>
        </div>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.max(0, st - 1))} disabled={step === 0}>◂ back</button>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.min(STEPS.length - 1, st + 1))} disabled={step === STEPS.length - 1}>next ▸</button>
          <span className={s.labStat}><span className={s.labStatValue}>{STEPS[step].title}</span></span>
        </div>
        <p className={s.labNote}>{STEPS[step].caption}</p>
      </div>
    </div>
  )
}
