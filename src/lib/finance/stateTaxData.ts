import type { StateTaxInfo, FilingStatus, Bracket } from './types'

// 2025 state individual income tax. Sources: Tax Foundation 2025 State Income Tax Rates &
// Brackets, state revenue departments. See plan Appendix D. Single-filer brackets are precise;
// MFJ uses doubled bands where the state doubles them, otherwise mirrors single (an estimator
// approximation). MFS/HoH mirror single unless a state specifies otherwise. Some states fold
// personal exemptions into the standard-deduction field as an approximation.

const b = (upTo: number | null, rate: number): Bracket => ({ upTo, rate })

/** Same bracket schedule for every filing status. */
function same(brackets: Bracket[]): Record<FilingStatus, Bracket[]> {
  return { single: brackets, mfj: brackets, mfs: brackets, hoh: brackets }
}

/** Single schedule, with MFJ thresholds doubled; MFS/HoH mirror single. */
function dbl(single: Bracket[]): Record<FilingStatus, Bracket[]> {
  const mfj = single.map((x) => ({ upTo: x.upTo === null ? null : x.upTo * 2, rate: x.rate }))
  return { single, mfj, mfs: single, hoh: single }
}

function std(s: number, m: number, h?: number): Record<FilingStatus, number> {
  return { single: s, mfj: m, mfs: s, hoh: h ?? s }
}

function none(code: string, name: string, note?: string): StateTaxInfo {
  return { code, name, kind: 'none', note }
}

function flat(code: string, name: string, flatRatePct: number, sd: Record<FilingStatus, number>, note?: string): StateTaxInfo {
  return { code, name, kind: 'flat', flatRatePct, standardDeduction: sd, note }
}

function prog(code: string, name: string, brackets: Record<FilingStatus, Bracket[]>, sd: Record<FilingStatus, number>, note?: string): StateTaxInfo {
  return { code, name, kind: 'progressive', brackets, standardDeduction: sd, note }
}

