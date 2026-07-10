'use client'
import { useMemo, useState } from 'react'
import s from './gfm.module.css'

// Joint scaling law L(N, D) = L_inf + (Nc/N)^aN + (Dc/D)^aD using the exponents
// GraphBFF (arXiv:2602.04768) fits for heterogeneous-graph pretraining:
// aN ~= 0.703 (Nc ~= 2.1e4), aD ~= 0.188 (Dc ~= 4.7). L_inf here is illustrative.
const L_INF = 0.05
const A_N = 0.703
const N_C = 2.1e4
const A_D = 0.188
const D_C = 4.7

const modelTerm = (n: number) => Math.pow(N_C / n, A_N)
const dataTerm = (d: number) => Math.pow(D_C / d, A_D)

// Sliders sweep the paper's experimental ranges: N in 1e6..4e9, D in 3e5..1e9.
const N_MIN = 6, N_MAX = 9.6
const D_MIN = 5.5, D_MAX = 9

function fmtCount(log10: number): string {
  const v = Math.pow(10, log10)
  if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 3e9 ? 0 : 1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 3e6 ? 0 : 1)}M`
  return `${Math.round(v / 1e3)}K`
}

const DATA_BARS = [
  { label: 'Web text (FineWeb)', sub: '≈ 15T tokens, public', log: 13.18, color: '#3a6ea5' },
  { label: 'Image-text (LAION-5B)', sub: '≈ 5.8B pairs, public', log: 9.77, color: '#3a6ea5' },
  { label: 'Largest public graph (IGB-HET)', sub: '≈ 5.8B edges', log: 9.76, color: '#2f8e2f' },
  { label: 'OGB-LSC MAG240M', sub: '≈ 1.3B edges', log: 9.11, color: '#2f8e2f' },
  { label: 'Typical GNN benchmark (Cora)', sub: '≈ 10K edges', log: 4.0, color: '#c8a030' },
  { label: 'GraphBFF enterprise graph', sub: '≈ 50B nodes+edges, private', log: 10.7, color: '#9a5aa0' },
]

const CHART = { w: 340, h: 170, padL: 34, padR: 10, padT: 10, padB: 24 }

export default function ScalingLab({ initialView = 'laws' }: { initialView?: 'laws' | 'gap' }) {
  const [view, setView] = useState<'laws' | 'gap'>(initialView)
  const [logN, setLogN] = useState(7)
  const [logD, setLogD] = useState(8)

  const { curve, point, floor, yOf } = useMemo(() => {
    const n = Math.pow(10, logN)
    const d = Math.pow(10, logD)
    const yMax = L_INF + modelTerm(Math.pow(10, N_MIN)) + dataTerm(Math.pow(10, D_MIN))
    const yMin = L_INF
    const { w, h, padL, padR, padT, padB } = CHART
    const xOf = (ln: number) => padL + ((ln - N_MIN) / (N_MAX - N_MIN)) * (w - padL - padR)
    const yOf = (loss: number) => padT + (1 - (loss - yMin) / (yMax - yMin)) * (h - padT - padB)
    const pts: string[] = []
    for (let ln = N_MIN; ln <= N_MAX + 1e-9; ln += 0.1) {
      const loss = L_INF + modelTerm(Math.pow(10, ln)) + dataTerm(d)
      pts.push(`${xOf(ln).toFixed(1)},${yOf(loss).toFixed(1)}`)
    }
    return {
      curve: pts.join(' '),
      point: { x: xOf(logN), y: yOf(L_INF + modelTerm(n) + dataTerm(d)) },
      floor: yOf(L_INF + dataTerm(d)),
      yOf,
    }
  }, [logN, logD])

  const n = Math.pow(10, logN)
  const d = Math.pow(10, logD)
  const mTerm = modelTerm(n)
  const dTerm = dataTerm(d)
  const bottleneck = mTerm > dTerm ? 'model' : 'data'

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Scaling Lab</span>
        <span className={s.widgetHint}>exponents from GraphBFF (2026)</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${view === 'laws' ? s.chipOn : ''}`} onClick={() => setView('laws')}>
            Scaling laws
          </button>
          <button type="button" className={`${s.chip} ${view === 'gap' ? s.chipOn : ''}`} onClick={() => setView('gap')}>
            The public-data gap
          </button>
        </div>

        {view === 'laws' && (
          <>
            <svg viewBox={`0 0 ${CHART.w} ${CHART.h}`} className={s.labCanvas} role="img" aria-label="Loss versus model size curve">
              <line x1={CHART.padL} y1={CHART.h - CHART.padB} x2={CHART.w - CHART.padR} y2={CHART.h - CHART.padB} stroke="#888" strokeWidth={1} />
              <line x1={CHART.padL} y1={CHART.padT} x2={CHART.padL} y2={CHART.h - CHART.padB} stroke="#888" strokeWidth={1} />
              <text x={CHART.padL - 4} y={CHART.padT + 8} fontSize={8.5} fill="#666" textAnchor="end">loss</text>
              <text x={CHART.w - CHART.padR} y={CHART.h - 8} fontSize={8.5} fill="#666" textAnchor="end">model parameters (log) →</text>
              {[6, 7, 8, 9].map(t => (
                <text key={t} x={CHART.padL + ((t - N_MIN) / (N_MAX - N_MIN)) * (CHART.w - CHART.padL - CHART.padR)} y={CHART.h - 12} fontSize={8.5} fill="#666" textAnchor="middle">
                  10{'⁶⁷⁸⁹'[t - 6]}
                </text>
              ))}
              <line x1={CHART.padL} y1={floor} x2={CHART.w - CHART.padR} y2={floor} stroke="#c8a030" strokeWidth={1} strokeDasharray="4 3" />
              <text x={CHART.w - CHART.padR - 2} y={floor - 3} fontSize={8.5} fill="#96751a" textAnchor="end">
                floor set by current data
              </text>
              <polyline points={curve} fill="none" stroke="#2b6fd0" strokeWidth={2} />
              <circle cx={point.x} cy={point.y} r={4.5} fill="#e08040" stroke="#9a4a10" strokeWidth={1.5} />
              <line x1={CHART.padL} y1={yOf(L_INF)} x2={CHART.w - CHART.padR} y2={yOf(L_INF)} stroke="#bbb" strokeWidth={1} strokeDasharray="2 3" />
              <text x={CHART.padL + 3} y={yOf(L_INF) - 3} fontSize={8.5} fill="#999">irreducible loss</text>
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>model <strong>{fmtCount(logN)}</strong></span>
              <input type="range" min={N_MIN} max={N_MAX} step={0.05} value={logN} onChange={e => setLogN(Number(e.target.value))} className={s.slider} aria-label="Model size" />
            </div>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>data&nbsp;&nbsp;&nbsp;<strong>{fmtCount(logD)}</strong> edges</span>
              <input type="range" min={D_MIN} max={D_MAX} step={0.05} value={logD} onChange={e => setLogD(Number(e.target.value))} className={s.slider} aria-label="Training data size" />
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>
                bottleneck:&nbsp;
                <span className={s.labStatValue}>{bottleneck === 'model' ? '📦 model capacity' : '💾 training data'}</span>
              </span>
              <span className={s.labStat}>
                next move:&nbsp;
                <span className={s.labStatValue}>{bottleneck === 'model' ? 'add parameters' : 'add data'}</span>
              </span>
            </div>
            <p className={s.labNote}>
              Loss follows <code>L = L∞ + (N꜀/N)^0.703 + (D꜀/D)^0.188</code> — the joint power law GraphBFF fits over
              9 model sizes and 8 data scales of heterogeneous-graph pretraining. Grow the model with too little
              data and you slam into the dashed floor: only more data moves it. This &quot;grow both together&quot;
              behavior is the same phenomenon LLM scaling laws describe — evidence that graphs <em>do</em> scale
              predictably once data exists at scale.
            </p>
          </>
        )}

        {view === 'gap' && (
          <>
            <svg viewBox="0 0 340 150" className={s.labCanvas} role="img" aria-label="Bar chart comparing public data across modalities">
              {DATA_BARS.map((bar, i) => {
                const y = 8 + i * 23
                const width = Math.max(6, ((bar.log - 3.5) / (13.5 - 3.5)) * 205)
                return (
                  <g key={bar.label}>
                    <rect x={125} y={y} width={width} height={11} fill={bar.color} opacity={0.85} />
                    <text x={122} y={y + 9} fontSize={8.2} textAnchor="end" fill="#333">{bar.label}</text>
                    <text x={128 + width} y={y + 9} fontSize={8} fill="#555">{bar.sub}</text>
                  </g>
                )
              })}
              <text x={125} y={147} fontSize={8} fill="#888">bar length = log scale — each step is 10×</text>
            </svg>
            <p className={s.labNote}>
              Tokens, image-text pairs, and edges aren&apos;t directly comparable units — but the <em>orders of
              magnitude</em> are the story. Public text corpora are ~10,000× larger than the biggest public graph
              benchmarks, most academic GNN research still runs on graphs the size of Cora (~10K edges), and the
              graphs that <em>are</em> billion-scale (Meta&apos;s, Google&apos;s, payment networks) are private. This is the
              data-scarcity argument for why billion-parameter GFMs lag LLMs by years.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
