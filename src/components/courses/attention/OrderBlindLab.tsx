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

// Two tokens get persistent colors so readers can follow them (and their
// output vectors) through every shuffle.
const TRACK: Record<number, { color: string; fill: string }> = {
  0: { color: '#2b6fd0', fill: '#dce8f8' }, // cat
  1: { color: '#2f8e2f', fill: '#def0de' }, // sat
}

export default function OrderBlindLab() {
  const [permIdx, setPermIdx] = useState(-1) // -1 = original order
  const [positions, setPositions] = useState(false)

  const order = permIdx === -1 ? IDENTITY : PERMS[permIdx]
  const shuffled = permIdx !== -1

  const { outputs, changed, same } = useMemo(() => {
    const base = attend(IDENTITY, positions)
    const outs = attend(order, positions)
    // Equivariance check, per slot: does slot i of the shuffled run equal the
    // original output of the token now sitting in slot i?
    const diff = outs.map((o, i) => o.some((val, d) => Math.abs(val - base[order[i]][d]) > 1e-9))
    return { outputs: outs, changed: diff, same: !diff.some(Boolean) }
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
          <span className={s.labStat}>
            tracking <span style={{ color: TRACK[0].color, fontWeight: 'bold' }}>cat</span> &{' '}
            <span style={{ color: TRACK[1].color, fontWeight: 'bold' }}>sat</span>
          </span>
        </div>
        <p className={s.flowShape} style={{ margin: '2px 0 4px' }}>
          no single query here — <strong>every token is a query</strong> at once; each card shows that
          token&apos;s attention output{shuffled ? ' (= same vector as before the shuffle, ≠ changed)' : ''}
        </p>
        <svg viewBox={`0 0 ${W} 120`} className={s.labCanvas} role="img" aria-label="Per-token attention output vectors">
          <line x1={0} y1={72} x2={W} y2={72} stroke="#ccc" strokeWidth={1} />
          {order.map((tok, i) => {
            const track = TRACK[tok]
            return (
              <g key={i}>
                {/* tracked tokens get a color band behind their whole card, vector included */}
                {track && <rect x={i * slot + 4} y={4} width={slot - 8} height={104} rx={4} fill={track.fill} opacity={0.55} />}
                <rect x={i * slot + 6} y={8} width={slot - 12} height={20} rx={3} fill={track ? track.fill : '#fff'} stroke={track ? track.color : '#7f9db9'} strokeWidth={track ? 1.8 : 1} />
                <text x={i * slot + slot / 2} y={22} textAnchor="middle" fontSize={11} fontFamily="Tahoma, sans-serif" fontWeight={track ? 'bold' : 'normal'} fill={track ? track.color : '#000'}>{TOKENS[tok]}</text>
                {/* same vector as in the original order, or changed? */}
                {shuffled && (
                  <text x={i * slot + slot - 13} y={42} textAnchor="middle" fontSize={11} fontWeight="bold" fill={changed[i] ? '#c0392b' : '#2f8e2f'}>
                    {changed[i] ? '≠' : '='}
                  </text>
                )}
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
                <text x={i * slot + slot / 2} y={116} textAnchor="middle" fontSize={8} fill={shuffled && changed[i] ? '#c0392b' : '#666'}>
                  [{outputs[i].slice(0, 2).map(v2 => v2.toFixed(2)).join(', ')}, …]
                </text>
              </g>
            )
          })}
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
          This is a real attention head (fixed toy weights, d=4) running in your browser — and there is no
          single &quot;query token&quot;: all five tokens query the whole sentence simultaneously, so each card is one
          token&apos;s output. Attention is <strong>permutation-equivariant</strong>: shuffle the input and the
          outputs shuffle identically, because <code>softmax(QKᵀ)·V</code> contains no notion of an index —
          follow the colored <strong style={{ color: TRACK[0].color }}>cat</strong> and{' '}
          <strong style={{ color: TRACK[1].color }}>sat</strong> cards and the <strong>&quot;=&quot;</strong> badges:
          their vectors are bit-identical, just relocated. Toggle <strong>positions</strong> to add a position
          vector to each embedding and every card flips to <strong>&quot;≠&quot;</strong> — even tokens that kept their slot change,
          because their neighbours&apos; K and V moved. Word order is now information the model can use.
        </p>
      </div>
    </div>
  )
}
