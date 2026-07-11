'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// 14 nodes, two communities (0-6 vs 7-13). Fixed weak features: community
// signal 0.4 plus fixed per-node "noise" — weak enough that raw features
// alone are unreliable, so the graph filters genuinely matter.
const NOISE: [number, number][] = [
  [0.42, -0.18], [-0.35, 0.28], [0.15, 0.45], [-0.48, -0.12], [0.3, 0.38], [-0.22, -0.42], [0.05, 0.2],
  [-0.4, 0.15], [0.33, -0.3], [-0.1, -0.45], [0.45, 0.1], [-0.28, 0.35], [0.2, -0.25], [-0.05, 0.48],
]
const X: [number, number][] = NOISE.map((n, i) => (i < 7 ? [0.4 + n[0], n[1]] : [n[0], 0.4 + n[1]]))
const LABEL = (i: number) => (i < 7 ? 0 : 1)

const LABELED = [0, 1, 2, 3, 7, 8, 9, 10]
const REF = [0, 1, 7, 8]           // used to SOLVE each channel (GraphAny's V_ref)
const TARGET = [2, 3, 9, 10]       // held out to weight channels (GraphAny's V_target)

// Two 7-rings; slider swaps within-edges for cross-edges (v of 14).
const WITHIN: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 7],
]
const CROSS: [number, number][] = [
  [0, 8], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 7],
  [0, 11], [3, 8], [5, 10], [1, 12], [4, 9], [6, 13], [2, 7],
]

const POS: [number, number][] = [
  [22, 24], [52, 12], [80, 26], [88, 56], [64, 76], [34, 78], [12, 54],
  [122, 24], [152, 12], [180, 26], [188, 56], [164, 76], [134, 78], [112, 54],
]

type Mat = number[][]

function edgesFor(v: number): [number, number][] {
  return [...WITHIN.slice(0, 14 - v), ...CROSS.slice(0, v)]
}

/** Row-normalized adjacency times a matrix: (Ā M). */
function aBar(edges: [number, number][], m: Mat): Mat {
  const nbrs: number[][] = Array.from({ length: 14 }, () => [])
  for (const [a, b] of edges) { nbrs[a].push(b); nbrs[b].push(a) }
  return m.map((_, i) => {
    if (nbrs[i].length === 0) return [0, 0]
    const acc = [0, 0]
    for (const j of nbrs[i]) { acc[0] += m[j][0]; acc[1] += m[j][1] }
    return [acc[0] / nbrs[i].length, acc[1] / nbrs[i].length]
  })
}

function sub(a: Mat, b: Mat): Mat { return a.map((r, i) => [r[0] - b[i][0], r[1] - b[i][1]]) }

/** Least squares W = (FᵀF + εI)⁻¹ FᵀY on the given rows (2x2 closed form). */
function solve(F: Mat, rows: number[]): Mat {
  let a = 1e-6, b = 0, c = 0, d = 1e-6
  const fty: Mat = [[0, 0], [0, 0]]
  for (const i of rows) {
    const [f0, f1] = F[i]
    a += f0 * f0; b += f0 * f1; c += f1 * f0; d += f1 * f1
    const y = LABEL(i)
    fty[0][y] += f0
    fty[1][y] += f1
  }
  const det = a * d - b * c
  const inv = [[d / det, -b / det], [-c / det, a / det]]
  return [
    [inv[0][0] * fty[0][0] + inv[0][1] * fty[1][0], inv[0][0] * fty[0][1] + inv[0][1] * fty[1][1]],
    [inv[1][0] * fty[0][0] + inv[1][1] * fty[1][0], inv[1][0] * fty[0][1] + inv[1][1] * fty[1][1]],
  ]
}

function predict(F: Mat, W: Mat): number[] {
  return F.map(f => (f[0] * W[0][0] + f[1] * W[1][0] >= f[0] * W[0][1] + f[1] * W[1][1] ? 0 : 1))
}

/** Decision margin (trueClass score − otherClass score) for one node under one channel's W. */
function marginAt(f: Mat, W: Mat, i: number): number {
  const s0 = f[i][0] * W[0][0] + f[i][1] * W[1][0]
  const s1 = f[i][0] * W[0][1] + f[i][1] * W[1][1]
  return LABEL(i) === 0 ? s0 - s1 : s1 - s0
}

function acc(pred: number[], rows: number[]): number {
  return rows.filter(i => pred[i] === LABEL(i)).length / rows.length
}

const CHANNEL_NAMES = ['Linear', 'LinearSGC1', 'LinearSGC2', 'LinearHGC1', 'LinearHGC2']
const COMMUNITY_COLORS = ['#d64541', '#3a6ec8']

