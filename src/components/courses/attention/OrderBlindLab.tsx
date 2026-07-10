'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// A real single-head attention layer over 5 tokens with d=4, tiny fixed weights.
// Everything is computed live so the equivariance claim is demonstrated, not asserted.
const TOKENS = ['cat', 'sat', 'on', 'the', 'mat']
const EMB: number[][] = [
  [0.9, 0.1, -0.3, 0.4],   // cat
  [-0.2, 0.8, 0.5, -0.1],  // sat
  [0.1, -0.4, 0.7, 0.6],   // on
  [-0.6, 0.2, -0.2, 0.3],  // the
  [0.7, -0.5, 0.1, -0.6],  // mat
]
const WQ = [[0.6, -0.3, 0.2, 0.5], [0.1, 0.7, -0.4, 0.2], [-0.5, 0.2, 0.6, -0.1], [0.3, 0.4, 0.1, -0.6]]
const WK = [[0.5, 0.2, -0.6, 0.1], [-0.2, 0.6, 0.3, -0.4], [0.4, -0.1, 0.5, 0.3], [0.2, 0.5, -0.3, 0.6]]
const WV = [[0.7, -0.2, 0.1, 0.4], [0.2, 0.5, -0.3, 0.1], [-0.3, 0.4, 0.6, 0.2], [0.1, -0.5, 0.2, 0.7]]

// Sinusoidal-flavored position vectors, added to the embedding at slot p when positions are ON.
const pe = (p: number) => [Math.sin(0.9 * p), Math.cos(0.9 * p), Math.sin(0.35 * p), Math.cos(0.35 * p)].map(v => v * 0.55)

const PERMS = [
  [4, 1, 2, 3, 0],
  [2, 3, 0, 4, 1],
  [1, 0, 3, 4, 2],
]

const matVec = (W: number[][], x: number[]) => W.map(row => row.reduce((acc, w, i) => acc + w * x[i], 0))
const dot = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0)

/** Full attention outputs for token order `order` (order[i] = which token sits in slot i). */
function attend(order: number[], positions: boolean): number[][] {
  const x = order.map((tok, slot) => {
    const e = EMB[tok]
    return positions ? e.map((v, d) => v + pe(slot)[d]) : e
  })
  const q = x.map(v => matVec(WQ, v))
  const k = x.map(v => matVec(WK, v))
  const v = x.map(vec => matVec(WV, vec))
  return q.map(qi => {
    const scores = k.map(kj => dot(qi, kj) / 2) // 1/sqrt(4)
    const mx = Math.max(...scores)
    const exps = scores.map(sc => Math.exp(sc - mx))
    const sum = exps.reduce((a, b) => a + b, 0)
    const w = exps.map(e2 => e2 / sum)
    return v[0].map((_, d) => w.reduce((acc, wj, j) => acc + wj * v[j][d], 0))
  })
}

const IDENTITY = [0, 1, 2, 3, 4]

export default function OrderBlindLab() {
  const [permIdx, setPermIdx] = useState(-1) // -1 = original order
  const [positions, setPositions] = useState(false)

  const order = permIdx === -1 ? IDENTITY : PERMS[permIdx]
  const shuffled = permIdx !== -1

  const { outputs, same } = useMemo(() => {
    const base = attend(IDENTITY, positions)
    const outs = attend(order, positions)
    // Equivariance check: does slot i of the shuffled run equal the original
    // output of the token now sitting in slot i?
    const eq = outs.every((o, i) => o.every((val, d) => Math.abs(val - base[order[i]][d]) < 1e-9))
    return { outputs: outs, same: eq }
  }, [order, positions])

  const W = 480
  const slot = W / TOKENS.length

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Order-Blindness Lab</span>
        <span className={s.widgetHint}>a real attention head, computed live</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setPermIdx(p => (p + 1) % PERMS.length)}>
            Shuffle tokens
          </button>
          <button type="button" className={s.btn} onClick={() => setPermIdx(-1)} disabled={!shuffled}>
            Restore order
          </button>
          <button type="button" className={`${s.chip} ${positions ? s.chipOn : ''}`} onClick={() => setPositions(p => !p)}>
            positions {positions ? 'ON' : 'off'}
          </button>
        </div>
        <svg viewBox={`0 0 ${W} 120`} className={s.labCanvas} role="img" aria-label="Per-token attention output vectors">
          {order.map((tok, i) => (
            <g key={i}>
              <rect x={i * slot + 6} y={8} width={slot - 12} height={20} rx={3} fill="#fff" stroke="#7f9db9" />
              <text x={i * slot + slot / 2} y={22} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif">{TOKENS[tok]}</text>
              {/* 4 output dims as signed bars around a midline */}
              {outputs[i].map((val, d) => {
                const bx = i * slot + 14 + d * ((slot - 28) / 4)
                const h = Math.min(34, Math.abs(val) * 55)
                return (
                  <rect
                    key={d}
                    x={bx}
                    y={val >= 0 ? 72 - h : 72}
                    width={(slot - 28) / 4 - 3}
                    height={Math.max(1.5, h)}
                    fill={val >= 0 ? '#2b6fd0' : '#c86018'}
                  />
                )
              })}
              <text x={i * slot + slot / 2} y={116} textAnchor="middle" fontSize={8} fill="#666">
                [{outputs[i].slice(0, 2).map(v2 => v2.toFixed(2)).join(', ')}, …]
              </text>
            </g>
          ))}
          <line x1={0} y1={72} x2={W} y2={72} stroke="#ccc" strokeWidth={1} />
        </svg>
        <div className={`${s.feedback} ${same ? s.feedbackCorrect : s.feedbackWrong}`}>
          <span className={s.feedbackIcon}>{same ? '✓' : '✗'}</span>
          <span>
            {!shuffled
              ? 'Original order. Shuffle the tokens to test whether attention notices.'
              : same
                ? 'Same output vectors — just reordered with the tokens. Attention literally cannot tell that the order changed.'
                : 'Outputs changed — position vectors broke the permutation symmetry, so "cat sat" ≠ "sat cat" now.'}
          </span>
        </div>
        <p className={s.labNote}>
          This is a real attention head (fixed toy weights, d=4) running in your browser. Attention is{' '}
          <strong>permutation-equivariant</strong>: shuffle the input and the outputs shuffle identically, because{' '}
          <code>softmax(QKᵀ)·V</code> contains no notion of an index. Toggle <strong>positions</strong> to add a
          position vector to each embedding — now slot 0 and slot 4 genuinely differ, and word order becomes
          information the model can use.
        </p>
      </div>
    </div>
  )
}
