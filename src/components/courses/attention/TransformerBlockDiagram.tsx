'use client'
import { Fragment, useState } from 'react'
import s from '../engine/course.module.css'
import { FLOW, FLOW_TOKENS, EMB, POS, D_HEAD } from './blockFlow'

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

// ---------- Data-flow panel: real numbers from blockFlow (4 tokens, d=6, 2 heads) ----------

const DCOLS = ['d₁', 'd₂', 'd₃', 'd₄', 'd₅', 'd₆']
const POS_ROWS = ['pos 0', 'pos 1', 'pos 2', 'pos 3']
const HEAD_COLORS = ['#2b6fd0', '#2f8e2f']

interface GridSpec {
  label: string
  data: number[][]
  rows?: string[] // row labels; default: the tokens
  cols?: string[] // column headers: dims, or token names for attention patterns
  weights?: boolean // 0..1 attention shading instead of signed shading
  headSplit?: boolean // label d₁–d₃ / d₄–d₆ column groups as head 1 / head 2
  headIndex?: number // whole grid belongs to one head (e.g. a 4×3 head output)
}
type StageItem = GridSpec | { op: string }

interface FlowStage {
  items: StageItem[]
  shape: string
  note: string
}

const FLOW_STAGES: Record<string, FlowStage> = {
  embed: {
    items: [
      { label: 'token embedding (lookup row)', data: EMB, cols: DCOLS },
      { op: '⊕' },
      { label: 'position vector (sinusoidal)', data: POS, rows: POS_ROWS, cols: DCOLS },
      { op: '=' },
      { label: 'what enters the block', data: FLOW.x0, cols: DCOLS },
    ],
    shape: 'tokens [4] → vectors [4×6]',
    note: '"cat" anywhere in any text fetches the SAME embedding row, and pos 1 adds the SAME vector no matter which token sits there — only the sum knows both. After the ⊕, "cat at position 1" ≠ "cat at position 3": that is how order sneaks into an otherwise order-blind mechanism. Deep dive 2.1 covers the schemes that inject position inside attention instead (RoPE, ALiBi).',
  },
  ln1: {
    items: [
      { label: 'from embeddings', data: FLOW.x0, cols: DCOLS },
      { op: '→' },
      { label: 'normalized', data: FLOW.x1, cols: DCOLS },
    ],
    shape: '[4×6] → [4×6]',
    note: 'Each ROW — one token\'s 6 numbers — is rescaled to mean 0, variance 1. Compare a row across the two grids: per token, never across the batch.',
  },
  mha: {
    items: [
      { label: 'normalized input', data: FLOW.x1, cols: DCOLS },
      { op: '→' },
      { label: 'attention output (the edit)', data: FLOW.a, cols: DCOLS },
    ],
    shape: '[4×6] → [4×6]',
    note: 'The attention edit for each token — a mix of the other tokens\' value vectors.',
  },
  add1: {
    items: [
      { label: 'residual copy (pre-norm input)', data: FLOW.x0, cols: DCOLS },
      { op: '+' },
      { label: 'attention edit', data: FLOW.a, cols: DCOLS },
      { op: '=' },
      { label: 'updated stream', data: FLOW.x2, cols: DCOLS },
    ],
    shape: '[4×6] + [4×6] → [4×6]',
    note: 'The edit is ADDED to the untouched pre-norm input — attention adjusts each token\'s vector, it never replaces it. Adding (not concatenating) also keeps the width at 6 forever — the add-vs-concat callout in 2.3 is the why.',
  },
  ln2: {
    items: [
      { label: 'residual stream', data: FLOW.x2, cols: DCOLS },
      { op: '→' },
      { label: 'normalized', data: FLOW.x3, cols: DCOLS },
    ],
    shape: '[4×6] → [4×6]',
    note: 'Same normalization again before the FFN — each row back to mean 0, variance 1.',
  },
  ffn: {
    items: [
      { label: 'normalized input', data: FLOW.x3, cols: DCOLS },
      { op: '→' },
      { label: 'FFN output (the edit)', data: FLOW.f, cols: DCOLS },
    ],
    shape: '4×6 → 4×24 → 4×6 (expand 4× → ReLU → project back)',
    note: 'Each row goes through the SAME two matrices independently — cover the other rows and nothing changes. No token sees any other token here.',
  },
  add2: {
    items: [
      { label: 'residual stream', data: FLOW.x2, cols: DCOLS },
      { op: '+' },
      { label: 'FFN edit', data: FLOW.f, cols: DCOLS },
      { op: '=' },
      { label: 'block output', data: FLOW.out, cols: DCOLS },
    ],
    shape: '[4×6] + [4×6] → [4×6]',
    note: 'Output shape = input shape, so the next block consumes this directly — stack 96 of them and you have a GPT.',
  },
}

const flowColor = (v: number) => {
  const t = Math.max(-1.6, Math.min(1.6, v)) / 1.6
  return t >= 0
    ? `rgb(${Math.round(255 - 55 * t)}, ${Math.round(255 - 144 * t)}, ${Math.round(255 - 231 * t)})`
    : `rgb(${Math.round(255 + 212 * t)}, ${Math.round(255 + 144 * t)}, ${Math.round(255 + 47 * t)})`
}

function VecGrid({ g }: { g: GridSpec }) {
  const rows = g.rows ?? FLOW_TOKENS
  const nCols = g.data[0].length
  const headLabels = g.headIndex !== undefined ? [g.headIndex] : g.headSplit ? [0, 1] : null
  return (
    <div>
      <div className={s.vecGrid} style={{ gridTemplateColumns: `auto repeat(${nCols}, auto)` }}>
        {headLabels && (
          <>
            <span />
            {headLabels.map(h => (
              <span
                key={`h${h}`}
                className={s.vecHeadLabel}
                style={{
                  gridColumn: `span ${headLabels.length === 1 ? nCols : D_HEAD}`,
                  color: HEAD_COLORS[h],
                  borderBottom: `2px solid ${HEAD_COLORS[h]}`,
                }}
              >
                head {h + 1}
              </span>
            ))}
          </>
        )}
        {g.cols && (
          <>
            <span />
            {g.cols.map((c, i) => <span key={`c${i}`} className={s.vecColHead}>{c}</span>)}
          </>
        )}
        {rows.map((tok, i) => (
          <Fragment key={`row${i}`}>
            <span className={s.vecTok}>{tok}</span>
            {g.data[i].map((v, d) => (
              // weights are 0..1: negate so flowColor's blue (negative) branch renders a white→blue ramp
              <span key={`${i}-${d}`} className={s.vecCell} style={{ background: g.weights ? flowColor(-v * 1.6) : flowColor(v) }}>
                {v.toFixed(2)}
              </span>
            ))}
          </Fragment>
        ))}
      </div>
      <p className={s.flowShape}>{g.label}</p>
    </div>
  )
}

function StageItems({ items }: { items: StageItem[] }) {
  return (
    <div className={s.flowGrids}>
      {items.map((it, i) => 'op' in it
        ? <span key={`op${i}`} className={s.flowArrow}>{it.op}</span>
        : <VecGrid key={`g${i}`} g={it} />)}
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
              <StageItems items={flow.items} />
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
