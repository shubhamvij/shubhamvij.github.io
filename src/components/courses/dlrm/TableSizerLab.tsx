'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

// Memory tiers (spec ledger): single GPU ~ 80 GB HBM, host ~ 1.5 TB DRAM, then SSD.
const TIERS = [
  { name: 'HBM (on-GPU)', maxGB: 80, color: '#2f8e2f', note: 'fast + tiny' },
  { name: 'DRAM (host)', maxGB: 1536, color: '#c8a030', note: 'big + slower' },
  { name: 'SSD / distributed', maxGB: Infinity, color: '#c0392b', note: 'huge + slowest' },
]
function tierFor(gb: number) { return TIERS.find(t => gb <= t.maxGB)! }

// Verified cache-locality curve (RecNMP, spec ledger): 8-64MB LRU -> 20-60% hit
// vs <5% random; reported anchor points, drawn as a curve.
const CACHE_PTS = [
  { mb: 8, hit: 20 }, { mb: 16, hit: 33 }, { mb: 32, hit: 47 }, { mb: 64, hit: 60 },
]

function fmtGB(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(gb >= 10240 ? 0 : 1)} TB`
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`
}

export default function TableSizerLab() {
  const [view, setView] = useState<'size' | 'cache'>('size')
  const [logRows, setLogRows] = useState(7)
  const [nTables, setNTables] = useState(100)
  const [dim, setDim] = useState(64)
  const [bytes, setBytes] = useState(4)

  const gb = useMemo(() => {
    const rows = Math.pow(10, logRows)
    return (rows * nTables * dim * bytes) / 1e9
  }, [logRows, nTables, dim, bytes])
  const tier = tierFor(gb)

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Table Sizer &amp; Roofline</span>
        <span className={s.widgetHint}>you can&apos;t just buy a bigger GPU</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${view === 'size' ? s.chipOn : ''}`} onClick={() => setView('size')}>table size &amp; tiers</button>
          <button type="button" className={`${s.chip} ${view === 'cache' ? s.chipOn : ''}`} onClick={() => setView('cache')}>cache locality</button>
        </div>
        {view === 'size' ? (
          <>
            <svg viewBox="0 0 360 120" className={s.labCanvas} role="img" aria-label="Memory tier bar">
              {TIERS.map((t, i) => {
                const x = 14 + i * 112
                const active = t.name === tier.name
                return (
                  <g key={t.name}>
                    <rect x={x} y={30} width={104} height={44} rx={4} fill={active ? t.color : '#f2f0e8'} stroke={active ? '#333' : '#ccc'} strokeWidth={active ? 2 : 1} />
                    <text x={x + 52} y={50} textAnchor="middle" fontSize={7.5} fill={active ? '#fff' : '#999'}>{t.note}</text>
                    <text x={x + 52} y={70} textAnchor="middle" fontSize={7.5} fill="#777">{t.maxGB === Infinity ? '> 1.5 TB' : `≤ ${fmtGB(t.maxGB)}`}</text>
                  </g>
                )
              })}
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>rows/table 10^<strong>{logRows}</strong></span>
              <input type="range" min={5} max={9.5} step={0.5} value={logRows} aria-label="rows per table" className={s.slider} onChange={e => setLogRows(Number(e.target.value))} />
              <span className={s.sliderLabel}>tables <strong>{nTables}</strong></span>
              <input type="range" min={1} max={400} step={1} value={nTables} aria-label="table count" className={s.slider} onChange={e => setNTables(Number(e.target.value))} />
              <span className={s.sliderLabel}>dim <strong>{dim}</strong></span>
              <input type="range" min={16} max={256} step={16} value={dim} aria-label="dim" className={s.slider} onChange={e => setDim(Number(e.target.value))} />
              <span className={s.sliderLabel}>bytes/elt <strong>{bytes}</strong></span>
              <input type="range" min={1} max={4} step={1} value={bytes} aria-label="bytes" className={s.slider} onChange={e => setBytes(Number(e.target.value))} />
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>total <span className={s.labStatValue}>{fmtGB(gb)}</span></span>
              <span className={s.labStat}>lands in <span className={s.labStatValue}>{tier.name}</span></span>
            </div>
          </>
        ) : (
          <>
            <svg viewBox="0 0 360 150" className={s.labCanvas} role="img" aria-label="Cache size versus hit rate">
              <line x1={34} y1={124} x2={348} y2={124} stroke="#888" />
              <line x1={34} y1={12} x2={34} y2={124} stroke="#888" />
              <polyline fill="none" stroke="#3a6ea5" strokeWidth={1.8}
                points={CACHE_PTS.map(p => `${34 + (Math.log2(p.mb) - 3) / 3 * 300},${124 - (p.hit / 65) * 108}`).join(' ')} />
              {CACHE_PTS.map(p => (
                <g key={p.mb}>
                  <circle cx={34 + (Math.log2(p.mb) - 3) / 3 * 300} cy={124 - (p.hit / 65) * 108} r={3.5} fill="#3a6ea5" />
                  <text x={34 + (Math.log2(p.mb) - 3) / 3 * 300} y={138} textAnchor="middle" fontSize={7.5} fill="#666" aria-hidden="true">{p.mb}MB</text>
                </g>
              ))}
              <line x1={34} y1={124 - (5 / 65) * 108} x2={348} y2={124 - (5 / 65) * 108} stroke="#c0392b" strokeDasharray="3 2" />
              <text x={200} y={124 - (5 / 65) * 108 - 3} fontSize={7.5} fill="#c0392b" aria-hidden="true">random access: &lt;5% hit</text>
              <text x={8} y={70} fontSize={8} fill="#555" transform="rotate(-90 8 70)">hit rate →</text>
            </svg>
            <p className={s.labNote}>
              Embeddings have <strong>temporal</strong> locality (popular items recur) but almost no{' '}
              <strong>spatial</strong> locality — an 8–64 MB LRU cache hits 20–60% on production traces vs under
              5% on random access, and (per RecNMP) the hit rate actually <em>falls</em> as the cacheline grows,
              because neighboring rows are unrelated. Caching hot rows works; prefetching contiguous ones doesn&apos;t.
            </p>
          </>
        )}
        {view === 'size' && (
          <p className={s.labNote}>
            rows × dim × bytes × tables → total memory. A single production table is ~1M rows; a real model has
            dozens to thousands of tables and lands in the hundreds of GB to multi-TB range — past any single GPU&apos;s
            HBM. The problem isn&apos;t FLOPs, it&apos;s <strong>capacity and bandwidth</strong>: the gather-reduce
            (SLS) ops are 37–74% of serving latency, running within ~35% of the memory-bandwidth roofline.
          </p>
        )}
      </div>
    </div>
  )
}
