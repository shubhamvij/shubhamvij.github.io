'use client'
import s from './finance.module.css'
import type { ExpenseLine } from '@/lib/finance/types'
import { fmtMoney } from '@/lib/finance/format'
import { NumberInput } from './fields'

export default function ExpensesTable({
  lines,
  edited,
  total,
  onEdit,
  onReset,
}: {
  lines: ExpenseLine[]
  edited: boolean
  total: number
  onEdit: (lines: ExpenseLine[]) => void
  onReset: () => void
}) {
  const setLine = (i: number, monthly: number) =>
    onEdit(lines.map((l, idx) => (idx === i ? { ...l, monthly } : l)))

  return (
    <div>
      <div className={s.expHead}>
        <span className={s.hint}>{edited ? 'Your custom values' : 'Auto-estimated from state & household'}</span>
        {edited && (
          <button type="button" className={s.link} onClick={onReset}>
            Re-estimate
          </button>
        )}
      </div>
      {lines.map((l, i) => (
        <div key={l.key} className={s.expRow}>
          <span className={s.label}>{l.label}</span>
          <span className={s.money}>
            <span className={s.moneySign}>$</span>
            <NumberInput
              value={l.monthly}
              onChange={(n) => setLine(i, n)}
              className={`${s.field} ${s.moneyInput} ${s.w90}`}
            />
          </span>
        </div>
      ))}
      <div className={s.divider} />
      <div className={s.stat}>
        <span className={s.total}>Total / month</span>
        <span className={`${s.statValue} ${s.total}`}>{fmtMoney(total)}</span>
      </div>
    </div>
  )
}
