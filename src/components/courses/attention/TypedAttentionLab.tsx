'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

type NodeType = 'user' | 'item' | 'shop'
type EdgeType = 'bought' | 'viewed' | 'sold-by'

interface HNode { id: string; type: NodeType; x: number; y: number }
interface HEdge { a: string; b: string; type: EdgeType }

const NODES: HNode[] = [
  { id: 'U1', type: 'user', x: 40, y: 34 },
  { id: 'U2', type: 'user', x: 40, y: 120 },
  { id: 'I1', type: 'item', x: 150, y: 22 },
  { id: 'I2', type: 'item', x: 150, y: 78 },
  { id: 'I3', type: 'item', x: 150, y: 134 },
  { id: 'S1', type: 'shop', x: 258, y: 50 },
  { id: 'S2', type: 'shop', x: 258, y: 118 },
]

const EDGES: HEdge[] = [
  { a: 'U1', b: 'I1', type: 'bought' },
  { a: 'U1', b: 'I2', type: 'viewed' },
  { a: 'U2', b: 'I2', type: 'viewed' },
  { a: 'U2', b: 'I3', type: 'bought' },
  { a: 'I1', b: 'S1', type: 'sold-by' },
  { a: 'I2', b: 'S1', type: 'sold-by' },
  { a: 'I3', b: 'S2', type: 'sold-by' },
]

const EDGE_COLORS: Record<EdgeType, string> = {
  bought: '#2f8e2f',
  viewed: '#c86018',
  'sold-by': '#7a4ab8',
}

const NODE_FILL: Record<NodeType, string> = {
  user: '#5a8fd0',
  item: '#e0a040',
  shop: '#a879d8',
}

function nodeShape(n: HNode, highlight: boolean) {
  const stroke = highlight ? '#0a246a' : '#444'
  const sw = highlight ? 2.5 : 1
  switch (n.type) {
    case 'user':
      return <circle cx={n.x} cy={n.y} r={13} fill={NODE_FILL.user} stroke={stroke} strokeWidth={sw} />
    case 'item':
      return <rect x={n.x - 12} y={n.y - 12} width={24} height={24} rx={2} fill={NODE_FILL.item} stroke={stroke} strokeWidth={sw} />
    case 'shop':
      return <polygon points={`${n.x},${n.y - 14} ${n.x + 14},${n.y} ${n.x},${n.y + 14} ${n.x - 14},${n.y}`} fill={NODE_FILL.shop} stroke={stroke} strokeWidth={sw} />
  }
}

export default function TypedAttentionLab() {
  const [typed, setTyped] = useState(true)
  const [center, setCenter] = useState('I2')

  const neighbors = EDGES
    .filter(e => e.a === center || e.b === center)
    .map(e => ({ other: e.a === center ? e.b : e.a, type: e.type }))
  const typeGroups = [...new Set(neighbors.map(n => n.type))]

  // Illustrative weights: one softmax over everything vs. one per edge type.
  const weightFor = (i: number, group: EdgeType): number => {
    if (!typed) return 1 / neighbors.length
    const inGroup = neighbors.filter(n => n.type === group).length
    return 1 / inGroup
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Typed Attention Lab</span>
        <span className={s.widgetHint}>heterogeneous graph: users · items · shops</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${!typed ? s.chipOn : ''}`} onClick={() => setTyped(false)}>
            shared attention (one softmax)
          </button>
          <button type="button" className={`${s.chip} ${typed ? s.chipOn : ''}`} onClick={() => setTyped(true)}>
            type-conditioned (per-type softmax)
          </button>
        </div>
        <svg viewBox="0 0 470 160" className={s.labCanvas} role="img" aria-label="Heterogeneous graph with typed attention">
          {EDGES.map((e, i) => {
            const na = NODES.find(n => n.id === e.a)!
            const nb = NODES.find(n => n.id === e.b)!
            const touches = e.a === center || e.b === center
            const w = touches ? weightFor(i, e.type) : 0
            return (
              <g key={i}>
                <line
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke={typed ? EDGE_COLORS[e.type] : '#667'}
                  strokeWidth={touches ? 1.5 + 6 * w : 1.2}
                  opacity={touches ? 0.95 : 0.3}
                />
                {touches && (
                  <text
                    x={(na.x + nb.x) / 2} y={(na.y + nb.y) / 2 - 4}
                    fontSize={8.5} fontWeight="bold" textAnchor="middle"
                    fill={typed ? EDGE_COLORS[e.type] : '#333'}
                  >
                    {Math.round(w * 100)}%
                  </text>
                )}
              </g>
            )
          })}
          {NODES.map(n => (
            <g key={n.id} onClick={() => setCenter(n.id)} style={{ cursor: 'pointer' }}>
              {nodeShape(n, n.id === center)}
              <text x={n.x} y={n.y + 3.5} fontSize={9} fontWeight="bold" textAnchor="middle" fill="#fff">{n.id}</text>
            </g>
          ))}
          {/* weight-matrix chips */}
          <g fontFamily="Tahoma, sans-serif">
            <text x={318} y={20} fontSize={10} fontWeight="bold" fill="#333">attention parameters:</text>
            {typed ? (
              typeGroups.map((t, i) => (
                <g key={t}>
                  <rect x={318} y={30 + i * 34} width={130} height={26} rx={3} fill="#fff" stroke={EDGE_COLORS[t]} strokeWidth={1.6} />
                  <text x={326} y={41 + i * 34} fontSize={9} fill={EDGE_COLORS[t]} fontWeight="bold">W_Q W_K W_V — &quot;{t}&quot;</text>
                  <text x={326} y={51 + i * 34} fontSize={8} fill="#666">softmax over {t} edges only</text>
                </g>
              ))
            ) : (
              <g>
                <rect x={318} y={30} width={130} height={26} rx={3} fill="#fff" stroke="#667" strokeWidth={1.6} />
                <text x={326} y={41} fontSize={9} fill="#333" fontWeight="bold">W_Q W_K W_V — shared</text>
                <text x={326} y={51} fontSize={8} fill="#666">one softmax over all neighbors</text>
              </g>
            )}
          </g>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>center <span className={s.labStatValue}>{center}</span></span>
          <span className={s.labStat}>parameter sets <span className={s.labStatValue}>{typed ? typeGroups.length : 1}×</span></span>
        </div>
        <p className={s.labNote}>
          Click a node. With <strong>shared attention</strong>, a &quot;viewed&quot; edge and a &quot;bought&quot; edge compete in one
          softmax through the same weights — but they mean different things. <strong>Type-conditioned
          attention</strong> gives each relation its own projections and its own softmax: HGT parameterizes attention
          by the meta-relation ⟨source type, edge type, target type⟩, and GraphBFF&apos;s <strong>TCA</strong> runs a
          separate sparse softmax per edge-type subset (~85% of its 1.4B parameters live here), pairing it with a
          shared <strong>TAA</strong> attention so types can still exchange information — provably more expressive
          together than either alone.
        </p>
      </div>
    </div>
  )
}
