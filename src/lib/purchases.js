const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const round4 = (n) => Math.round((Number(n) + Number.EPSILON) * 10000) / 10000
const round6 = (n) => Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6

/** Quanto custou uma compra: cotas x preço + custos (corretagem, taxas). */
export function purchaseCost(p) {
  return round2(Number(p.quantity) * Number(p.unit_price) + Number(p.fees || 0))
}

/**
 * Junta todas as compras de um ativo: quantidade total, total investido (com custos),
 * preço médio ponderado e data da primeira compra.
 */
export function consolidate(purchases) {
  let qty = 0
  let invested = 0
  let fees = 0
  let first = null
  for (const p of purchases) {
    qty += Number(p.quantity)
    invested += Number(p.quantity) * Number(p.unit_price) + Number(p.fees || 0)
    fees += Number(p.fees || 0)
    if (!first || p.date < first) first = p.date
  }
  qty = round6(qty)
  invested = round2(invested)
  return { qty, invested, fees: round2(fees), avg: qty > 0 ? round4(invested / qty) : 0, first }
}

/** Compras de um ativo, da mais recente para a mais antiga. */
export function purchasesOf(purchases, investmentId) {
  return purchases
    .filter((p) => p.investment_id === investmentId)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)))
}

/** Total investido de cada ativo até uma data (para o gráfico de evolução). */
export function investedUntil(purchases, investmentId, endISO) {
  let sum = 0
  for (const p of purchases) if (p.investment_id === investmentId && p.date <= endISO) sum += purchaseCost(p)
  return round2(sum)
}
