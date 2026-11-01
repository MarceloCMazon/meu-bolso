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

/** Patrimônio = investimentos + bens − dívidas. */
export function netWorth(investments, assets, rate) {
  const inv = portfolio(investments, rate).value
  let goods = 0
  let debts = 0
  for (const a of assets) {
    if (a.kind === 'divida') debts += Number(a.value)
    else goods += Number(a.value)
  }
  return { investments: inv, goods, debts, have: inv + goods, total: inv + goods - debts }
}

function assetValueAt(asset, history, end) {
  if (asset.since > end) return null
  let best = null
  let first = null
  for (const h of history) {
    if (h.asset_id !== asset.id) continue
    if (!first || h.recorded_at < first.recorded_at) first = h
    if (h.recorded_at <= end && (!best || h.recorded_at >= best.recorded_at)) best = h
  }
  const h = best || first
  return h ? Number(h.value) : Number(asset.value)
}

/** Patrimônio no fim de cada mês (investimentos + bens − dívidas). */
export function netWorthEvolution(investments, history, assets, assetHistory, months, rate) {
  const evo = evolution(investments, history, months, rate)
  const today = todayISO()
  const cur = currentMonth()
  return months.map((key, idx) => {
    const end = key === cur ? today : lastDayOfMonth(key)
    let goods = 0
    let debts = 0
    for (const a of assets) {
      const v = key === cur ? Number(a.value) : assetValueAt(a, assetHistory, end)
      if (v === null) continue
      if (a.kind === 'divida') debts += v
      else goods += v
    }
    return { key, value: evo[idx].value + goods - debts }
  })
}

/** Simulador: juros compostos mensais com aporte no fim de cada mês. */
export function simulate({ initial, monthly, years, annualRate }) {
  const months = Math.round(years * 12)
  const i = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  let balance = initial
  let invested = initial
  const points = [{ month: 0, invested, balance }]
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + i) + monthly
    invested += monthly
    points.push({ month: m, invested, balance })
  }
  return { months, points, invested, balance, gain: balance - invested }
}

/** Poupança rendendo 0,5% ao mês (regra atual com Selic acima de 8,5%). */
export const POUPANCA_ANUAL = (Math.pow(1.005, 12) - 1) * 100

function daysBetween(fromISO, toISO) {
  const [y1, m1, d1] = fromISO.split('-').map(Number)
  const [y2, m2, d2] = toISO.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

/**
 * Situação de uma meta, já com textos prontos para mostrar.
 * - gasto_limite: soma das saídas entre start_date e end_date.
 * - investir_mensal: soma do que foi investido no mês atual.
 */
export function goalProgress(goal, transactions, investments, today = todayISO()) {
  const target = Number(goal.amount)

  if (goal.kind === 'investir_mensal') {
    const cur = monthKey(today)
    const done = investments
      .filter((i) => monthKey(i.date) === cur)
      .reduce((s, i) => s + Number(i.invested_brl), 0)
    const reached = done >= target
    return {
      kind: goal.kind,
      done,
      target,
      share: Math.min(done / target, 1),
      state: reached ? 'ok' : 'going',
      active: true,
      left: Math.max(target - done, 0),
      daysLeft: null,
    }
  }

  const start = goal.start_date
  const end = goal.end_date
  const spent = transactions
    .filter((t) => t.type === 'saida' && t.date >= start && t.date <= end)
    .reduce((s, t) => s + Number(t.amount), 0)
  const finished = today > end
  const notStarted = today < start
  const over = spent > target
  const share = Math.min(spent / target, 1)
  let state = 'ok'
  if (over) state = 'over'
  else if (spent / target >= 0.8) state = 'warn'
  return {
    kind: goal.kind,
    done: spent,
    target,
    share,
    state,
    active: !finished,
    finished,
    notStarted,
    left: Math.max(target - spent, 0),
    exceeded: Math.max(spent - target, 0),
    daysLeft: finished ? 0 : Math.max(daysBetween(notStarted ? start : today, end) + 1, 0),
  }
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
