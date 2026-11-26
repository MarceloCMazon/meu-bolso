import { categoryOf } from './constants'

export const MOVEMENT_TYPES = [
  { id: 'todos', label: 'Todas as movimentações' },
  { id: 'despesa', label: 'Despesas' },
  { id: 'receita', label: 'Receitas' },
  { id: 'fixo', label: 'Gastos fixos' },
  { id: 'investimento', label: 'Investimentos' },
]

/**
 * Junta, numa lista só, tudo o que mexeu no seu dinheiro: gastos, entradas, gastos fixos e
 * investimentos NOVOS (aportes e compras feitas depois que você começou a usar o app).
 * Investimentos que você já tinha antes NÃO entram aqui. Não cria nada no banco.
 * `sign`: -1 saiu dinheiro, +1 entrou dinheiro, 0 virou investimento (não é gasto).
 */
export function buildMovements({ transactions }) {
  return transactions.map((t) => {
    const aporte = t.category === 'investimento'
    const fixed = Boolean(t.recurring_id)
    const isIn = t.type === 'entrada'
    return {
      id: `t-${t.id}`,
      source: 'tx',
      type: aporte ? 'investimento' : fixed ? 'fixo' : isIn ? 'receita' : 'despesa',
      date: t.date,
      amount: Number(t.amount) || 0,
      sign: aporte ? 0 : isIn ? 1 : -1,
      search: `${t.description || ''} ${categoryOf(t.category).label}`,
      ref: t,
    }
  })
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
