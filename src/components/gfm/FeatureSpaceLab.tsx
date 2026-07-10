'use client'
import { useState } from 'react'
import s from './gfm.module.css'

interface Domain {
  id: string
  label: string
  nodeMeaning: string
  columns: string[]
  rows: string[][]
  dim: number
  dimLabel: string
  fits: boolean
  verdict: string
}

const DOMAINS: Domain[] = [
  {
    id: 'citation',
    label: 'Citation network',
    nodeMeaning: 'node = a paper',
    columns: ['text-emb[0]', 'text-emb[1]', 'text-emb[2]', '… ×768'],
    rows: [
      ['0.021', '-0.114', '0.303', '…'],
      ['-0.087', '0.256', '-0.011', '…'],
      ['0.148', '0.039', '-0.192', '…'],
    ],
    dim: 768,
    dimLabel: '768 floats (title+abstract embedding)',
    fits: true,
    verdict: 'Shapes line up — the model runs. But notice why: papers happen to be described by text, and we chose a 768-d text encoder. The fit is a modeling choice, not a law of nature.',
  },
  {
    id: 'molecule',
    label: 'Molecule',
    nodeMeaning: 'node = an atom',
    columns: ['atom type (one-hot ×119)', 'charge', 'aromatic'],
    rows: [
      ['C → [0,0,0,0,0,1,0…]', '0', '1'],
      ['N → [0,0,0,0,0,0,1…]', '-1', '0'],
      ['O → [0,0,0,0,0,0,0…]', '0', '0'],
    ],
    dim: 121,
    dimLabel: '121 mixed values (one-hot + integers)',
    fits: false,
    verdict: 'Expected input of size 768, got 121. And even if we zero-padded the vector, position 5 means "carbon" here and "the 6th embedding coordinate" there — the dimensions don\'t mean the same thing.',
  },
  {
    id: 'payments',
    label: 'Payment network',
    nodeMeaning: 'node = an account',
    columns: ['age (days)', 'country', 'avg amount', 'risk flags'],
    rows: [
      ['412', 'CA', '$81.20', '0b0010'],
      ['12', 'US', '$1,204.99', '0b1011'],
      ['1,988', 'IN', '$14.05', '0b0000'],
    ],
    dim: 4,
    dimLabel: '4 columns (numeric + categorical + bitfield)',
    fits: false,
    verdict: 'Expected input of size 768, got 4 — and the columns are a mix of numbers, categories, and bitfields. There is no text to embed and no obvious way to map "country" into a paper-embedding space.',
  },
]

export default function FeatureSpaceLab() {
  const [domainId, setDomainId] = useState('citation')
  const [fed, setFed] = useState(false)
  const domain = DOMAINS.find(d => d.id === domainId)!

  const selectDomain = (id: string) => {
    setDomainId(id)
    setFed(false)
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Feature Space Lab</span>
        <span className={s.widgetHint}>one pretrained model, three graphs</span>
      </div>
      <div className={s.widgetBody}>
        <div className={s.chipRow}>
          {DOMAINS.map(d => (
            <button
              key={d.id}
              type="button"
              className={`${s.chip} ${d.id === domainId ? s.chipOn : ''}`}
              onClick={() => selectDomain(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #aca899', padding: '7px 9px', fontSize: 11 }}>
          <div style={{ color: '#666', marginBottom: 4 }}>{domain.nodeMeaning} — node feature table:</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  {domain.columns.map(c => (
                    <th key={c} style={{ border: '1px solid #d8d4c0', padding: '2px 7px', background: '#ece9d8', fontWeight: 'bold', textAlign: 'left' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domain.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ border: '1px solid #e4e0d0', padding: '2px 7px', fontFamily: '"Courier New", monospace', fontSize: 10.5 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 4, color: '#666' }}>feature dimension: <strong style={{ color: '#000' }}>{domain.dimLabel}</strong></div>
        </div>

        <div className={s.labControls}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setFed(true)} disabled={fed}>
            Feed to pretrained GNN ▸
          </button>
          <span className={s.labStat}>model input layer <span className={s.labStatValue}>[N × 768]</span></span>
        </div>

        {fed && (
          domain.fits ? (
            <div className={`${s.feedback} ${s.feedbackCorrect}`} style={{ marginTop: 8 }}>
              <span className={s.feedbackIcon}>✓</span>
              <span><strong>Forward pass OK.</strong> {domain.verdict}</span>
            </div>
          ) : (
            <div style={{ marginTop: 8, border: '1px solid #808080', background: '#ece9d8', boxShadow: '2px 2px 6px rgba(0,0,0,0.25)', maxWidth: 420 }}>
              <div style={{ background: 'linear-gradient(180deg, #0a246a 0%, #3a6ea5 60%, #0a246a 100%)', color: '#fff', fontSize: 11, fontWeight: 'bold', padding: '2px 6px' }}>
                model.forward() — Error
              </div>
              <div style={{ display: 'flex', gap: 8, padding: '9px 10px', fontSize: 11.5, lineHeight: 1.5 }}>
                <span style={{ fontSize: 18, color: '#c00', fontWeight: 'bold' }}>✕</span>
                <span><strong>RuntimeError: shape mismatch.</strong> {domain.verdict}</span>
              </div>
            </div>
          )
        )}

        <p className={s.labNote}>
          This is <strong>feature heterogeneity</strong>: every graph dataset invents its own feature schema,
          so a network pretrained on one graph can&apos;t even <em>run</em> on the next — the failure happens at the
          very first weight matrix, before any &quot;learning&quot; question arises.
        </p>
      </div>
    </div>
  )
}
