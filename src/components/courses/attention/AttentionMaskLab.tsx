'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

const N = 10
const WINDOW = 2

// Fixed small graph for "graph mask" mode: a ring with a few chords.
const GRAPH_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0],
  [0, 4], [2, 7], [3, 8],
]
const ADJ: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false))
for (const [a, b] of GRAPH_EDGES) {
  ADJ[a][b] = true
  ADJ[b][a] = true
}

type Mode = 'full' | 'causal' | 'window' | 'graph'

const MODES: { id: Mode; label: string; complexity: string; note: string }[] = [
  { id: 'full', label: 'Full (BERT / ViT)', complexity: 'O(n²)', note: 'every token attends to every token — a complete graph' },
  { id: 'causal', label: 'Causal (GPT)', complexity: 'O(n²)/2', note: 'each token sees only the past — a fully-connected DAG' },
  { id: 'window', label: `Sliding window (w=${WINDOW})`, complexity: 'O(n·w)', note: 'each token sees the last few tokens — a path-like graph (Mistral, Longformer)' },
  { id: 'graph', label: 'Graph mask (GNN)', complexity: 'O(E)', note: 'attention allowed only along real edges — this IS a graph transformer layer (and GAT, exactly)' },
]

function allowed(mode: Mode, q: number, k: number): boolean {
  switch (mode) {
    case 'full': return true
    case 'causal': return k <= q
    case 'window': return k <= q && q - k <= WINDOW
    case 'graph': return q === k || ADJ[q][k]
  }
}

export default function AttentionMaskLab({ emphasis = 'efficiency' }: { emphasis?: 'efficiency' | 'graphs' }) {
  const [mode, setMode] = useState<Mode>(emphasis === 'graphs' ? 'graph' : 'full')

  const { grid, edgeCount } = useMemo(() => {
    const grid: boolean[][] = []
    let edgeCount = 0
    for (let q = 0; q < N; q++) {
      const row: boolean[] = []
      for (let k = 0; k < N; k++) {
        const a = allowed(mode, q, k)
        row.push(a)
        if (a) edgeCount++
      }
      grid.push(row)
    }
    return { grid, edgeCount }
  }, [mode])

  const modeInfo = MODES.find(m => m.id === mode)!
  const CELL = 15
  const GRID_X = 26
  const GRID_Y = 20
  // node ring layout for the right-hand graph view
  const ring = Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2
    return { x: 330 + 62 * Math.cos(angle), y: 88 + 62 * Math.sin(angle) }
  })

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Attention Mask Lab</span>
        <span className={s.widgetHint}>one mechanism, four wiring diagrams</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {MODES.map(m => (
            <button key={m.id} type="button" className={`${s.chip} ${mode === m.id ? s.chipOn : ''}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 420 178" className={s.labCanvas} role="img" aria-label="Attention mask as both a matrix and a graph">
          {/* matrix view */}
          {grid.map((row, q) =>
            row.map((ok, k) => (
              <rect
                key={`${q}-${k}`}
                x={GRID_X + k * CELL}
                y={GRID_Y + q * CELL}
                width={CELL - 1.5}
                height={CELL - 1.5}
                fill={ok ? (q === k ? '#f0d98c' : '#5a7ce0') : '#1a1f3d'}
                opacity={ok ? 0.9 : 0.9}
              />
            ))
          )}
          <text x={GRID_X + (N * CELL) / 2} y={12} fontSize={9} fill="#555" textAnchor="middle">keys →</text>
          <text x={13} y={GRID_Y + (N * CELL) / 2} fontSize={9} fill="#555" textAnchor="middle" transform={`rotate(-90 13 ${GRID_Y + (N * CELL) / 2})`}>queries ↓</text>
          <text x={GRID_X + (N * CELL) / 2} y={GRID_Y + N * CELL + 12} fontSize={9} fill="#555" textAnchor="middle">the attention mask…</text>

          {/* graph view of the same mask */}
          {grid.map((row, q) =>
            row.map((ok, k) => {
              if (!ok || k >= q) return null
              return (
                <line
                  key={`e${q}-${k}`}
                  x1={ring[q].x} y1={ring[q].y} x2={ring[k].x} y2={ring[k].y}
                  stroke="#5a7ce0" strokeWidth={1.2} opacity={0.55}
                />
              )
            })
          )}
          {ring.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={8} fill="#f0d98c" stroke="#9a7a1a" strokeWidth={1} />
              <text x={p.x} y={p.y + 3} fontSize={8} textAnchor="middle">{i}</text>
            </g>
          ))}
          <text x={330} y={172} fontSize={9} fill="#555" textAnchor="middle">…is a graph over tokens</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>allowed pairs <span className={s.labStatValue}>{edgeCount} / {N * N}</span></span>
          <span className={s.labStat}>cost <span className={s.labStatValue}>{modeInfo.complexity}</span></span>
          <span className={s.labStat}><span className={s.labStatValue}>{modeInfo.note.split(' — ')[0]}</span></span>
        </div>
        <p className={s.labNote}>
          {emphasis === 'efficiency' ? (
            <>Every &quot;efficient attention&quot; method is a statement about which query-key pairs are worth computing.
            Full attention pays O(n²); a sliding window pays O(n·w) and is why million-token contexts are even
            thinkable. Notice the right panel: <strong>each mask is just a graph over tokens</strong> — remember
            that for module 5.</>
          ) : (
            <>Here&apos;s the punchline of this course: the mask <em>is</em> the graph. Switch to <strong>Graph
            mask</strong> — attention allowed only along real edges is exactly a GAT/graph-transformer layer, and
            full attention is the special case where the graph is complete ({modeInfo.note}). A transformer is a
            GNN on the complete token graph; a GNN is a transformer with an opinionated mask.</>
          )}
        </p>
      </div>
    </div>
  )
}
