'use client'
import { useMemo, useState } from 'react'
import s from './gfm.module.css'

// A fixed 10-node graph laid out for a 340x220 viewBox. Node "features" are RGB
// colors; one message-passing step averages each node with its neighbors, so
// repeated steps visibly diffuse (and eventually over-smooth) the colors.
const NODES: { x: number; y: number; color: [number, number, number] }[] = [
  { x: 50, y: 60, color: [214, 69, 65] },    // red cluster
  { x: 105, y: 32, color: [214, 69, 65] },
  { x: 118, y: 96, color: [214, 100, 60] },
  { x: 48, y: 132, color: [214, 69, 65] },
  { x: 176, y: 60, color: [58, 110, 200] },  // blue bridge
  { x: 186, y: 138, color: [58, 110, 200] },
  { x: 246, y: 34, color: [46, 160, 90] },   // green cluster
  { x: 292, y: 88, color: [46, 160, 90] },
  { x: 250, y: 150, color: [46, 160, 90] },
  { x: 296, y: 186, color: [240, 180, 40] }, // yellow outlier
]

const EDGES: [number, number][] = [
  [0, 1], [0, 3], [1, 2], [2, 3], [1, 4], [2, 5],
  [4, 5], [4, 6], [5, 8], [6, 7], [7, 8], [8, 9],
]

const neighbors: number[][] = NODES.map((_, i) =>
  EDGES.filter(e => e.includes(i)).map(([a, b]) => (a === i ? b : a))
)

function stepColors(colors: [number, number, number][]): [number, number, number][] {
  return colors.map((c, i) => {
    const group = [c, ...neighbors[i].map(j => colors[j])]
    const sum = group.reduce((acc, g) => [acc[0] + g[0], acc[1] + g[1], acc[2] + g[2]] as [number, number, number], [0, 0, 0] as [number, number, number])
    return [sum[0] / group.length, sum[1] / group.length, sum[2] / group.length]
  })
}

function hopsFrom(start: number, maxHops: number): Map<number, number> {
  const dist = new Map<number, number>([[start, 0]])
  let frontier = [start]
  for (let h = 1; h <= maxHops; h++) {
    const next: number[] = []
    for (const n of frontier) {
      for (const nb of neighbors[n]) {
        if (!dist.has(nb)) {
          dist.set(nb, h)
          next.push(nb)
        }
      }
    }
    frontier = next
  }
  return dist
}

export default function MessagePassingLab() {
  const [layers, setLayers] = useState(0)
  const [selected, setSelected] = useState<number | null>(4)

  const colors = useMemo(() => {
    let c = NODES.map(n => n.color)
    for (let i = 0; i < layers; i++) c = stepColors(c)
    return c
  }, [layers])

  const receptive = useMemo(
    () => (selected === null ? new Map<number, number>() : hopsFrom(selected, layers)),
    [selected, layers]
  )

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Message Passing Lab</span>
        <span className={s.widgetHint}>click a node, then run layers</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 340 220" className={s.labCanvas} role="img" aria-label="Interactive graph showing message passing">
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
              stroke="#b8b4a2" strokeWidth={1.5}
            />
          ))}
          {NODES.map((n, i) => {
            const inField = receptive.has(i)
            const c = colors[i]
            return (
              <g key={i} onClick={() => setSelected(i)}>
                {selected === i && (
                  <circle cx={n.x} cy={n.y} r={16} fill="none" stroke="#0a246a" strokeWidth={1.5} strokeDasharray="3 2" />
                )}
                <circle
                  className={s.nodeCircle}
                  cx={n.x} cy={n.y}
                  r={inField && selected !== i ? 12 : 11}
                  fill={`rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`}
                  stroke={inField ? '#0a246a' : '#666'}
                  strokeWidth={inField ? 2.5 : 1}
                />
                {inField && receptive.get(i)! > 0 && (
                  <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#fff" style={{ pointerEvents: 'none' }}>
                    {receptive.get(i)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setLayers(l => Math.min(l + 1, 8))} disabled={layers >= 8}>
            Run 1 layer ▸
          </button>
          <button type="button" className={s.btn} onClick={() => setLayers(0)} disabled={layers === 0}>
            Reset
          </button>
          <span className={s.labStat}>layers <span className={s.labStatValue}>{layers}</span></span>
          <span className={s.labStat}>receptive field <span className={s.labStatValue}>{selected === null ? '—' : `${receptive.size} node${receptive.size === 1 ? '' : 's'}`}</span></span>
        </div>
        <p className={s.labNote}>
          Each layer, every node averages its color (its <strong>feature vector</strong>) with its neighbors&apos;.
          The numbers show how many hops information traveled to reach the selected node — after <em>k</em> layers,
          a node can only &quot;see&quot; its <em>k</em>-hop neighborhood. Keep clicking: by ~6-8 layers every node turns
          the same muddy brown. That collapse is <strong>over-smoothing</strong>, one reason GNNs are usually shallow.
        </p>
      </div>
    </div>
  )
}
