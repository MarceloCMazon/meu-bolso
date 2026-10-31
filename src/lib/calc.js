import { categoryOf, CHART_COLORS, KINDS } from './constants'
import { currentMonth, lastDayOfMonth, monthKey, shiftMonth, todayISO } from './format'

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export function monthTotals(transactions, month) {
  let income = 0
  let spent = 0
  for (const t of transactions) {
    if (monthKey(t.date) !== month) continue
    if (t.type === 'entrada') income += Number(t.amount)
    else spent += Number(t.amount)
  }
  return { income, spent, balance: income - spent }
}

export function spendingByCategory(transactions, month) {
  const map = new Map()
  let total = 0
  for (const t of transactions) {
    if (t.type !== 'saida' || monthKey(t.date) !== month) continue
    const v = Number(t.amount)
    total += v
    map.set(t.category, (map.get(t.category) || 0) + v)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, value], i) => {
      const c = categoryOf(id)
      return {
        id,
        label: c.label,
        icon: c.icon,
        value,
        share: total ? (value / total) * 100 : 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }
    })
}

/** Lista de n meses terminando em endMonth (do mais antigo ao mais recente). */
export function lastMonths(endMonth, n) {
  return Array.from({ length: n }, (_, i) => shiftMonth(endMonth, i - (n - 1)))
}

/** Valor atual de um investimento em reais. Dólar usa a cotação de hoje quando houver. */
export function investValue(inv, rate) {
  if (inv.kind === 'dolar' && Number(inv.usd_amount) > 0 && rate) {
    return round2(Number(inv.usd_amount) * rate)
  }
  return Number(inv.current_value_brl)
}

export function portfolio(investments, rate) {
  let invested = 0
  let value = 0
  for (const i of investments) {
    invested += Number(i.invested_brl)
    value += investValue(i, rate)
  }
  const gain = value - invested
  return { invested, value, gain, gainPct: invested > 0 ? (gain / invested) * 100 : 0 }
}

export function allocation(investments, rate) {
  return KINDS.map((k) => {
    const items = investments.filter((i) => i.kind === k.id)
    const value = items.reduce((s, i) => s + investValue(i, rate), 0)
    const invested = items.reduce((s, i) => s + Number(i.invested_brl), 0)
    return { id: k.id, label: k.label, icon: k.icon, color: k.color, value, invested, items }
  }).filter((g) => g.items.length > 0)
}

/** Evolução mês a mês: quanto foi investido e quanto valia no fim de cada mês. */
export function evolution(investments, history, months, rate) {
  const today = todayISO()
  const cur = currentMonth()
  return months.map((key) => {
    const end = key === cur ? today : lastDayOfMonth(key)
    let invested = 0
    let value = 0
    for (const inv of investments) {
      if (inv.date > end) continue
      invested += Number(inv.invested_brl)
      if (key === cur) {
        value += investValue(inv, rate)
        continue
      }
      let best = null
      for (const h of history) {
        if (h.investment_id !== inv.id || h.recorded_at > end) continue
        if (!best || h.recorded_at >= best.recorded_at) best = h
      }
      value += best ? Number(best.value_brl) : Number(inv.invested_brl)
    }
    return { key, invested, value }
  })
}
