'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

type Rel = 'authored' | 'cites' | 'affiliated' | 'published-in'
type Interaction = 'h2h' | 't2t' | 'h2t' | 't2h'

const RELS: Rel[] = ['authored', 'cites', 'affiliated', 'published-in']
const REL_COLORS: Record<Rel, string> = {
  authored: '#2f8e2f',
  cites: '#c86018',
  affiliated: '#5a8fd0',
  'published-in': '#7a4ab8',
}

const ENTITIES: { id: string; x: number; y: number }[] = [
  { id: 'Ada', x: 36, y: 40 },
  { id: 'Bob', x: 36, y: 130 },
  { id: 'P1', x: 120, y: 62 },
  { id: 'P2', x: 120, y: 148 },
  { id: 'Org', x: 30, y: 196 },
  { id: 'Venue', x: 196, y: 108 },
]

// Directed typed edges: h --r--> t
const EDGES: { h: string; t: string; r: Rel }[] = [
  { h: 'Ada', t: 'P1', r: 'authored' },
  { h: 'Bob', t: 'P2', r: 'authored' },
  { h: 'P1', t: 'P2', r: 'cites' },
  { h: 'Ada', t: 'Org', r: 'affiliated' },
  { h: 'Bob', t: 'Org', r: 'affiliated' },
  { h: 'P1', t: 'Venue', r: 'published-in' },
  { h: 'P2', t: 'Venue', r: 'published-in' },
]

const INTERACTIONS: { key: Interaction; label: string; blurb: string }[] = [
  { key: 'h2h', label: 'h2h — share a head', blurb: 'some entity is the head of both relations' },
  { key: 't2t', label: 't2t — share a tail', blurb: 'some entity is the tail of both relations' },
  { key: 'h2t', label: 'h2t — head meets tail', blurb: 'some entity heads one relation and tails the other' },
  { key: 't2h', label: 't2h — tail meets head', blurb: 'some entity tails one relation and heads the other' },
]

function headsOf(r: Rel): Set<string> { return new Set(EDGES.filter(e => e.r === r).map(e => e.h)) }
function tailsOf(r: Rel): Set<string> { return new Set(EDGES.filter(e => e.r === r).map(e => e.t)) }
function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true
  return false
}

/** Derive the graph-of-relations edges for one interaction type (no self-pairs). */
function interactionEdges(kind: Interaction): [Rel, Rel][] {
  const out: [Rel, Rel][] = []
  for (const r1 of RELS) {
    for (const r2 of RELS) {
      if (r1 === r2) continue
      if (kind === 'h2h' && RELS.indexOf(r1) < RELS.indexOf(r2) && intersects(headsOf(r1), headsOf(r2))) out.push([r1, r2])
      if (kind === 't2t' && RELS.indexOf(r1) < RELS.indexOf(r2) && intersects(tailsOf(r1), tailsOf(r2))) out.push([r1, r2])
      if (kind === 'h2t' && intersects(headsOf(r1), tailsOf(r2))) out.push([r1, r2])
      if (kind === 't2h' && intersects(tailsOf(r1), headsOf(r2))) out.push([r1, r2])
    }
  }
  return out
}

const INTERACTION_WEIGHT: Record<Interaction, number> = { h2h: 0.6, t2t: 0.5, h2t: 0.35, t2h: 0.35 }

// Fixed positions for the 4 relation nodes on the right panel.
const REL_POS: Record<Rel, { x: number; y: number }> = {
  authored: { x: 300, y: 44 },
  cites: { x: 420, y: 44 },
  affiliated: { x: 300, y: 172 },
  'published-in': { x: 420, y: 172 },
}

const QUERIES: { head: string; rel: Rel }[] = [
  { head: 'P2', rel: 'cites' },
  { head: 'Bob', rel: 'affiliated' },
]

