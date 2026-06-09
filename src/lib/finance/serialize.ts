import type {
  PlannerState,
  FilingStatus,
  TaxYear,
  SavingsMode,
  IncomeStream,
  ExpenseLine,
} from './types'
import { SCHEMA_VERSION } from './types'
import { makeDefaultState } from './defaults'

export { SCHEMA_VERSION }

const TAX_YEARS: TaxYear[] = [2025, 2026]
const FILING_STATUSES: FilingStatus[] = ['single', 'mfj', 'mfs', 'hoh']
const SAVINGS_MODES: SavingsMode[] = ['expenses', 'rate', 'contribution']

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

class BinWriter {
  private bytes: number[] = []
  u8(n: number) {
    this.bytes.push(n & 0xff)
  }
  u16(n: number) {
    this.u8(n & 0xff)
    this.u8((n >>> 8) & 0xff)
  }
  /** LEB128 unsigned varint (handles values beyond 2^31). */
  varUint(n: number) {
    let v = Math.max(0, Math.floor(n))
    do {
      let b = v & 0x7f
      v = Math.floor(v / 128)
      if (v > 0) b |= 0x80
      this.u8(b)
    } while (v > 0)
  }
  /** One-decimal fixed point packed as u16 (e.g. 6.5% -> 65). */
  fixed1(n: number) {
    this.u16(Math.round(n * 10))
  }
  bool(b: boolean) {
    this.u8(b ? 1 : 0)
  }
  str(s: string) {
    const enc = textEncoder.encode(s)
    this.varUint(enc.length)
    for (const b of enc) this.u8(b)
  }
  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}

class BinReader {
  private offset = 0
  constructor(private data: Uint8Array) {}
  u8(): number {
    if (this.offset >= this.data.length) throw new Error('eof')
    return this.data[this.offset++]
  }
  u16(): number {
    const lo = this.u8()
    const hi = this.u8()
    return lo | (hi << 8)
  }
  varUint(): number {
    let result = 0
    let shift = 0
    let b: number
    do {
      b = this.u8()
      result += (b & 0x7f) * Math.pow(2, shift)
      shift += 7
      if (shift > 56) throw new Error('varint too long')
    } while (b & 0x80)
    return result
  }
  fixed1(): number {
    return this.u16() / 10
  }
  bool(): boolean {
    return this.u8() !== 0
  }
  str(): string {
    const len = this.varUint()
    const out = new Uint8Array(len)
    for (let i = 0; i < len; i++) out[i] = this.u8()
    return textDecoder.decode(out)
  }
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Encode the full PlannerState into a compact, self-contained, URL-safe restore code. */
export function encodeState(s: PlannerState): string {
  const w = new BinWriter()
  w.u8(SCHEMA_VERSION)
  w.u8(Math.max(0, TAX_YEARS.indexOf(s.taxYear)))
  w.u8(Math.max(0, FILING_STATUSES.indexOf(s.filingStatus)))
  const code = (s.state || 'CA').padEnd(2, 'X').slice(0, 2)
  w.u8(code.charCodeAt(0))
  w.u8(code.charCodeAt(1))
  w.u8(s.householdSize)
  w.u8(s.dependents)
  w.varUint(s.annualIncome)
  w.u8(s.otherIncome.length)
  for (const inc of s.otherIncome) {
    w.str(inc.label)
    w.varUint(inc.annual)
  }
  w.varUint(s.pretax401k)
  w.varUint(s.pretaxHsa)
  w.varUint(s.pretaxHealthInsurance)
  w.varUint(s.employerMatch)
  w.varUint(s.desiredMonthlyRetirementIncome)
  w.fixed1(s.expectedReturnPct)
  w.fixed1(s.inflationPct)
  w.fixed1(s.withdrawalRatePct)
  w.u8(s.currentAge)
  w.u8(s.retirementAge)
  w.varUint(s.currentSavings)
  w.u8(Math.max(0, SAVINGS_MODES.indexOf(s.savingsMode)))
  w.fixed1(s.savingsRatePct)
  w.varUint(s.directMonthlyContribution)
  w.bool(s.expensesEdited)
  if (s.expensesEdited) {
    w.u8(s.expenses.length)
    for (const e of s.expenses) {
      w.str(e.key)
      w.str(e.label)
      w.varUint(e.monthly)
    }
  }
  // v2 additions (appended for backward-compatible decode)
  w.u8(s.lifeExpectancy)
  w.fixed1(s.retirementReturnPct)
  return bytesToBase64Url(w.toBytes())
}

/** Decode a restore code back into a PlannerState. Returns null on any malformed/incompatible input. */
export function decodeState(code: string): PlannerState | null {
  try {
    const r = new BinReader(base64UrlToBytes(code))
    const version = r.u8()
    if (version < 1 || version > SCHEMA_VERSION) return null
    const base = makeDefaultState()
    const taxYear = TAX_YEARS[r.u8()] ?? base.taxYear
    const filingStatus = FILING_STATUSES[r.u8()] ?? base.filingStatus
    const state = String.fromCharCode(r.u8()) + String.fromCharCode(r.u8())
    const householdSize = r.u8()
    const dependents = r.u8()
    const annualIncome = r.varUint()
    const otherCount = r.u8()
    const otherIncome: IncomeStream[] = []
    for (let i = 0; i < otherCount; i++) {
      const label = r.str()
      const annual = r.varUint()
      otherIncome.push({ label, annual })
    }
    const pretax401k = r.varUint()
    const pretaxHsa = r.varUint()
    const pretaxHealthInsurance = r.varUint()
    const employerMatch = r.varUint()
    const desiredMonthlyRetirementIncome = r.varUint()
    const expectedReturnPct = r.fixed1()
    const inflationPct = r.fixed1()
    const withdrawalRatePct = r.fixed1()
    const currentAge = r.u8()
    const retirementAge = r.u8()
    const currentSavings = r.varUint()
    const savingsMode = SAVINGS_MODES[r.u8()] ?? base.savingsMode
    const savingsRatePct = r.fixed1()
    const directMonthlyContribution = r.varUint()
    const expensesEdited = r.bool()
    const expenses: ExpenseLine[] = []
    if (expensesEdited) {
      const count = r.u8()
      for (let i = 0; i < count; i++) {
        const key = r.str()
        const label = r.str()
        const monthly = r.varUint()
        expenses.push({ key, label, monthly })
      }
    }
    // v2 additions; older codes fall back to defaults.
    let lifeExpectancy = base.lifeExpectancy
    let retirementReturnPct = base.retirementReturnPct
    if (version >= 2) {
      lifeExpectancy = r.u8()
      retirementReturnPct = r.fixed1()
    }
    return {
      ...base,
      v: version,
      lifeExpectancy,
      retirementReturnPct,
      taxYear,
      filingStatus,
      state,
      householdSize,
      dependents,
      annualIncome,
      otherIncome,
      pretax401k,
      pretaxHsa,
      pretaxHealthInsurance,
      employerMatch,
      desiredMonthlyRetirementIncome,
      expectedReturnPct,
      inflationPct,
      withdrawalRatePct,
      currentAge,
      retirementAge,
      currentSavings,
      savingsMode,
      savingsRatePct,
      directMonthlyContribution,
      expenses,
      expensesEdited,
    }
  } catch {
    return null
  }
}
