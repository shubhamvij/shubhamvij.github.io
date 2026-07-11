'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type SlotState = 'frozen' | 'trained' | 'free' | 'none'
type Wiring = 'ofa' | 'graphgpt' | 'llaga' | 'unigraph'

interface Slot {
  label: string
  sub?: string
  state: SlotState
  blurb?: string
}

interface WiringDef {
  name: string
  /** Exactly 5 slots: source, text encoder, graph module, projector, predictor. */
  slots: Slot[]
  trained: string
  locus: 'GNN predicts' | 'LLM predicts'
  conditioning: string
}

// All facts per the spec's verification ledger (OFA/GraphGPT/LLaGA/UniGraph primary papers).
const WIRINGS: Record<Wiring, WiringDef> = {
  ofa: {
    name: 'One-for-All',
    slots: [
      { label: 'node & task text', state: 'none', blurb: 'every node, edge, task and class gets a natural-language description' },
      { label: 'LM text encoder', sub: 'e5 / Llama2 — frozen', state: 'frozen', blurb: 'a frozen LM embeds all descriptions into one shared vector space — the whole alignment trick' },
      { label: 'typed GNN', sub: 'edge-type aware', state: 'trained', blurb: 'a trained GNN message-passes over the graph PLUS the appended prompt and class nodes' },
      { label: '', state: 'none' },
      { label: 'sigmoid(MLP(h_class))', sub: 'per class node', state: 'trained', blurb: 'each class node\'s final embedding is scored — classification without a fixed-size head' },
    ],
    trained: 'the GNN + class-node MLP head',
    locus: 'GNN predicts',
    conditioning: 'the task arrives as GRAPH SURGERY: a prompt node + class nodes appended to the input graph',
  },
  graphgpt: {
    name: 'GraphGPT',
    slots: [
      { label: 'graph + instruction', state: 'none', blurb: 'an instruction template contains a <graph> placeholder token' },
      { label: '', state: 'none' },
      { label: 'graph encoder', sub: 'frozen', state: 'frozen', blurb: 'a pre-aligned graph encoder (default: a graph transformer) — frozen during instruction tuning' },
      { label: 'projector', sub: 'the only 🔥', state: 'trained', blurb: 'as simple as a single linear layer: maps node embeddings into the LLM\'s token space' },
      { label: 'LLM', sub: 'Vicuna — frozen', state: 'frozen', blurb: 'n graph tokens replace <graph>: {<graph_begin>, <graph_token>_1..n, <graph_end>}; the frozen LLM answers' },
    ],
    trained: 'the projector — nothing else',
    locus: 'LLM predicts',
    conditioning: 'graph tokens are spliced into the instruction at the <graph> marker',
  },
  llaga: {
    name: 'LLaGA',
    slots: [
      { label: 'node text', state: 'none', blurb: 'node attributes only — LLaGA never trains a graph encoder' },
      { label: 'text encoder', sub: 'SimTeG/SBERT — frozen', state: 'frozen', blurb: 'off-the-shelf frozen text embeddings for every node' },
      { label: 'templates', sub: '0 params', state: 'free', blurb: 'parameter-free: a fixed-shape sampled tree flattened level-by-level (+ Laplacian PEs), or per-hop mean aggregation' },
      { label: 'projector', sub: 'MLP — the only 🔥', state: 'trained', blurb: 'a small MLP maps template sequences into token space — the only trained parameters' },
      { label: 'LLM', sub: 'Vicuna-7B — frozen', state: 'frozen', blurb: 'the frozen LLM reads the projected node sequence and answers' },
    ],
    trained: 'the MLP projector — nothing else',
    locus: 'LLM predicts',
    conditioning: 'structure is encoded by the token ORDER the parameter-free templates produce',
  },
  unigraph: {
    name: 'UniGraph',
    slots: [
      { label: 'masked node text', state: 'none', blurb: 'node texts with masked spans — the self-supervision signal' },
      { label: 'DeBERTa', sub: 'trained 🔥', state: 'trained', blurb: 'the LM is NOT frozen here — it trains jointly with the GNN' },
      { label: 'GAT', sub: 'trained 🔥', state: 'trained', blurb: 'propagates each node\'s [CLS] embedding over the graph — the cascade\'s second half' },
      { label: '', state: 'none' },
      { label: 'MGM head', sub: 'masked-graph modeling', state: 'trained', blurb: 'Graph Siamese Masked Autoencoder objective on text-attributed graphs' },
    ],
    trained: 'LM + GNN jointly, end to end',
    locus: 'GNN predicts',
    conditioning: 'none at pretrain; a LoRA-tuned Llama handles instructions at inference time only',
  },
}

