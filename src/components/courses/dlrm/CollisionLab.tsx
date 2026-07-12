'use client'
import { useMemo, useState } from 'react'
import s from '../engine/course.module.css'

const N = 48          // toy ID space 0..47
const D = 16          // embedding dim (for memory math)

// Reported Criteo deltas (spec ledger) — shown as paper chips, NOT computed.
const QR_NOTE = 'Criteo Kaggle: ~4× smaller within 0.3% (DCN) / 0.7% (DLRM) of baseline BCE'
const QUANT_NOTE: Record<number, string> = {
  32: 'baseline (FP32)',
  16: 'FP16 · ~2× · quality-neutral',
  8: 'int8 · ~4× · negligible loss',
  4: 'int4 · ~7–8× (with per-row scale+bias) · log-loss-neutral on Terabyte Criteo',
}

export default function CollisionLab() {
  const [tab, setTab] = useState<'share' | 'shrink'>('share')
  const [mode, setMode] = useState<'mod' | 'qr'>('mod')
  const [m, setM] = useState(8)
  const [sel, setSel] = useState<number[]>([])
  const [bits, setBits] = useState(8)

  const qRows = Math.ceil(N / m)
  // Real index math.
  const modRow = (id: number) => id % m
  const qr = (id: number) => ({ r: id % m, q: Math.floor(id / m) })

  const collision = useMemo(() => {
    if (sel.length < 2) return null
    if (mode === 'mod') {
      const rows = sel.map(modRow)
      return rows[0] === rows[1] ? { kind: 'collide', detail: `both map to row ${rows[0]}` } : { kind: 'distinct', detail: `rows ${rows[0]} and ${rows[1]}` }
    }
    const a = qr(sel[0]), b = qr(sel[1])
    const same = a.r === b.r && a.q === b.q
    return same
      ? { kind: 'collide', detail: `(r${a.r},q${a.q}) = (r${b.r},q${b.q})` }
      : { kind: 'unique', detail: `(r${a.r},q${a.q}) vs (r${b.r},q${b.q}) — different pair` }
  }, [sel, mode, m])

  const fullRows = N
  const usedRows = mode === 'mod' ? m : m + qRows
  const memPct = Math.round((usedRows / fullRows) * 100)

  const toggle = (id: number) => setSel(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur.slice(-1), id])

  const bytesPerRow = (bits / 8) * D + (bits < 32 ? 6 : 0) // +scale+bias for low precision

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Collision Explorer</span>
        <span className={s.widgetHint}>memory vs collisions vs accuracy — pick your axis</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          <button type="button" className={`${s.chip} ${tab === 'share' ? s.chipOn : ''}`} onClick={() => setTab('share')}>share rows</button>
          <button type="button" className={`${s.chip} ${tab === 'shrink' ? s.chipOn : ''}`} onClick={() => setTab('shrink')}>shrink each row</button>
        </div>
        {tab === 'share' ? (
          <>
            <div className={s.chipRow}>
              <button type="button" className={`${s.chip} ${mode === 'mod' ? s.chipOn : ''}`} onClick={() => setMode('mod')}>modulo hashing</button>
              <button type="button" className={`${s.chip} ${mode === 'qr' ? s.chipOn : ''}`} onClick={() => setMode('qr')}>quotient-remainder</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {Array.from({ length: N }, (_, id) => {
                const on = sel.includes(id)
                const share = collision?.kind === 'collide' && on
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: on ? '1.6px solid #0a246a' : '0.6px solid #ccc',
                      background: share ? '#f0b8b8' : on ? '#f0d98c' : '#f2f0e8',
                      cursor: 'pointer',
                    }}
                  >
                    id {id}
                  </button>
                )
              })}
            </div>
            {sel.length >= 2 && collision && (
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: collision.kind === 'collide' ? '#c0392b' : '#2f8e2f' }}>
                {collision.kind === 'collide' ? `Collision: ids ${sel[0]} & ${sel[1]} collide` : collision.kind === 'unique' ? `Status: unique mapping — ${collision.detail}` : `Status: ${collision.detail}`}
              </div>
            )}
            <svg viewBox="0 0 470 120" className={s.labCanvas} role="img" aria-label="ID space mapping into rows">
              {/* target rows summary */}
              <text x={10} y={20} fontSize={9} fill="#333">
                {mode === 'mod' ? `${m} shared rows (id mod ${m})` : `${m} remainder rows ⊙ ${qRows} quotient rows`}
              </text>
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>buckets m <strong>{m}</strong></span>
              <input type="range" min={2} max={24} step={1} value={m} aria-label="buckets" className={s.slider} onChange={e => setM(Number(e.target.value))} />
              <span className={s.labStat}>rows stored <span className={s.labStatValue}>{usedRows} rows</span></span>
              <span className={s.labStat}>vs full <span className={s.labStatValue}>{memPct}%</span></span>
            </div>
            <p className={s.labNote}>
              <strong>Modulo hashing</strong> maps id → id mod m: memory drops to m rows, but ids sharing a
              residue <em>hash to the same row</em> (pick two and watch). <strong>Quotient-remainder</strong>
              keeps two small tables — remainder (id mod m) and quotient (id ÷ m) — and combines their rows
              element-wise, so every id gets a distinct vector using only (m + ⌈N/m⌉) rows instead of N.
              That&apos;s the trade: modulo is smaller but less precise; Q-R preserves all pairs at a √-ish row count.{' '}
              <span style={{ opacity: 0.75 }}>{QR_NOTE}.</span>
            </p>
          </>
        ) : (
          <>
            <svg viewBox="0 0 360 70" className={s.labCanvas} role="img" aria-label="Bytes per embedding row by precision">
              <rect x={90} y={20} width={Math.max(6, bytesPerRow * 3)} height={26} fill="#7a4ab8" />
              <text x={8} y={38} fontSize={9} fill="#555">bytes/row</text>
              <text x={96 + Math.max(6, bytesPerRow * 3)} y={38} fontSize={9} fill="#555">{bytesPerRow} B</text>
            </svg>
            <div className={s.labControls}>
              <span className={s.sliderLabel}>precision bits <strong>{bits}</strong></span>
              <input type="range" min={2} max={5} step={1} value={Math.log2(bits)} aria-label="bits" className={s.slider} onChange={e => setBits(Math.pow(2, Number(e.target.value)))} />
            </div>
            <div className={s.labControls}>
              <span className={s.labStat}>mode <span className={s.labStatValue}>{bits === 32 ? 'fp32' : bits === 16 ? 'fp16' : `int${bits}`}</span></span>
            </div>
            <p className={s.labNote}>
              <strong>Row-wise quantization</strong> stores each row in low precision with one (scale, bias)
              pair per row — that&apos;s the +6 bytes you see below int8. Pure int4 is 8×; the per-row scale+bias
              trims it to ~7×. <span style={{ opacity: 0.75 }}>{QUANT_NOTE[bits]}.</span> These are the paper&apos;s
              reported numbers on Terabyte Criteo, not measured here — and note every compression method reports
              on its <em>own</em> benchmark, so the ratios aren&apos;t directly comparable.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
