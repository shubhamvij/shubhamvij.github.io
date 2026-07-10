'use client'
import { Fragment, useState } from 'react'
import s from '../engine/course.module.css'

interface Part {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
  blurb: string
}

// One pre-norm transformer block, drawn as a residual "highway" with two stops.
const PARTS: Part[] = [
  { id: 'embed', label: 'token embeddings + positions', x: 130, y: 250, w: 220, h: 26, color: '#d8e3f5', blurb: 'Tokens become vectors. Position information is added here (learned or sinusoidal) or injected inside attention itself (RoPE rotates Q/K; ALiBi biases scores by distance) — attention alone is order-blind, so without this "cat sat" = "sat cat". Deep dive: 2.1.' },
  { id: 'ln1', label: 'LayerNorm', x: 155, y: 208, w: 78, h: 22, color: '#f4f2e8', blurb: 'Normalizes each token vector before attention (the "pre-norm" placement modern LLMs use). Keeps activations in a healthy range so 100-layer stacks train stably. Deep dive: 2.3.' },
  { id: 'mha', label: 'multi-head attention', x: 145, y: 168, w: 170, h: 30, color: '#cfe0f5', blurb: 'The communication step: the only place tokens exchange information. Every token queries every other token (module 1) with several heads in parallel (this module). Cost: O(n²) in sequence length — the villain of module 3. Deep dive: 2.2.' },
  { id: 'add1', label: '⊕ add (residual)', x: 155, y: 130, w: 130, h: 22, color: '#e3f6e3', blurb: 'The attention output is ADDED to the input, not substituted for it. The untouched copy flowing around every sublayer is the residual stream — an information highway that makes very deep stacks trainable and lets layers make small, composable edits. Deep dive: 2.3.' },
  { id: 'ln2', label: 'LayerNorm', x: 155, y: 92, w: 78, h: 22, color: '#f4f2e8', blurb: 'Same normalization again, before the feed-forward sublayer. Deep dive: 2.3.' },
  { id: 'ffn', label: 'feed-forward network', x: 145, y: 52, w: 170, h: 30, color: '#fbe7d4', blurb: 'The computation step: a two-layer MLP (usually 4× wider than the model dimension) applied to each token independently — no token-to-token communication here. Roughly 2/3 of a transformer\'s parameters live in these layers; much of its stored "knowledge" does too. Deep dive: 2.4.' },
  { id: 'add2', label: '⊕ add (residual)', x: 155, y: 14, w: 130, h: 22, color: '#e3f6e3', blurb: 'Second residual add. Output shape = input shape, so blocks stack like LEGO: GPT-3 is 96 of these; a ViT is the same block over image patches; a graph transformer is the same block with attention restricted by a graph. Deep dive: 2.3.' },
]

// ---------- A real forward pass through one pre-norm block ----------
// 4 tokens, d=4, one attention head, d_ff=8, fixed weights, no biases, γ=1/β=0.
// Computed once at module load; the panel below the diagram shows the numbers.
const FLOW_TOKENS = ['The', 'cat', 'sat', 'here']
const F_EMB = [
  [0.2, -0.6, 0.4, 0.1],
  [0.9, 0.3, -0.5, 0.7],
  [-0.4, 0.8, 0.6, -0.2],
  [0.5, -0.3, -0.7, -0.8],
]
const F_WQ = [[0.6, -0.3, 0.2, 0.5], [0.1, 0.7, -0.4, 0.2], [-0.5, 0.2, 0.6, -0.1], [0.3, 0.4, 0.1, -0.6]]
const F_WK = [[0.5, 0.2, -0.6, 0.1], [-0.2, 0.6, 0.3, -0.4], [0.4, -0.1, 0.5, 0.3], [0.2, 0.5, -0.3, 0.6]]
const F_WV = [[0.7, -0.2, 0.1, 0.4], [0.2, 0.5, -0.3, 0.1], [-0.3, 0.4, 0.6, 0.2], [0.1, -0.5, 0.2, 0.7]]
const F_WO = [[0.5, 0.3, -0.2, 0.1], [-0.3, 0.6, 0.2, -0.1], [0.2, -0.4, 0.7, 0.3], [0.1, 0.2, -0.3, 0.6]]
const F_W1 = [
  [0.4, -0.2, 0.3, 0.1], [-0.3, 0.5, 0.2, -0.4], [0.2, 0.3, -0.5, 0.6], [0.6, -0.4, 0.1, 0.2],
  [-0.1, 0.2, 0.4, -0.3], [0.3, 0.6, -0.2, -0.5], [-0.5, 0.1, 0.3, 0.4], [0.2, -0.3, 0.6, 0.1],
]
const F_W2 = [
  [0.3, -0.2, 0.4, 0.1, -0.3, 0.2, 0.5, -0.1],
  [-0.2, 0.4, 0.1, -0.5, 0.2, 0.3, -0.4, 0.6],
  [0.5, 0.1, -0.3, 0.2, 0.4, -0.6, 0.1, 0.3],
  [0.1, -0.4, 0.2, 0.3, -0.1, 0.5, 0.2, -0.2],
]

