'use client'
import { useState, useEffect, useLayoutEffect, useRef, ReactNode } from 'react'
import s from './finance.module.css'

/** Add thousands separators to a string of digits. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function countMatches(str: string, re: RegExp): number {
  let c = 0
  for (const ch of str) if (re.test(ch)) c++
  return c
}

/** Caret index just after the n-th character in `str` that matches `re`. */
function caretAfterN(str: string, n: number, re: RegExp): number {
  if (n <= 0) return 0
  let c = 0
  for (let i = 0; i < str.length; i++) {
    if (re.test(str[i])) {
      c++
      if (c === n) return i + 1
    }
  }
  return str.length
}

/**
 * Controlled numeric input that shows thousands separators (e.g. 100,000) for whole numbers,
 * lets the user clear/retype, keeps the caret stable while commas are inserted, and syncs on
 * external value changes. Percentages (allowDecimal) are shown without commas.
 */
export function NumberInput({
  value,
  onChange,
  className,
  allowDecimal = false,
  max,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  allowDecimal?: boolean
  max?: number
}) {
  const toDisplay = (v: number): string =>
    allowDecimal ? String(v) : groupDigits(String(Math.max(0, Math.floor(v))))

  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)
  const focused = useRef(false)
  const [text, setText] = useState(() => toDisplay(value))

  useEffect(() => {
    if (!focused.current) setText(toDisplay(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Restore the caret after a comma-reformat re-render.
  useLayoutEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current)
      caretRef.current = null
    }
  })

  return (
    <input
      ref={inputRef}
      className={className}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setText(toDisplay(value))
      }}
      onChange={(e) => {
        const raw = e.target.value
        const relevantRe = allowDecimal ? /[0-9.]/ : /[0-9]/
        const selStart = e.target.selectionStart ?? raw.length
        const relevantBefore = countMatches(raw.slice(0, selStart), relevantRe)

        let cleaned = raw.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '')
        if (!allowDecimal) cleaned = cleaned.replace(/^0+(?=\d)/, '')
        const display = allowDecimal ? cleaned : groupDigits(cleaned)

        setText(display)
        caretRef.current = caretAfterN(display, relevantBefore, relevantRe)

        const n = cleaned === '' ? 0 : Number(cleaned)
        if (!isNaN(n)) onChange(max != null ? Math.min(n, max) : n)
      }}
    />
  )
}

/** A small "?" badge that reveals an explanation on hover (native tooltip — never clips). */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className={s.infoTip} title={text} aria-label={text} role="img">
      ?
    </span>
  )
}

function Label({ text, info }: { text: ReactNode; info?: string }) {
  return (
    <span className={s.label}>
      {text}
      {info && <InfoTip text={info} />}
    </span>
  )
}

export function GroupBox({ title, info, children }: { title: string; info?: string; children: ReactNode }) {
  return (
    <fieldset className={s.groupBox}>
      <legend className={s.legend}>
        {title}
        {info && <InfoTip text={info} />}
      </legend>
      {children}
    </fieldset>
  )
}

export function MoneyField({
  label,
  value,
  onChange,
  hint,
  info,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  hint?: string
  info?: string
}) {
  return (
    <label className={s.row}>
      <Label text={<>{label}{hint && <span className={s.hint}> {hint}</span>}</>} info={info} />
      <span className={s.money}>
        <span className={s.moneySign}>$</span>
        <NumberInput value={value} onChange={onChange} className={`${s.field} ${s.moneyInput} ${s.w120}`} />
      </span>
    </label>
  )
}

export function PercentField({
  label,
  value,
  onChange,
  hint,
  info,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  hint?: string
  info?: string
}) {
  return (
    <label className={s.row}>
      <Label text={<>{label}{hint && <span className={s.hint}> {hint}</span>}</>} info={info} />
      <span className={s.money}>
        <NumberInput value={value} onChange={onChange} allowDecimal max={100} className={`${s.field} ${s.fieldRight} ${s.w70}`} />
        <span style={{ marginLeft: 4 }}>%</span>
      </span>
    </label>
  )
}

export function IntField({
  label,
  value,
  onChange,
  max,
  hint,
  info,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  max?: number
  hint?: string
  info?: string
}) {
  return (
    <label className={s.row}>
      <Label text={<>{label}{hint && <span className={s.hint}> {hint}</span>}</>} info={info} />
      <NumberInput value={value} onChange={onChange} max={max} className={`${s.field} ${s.fieldRight} ${s.w70}`} />
    </label>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  info,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  options: { value: string | number; label: string }[]
  info?: string
}) {
  return (
    <label className={s.row}>
      <Label text={label} info={info} />
      <select className={`${s.field} ${s.w120}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Stat({
  label,
  sub,
  value,
  info,
  negative,
  strong,
  gold,
}: {
  label: string
  sub?: string
  value: string
  info?: string
  negative?: boolean
  strong?: boolean
  gold?: boolean
}) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>
        {label}
        {sub && <span className={s.statSub}> {sub}</span>}
        {info && <InfoTip text={info} />}
      </span>
      <span
        className={[s.statValue, negative ? s.statNeg : '', strong ? s.total : '', gold ? s.gold : '']
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

export function Divider() {
  return <div className={s.divider} />
}
