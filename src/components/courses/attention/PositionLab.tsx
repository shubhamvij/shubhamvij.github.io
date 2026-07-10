'use client'
import { ReactNode, useState } from 'react'
import s from '../engine/course.module.css'

const TABS = ['Sinusoidal', 'Learned', 'RoPE', 'ALiBi'] as const
type Tab = typeof TABS[number]

const N_POS = 32
const N_DIM = 24
const TRAINED_MAX = 24 // "learned" table rows beyond this were never trained

/** Original-transformer sinusoidal encoding value at (position, dim). */
function sinusoidal(p: number, d: number): number {
  const i = Math.floor(d / 2)
  const freq = 1 / Math.pow(10000, (2 * i) / N_DIM)
  return d % 2 === 0 ? Math.sin(p * freq) : Math.cos(p * freq)
}

/** Deterministic pseudo-random in [-1, 1] — a stand-in for trained embedding values. */
function learned(p: number, d: number): number {
  const x = Math.sin(p * 12.9898 + d * 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

/** value in [-1,1] → blue/white/orange diverging fill */
function valColor(v: number): string {
  const t = Math.max(-1, Math.min(1, v))
  if (t >= 0) {
    const u = 1 - t
    return `rgb(${Math.round(200 + 55 * u)}, ${Math.round(96 + 159 * u)}, ${Math.round(24 + 231 * u)})`
  }
  const u = 1 + t
  return `rgb(${Math.round(43 + 212 * u)}, ${Math.round(111 + 144 * u)}, ${Math.round(208 + 47 * u)})`
}

function Heatmap({ values, untrainedFrom }: { values: (p: number, d: number) => number; untrainedFrom?: number }) {
  const cw = 480 / N_DIM
  const ch = 7
  return (
    <svg viewBox={`0 0 480 ${N_POS * ch + 14}`} className={s.labCanvas} role="img" aria-label="Positional encoding matrix heatmap">
      {Array.from({ length: N_POS }, (_, p) => (
        <g key={p}>
          {untrainedFrom !== undefined && p >= untrainedFrom ? (
            <>
              <rect x={0} y={p * ch} width={480} height={ch - 0.5} fill="#e8e6dd" />
              <text x={240} y={p * ch + ch - 1} textAnchor="middle" fontSize={6.5} fill="#a09880">?</text>
            </>
          ) : (
            Array.from({ length: N_DIM }, (_, d) => (
              <rect key={d} x={d * cw} y={p * ch} width={cw - 0.5} height={ch - 0.5} fill={valColor(values(p, d))}>
                <title>{`position ${p}, dim ${d}: ${values(p, d).toFixed(2)}`}</title>
              </rect>
            ))
          )}
        </g>
      ))}
      <text x={0} y={N_POS * ch + 11} fontSize={8.5} fill="#666">← dimensions (pairs at geometric frequencies) · rows = positions 0…{N_POS - 1}</text>
    </svg>
  )
}

const ROPE_PAIRS = [
  { label: 'pair 0 (fast, θ=1)', theta: 1 },
  { label: 'pair 2 (θ=0.1)', theta: 0.1 },
  { label: 'pair 4 (slow, θ=0.01)', theta: 0.01 },
]

function RopePanel() {
  const [m, setM] = useState(6)
  const [n, setN] = useState(2)
  const [pair, setPair] = useState(1)

  const theta = ROPE_PAIRS[pair].theta
  const score = Math.cos((m - n) * theta) // unit q,k rotated by mθ, nθ: q·k = cos((m−n)θ)
  const cx = 110, cy = 96, r = 78
  const arrow = (angle: number, color: string, label: string) => {
    const x = cx + r * Math.cos(-angle)
    const y = cy + r * Math.sin(-angle)
    return (
      <g>
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth={2.5} />
        <circle cx={x} cy={y} r={3.5} fill={color} />
        <text x={x + (x > cx ? 6 : -6)} y={y} textAnchor={x > cx ? 'start' : 'end'} fontSize={10} fontWeight="bold" fill={color}>{label}</text>
      </g>
    )
  }

  return (
    <>
      <svg viewBox="0 0 480 196" className={s.labCanvas} role="img" aria-label="RoPE rotation of query and key on the unit circle">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#c9c4b4" strokeDasharray="3 3" />
        <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="#ddd" />
        <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="#ddd" />
        {arrow(m * theta, '#2b6fd0', `q @ ${m}`)}
        {arrow(n * theta, '#c86018', `k @ ${n}`)}
        <text x={300} y={52} fontSize={11} fontFamily="Tahoma, sans-serif">rotation: position × θ</text>
        <text x={300} y={78} fontSize={11} fontFamily="Tahoma, sans-serif">angle between q and k:</text>
        <text x={300} y={96} fontSize={13} fontWeight="bold">(m − n)·θ = {((m - n) * theta).toFixed(2)} rad</text>
        <text x={300} y={126} fontSize={11} fontFamily="Tahoma, sans-serif">their dot product (the score):</text>
        <text x={300} y={148} fontSize={17} fontWeight="bold" fill="#0a246a">{score.toFixed(2)}</text>
        <text x={300} y={168} fontSize={10} fill="#666">depends ONLY on m − n = {m - n}</text>
      </svg>
      <div className={s.labControls}>
        <span className={s.sliderLabel}>query position m</span>
        <input type="range" min={0} max={35} step={1} value={m} onChange={e => setM(Number(e.target.value))} className={s.slider} aria-label="query position m" />
        <span className={s.labStat}>m = {m}</span>
      </div>
      <div className={s.labControls}>
        <span className={s.sliderLabel}>key position n</span>
        <input type="range" min={0} max={35} step={1} value={n} onChange={e => setN(Number(e.target.value))} className={s.slider} aria-label="key position n" />
        <span className={s.labStat}>n = {n}</span>
      </div>
      <div className={s.labControls}>
        <button type="button" className={s.btn} onClick={() => { setM(v => v + 5); setN(v => v + 5) }} disabled={m > 30 || n > 30}>
          shift both +5 →
        </button>
        {ROPE_PAIRS.map((p2, i) => (
          <button key={p2.label} type="button" className={`${s.chip} ${pair === i ? s.chipOn : ''}`} onClick={() => setPair(i)}>
            {p2.label}
          </button>
        ))}
      </div>
      <p className={s.labNote}>
        RoPE splits each query/key vector into 2D pairs and <strong>rotates</strong> pair i of the token at
        position p by angle p·θᵢ — inside attention, at every layer, no position vectors added anywhere. Because
        both vectors rotate, the angle <em>between</em> them (hence the score) depends only on the offset m−n:
        press <strong>shift both +5</strong> and watch the score not move. Different pairs get geometrically spaced
        θᵢ — fast pairs resolve nearby order like a second hand; slow pairs carry long-range position like an hour
        hand.
      </p>
    </>
  )
}

function AlibiPanel() {
  const [slope, setSlope] = useState(1)
  const SLOPES = [{ label: 'head slope 1/2', v: 0.5 }, { label: '1/4', v: 0.25 }, { label: '1/8', v: 0.125 }]
  const n = 10
  const cell = 30
  return (
    <>
      <div className={s.chipRow}>
        {SLOPES.map((sl, i) => (
          <button key={sl.label} type="button" className={`${s.chip} ${slope === i ? s.chipOn : ''}`} onClick={() => setSlope(i)}>
            {sl.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${n * cell + 130} ${n * cell + 20}`} className={s.labCanvas} role="img" aria-label="ALiBi bias matrix">
        {Array.from({ length: n }, (_, q) =>
          Array.from({ length: q + 1 }, (_, k) => {
            const bias = -SLOPES[slope].v * (q - k)
            return (
              <g key={`${q}-${k}`}>
                <rect x={k * cell} y={q * cell} width={cell - 1.5} height={cell - 1.5} fill={valColor(Math.max(-1, bias / 3))} stroke="#d8d4c0" strokeWidth={0.5}>
                  <title>{`query ${q}, key ${k}: bias ${bias.toFixed(2)}`}</title>
                </rect>
                <text x={k * cell + cell / 2} y={q * cell + cell / 2 + 3} textAnchor="middle" fontSize={7.5} fill="#333">{bias === 0 ? '0' : bias.toFixed(1)}</text>
              </g>
            )
          })
        )}
        <text x={n * cell + 12} y={40} fontSize={10.5} fontFamily="Tahoma, sans-serif">score += −slope·(q−k)</text>
        <text x={n * cell + 12} y={58} fontSize={10.5} fill="#666">added to QKᵀ before</text>
        <text x={n * cell + 12} y={71} fontSize={10.5} fill="#666">the softmax</text>
      </svg>
      <p className={s.labNote}>
        ALiBi adds a <strong>linear distance penalty</strong> straight onto the attention scores — no position
        vectors, no rotations. Each head gets its own slope (geometric series 1/2, 1/4, …), so some heads stay
        local while others keep long reach. Because the rule &quot;further = fainter&quot; is the same at any length, ALiBi
        models <strong>extrapolate</strong>: train at 1k tokens, run at 4k, and position 3000 needs no new
        parameters — the penalty just keeps going.
      </p>
    </>
  )
}

export default function PositionLab() {
  const [tab, setTab] = useState<Tab>('Sinusoidal')

  const panel: Record<Tab, ReactNode> = {
    Sinusoidal: (
      <>
        <Heatmap values={sinusoidal} />
        <p className={s.labNote}>
          The original transformer&apos;s encoding: dimension pair i oscillates at frequency 1/10000^(2i/d), so each
          row (a position) is a unique <strong>barcode</strong> of sines and cosines — fast columns on the left
          disambiguate neighbors, slow columns on the right encode coarse location. It&apos;s added to the token
          embedding once, at the input. Zero learned parameters, defined for <em>any</em> position — though
          attention still has to learn to decode it.
        </p>
      </>
    ),
    Learned: (
      <>
        <Heatmap values={learned} untrainedFrom={TRAINED_MAX} />
        <p className={s.labNote}>
          GPT-2/BERT style: the encoding is just a <strong>trainable lookup table</strong> — row p is a free
          d-dimensional vector, added to the token embedding at the input exactly like the sinusoidal version
          (x = emb(token) + PE[p]), and learned end-to-end like any other weight. The catch is visible above:
          the table has exactly max-length rows (here {TRAINED_MAX}). Position {TRAINED_MAX} or beyond{' '}
          <strong>has no row</strong> — the model simply cannot represent it, which is why learned absolute PEs
          don&apos;t extrapolate past the training length.
        </p>
      </>
    ),
    RoPE: <RopePanel />,
    ALiBi: <AlibiPanel />,
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Position Lab</span>
        <span className={s.widgetHint}>four ways to smuggle order into an order-blind mechanism</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {TABS.map(t => (
            <button key={t} type="button" className={`${s.chip} ${tab === t ? s.chipOn : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {panel[tab]}
      </div>
    </div>
  )
}