const fMatVec = (W: number[][], x: number[]) => W.map(row => row.reduce((acc, w, i) => acc + w * x[i], 0))
const fLn = (v: number[]) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length + 1e-5)
  return v.map(x => (x - m) / sd)
}
const fPe = (p: number) => [Math.sin(0.9 * p), Math.cos(0.9 * p), Math.sin(0.35 * p), Math.cos(0.35 * p)].map(v => v * 0.5)

function blockForward() {
  const x0 = F_EMB.map((e, p) => e.map((v, d) => v + fPe(p)[d]))
  const x1 = x0.map(fLn)
  const q = x1.map(v => fMatVec(F_WQ, v))
  const k = x1.map(v => fMatVec(F_WK, v))
  const vv = x1.map(v => fMatVec(F_WV, v))
  const attnW = q.map(qi => {
    const scores = k.map(kj => qi.reduce((acc, x, i2) => acc + x * kj[i2], 0) / 2)
    const mx = Math.max(...scores)
    const exps = scores.map(sc => Math.exp(sc - mx))
    const sum = exps.reduce((a2, b2) => a2 + b2, 0)
    return exps.map(e2 => e2 / sum)
  })
  const a = attnW.map(w => fMatVec(F_WO, vv[0].map((_, d) => w.reduce((acc, wj, j) => acc + wj * vv[j][d], 0))))
  const x2 = x0.map((v, i2) => v.map((x, d) => x + a[i2][d]))
  const x3 = x2.map(fLn)
  const f = x3.map(v => fMatVec(F_W2, fMatVec(F_W1, v).map(h => Math.max(0, h))))
  const out = x2.map((v, i2) => v.map((x, d) => x + f[i2][d]))
  return { x0, x1, a, attnW, x2, x3, f, out }
}
const FLOW = blockForward()

interface FlowStage {
  before: number[][] | null // null = show token symbols
  after: number[][]
  beforeLabel: string
  afterLabel: string
  shape: string
  note: string
  weights?: number[][]
}

const FLOW_STAGES: Record<string, FlowStage> = {
  embed: {
    before: null, after: FLOW.x0, beforeLabel: 'tokens', afterLabel: 'embedding + position',
    shape: 'tokens [4] → vectors [4×4]',
    note: 'The only shape-changing step: symbols become d-dim vectors (embedding row + position vector). Everything after is [4×4] in, [4×4] out.',
  },
  ln1: {
    before: FLOW.x0, after: FLOW.x1, beforeLabel: 'from embeddings', afterLabel: 'normalized',
    shape: '[4×4] → [4×4]',
    note: 'Each ROW is rescaled to mean 0, variance 1 — compare a row across the two grids. Per token, never across the batch.',
  },
  mha: {
    before: FLOW.x1, after: FLOW.a, beforeLabel: 'normalized input', afterLabel: 'attention output (the edit)',
    shape: '[4×4] → [4×4]', weights: FLOW.attnW,
    note: 'The middle grid is the real attention pattern — row = query token, column = who it attends to, rows sum to 1. The output mixes value vectors by those weights.',
  },
  add1: {
    before: FLOW.a, after: FLOW.x2, beforeLabel: 'attention edit', afterLabel: 'input + edit',
    shape: '[4×4] + [4×4] → [4×4]',
    note: 'The edit is ADDED to the untouched pre-norm input (the residual copy) — attention adjusts each token\'s vector, it never replaces it.',
  },
  ln2: {
    before: FLOW.x2, after: FLOW.x3, beforeLabel: 'residual stream', afterLabel: 'normalized',
    shape: '[4×4] → [4×4]',
    note: 'Same normalization again before the FFN — each row back to mean 0, variance 1.',
  },
  ffn: {
    before: FLOW.x3, after: FLOW.f, beforeLabel: 'normalized input', afterLabel: 'FFN output (the edit)',
    shape: '4×4 → 4×8 → 4×4 (expand → nonlinearity → project back)',
    note: 'Each row goes through the SAME two matrices independently — cover the other rows and nothing changes. No token sees any other token here.',
  },
  add2: {
    before: FLOW.f, after: FLOW.out, beforeLabel: 'FFN edit', afterLabel: 'block output',
    shape: '[4×4] + [4×4] → [4×4]',
    note: 'Output shape = input shape, so the next block consumes this directly — stack 96 of them and you have a GPT.',
  },
}

const flowColor = (v: number) => {
  const t = Math.max(-1.6, Math.min(1.6, v)) / 1.6
  return t >= 0
    ? `rgb(${Math.round(255 - 55 * t)}, ${Math.round(255 - 144 * t)}, ${Math.round(255 - 231 * t)})`
    : `rgb(${Math.round(255 + 212 * t)}, ${Math.round(255 + 144 * t)}, ${Math.round(255 + 47 * t)})`
}