export default function ChannelEnsembleLab() {
  const [v, setV] = useState(0) // 0 = 100% homophily … 14 = 0%

  const { channels, attention, topIdx, ensembleAcc } = useMemo(() => {
    const edges = edgesFor(v)
    const ax = aBar(edges, X)
    const aax = aBar(edges, ax)
    const F: Mat[] = [X, ax, aax, sub(X, ax), sub(sub(X, ax), aBar(edges, sub(X, ax)))]
    const unlabeled = Array.from({ length: 14 }, (_, i) => i).filter(i => !LABELED.includes(i))
    const chans = F.map((f, ci) => {
      const W = solve(f, REF)
      const pred = predict(f, W)
      const targetAcc = acc(pred, TARGET)
      const meanMargin = TARGET.reduce((p, i) => p + marginAt(f, W, i), 0) / TARGET.length
      const logit = 3 * targetAcc + Math.max(-1, Math.min(1, meanMargin))
      return { name: CHANNEL_NAMES[ci], pred, evalAcc: acc(pred, unlabeled), targetAcc, logit }
    })
    // Honest stand-in for the learned attention: softmax over held-out accuracy, with
    // mean decision-margin on the held-out nodes as a continuous tiebreak.
    const exps = chans.map(c => Math.exp(c.logit))
    const z = exps.reduce((p, q) => p + q, 0)
    const att = exps.map(e => e / z)
    const top = att.indexOf(Math.max(...att))
    // Ensemble: attention-weighted vote.
    const ens = Array.from({ length: 14 }, (_, i) => {
      const w0 = chans.reduce((p, c, ci) => p + att[ci] * (c.pred[i] === 0 ? 1 : 0), 0)
      return w0 >= 0.5 ? 0 : 1
    })
    return { channels: chans, attention: att, topIdx: top, ensembleAcc: acc(ens, unlabeled) }
  }, [v])

  const edges = edgesFor(v)
  const homophily = Math.round(((14 - v) / 14) * 100)

  const miniGraph = (pred: number[], key: string) => (
    <svg key={key} viewBox="0 0 200 90" width={150} aria-hidden="true">
      {edges.map(([a2, b2], i) => (
        <line key={i} x1={POS[a2][0]} y1={POS[a2][1]} x2={POS[b2][0]} y2={POS[b2][1]} stroke="#c5c1af" strokeWidth={0.8} />
      ))}
      {POS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5}
          fill={COMMUNITY_COLORS[pred[i]]}
          stroke={COMMUNITY_COLORS[LABEL(i)]}
          strokeWidth={1.8}
        />
      ))}
    </svg>
  )

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Channel Ensemble Lab</span>
        <span className={s.widgetHint}>GraphAny: learn which filter to trust</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>homophily <strong>{homophily}%</strong></span>
          <input
            type="range" min={0} max={14} step={2} value={v}
            aria-label="homophily"
            className={s.slider}
            onChange={e => setV(Number(e.target.value))}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {channels.map((c, ci) => (
            <div key={c.name} style={{ textAlign: 'center', fontSize: 10 }}>
              <div style={{ fontWeight: ci === topIdx ? 'bold' : 'normal' }}>
                <span>{c.name}</span> · {Math.round(c.evalAcc * 100)}%
              </div>
              {miniGraph(c.pred, c.name)}
              <div style={{ height: 6, background: '#e4e0cf', borderRadius: 2 }}>
                <div style={{ height: 6, width: `${Math.round(attention[ci] * 100)}%`, background: '#0a246a', borderRadius: 2 }} />
              </div>
              <div>α = {attention[ci].toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>top filter: <span className={s.labStatValue}>{channels[topIdx].name}</span></span>
          <span className={s.labStat}>ensemble accuracy <span className={s.labStatValue}>{Math.round(ensembleAcc * 100)}%</span></span>
          <span className={s.labStat}>learned input weights <span className={s.labStatValue}>0</span></span>
        </div>
        <p className={s.labNote}>
          Five <strong>LinearGNN channels</strong> — X, ĀX, Ā²X, (I−Ā)X, (I−Ā)²X — each solved in closed form
          (least squares via the pseudo-inverse) on this graph&apos;s eight labeled nodes; node fill = prediction,
          ring = truth. Now sweep homophily and watch the U-shape: at 100% the low-pass channels win (averaging
          your neighbors denoises). Near 50% they bottom out — an even class mix means neighbor averages carry no
          signal at all. And at 0% they resurrect: on a cleanly bipartite graph, ĀX flips the community perfectly,
          and the closed-form solve learns the inverted rule without blinking — module 4&apos;s lesson that 0%
          homophily is as far from random as 100%. The α bars are an honest stand-in (softmax over held-out
          accuracy plus margin) for GraphAny&apos;s learned attention, which reads entropy-normalized distances{' '}
          <em>between the channels&apos; predictions</em> — quantities that exist for any graph, any feature width,
          any label count. It never learns your features; it learns{' '}
          <strong>which filter to trust</strong>.
        </p>
      </div>
    </div>
  )
}
