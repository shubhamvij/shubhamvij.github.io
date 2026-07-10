'use client'
import { useMemo, useState } from 'react'
import s from './gfm.module.css'

// Deterministic layout: seeded PRNG so server and client render identically.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const N = 24
const E = 34

interface LabNode { x: number; y: number; cls: 0 | 1 }

const { LAB_NODES, SAME_POOL, CROSS_POOL } = (() => {
  const rand = mulberry32(20260709)
  const nodes: LabNode[] = []
  // Scatter nodes on a jittered grid, alternating classes so both edge kinds stay short.
  for (let i = 0; i < N; i++) {
    const col = i % 6
    const row = Math.floor(i / 6)
    nodes.push({
      x: 34 + col * 55 + (rand() - 0.5) * 26,
      y: 32 + row * 52 + (rand() - 0.5) * 22,
      cls: ((col + row) % 2) as 0 | 1,
    })
  }
  const pairs: { a: number; b: number; d: number }[] = []
  for (let a = 0; a < N; a++) {
    for (let b = a + 1; b < N; b++) {
      const dx = nodes[a].x - nodes[b].x
      const dy = nodes[a].y - nodes[b].y
      pairs.push({ a, b, d: Math.hypot(dx, dy) })
    }
  }
  pairs.sort((p, q) => p.d - q.d)
  const same = pairs.filter(p => nodes[p.a].cls === nodes[p.b].cls).slice(0, E)
  const cross = pairs.filter(p => nodes[p.a].cls !== nodes[p.b].cls).slice(0, E)
  return { LAB_NODES: nodes, SAME_POOL: same, CROSS_POOL: cross }
})()

export default function HomophilyLab() {
  const [homophily, setHomophily] = useState(90)

  const { edges, accuracy } = useMemo(() => {
    const nSame = Math.round((homophily / 100) * E)
    const chosen = [...SAME_POOL.slice(0, nSame), ...CROSS_POOL.slice(0, E - nSame)]
    // 1-hop majority vote: predict each node's class from its neighbors.
    const neigh: number[][] = Array.from({ length: N }, () => [])
    for (const e of chosen) {
      neigh[e.a].push(e.b)
      neigh[e.b].push(e.a)
    }
    let score = 0
    let counted = 0
    for (let i = 0; i < N; i++) {
      if (neigh[i].length === 0) continue
      counted++
      const sameVotes = neigh[i].filter(j => LAB_NODES[j].cls === LAB_NODES[i].cls).length
      const diff = neigh[i].length - sameVotes
      if (sameVotes > diff) score += 1
      else if (sameVotes === diff) score += 0.5
    }
    return { edges: chosen, accuracy: counted ? score / counted : 0 }
  }, [homophily])

  const pct = Math.round(accuracy * 100)

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Homophily Lab</span>
        <span className={s.widgetHint}>same data, different wiring</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 340 200" className={s.labCanvas} role="img" aria-label="Graph whose edges rewire as homophily changes">
          {edges.map((e, i) => {
            const sameCls = LAB_NODES[e.a].cls === LAB_NODES[e.b].cls
            return (
              <line
                key={i}
                x1={LAB_NODES[e.a].x} y1={LAB_NODES[e.a].y}
                x2={LAB_NODES[e.b].x} y2={LAB_NODES[e.b].y}
                stroke={sameCls ? '#9fb89f' : '#d0a0a0'}
                strokeWidth={1.4}
              />
            )
          })}
          {LAB_NODES.map((n, i) =>
            n.cls === 0 ? (
              <circle key={i} cx={n.x} cy={n.y} r={7} fill="#3a6ea5" stroke="#0a246a" strokeWidth={1} />
            ) : (
              <rect key={i} x={n.x - 6} y={n.y - 6} width={12} height={12} fill="#e08040" stroke="#9a4a10" strokeWidth={1} />
            )
          )}
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>heterophilic</span>
          <input
            type="range"
            min={0}
            max={100}
            value={homophily}
            onChange={e => setHomophily(Number(e.target.value))}
            className={s.slider}
            aria-label="Homophily level"
          />
          <span className={s.sliderLabel}>homophilic</span>
          <span className={s.labStat}>homophily <span className={s.labStatValue}>{homophily}%</span></span>
          <span className={s.labStat}>&quot;copy your neighbors&quot; accuracy <span className={s.labStatValue}>{pct}%</span></span>
        </div>
        <p className={s.labNote}>
          Circles and squares are two classes; the slider rewires the same nodes from <strong>homophilic</strong>{' '}
          (edges join same-class nodes) to <strong>heterophilic</strong> (edges join opposites). A classifier that
          trusts neighborhood averaging — which is what vanilla message passing computes — collapses from ~100%
          to ~0% accuracy. At 0% the structure is still perfectly informative (predict the <em>opposite</em> of your
          neighbors!), but a model that <em>assumed</em> homophily during pretraining will transfer it to graphs where
          the assumption is wrong. This is <strong>structural heterogeneity</strong>.
        </p>
      </div>
    </div>
  )
}
