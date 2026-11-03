import { monthKey, shiftMonth } from './format'

const pad = (n) => String(n).padStart(2, '0')
const daysIn = (y, m) => new Date(y, m, 0).getDate()

/** Dia `day` do mês "AAAA-MM"; se o mês é mais curto, usa o último dia. */
export function dayOfMonth(key, day) {
  const [y, m] = key.split('-').map(Number)
  return `${key}-${pad(Math.min(day, daysIn(y, m)))}`
}

/**
 * Mês (AAAA-MM) em que vence a fatura que recebe uma compra feita em `purchaseISO`.
 * Compra até o dia do fechamento entra na fatura que fecha neste mês; depois, na seguinte.
 * Se o vencimento é depois do fechamento, vence no mesmo mês; senão, no mês seguinte.
 */
export function firstInvoiceMonth(purchaseISO, card) {
  const day = Number(purchaseISO.slice(8, 10))
  const closeOffset = day <= card.closing_day ? 0 : 1
  const dueOffset = card.due_day > card.closing_day ? 0 : 1
  return shiftMonth(monthKey(purchaseISO), closeOffset + dueOffset)
}

/** Data de vencimento da fatura em que a compra cai. `i` = parcela (0 é a primeira). */
export function invoiceDueDate(purchaseISO, card, i = 0) {
  return dayOfMonth(shiftMonth(firstInvoiceMonth(purchaseISO, card), i), card.due_day)
}

/** Datas de fechamento e vencimento da fatura que vence no mês `dueMonth`. */
export function invoiceDates(dueMonth, card) {
  const closeMonth = card.due_day > card.closing_day ? dueMonth : shiftMonth(dueMonth, -1)
  return { closes: dayOfMonth(closeMonth, card.closing_day), due: dayOfMonth(dueMonth, card.due_day) }
}
