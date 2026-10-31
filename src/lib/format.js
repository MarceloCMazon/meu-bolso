const pad = (n) => String(n).padStart(2, '0')

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const usdFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' })

export const brl = (n) => brlFmt.format(Number(n) || 0)
export const usd = (n) => usdFmt.format(Number(n) || 0)

export const pct = (n) =>
  `${(Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

/** Converte "1.234,56", "1234,56" ou "1234.56" em número. Retorna NaN se inválido. */
export function parseMoney(text) {
  if (typeof text === 'number') return text
  let s = String(text ?? '').replace(/[R$US\s]/g, '')
  if (!s) return NaN
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/** Número -> texto para campos de edição ("1234,5") */
export const toInput = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const monthKey = (iso) => String(iso).slice(0, 7)
export const currentMonth = () => monthKey(todayISO())

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return cap(new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
}

export function monthName(key) {
  const [y, m] = key.split('-').map(Number)
  return cap(new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }))
}

export function monthShort(key) {
  const [y, m] = key.split('-').map(Number)
  return cap(new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))
}

export function lastDayOfMonth(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const week = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  const rest = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${cap(week)}, ${rest}`
}

export function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}