export default function RelationGraphLab() {
  const [active, setActive] = useState<Interaction[]>([])
  const [query, setQuery] = useState(0)
  const [steps, setSteps] = useState(0)

  const relEdges = useMemo(
    () => active.flatMap(kind => interactionEdges(kind).map(([r1, r2]) => ({ r1, r2, kind }))),
    [active]
  )

  // Stage A: relation representations conditioned on the query relation,
  // computed purely from the (active) interaction structure — no lookup table.
  const relScore = useMemo(() => {
    const score: Record<Rel, number> = { authored: 0, cites: 0, affiliated: 0, 'published-in': 0 }
    score[QUERIES[query].rel] = 1
    for (let round = 0; round < 2; round++) {
      const prev = { ...score }
      for (const { r1, r2, kind } of relEdges) {
        score[r2] += INTERACTION_WEIGHT[kind] * prev[r1]
        score[r1] += INTERACTION_WEIGHT[kind] * prev[r2]
      }
      const max = Math.max(...RELS.map(r => score[r]), 1e-9)
      for (const r of RELS) score[r] = score[r] / max
    }
    return score
  }, [relEdges, query])

  // Stage B: conditional message passing over entities, head initialized to 1.
  const entScore = useMemo(() => {
    let cur: Record<string, number> = Object.fromEntries(ENTITIES.map(e => [e.id, 0]))
    cur[QUERIES[query].head] = 1
    for (let k = 0; k < steps; k++) {
      const next = { ...cur }
      for (const e of EDGES) {
        next[e.t] += cur[e.h] * relScore[e.r] * 0.8
        next[e.h] += cur[e.t] * relScore[e.r] * 0.3
      }
      const max = Math.max(...Object.values(next), 1e-9)
      cur = Object.fromEntries(Object.entries(next).map(([k2, v]) => [k2, v / max]))
    }
    return cur
  }, [query, steps, relScore])

  const q = QUERIES[query]
  const ranked = ENTITIES.filter(e => e.id !== q.head)
    .map(e => ({ id: e.id, v: entScore[e.id] }))
    .sort((x, y) => y.v - x.v)
  const top = steps > 0 ? ranked[0] : null

  const toggle = (kind: Interaction) =>
    setActive(a => (a.includes(kind) ? a.filter(k => k !== kind) : [...a, kind]))

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Relation-Graph Builder</span>
        <span className={s.widgetHint}>ULTRA: the vocabulary is how relations interact</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
          {INTERACTIONS.map(i => (
            <button
              key={i.key}
              type="button"
              className={`${s.chip} ${active.includes(i.key) ? s.chipOn : ''}`}
              title={i.blurb}
              onClick={() => toggle(i.key)}
            >
              {i.label}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 470 224" className={s.labCanvas} role="img" aria-label="Entity graph (left) and derived graph of relations (right)">
          {/* left: entity graph */}
          {EDGES.map((e, i) => {
            const h = ENTITIES.find(n => n.id === e.h)!
            const t = ENTITIES.find(n => n.id === e.t)!
            return (
              <g key={i}>
                <line x1={h.x} y1={h.y} x2={t.x} y2={t.y} stroke={REL_COLORS[e.r]} strokeWidth={1.6} markerEnd="url(#rg-arrow)" />
              </g>
            )
          })}
          {ENTITIES.map(n => (
            <g key={n.id}>
              <circle
                cx={n.x} cy={n.y} r={13}
                fill={n.id === q.head ? '#f0d98c' : '#fff'}
                stroke={steps > 0 ? '#0a246a' : '#666'}
                strokeWidth={n.id === q.head ? 2.5 : 1}
                opacity={n.id === q.head ? 1 : 0.35 + 0.65 * (entScore[n.id] ?? 0)}
              />
              <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={8.5} fontWeight="bold">{n.id}</text>
            </g>
          ))}
          <text x={110} y={218} textAnchor="middle" fontSize={9} fill="#555">entity graph (typed edges)</text>
          {/* divider */}
          <line x1={252} y1={8} x2={252} y2={210} stroke="#b8b4a2" strokeDasharray="3 3" />
          {/* right: graph of relations, derived live */}
          {relEdges.map((e, i) => {
            const p1 = REL_POS[e.r1]
            const p2 = REL_POS[e.r2]
            const bend = 6 + 5 * (i % 3)
            const mx = (p1.x + p2.x) / 2
            const my = (p1.y + p2.y) / 2 - bend
            return (
              <path
                key={i}
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke="#555"
                strokeWidth={1.3}
                opacity={0.75}
              />
            )
          })}
          {RELS.map(r => (
            <g key={r}>
              <circle cx={REL_POS[r].x} cy={REL_POS[r].y} r={15} fill={REL_COLORS[r]} opacity={0.25 + 0.75 * relScore[r]} stroke="#444" />
              <text x={REL_POS[r].x} y={REL_POS[r].y - 20} textAnchor="middle" fontSize={8.5} fontWeight="bold" fill={REL_COLORS[r]}>{r}</text>
            </g>
          ))}
          <text x={360} y={218} textAnchor="middle" fontSize={9} fill="#555">graph of relations (derived, not learned)</text>
          <defs>
            <marker id="rg-arrow" markerWidth="7" markerHeight="7" refX="14" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#888" />
            </marker>
          </defs>
        </svg>
        <div className={s.labControls}>
          {QUERIES.map((qq, i) => (
            <button key={i} type="button" className={`${s.chip} ${query === i ? s.chipOn : ''}`} onClick={() => { setQuery(i); setSteps(0) }}>
              query: ({qq.head}, {qq.rel}, ?)
            </button>
          ))}
          <button type="button" className={s.btn} onClick={() => setSteps(k => Math.min(k + 1, 4))} disabled={steps >= 4}>
            Propagate 1 step ▸
          </button>
          <button type="button" className={s.btn} onClick={() => setSteps(0)} disabled={steps === 0}>
            Reset
          </button>
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>relation-graph edges <span className={s.labStatValue}>{relEdges.length}</span></span>
          <span className={s.labStat}>learned per-relation embeddings <span className={s.labStatValue}>0</span></span>
          {top && <span className={s.labStat}>top candidate: <span className={s.labStatValue}>{top.id}</span></span>}
        </div>
        <p className={s.labNote}>
          Toggle the four <strong>fundamental interactions</strong> and watch the right panel build ULTRA&apos;s{' '}
          <strong>graph of relations</strong> — computed from the entity graph, never learned. Then pick a query{' '}
          (h, r, ?): the relation nodes light up with <em>query-conditioned</em> roles (stage A), the head entity
          is marked with the query (the <strong>labeling trick</strong>), and each propagate step runs conditional
          message passing over the entities (stage B). Nothing in the parameters names any relation — that is why
          one pretrained ULTRA does zero-shot link prediction on 57 unseen knowledge graphs.
        </p>
      </div>
    </div>
  )
}
