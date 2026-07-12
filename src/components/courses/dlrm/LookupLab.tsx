'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

// A tiny fixed embedding table: 6 movie genres (the "vocabulary") × 4 dims.
// Values are fixed (no randomness) so the lookup is a real, deterministic
// one-hot × W = row selection.
const CATEGORIES = ['Action', 'Drama', 'SciFi', 'Comedy', 'Horror', 'Docu']
const D = 4
const W: number[][] = [
  [0.82, -0.31, 0.15, 0.44],
  [-0.12, 0.67, -0.40, 0.22],
  [0.55, 0.28, 0.71, -0.18],
  [-0.48, 0.12, 0.33, 0.60],
  [0.20, -0.55, -0.22, 0.38],
  [0.05, 0.41, -0.16, -0.52],
]

export default function LookupLab() {
  const [pick, setPick] = useState(0)
  const [multiHot, setMultiHot] = useState(false)
  const [pick2, setPick2] = useState(2)

  // Real one-hot × W. For multi-hot, average the two selected rows (mean pooling).
  const oneHot = CATEGORIES.map((_, i) => (i === pick || (multiHot && i === pick2) ? 1 : 0))
  const rows = multiHot ? [pick, pick2] : [pick]
  const out = Array.from({ length: D }, (_, k) =>
    rows.reduce((acc, r) => acc + W[r][k], 0) / rows.length
  )

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Lookup Lab</span>
        <span className={s.widgetHint}>one-hot × W is just a row selection</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((c, i) => (
            <button key={c} type="button" className={`${s.chip} ${i === pick ? s.chipOn : ''}`} onClick={() => setPick(i)}>
              {c}
            </button>
          ))}
          <button type="button" className={`${s.chip} ${multiHot ? s.chipOn : ''}`} onClick={() => setMultiHot(m => !m)}>
            multi-hot pooling
          </button>
        </div>
        {multiHot && (
          <div className={s.chipRow} style={{ flexWrap: 'wrap' }}>
            <span className={s.sliderLabel}>+ second genre:</span>
            {CATEGORIES.map((c, i) => (
              <button key={c} type="button" className={`${s.chip} ${i === pick2 ? s.chipOn : ''}`} onClick={() => setPick2(i)} disabled={i === pick}>
                {c}
              </button>
            ))}
          </div>
        )}
        <svg viewBox="0 0 470 200" className={s.labCanvas} role="img" aria-label="One-hot vector times embedding matrix selecting a row">
          {/* one-hot column */}
          <text x={24} y={16} fontSize={9} fontWeight="bold" fill="#333">one-hot</text>
          {CATEGORIES.map((c, i) => (
            <g key={c}>
              <rect x={14} y={24 + i * 26} width={22} height={22} fill={oneHot[i] ? '#f0d98c' : '#fff'} stroke="#666" />
              <text x={25} y={39 + i * 26} textAnchor="middle" fontSize={10}>{oneHot[i]}</text>
              <text x={44} y={39 + i * 26} fontSize={8.5} fill="#555">{c}</text>
            </g>
          ))}
          {/* matrix W */}
          <text x={150} y={16} fontSize={9} fontWeight="bold" fill="#333">W (V×d)</text>
          {W.map((row, i) => (
            <g key={i}>
              {row.map((v, k) => {
                const on = rows.includes(i)
                return (
                  <g key={k}>
                    <rect x={120 + k * 42} y={24 + i * 26} width={40} height={22}
                      fill={on ? '#dceefb' : '#fff'} stroke={on ? '#5a8fd0' : '#ccc'} strokeWidth={on ? 1.6 : 0.8} />
                    <text x={140 + k * 42} y={39 + i * 26} textAnchor="middle" fontSize={8.5} fill={on ? '#1a4a8a' : '#999'}>{v.toFixed(2)}</text>
                  </g>
                )
              })}
            </g>
          ))}
          {/* output vector */}
          <text x={330} y={16} fontSize={9} fontWeight="bold" fill="#333">embedding</text>
          {out.map((v, k) => (
            <g key={k}>
              <rect x={320} y={24 + k * 26} width={44} height={22} fill="#e9f5e9" stroke="#2f8e2f" />
              <text x={342} y={39 + k * 26} textAnchor="middle" fontSize={8.5} fill="#1a5a1a">{v.toFixed(3)}</text>
            </g>
          ))}
          <text x={388} y={70} fontSize={16} fill="#666">←</text>
        </svg>
        <div className={s.labControls}>
          <span className={s.labStat}>{multiHot ? `${rows.length} rows pooled` : `row ${pick} selected`}</span>
          <span className={s.labStat}>table params <span className={s.labStatValue}>{CATEGORIES.length * D}</span></span>
        </div>
        <p className={s.labNote}>
          A categorical value can&apos;t be a number the network does arithmetic on — &quot;genre 3&quot; isn&apos;t
          three times &quot;genre 1&quot;. So each value gets a <strong>learned row</strong> of an embedding
          table, and the lookup is exactly a one-hot vector times the matrix: <strong>wᵢᵀ = eᵢᵀW</strong> —
          a row selection. <strong>Multi-hot</strong> features (a movie with several genres) pool several rows.
          This toy table has {CATEGORIES.length}×{D} = {CATEGORIES.length * D} parameters; a production user-id
          table has billions of rows. That gap is the whole course.
        </p>
      </div>
    </div>
  )
}
