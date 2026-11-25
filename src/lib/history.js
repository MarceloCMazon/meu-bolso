import { categoryOf } from './constants'
import { purchaseCost } from './purchases'

export const MOVEMENT_TYPES = [
  { id: 'todos', label: 'Todas as movimentações' },
  { id: 'despesa', label: 'Despesas' },
  { id: 'receita', label: 'Receitas' },
  { id: 'fixo', label: 'Gastos fixos' },
  { id: 'investimento', label: 'Investimentos' },
]

/**
 * Junta, numa lista só, tudo o que o app já tem salvo: gastos, entradas, gastos fixos
 * e investimentos (compras de ações e demais aplicações). Não cria nada no banco.
 * `sign`: -1 saiu dinheiro, +1 entrou dinheiro, 0 virou investimento (não é gasto).
 */
export function buildMovements({ transactions, investments, purchases, purchasesReady }) {
  const list = []
  for (const t of transactions) {
    const fixed = Boolean(t.recurring_id)
    const isIn = t.type === 'entrada'
    list.push({
      id: `t-${t.id}`,
      source: 'tx',
      type: fixed ? 'fixo' : isIn ? 'receita' : 'despesa',
      date: t.date,
      amount: Number(t.amount) || 0,
      sign: isIn ? 1 : -1,
      search: `${t.description || ''} ${categoryOf(t.category).label}`,
      ref: t,
    })
  }

  const byId = new Map(investments.map((i) => [i.id, i]))
  const withPurchases = new Set()
  if (purchasesReady) {
    for (const p of purchases) {
      const inv = byId.get(p.investment_id)
      if (!inv) continue
      withPurchases.add(inv.id)
      list.push({
        id: `p-${p.id}`,
        source: 'purchase',
        type: 'investimento',
        date: p.date,
        amount: purchaseCost(p),
        sign: 0,
        search: `${inv.name || ''} ${inv.ticker || ''} compra`,
        ref: inv,
        purchase: p,
      })
    }
  }
  for (const inv of investments) {
    if (withPurchases.has(inv.id)) continue
    const amount = Number(inv.invested_brl) || 0
    if (!(amount > 0) || !inv.date) continue
    list.push({
      id: `i-${inv.id}`,
      source: 'investment',
      type: 'investimento',
      date: inv.date,
      amount,
      sign: 0,
      search: `${inv.name || ''} ${inv.ticker || ''}`,
      ref: inv,
    })
  }
  return list
}

const plain = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Aplica os filtros da tela. `range` = { from, to } em AAAA-MM-DD (qualquer um pode faltar). */
export function filterMovements(list, { type, range, query, includeFuture, today }) {
  const q = plain(query).trim()
  return list.filter((m) => {
    if (type !== 'todos' && m.type !== type) return false
    if (!includeFuture && m.date > today) return false
    if (range.from && m.date < range.from) return false
    if (range.to && m.date > range.to) return false
    if (q && !plain(m.search).includes(q)) return false
    return true
  })
}

export function sortMovements(list, sort) {
  const out = [...list]
  const byDate = (a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)
  if (sort === 'antigas') out.sort((a, b) => -byDate(a, b))
  else if (sort === 'maior') out.sort((a, b) => b.amount - a.amount || byDate(a, b))
  else if (sort === 'menor') out.sort((a, b) => a.amount - b.amount || byDate(a, b))
  else out.sort(byDate)
  return out
}

export function summarize(list) {
  let income = 0
  let spent = 0
  let invested = 0
  for (const m of list) {
    if (m.type === 'investimento') invested += m.amount
    else if (m.sign > 0) income += m.amount
    else spent += m.amount
  }
  return { income, spent, invested }
}
