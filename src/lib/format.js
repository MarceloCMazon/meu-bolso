const pad = (n) => String(n).padStart(2, '0')

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const usdFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' })

// Modo "esconder valores": quando ligado, todo dinheiro aparece como R$ ••••
let valuesHidden = false
export const setHidden = (v) => {
  valuesHidden = Boolean(v)
}
export const isHidden = () => valuesHidden

export const brl = (n) => (valuesHidden ? 'R$ ••••' : brlFmt.format(Number(n) || 0))
export const usd = (n) => (valuesHidden ? 'US$ ••••' : usdFmt.format(Number(n) || 0))
/** Para valores públicos (como a cotação do dólar), que não precisam ser escondidos. */
export const brlOpen = (n) => brlFmt.format(Number(n) || 0)

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

/** Quantidade de cotas: aceita "30" ou "0,5". O ponto é separador de milhar (1.000 = mil). */
export function parseQty(text) {
  const s = String(text ?? '').replace(/\./g, '').replace(',', '.').trim()
  const n = Number(s)
  return s !== '' && Number.isFinite(n) ? n : NaN
}

export const qtyFmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 6 })

/** Dias de hoje até a data (negativo se já passou). */
export function daysUntil(iso, from = todayISO()) {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = iso.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

/** Texto do vencimento e se está chegando (30 dias ou menos). */
export function maturityInfo(iso, from = todayISO()) {
  const days = daysUntil(iso, from)
  const date = shortDate(iso)
  if (days < 0) return { text: `Venceu em ${date}`, soon: true }
  if (days === 0) return { text: 'Vence hoje', soon: true }
  if (days === 1) return { text: `Vence amanhã (${date})`, soon: true }
  if (days <= 60) return { text: `Vence em ${date} (faltam ${days} dias)`, soon: days <= 30 }
  return { text: `Vence em ${date}`, soon: false }
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