function VecGrid({ label, data, weights }: { label: string; data: number[][] | null; weights?: boolean }) {
  return (
    <div>
      <div className={s.vecGrid} style={{ gridTemplateColumns: `auto repeat(${data ? data[0].length : 1}, auto)` }}>
        {FLOW_TOKENS.map((tok, i) => (
          <Fragment key={`row${i}`}>
            <span key={`t${i}`} className={s.vecTok}>{tok}</span>
            {data
              ? data[i].map((v, d) => (
                  <span key={`${i}-${d}`} className={s.vecCell} style={{ background: weights ? flowColor(-v * 1.6) : flowColor(v) }}>
                    {v.toFixed(2)}
                  </span>
                ))
              : <span key={`s${i}`} className={s.vecCell}>&quot;{FLOW_TOKENS[i]}&quot;</span>}
          </Fragment>
        ))}
      </div>
      <p className={s.flowShape}>{label}</p>
    </div>
  )
}

export default function TransformerBlockDiagram() {
  const [selected, setSelected] = useState('mha')
  const part = PARTS.find(p => p.id === selected)!

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Anatomy of a Transformer Block</span>
        <span className={s.widgetHint}>click each component</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 480 290" className={s.labCanvas} role="img" aria-label="Transformer block diagram with clickable components">
          {/* residual highway */}
          <line x1="112" y1="262" x2="112" y2="18" stroke="#9ab48c" strokeWidth={6} opacity={0.55} />
          <text x="104" y="146" fontSize="9" fill="#4a7a3a" textAnchor="middle" transform="rotate(-90 104 146)">residual stream</text>
          {/* skip curves into the adds */}
          <path d="M 112 236 C 112 190, 140 150, 155 141" fill="none" stroke="#9ab48c" strokeWidth={2.5} />
          <path d="M 112 120 C 112 74, 140 34, 155 25" fill="none" stroke="#9ab48c" strokeWidth={2.5} />
          {/* main flow arrows */}
          <line x1="240" y1="250" x2="240" y2="230" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="208" x2="240" y2="198" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="168" x2="240" y2="152" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="130" x2="240" y2="114" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="92" x2="240" y2="82" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <line x1="240" y1="52" x2="240" y2="36" stroke="#777" strokeWidth={1.5} markerEnd="url(#arr)" />
          <defs>
            <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#777" />
            </marker>
          </defs>
          {PARTS.map(p => (
            <g key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
              <rect
                x={p.x} y={p.y} width={p.w} height={p.h} rx={4}
                fill={p.color}
                stroke={selected === p.id ? '#0a246a' : '#8898a8'}
                strokeWidth={selected === p.id ? 2.5 : 1}
              />
              <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 3.5} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif" fontWeight={selected === p.id ? 'bold' : 'normal'}>
                {p.label}
              </text>
            </g>
          ))}
          <text x="240" y="284" fontSize="9.5" fill="#888" textAnchor="middle">input: one vector per token — output: same shape, so blocks stack</text>
          <text x="416" y="152" fontSize="10" fill="#666" textAnchor="middle">×N layers</text>
          <rect x="384" y="160" width="64" height="4" fill="#ccc" />
          <rect x="384" y="168" width="64" height="4" fill="#ddd" />
          <rect x="384" y="176" width="64" height="4" fill="#eee" />
        </svg>
        <div className={`${s.feedback} ${s.feedbackCorrect}`} style={{ marginTop: 8 }}>
          <span className={s.feedbackIcon}>▸</span>
          <span><strong>{part.label}:</strong> {part.blurb}</span>
        </div>
        {(() => {
          const flow = FLOW_STAGES[selected]
          if (!flow) return null
          return (
            <div className={s.flowPanel}>
              <p className={s.flowTitle}>data through &quot;{part.label}&quot; — real numbers, computed live</p>
              <div className={s.flowGrids}>
                <VecGrid label={flow.beforeLabel} data={flow.before} />
                <span className={s.flowArrow}>→</span>
                {flow.weights && (
                  <>
                    <VecGrid label="attention weights (rows sum to 1)" data={flow.weights} weights />
                    <span className={s.flowArrow}>→</span>
                  </>
                )}
                <VecGrid label={flow.afterLabel} data={flow.after} />
              </div>
              <p className={s.flowShape}>{flow.shape}</p>
              <p className={s.flowNote}>{flow.note}</p>
            </div>
          )
        })()}
        <p className={s.labNote}>
          Read bottom-up. The pattern to internalize: <strong>attention communicates, the FFN computes,
          residuals + LayerNorm keep it all trainable</strong>. Every architecture in this course is this block
          with one ingredient swapped.
        </p>
      </div>
    </div>
  )
}