const FILL: Record<SlotState, { fill: string; stroke: string; icon: string }> = {
  frozen: { fill: '#dceefb', stroke: '#5a8fd0', icon: '❄' },
  trained: { fill: '#ffe9d6', stroke: '#c86018', icon: '🔥' },
  free: { fill: '#eeeeea', stroke: '#999', icon: '∅' },
  none: { fill: 'none', stroke: '#bbb', icon: '' },
}

export default function TextGlueLab() {
  const [wiring, setWiring] = useState<Wiring>('ofa')
  const [picked, setPicked] = useState<number | null>(null)

  const def = WIRINGS[wiring]
  const blurb = picked !== null ? def.slots[picked].blurb : undefined

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Wiring Switcher</span>
        <span className={s.widgetHint}>one bet, four machines — click a slot for details</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {(Object.keys(WIRINGS) as Wiring[]).map(w => (
            <button key={w} type="button" className={`${s.chip} ${wiring === w ? s.chipOn : ''}`} onClick={() => { setWiring(w); setPicked(null) }}>
              {WIRINGS[w].name}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 470 120" className={s.labCanvas} role="img" aria-label={`Pipeline diagram for ${def.name}`}>
          {def.slots.map((slot, i) => {
            const x = 6 + i * 94
            const st = FILL[slot.state]
            const empty = slot.label === ''
            return (
              <g key={i} onClick={() => !empty && setPicked(i)} style={{ cursor: empty ? 'default' : 'pointer' }}>
                <rect
                  x={x} y={26} width={86} height={46} rx={4}
                  fill={empty ? 'none' : st.fill}
                  stroke={st.stroke}
                  strokeWidth={picked === i ? 2.5 : 1.4}
                  strokeDasharray={slot.state === 'none' ? '4 3' : undefined}
                />
                {!empty && (
                  <>
                    <text x={x + 43} y={41} textAnchor="middle" fontSize={9} fontWeight="bold">{slot.label}</text>
                    <text x={x + 58} y={43} textAnchor="middle" fontSize={8}>{st.icon}</text>
                    {slot.sub && <text x={x + 43} y={57} textAnchor="middle" fontSize={7.5} fill="#555">{slot.sub}</text>}
                  </>
                )}
                {empty && <text x={x + 43} y={52} textAnchor="middle" fontSize={8} fill="#aaa">—</text>}
                {i < 4 && <text x={x + 90} y={52} textAnchor="middle" fontSize={11} fill="#666">→</text>}
              </g>
            )
          })}
          <text x={10} y={14} fontSize={8.5} fill="#555">❄ frozen · 🔥 trained · ∅ parameter-free · dashed = raw data in / slot absent</text>
          <text x={10} y={104} fontSize={8.5} fill="#333" fontWeight="bold">conditioning: <tspan fontWeight="normal">{def.conditioning}</tspan></text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>trained here: <span className={s.labStatValue}>{def.trained}</span></span>
          <span className={s.labStat}><span className={s.labStatValue}>{def.locus}</span></span>
        </div>
        {blurb && <p className={s.labNote}>{blurb}</p>}
        {!blurb && (
          <p className={s.labNote}>
            All four share the same bet — English as the universal vocabulary — yet they are four different
            machines. Watch three things as you switch: <strong>who predicts</strong> (GNN or LLM),{' '}
            <strong>whether a graph encoder exists at all</strong> (LLaGA&apos;s answer: no), and{' '}
            <strong>what actually trains</strong> (OFA: the GNN; GraphGPT/LLaGA: one projector; UniGraph:
            everything). The shared ceiling: nodes need meaningful text.
          </p>
        )}
      </div>
    </div>
  )
}