export const STATES: StateTaxInfo[] = [
  prog('AL', 'Alabama', dbl([b(500, 2), b(3000, 4), b(null, 5)]), std(4500, 11500)),
  none('AK', 'Alaska'),
  flat('AZ', 'Arizona', 2.5, std(15000, 30000)),
  prog('AR', 'Arkansas', same([b(5500, 0), b(10000, 2), b(14600, 3), b(25700, 3.4), b(null, 3.9)]), std(2410, 4820)),
  prog('CA', 'California', dbl([b(10756, 1), b(25499, 2), b(40245, 4), b(55866, 6), b(70606, 8), b(360659, 9.3), b(432787, 10.3), b(721314, 11.3), b(1000000, 12.3), b(null, 13.3)]), std(5540, 11080)),
  flat('CO', 'Colorado', 4.4, std(15000, 30000)),
  prog('CT', 'Connecticut', dbl([b(10000, 2), b(50000, 4.5), b(100000, 5.5), b(200000, 6), b(250000, 6.5), b(500000, 6.9), b(null, 6.99)]), std(15000, 24000)),
  prog('DE', 'Delaware', same([b(2000, 0), b(5000, 2.2), b(10000, 3.9), b(20000, 4.8), b(25000, 5.2), b(60000, 5.55), b(null, 6.6)]), std(3250, 6500)),
  none('FL', 'Florida'),
  flat('GA', 'Georgia', 5.39, std(12000, 24000)),
  prog('HI', 'Hawaii', dbl([b(9600, 1.4), b(14400, 3.2), b(19200, 5.5), b(24000, 6.4), b(36000, 6.8), b(48000, 7.2), b(125000, 7.6), b(175000, 7.9), b(225000, 8.25), b(275000, 9), b(325000, 10), b(null, 11)]), std(4400, 8800, 6424)),
  flat('ID', 'Idaho', 5.3, std(15000, 30000)),
  flat('IL', 'Illinois', 4.95, std(2850, 5700), 'Retirement income not taxed'),
  flat('IN', 'Indiana', 3.0, std(1000, 2000), 'County income taxes apply (not modeled)'),
  flat('IA', 'Iowa', 3.8, std(0, 0)),
  prog('KS', 'Kansas', dbl([b(23000, 5.2), b(null, 5.58)]), std(3605, 8240)),
  flat('KY', 'Kentucky', 4.0, std(3270, 6540)),
  flat('LA', 'Louisiana', 3.0, std(12500, 25000)),
  prog('ME', 'Maine', dbl([b(26800, 5.8), b(63450, 6.75), b(null, 7.15)]), std(15000, 30000)),
  prog('MD', 'Maryland', same([b(1000, 2), b(2000, 3), b(3000, 4), b(100000, 4.75), b(125000, 5), b(150000, 5.25), b(250000, 5.5), b(500000, 5.75), b(1000000, 6.25), b(null, 6.5)]), std(2700, 5450), 'County income tax 2.25–3.30% (not modeled)'),
  flat('MA', 'Massachusetts', 5.0, std(4400, 8800), '4% surtax over $1.08M (not modeled)'),
  flat('MI', 'Michigan', 4.25, std(5800, 11600), 'Some cities levy local income tax (not modeled)'),
  prog('MN', 'Minnesota', { single: [b(32570, 5.35), b(106990, 6.8), b(198630, 7.85), b(null, 9.85)], mfj: [b(47620, 5.35), b(189180, 6.8), b(330410, 7.85), b(null, 9.85)], mfs: [b(23810, 5.35), b(94590, 6.8), b(165205, 7.85), b(null, 9.85)], hoh: [b(40100, 5.35), b(161130, 6.8), b(264050, 7.85), b(null, 9.85)] }, std(14950, 29900)),
  prog('MS', 'Mississippi', same([b(10000, 0), b(null, 4.4)]), std(2300, 4600)),
  prog('MO', 'Missouri', same([b(1313, 0), b(2626, 2), b(3939, 2.5), b(5252, 3), b(6565, 3.5), b(7878, 4), b(9191, 4.5), b(null, 4.7)]), std(15000, 30000)),
  prog('MT', 'Montana', dbl([b(21100, 4.7), b(null, 5.9)]), std(15000, 30000)),
  prog('NE', 'Nebraska', dbl([b(4030, 2.46), b(24120, 3.51), b(38870, 5.01), b(null, 5.2)]), std(8600, 17200)),
  none('NV', 'Nevada'),
  none('NH', 'New Hampshire', 'Interest/dividends tax repealed 2025'),
  prog('NJ', 'New Jersey', same([b(20000, 1.4), b(35000, 1.75), b(40000, 3.5), b(75000, 5.525), b(500000, 6.37), b(1000000, 8.97), b(null, 10.75)]), std(0, 0)),
  prog('NM', 'New Mexico', same([b(5500, 1.5), b(11000, 3.2), b(16000, 4.3), b(210000, 4.7), b(315000, 4.9), b(null, 5.9)]), std(15000, 30000), 'Bracket thresholds approximate'),
  prog('NY', 'New York', same([b(8500, 4), b(11700, 4.5), b(13900, 5.25), b(80650, 5.5), b(215400, 6), b(1077550, 6.85), b(5000000, 9.65), b(25000000, 10.3), b(null, 10.9)]), std(8000, 16050), 'NYC & Yonkers local tax (not modeled)'),
  flat('NC', 'North Carolina', 4.25, std(12750, 25500)),
  prog('ND', 'North Dakota', { single: [b(47150, 0), b(244825, 1.95), b(null, 2.5)], mfj: [b(78775, 0), b(289975, 1.95), b(null, 2.5)], mfs: [b(47150, 0), b(244825, 1.95), b(null, 2.5)], hoh: [b(47150, 0), b(244825, 1.95), b(null, 2.5)] }, std(15000, 30000)),
  prog('OH', 'Ohio', same([b(26050, 0), b(100000, 2.75), b(null, 3.125)]), std(0, 0), 'Municipal income tax (not modeled)'),
  prog('OK', 'Oklahoma', dbl([b(1000, 0.25), b(2500, 0.75), b(3750, 1.75), b(4900, 2.75), b(7200, 3.75), b(null, 4.75)]), std(6350, 12700)),
  prog('OR', 'Oregon', dbl([b(4400, 4.75), b(11050, 6.75), b(125000, 8.75), b(null, 9.9)]), std(2800, 5600)),
  flat('PA', 'Pennsylvania', 3.07, std(0, 0), 'Local Earned Income Tax (not modeled)'),
  prog('RI', 'Rhode Island', same([b(79900, 3.75), b(181650, 4.75), b(null, 5.99)]), std(10900, 21800)),
  prog('SC', 'South Carolina', same([b(3560, 0), b(17830, 3), b(null, 6)]), std(15000, 30000)),
  none('SD', 'South Dakota'),
  none('TN', 'Tennessee'),
  none('TX', 'Texas'),
  flat('UT', 'Utah', 4.5, std(0, 0), 'Credit-based; approximated as flat'),
  prog('VT', 'Vermont', dbl([b(3825, 0), b(53225, 3.35), b(123525, 6.6), b(253525, 7.6), b(null, 8.75)]), std(14600, 29200)),
  prog('VA', 'Virginia', same([b(3000, 2), b(5000, 3), b(17000, 5), b(null, 5.75)]), std(8500, 17000)),
  none('WA', 'Washington', 'Wages untaxed; capital-gains tax only'),
  prog('WV', 'West Virginia', same([b(10000, 2.22), b(25000, 2.96), b(40000, 3.33), b(60000, 4.44), b(null, 4.82)]), std(2000, 4000)),
  prog('WI', 'Wisconsin', dbl([b(14679, 3.5), b(50479, 4.4), b(323289, 5.3), b(null, 7.65)]), std(13560, 25110)),
  none('WY', 'Wyoming'),
  prog('DC', 'Washington DC', same([b(10000, 4), b(40000, 6), b(60000, 6.5), b(250000, 8.5), b(500000, 9.25), b(1000000, 9.75), b(null, 10.75)]), std(15000, 30000)),
]

export const STATE_BY_CODE: Record<string, StateTaxInfo> = Object.fromEntries(
  STATES.map((s) => [s.code, s]),
)
