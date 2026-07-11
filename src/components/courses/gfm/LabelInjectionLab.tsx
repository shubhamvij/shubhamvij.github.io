'use client'
import { useState } from 'react'
import s from '../engine/course.module.css'

const USERS = [
  { id: 'U1', country: 'US', churn: 'yes' },
  { id: 'U2', country: 'DE', churn: 'no' },
  { id: 'U3', country: 'US', churn: 'no' },
  { id: 'U4', country: 'DE', churn: '?' },
]
const ORDERS = [
  { id: 'O1', user: 'U1', item: 'I1', amount: 12 },
  { id: 'O2', user: 'U2', item: 'I2', amount: 80 },
  { id: 'O3', user: 'U3', item: 'I2', amount: 64 },
  { id: 'O4', user: 'U4', item: 'I3', amount: 71 },
  { id: 'O5', user: 'U4', item: 'I2', amount: 58 },
]
const ITEMS = [
  { id: 'I1', category: 'starter' },
  { id: 'I2', category: 'pro' },
  { id: 'I3', category: 'pro' },
]

// Fixed similarity of U4 to each context user (from order count + avg amount),
// run through a real softmax → cross-sample attention weights.
function softmax(l: number[]): number[] {
  const m = Math.max(...l)
  const e = l.map(x => Math.exp(x - m))
  const z = e.reduce((p, q) => p + q, 0)
  return e.map(x => x / z)
}
const SIM = [0.2, 1.4, 1.1] // U1 (1 cheap order) vs U2/U3 (like U4: fewer, pricier)
const W = softmax(SIM)
const P_NO = W[1] + W[2] // U2 and U3 are "no"

const STEP_CAPTIONS = [
  'A tiny relational database: three tables joined by primary/foreign keys. The task: will U4 churn? Three users have known outcomes — they are the in-context examples.',
  'Step 1 — inject: the context users\' labels are written INTO the users table as a new column. Conditioning enters before any model runs — earlier than every other model in this zoo.',
  'Step 2 — within each table, attention alternates over columns and rows, producing TASK-CONDITIONED row embeddings: because the label column is present, the network can learn task-relevant extractions per row.',
  'Step 3 — attention follows primary/foreign-key edges: U4\'s row gathers from U4\'s orders (O4, O5), which gather from their items. No quadratic all-cell attention — only key-joined rows talk.',
  'Step 4 — cross-sample attention: the query row attends over the context rows, weighted by learned similarity — then the prediction reads out. No gradient step ever ran.',
]

export default function LabelInjectionLab() {
  const [step, setStep] = useState(0)
  const [flat, setFlat] = useState(false)

  const cell: React.CSSProperties = { border: '1px solid #b8b4a2', padding: '2px 7px', fontSize: 10.5 }
  const head: React.CSSProperties = { ...cell, background: '#e4e0cf', fontWeight: 'bold' }
  const hot = (on: boolean): React.CSSProperties => (on ? { background: '#ffe9d6' } : {})
  const injected = step >= 1

  if (flat) {
    return (
      <div className={s.widgetBox}>
        <div className={s.widgetTitle}>
          <span>Label-Injection Stepper</span>
          <span className={s.widgetHint}>the flatten-first alternative</span>
        </div>
        <div className={s.widgetBody}>
          <table style={{ borderCollapse: 'collapse', margin: '6px 0' }}>
            <thead>
              <tr>{['id', 'country', 'n_orders', 'total_spent', 'top_category', 'churn?'].map(h => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>{['U4', 'DE', '2', '129', 'pro', '?'].map((v, i) => <td key={i} style={cell}>{v}</td>)}</tr>
            </tbody>
          </table>
          <p className={s.labNote}>
            The flatten-then-tabular-FM pipeline (RDBLearn-style: deep feature synthesis, then TabPFN) collapses
            U4&apos;s whole neighborhood into ONE wide row before the model runs. The aggregation columns were
            chosen <em>before anyone knew the task</em> — <strong>task-conditioned extraction</strong> is lost.
            Kumo&apos;s purpose-built synthetic makes the gap stark: fixed column-wise encoders score AUROC 0.5
            where task-conditioned extraction scores 1.0 (vendor-reported, adversarial example).
          </p>
          <div className={s.labControls}>
            <button type="button" className={s.btn} onClick={() => setFlat(false)}>◂ back to the stepper</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.widgetBox}>
      <div className={s.widgetTitle}>
        <span>Label-Injection Stepper</span>
        <span className={s.widgetHint}>KumoRFM-2: will user U4 churn?</span>
      </div>
      <div className={s.widgetBody}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
          <table style={{ borderCollapse: 'collapse' }} aria-label="users table">
            <thead>
              <tr>
                <th style={head} colSpan={injected ? 3 : 2}>users</th>
              </tr>
              <tr>
                <th style={head}>id</th>
                <th style={head}>country</th>
                {injected && <th style={{ ...head, background: '#ffe9d6' }}>churn?</th>}
              </tr>
            </thead>
            <tbody>
              {USERS.map(u => (
                <tr key={u.id}>
                  <td style={{ ...cell, ...hot(step >= 2 && u.id === 'U4') }}>{u.id}</td>
                  <td style={{ ...cell, ...hot(step >= 2 && u.id === 'U4') }}>{u.country}</td>
                  {injected && <td style={{ ...cell, background: '#fff7ec' }}>{u.churn}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: 'collapse' }} aria-label="orders table">
            <thead>
              <tr><th style={head} colSpan={4}>orders</th></tr>
              <tr>{['id', 'user ⇢', 'item ⇢', 'amount'].map(h => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.id}>
                  {[o.id, o.user, o.item, String(o.amount)].map((v, i) => (
                    <td key={i} style={{ ...cell, ...hot(step >= 3 && o.user === 'U4') }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: 'collapse' }} aria-label="items table">
            <thead>
              <tr><th style={head} colSpan={2}>items</th></tr>
              <tr>{['id', 'category'].map(h => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ITEMS.map(it => (
                <tr key={it.id}>
                  <td style={{ ...cell, ...hot(step >= 3 && (it.id === 'I2' || it.id === 'I3')) }}>{it.id}</td>
                  <td style={{ ...cell, ...hot(step >= 3 && (it.id === 'I2' || it.id === 'I3')) }}>{it.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {step >= 4 && (
          <div className={s.labControls}>
            <span className={s.labStat}>cross-sample weights: U1 <span className={s.labStatValue}>{W[0].toFixed(2)}</span> · U2 <span className={s.labStatValue}>{W[1].toFixed(2)}</span> · U3 <span className={s.labStatValue}>{W[2].toFixed(2)}</span></span>
            <span className={s.labStat}>churn(U4) = <span className={s.labStatValue}>no ({P_NO.toFixed(2)})</span></span>
            <span className={s.labStat}>weights updated <span className={s.labStatValue}>0</span></span>
          </div>
        )}
        <div className={s.labControls}>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.max(0, st - 1))} disabled={step === 0}>◂ back</button>
          <button type="button" className={s.btn} onClick={() => setStep(st => Math.min(4, st + 1))} disabled={step === 4}>next ▸</button>
          <button type="button" className={s.btn} onClick={() => setFlat(true)}>flatten instead</button>
          <span className={s.labStat}>step <span className={s.labStatValue}>{step} / 4</span></span>
        </div>
        <p className={s.labNote}>{STEP_CAPTIONS[step]}</p>
      </div>
    </div>
  )
}
