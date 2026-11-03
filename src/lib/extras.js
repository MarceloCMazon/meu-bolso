import { dayOfMonth, invoiceDueDate } from './cards'
import { monthKey, shiftMonth, todayISO } from './format'

/* ---------- Gastos fixos ---------- */

/** Primeiro mês em que o gasto fixo vale: se o dia deste mês já passou, começa no próximo. */
export function recurringStartMonth(day, today = todayISO()) {
  const m = monthKey(today)
  return day < Number(today.slice(8, 10)) ? shiftMonth(m, 1) : m
}

/**
 * Lançamentos que ainda faltam criar para os gastos fixos: do mês seguinte ao último já criado
 * até 3 meses à frente. `cards` serve para os fixos que são cobrados no cartão.
 */
export function recurringRows(rules, cards, today = todayISO(), ahead = 3) {
  const horizon = shiftMonth(monthKey(today), ahead)
  const rows = []
  const touched = []
  for (const r of rules) {
    const card = r.card_id ? cards.find((c) => c.id === r.card_id) : undefined
    // Cartão ainda não carregado: espera, para não lançar no mês errado.
    if (r.card_id && !card) continue
    let m = r.generated_until ? shiftMonth(r.generated_until, 1) : r.start_month
    if (m < r.start_month) m = r.start_month
    if (m > horizon) continue
    let last = null
    for (; m <= horizon; m = shiftMonth(m, 1)) {
      const purchase = dayOfMonth(m, r.day)
      rows.push({
        type: r.type,
        amount: Number(r.amount),
        category: r.category,
        description: r.description,
        date: card ? invoiceDueDate(purchase, card) : purchase,
        ...(card ? { card_id: card.id, purchase_date: purchase } : {}),
        recurring_id: r.id,
        recurring_month: m,
      })
      last = m
    }
    if (last) touched.push({ id: r.id, generated_until: last })
  }
  return { rows, touched }
}

/* ---------- Investimentos: quem mais rendeu ---------- */

/**
 * Rendimento de cada investimento (em % sobre o que foi investido), do maior para o menor.
 * Só entram os que têm valor investido. `valueOf(inv)` é o valor de hoje.
 */
export function rankInvestments(investments, valueOf) {
  return investments
    .filter((i) => Number(i.invested_brl) > 0)
    .map((inv) => {
      const gain = valueOf(inv) - Number(inv.invested_brl)
      return { inv, gain: Math.round((gain + Number.EPSILON) * 100) / 100, pct: (gain / Number(inv.invested_brl)) * 100 }
    })
    .sort((a, b) => b.pct - a.pct)
}
