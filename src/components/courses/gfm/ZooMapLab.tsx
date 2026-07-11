'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type AxisKey = 'token' | 'backbone' | 'conditioning' | 'trained' | 'locus'

interface ZooModel {
  id: string
  name: string
  year: string
  family: string
  color: string
  dive: string
  cells: Record<AxisKey, string>
}

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'token', label: "What is the \"token\"?" },
  { key: 'backbone', label: 'Backbone' },
  { key: 'conditioning', label: 'Where conditioning enters' },
  { key: 'trained', label: 'Frozen vs trained' },
  { key: 'locus', label: 'Who predicts' },
]

// Every cell string below is fact-checked against the primary papers — see the
// verification ledger in docs/superpowers/specs/2026-07-10-gfm-zoo-subchapters-design.md.
const MODELS: ZooModel[] = [
  {
    id: 'ultra', name: 'ULTRA', year: '2023', family: 'domain vocabulary', color: '#2f8e2f', dive: 'deep dive 5.1',
    cells: {
      token: 'relations, via their interaction graph',
      backbone: 'conditional MPNN (NBFNet-style)',
      conditioning: 'inside message passing, per query (labeling trick)',
      trained: 'GNN weights transfer; relation graph recomputed per KG',
      locus: 'the GNN scores (h, r, ?) directly',
    },
  },
  {
    id: 'jmp', name: 'JMP', year: '2023', family: 'domain vocabulary', color: '#2f8e2f', dive: 'deep dive 5.1',
    cells: {
      token: 'atoms: element + 3D position',
      backbone: 'geometric MPNN (GemNet-OC)',
      conditioning: 'per-dataset output heads',
      trained: 'pretrain all; fine-tune whole model with new heads',
      locus: 'GNN regression heads (energy & forces)',
    },
  },
  {
    id: 'ofa', name: 'One-for-All', year: '2023', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'nodes/edges described in text, LM-embedded',
      backbone: 'edge-type-aware GNN',
      conditioning: 'prompt + class nodes appended to the graph',
      trained: 'LM frozen; GNN trained',
      locus: 'the GNN: P(class i) = sigmoid(MLP(h_class_i))',
    },
  },
  {
    id: 'graphgpt', name: 'GraphGPT', year: '2023', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'projected node embeddings as prompt tokens',
      backbone: 'frozen graph encoder feeding a frozen LLM',
      conditioning: 'graph tokens spliced at <graph> in the instruction',
      trained: 'everything frozen except one projector',
      locus: 'the LLM generates the answer',
    },
  },
  {
    id: 'llaga', name: 'LLaGA', year: '2024', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'template-ordered node sequences (+ Laplacian PE)',
      backbone: 'no graph encoder — frozen LLM only',
      conditioning: 'parameter-free structure templates',
      trained: 'everything frozen except one projector',
      locus: 'the LLM generates the answer',
    },
  },
  {
    id: 'unigraph', name: 'UniGraph', year: '2024', family: 'text as glue', color: '#c86018', dive: 'deep dive 5.2',
    cells: {
      token: 'masked node text, one [CLS] per node',
      backbone: 'DeBERTa-to-GAT cascade',
      conditioning: 'none at pretrain; LoRA LLM later for instructions',
      trained: 'LM + GNN trained jointly, end to end',
      locus: 'GNN-side heads (masked-graph modeling)',
    },
  },
  {
    id: 'graphany', name: 'GraphAny', year: '2024', family: 'structure + in-context', color: '#5a8fd0', dive: 'deep dive 5.3',
    cells: {
      token: 'pairwise distances between channel predictions',
      backbone: '5 closed-form LinearGNNs + an attention MLP',
      conditioning: 'the target graph’s own labels (closed-form solve)',
      trained: 'only the attention MLP is ever trained',
      locus: 'weighted vote over LinearGNN channels',
    },
  },
  {
    id: 'graphpfn', name: 'GraphPFN', year: '2025', family: 'structure + in-context', color: '#5a8fd0', dive: 'deep dive 5.3',
    cells: {
      token: 'node = a table row of feature tokens',
      backbone: 'LimiX PFN + adjacency-masked attention adapters',
      conditioning: 'labeled nodes as in-context examples',
      trained: 'frozen at inference (ICL); fine-tune optional',
      locus: 'the PFN transformer head',
    },
  },
  {
    id: 'graphbff', name: 'GraphBFF', year: '2026', family: 'typed at scale', color: '#7a4ab8', dive: 'deep dive 5.4',
    cells: {
      token: 'typed nodes (per-type feature vector)',
      backbone: 'graph transformer: TCA + TAA fused per block',
      conditioning: 'downstream: frozen features + a small probe',
      trained: 'pretrain all 1.4B; freeze + probe downstream',
      locus: 'edge scorer at pretrain; probe downstream',
    },
  },
  {
    id: 'kumorfm2', name: 'KumoRFM-2', year: '2026', family: 'relational', color: '#b03060', dive: 'deep dive 5.5',
    cells: {
      token: 'task-conditioned table rows',
      backbone: 'column-row attention, then PK-FK + cross-sample',
      conditioning: 'labels injected into the input tables (earliest)',
      trained: 'fully frozen at inference — pure ICL',
      locus: 'cross-sample attention readout',
    },
  },
]

export default function ZooMapLab() {
  const [selected, setSelected] = useState<[string, string]>(['ultra', 'graphbff'])

  const pick = (id: string) => {
    setSelected(sel => (sel.includes(id) ? sel : [sel[1], id]))
  }

  const a = MODELS.find(m => m.id === selected[0])!
  const b = MODELS.find(m => m.id === selected[1])!

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Zoo Map</span>
        <span className={s.widgetHint}>pick any two models to compare</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
          {MODELS.map(m => (
            <button
              key={m.id}
              type="button"
              className={`${s.chip} ${selected.includes(m.id) ? s.chipOn : ''}`}
              style={{ borderColor: m.color }}
              onClick={() => pick(m.id)}
            >
              {m.name} <span style={{ opacity: 0.65 }}>&apos;{m.year.slice(2)}</span>
              <span style={{ display: 'block', fontSize: 9, opacity: 0.75 }}>{m.dive}</span>
            </button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 6px', width: '20%' }}></th>
              {[a, b].map(m => (
                <th key={m.id} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: `2px solid ${m.color}` }}>
                  {m.name}
                  <div style={{ fontWeight: 'normal', opacity: 0.7 }}>
                    {m.family}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AXES.map(ax => {
              const same = a.cells[ax.key] === b.cells[ax.key]
              return (
                <tr key={ax.key} style={same ? { opacity: 0.6 } : undefined}>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold', verticalAlign: 'top' }}>
                    {ax.label}
                    {same && <div style={{ fontWeight: 'normal', fontSize: 10 }}>· same ·</div>}
                  </td>
                  <td style={{ padding: '5px 6px', verticalAlign: 'top', borderLeft: `3px solid ${a.color}` }}>{a.cells[ax.key]}</td>
                  <td style={{ padding: '5px 6px', verticalAlign: 'top', borderLeft: `3px solid ${b.color}` }}>{b.cells[ax.key]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className={s.labNote}>
          Five axes, every model. Rows where two models agree are dimmed — GraphGPT and LLaGA, for example,
          share a prediction locus and a frozen/trained split and differ only in how graph structure reaches
          the LLM. One caution from Mao et al.: a graph &quot;vocabulary&quot; need not be a literal tokenizer —
          for several of these models the transferable unit is <em>a model</em> that maps graphs into a shared
          space, not a symbol table.
        </p>
      </div>
    </div>
  )
}
