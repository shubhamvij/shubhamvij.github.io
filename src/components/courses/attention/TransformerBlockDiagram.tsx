'use client'
import { useState } from 'react'
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
        <p className={s.labNote}>
          Read bottom-up. The pattern to internalize: <strong>attention communicates, the FFN computes,
          residuals + LayerNorm keep it all trainable</strong>. Every architecture in this course is this block
          with one ingredient swapped.
        </p>
      </div>
    </div>
  )
}
