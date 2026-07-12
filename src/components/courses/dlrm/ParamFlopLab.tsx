'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// Verified production points (spec ledger): DLRMs 332B-12T params @ 5-638
// MFLOPS/sample (ISCA 2022, arXiv 2104.05158). Transformer points are
// order-of-magnitude public figures for contrast (params ~ FLOPs coupling).
// x = log10(params), y = log10(MFLOPs per sample).
const POINTS = [
  { name: 'DLRM-332B', lp: Math.log10(332e9), lf: Math.log10(60), kind: 'dlrm' },
  { name: 'DLRM-793B', lp: Math.log10(793e9), lf: Math.log10(638), kind: 'dlrm' },
  { name: 'DLRM-12T', lp: Math.log10(12e12), lf: Math.log10(5), kind: 'dlrm' },
  { name: 'GPT-3', lp: Math.log10(175e9), lf: Math.log10(350e3), kind: 'xf' },
  { name: 'BERT-large', lp: Math.log10(340e6), lf: Math.log10(680), kind: 'xf' },
]

const CH = { w: 360, h: 210, padL: 40, padR: 12, padT: 12, padB: 30 }
const X_MIN = 8, X_MAX = 13.2   // params 1e8..~1.6e13
const Y_MIN = 0.5, Y_MAX = 6    // MFLOPs 3..1e6

function fmtP(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
  return v.toFixed(0)
}

export default function ParamFlopLab() {
  const [logRows, setLogRows] = useState(7)   // rows per table, 10^x
  const [nTables, setNTables] = useState(26)
  const [dim, setDim] = useState(64)
  const [mlpW, setMlpW] = useState(512)

  const { params, mflops } = useMemo(() => {
    const rows = Math.pow(10, logRows)
    const embParams = rows * nTables * dim
    // MLP: bottom (13->mlpW->mlpW) + top (~interactions -> mlpW -> mlpW -> 1).
    // FLOPs per sample ~ 2 * sum of layer matmul sizes; depends ONLY on widths.
    const mlpParams = 13 * mlpW + mlpW * mlpW + mlpW * mlpW + mlpW * mlpW + mlpW
    const flops = 2 * mlpParams // ~2 FLOP per param per sample (matmul)
    return { params: embParams + mlpParams, mflops: flops / 1e6 }
  }, [logRows, nTables, dim, mlpW])

  const xOf = (lp: number) => CH.padL + ((lp - X_MIN) / (X_MAX - X_MIN)) * (CH.w - CH.padL - CH.padR)
  const yOf = (lf: number) => CH.padT + (1 - (lf - Y_MIN) / (Y_MAX - Y_MIN)) * (CH.h - CH.padT - CH.padB)
  const yourX = xOf(Math.log10(params))
  const yourY = yOf(Math.log10(Math.max(mflops, 3)))

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Params vs FLOPs</span>
        <span className={s.widgetHint}>recommenders break the transformer assumption</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 360 210" className={s.labCanvas} role="img" aria-label="Log-log scatter of parameters versus FLOPs per sample">
          {/* axes */}
          <line x1={CH.padL} y1={CH.h - CH.padB} x2={CH.w - CH.padR} y2={CH.h - CH.padB} stroke="#888" />
          <line x1={CH.padL} y1={CH.padT} x2={CH.padL} y2={CH.h - CH.padB} stroke="#888" />
          <text x={CH.w / 2} y={CH.h - 4} textAnchor="middle" fontSize={8.5} fill="#555">parameters (log) →</text>
          <text x={10} y={CH.h / 2} textAnchor="middle" fontSize={8.5} fill="#555" transform={`rotate(-90 10 ${CH.h / 2})`}>MFLOPs/sample (log) →</text>
          {POINTS.map(p => (
            <g key={p.name}>
              <circle cx={xOf(p.lp)} cy={yOf(p.lf)} r={5} fill={p.kind === 'dlrm' ? '#c86018' : '#5a8fd0'} stroke="#333" />
              <text x={xOf(p.lp)} y={yOf(p.lf) - 8} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#333">{p.name}</text>
            </g>
          ))}
          {/* your model */}
          <circle cx={yourX} cy={yourY} r={7} fill="none" stroke="#0a246a" strokeWidth={2} strokeDasharray="3 2" />
          <text x={yourX} y={yourY + 16} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#0a246a">your model</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>rows/table 10^<strong>{logRows}</strong></span>
          <input type="range" min={6} max={9.5} step={0.5} value={logRows} aria-label="rows per table" className={s.slider} onChange={e => setLogRows(Number(e.target.value))} />
          <span className={s.sliderLabel}>dim <strong>{dim}</strong></span>
          <input type="range" min={16} max={256} step={16} value={dim} aria-label="embedding dim" className={s.slider} onChange={e => setDim(Number(e.target.value))} />
          <span className={s.sliderLabel}>MLP width <strong>{mlpW}</strong></span>
          <input type="range" min={128} max={2048} step={128} value={mlpW} aria-label="MLP width" className={s.slider} onChange={e => setMlpW(Number(e.target.value))} />
        </div>
        <div className={s.labControls}>
          <span className={s.labStat}>your params <span className={s.labStatValue} data-testid="your-params">{fmtP(params)}</span></span>
          <span className={s.labStat}>your compute <span className={s.labStatValue} data-testid="your-flops">{mflops.toFixed(1)} MFLOPs</span></span>
        </div>
        <p className={s.labNote}>
          In a transformer, params and FLOPs rise together — a bigger model costs more compute (the whole
          Attention course). Recommenders <strong>invert</strong> that: the orange points are real production
          DLRMs — <strong>332B to 12 trillion parameters at only 5–638 MFLOPs per sample</strong>. Drag
          &quot;rows/table&quot; and your model marches right (more memory) while &quot;your compute&quot;
          doesn&apos;t move — embedding lookups are O(1) gathers. Only the MLP-width slider changes FLOPs. A DLRM
          mostly <em>remembers</em>; it barely <em>computes</em>.
        </p>
      </div>
    </div>
  )
}
