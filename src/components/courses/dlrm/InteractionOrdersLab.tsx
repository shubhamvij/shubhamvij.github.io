'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// Wukong (spec ledger): layer i captures feature-interaction orders up to 2^i
// via stacked FMB+LCB blocks — vs DLRM's single fixed pairwise (order-2) dot.
export default function InteractionOrdersLab() {
  const [layers, setLayers] = useState(3)
  const wukongOrder = Math.pow(2, layers)

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Interaction Orders</span>
        <span className={s.widgetHint}>sparse scaling → dense scaling</span>
      </div>
      <div className={s.widgetBody}>
        <svg viewBox="0 0 360 120" className={s.labCanvas} role="img" aria-label="Interaction order reachable by DLRM versus Wukong">
          {/* DLRM: fixed order 2 */}
          <text x={10} y={20} fontSize={9} fontWeight="bold" fill="#c86018">DLRM (fixed pairwise)</text>
          <rect x={10} y={26} width={40} height={20} fill="#ffe9d6" stroke="#c86018" />
          <text x={30} y={40} textAnchor="middle" fontSize={9} fill="#8a3a0a">order 2</text>
          {/* Wukong: stacked layers, order 2^i */}
          <text x={10} y={70} fontSize={9} fontWeight="bold" fill="#7a4ab8">Wukong ({layers} layers)</text>
          {Array.from({ length: layers }, (_, i) => (
            <g key={i}>
              <rect x={10 + i * 56} y={76} width={50} height={20} fill="#efe9f8" stroke="#7a4ab8" />
              <text x={35 + i * 56} y={90} textAnchor="middle" fontSize={8} fill="#4a2a6a">2^{i + 1}={Math.pow(2, i + 1)}</text>
            </g>
          ))}
        </svg>
        <div className={s.labControls}>
          <span className={s.sliderLabel}>Wukong layers <strong>{layers}</strong></span>
          <input type="range" min={1} max={6} step={1} value={layers} aria-label="layers" className={s.slider} onChange={e => setLayers(Number(e.target.value))} />
          <span className={s.labStat}>DLRM reaches <span className={s.labStatValue}>order 2</span></span>
          <span className={s.labStat}>Wukong reaches <span className={s.labStatValue}>order {wukongOrder}</span></span>
        </div>
        <p className={s.labNote}>
          Classic DLRM computes one fixed round of <strong>pairwise</strong> (order-2) dot-product interactions.
          Wukong stacks identical blocks so layer <em>i</em> reaches interaction order <strong>2^i</strong> — by
          binary exponentiation, a handful of layers captures very high-order feature crosses, and the model
          scales by adding <strong>compute</strong> (dense scaling) rather than only growing tables (sparse
          scaling). Wukong reports an LLM-style scaling law past 100 GFLOP/example — yet{' '}
          <strong>627B of its 637B parameters are still embeddings</strong>. The interaction core is being
          reinvented; the table isn&apos;t going anywhere.
        </p>
      </div>
    </div>
  )
}
