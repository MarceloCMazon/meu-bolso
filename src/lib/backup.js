import { assetTypeOf, categoryOf, kindOf } from './constants'
import { toInput } from './format'

const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
const money = (v) => (v === null || v === undefined || v === '' ? '' : toInput(Number(v).toFixed(2)))
const num = (v) => (v === null || v === undefined || v === '' ? '' : toInput(Number(v)))
const line = (cells) => cells.map(esc).join(';')

function section(title, header, rows) {
  if (rows.length === 0) return []
  return [esc(title), line(header), ...rows.map(line), '']
}

/** Planilha de backup: uma parte para cada assunto, tudo no mesmo arquivo. Abre no Excel. */
export function backupCsv(raw) {
  const t = (name) => raw[name] || []
  const invName = Object.fromEntries(t('investments').map((i) => [i.id, i.name]))
  const assetName = Object.fromEntries(t('assets').map((a) => [a.id, a.name]))
  const cardName = Object.fromEntries(t('cards').map((c) => [c.id, c.name]))

  const out = []
  out.push(
    ...section(
      'LANÇAMENTOS',
      ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Cartão', 'Comprado em', 'Parcela', 'Fixo'],
      t('transactions').map((x) => [
        x.date,
        x.type === 'entrada' ? 'Entrada' : 'Saída',
        categoryOf(x.category).label,
        x.description || '',
        money(x.amount),
        cardName[x.card_id] || '',
        x.purchase_date || '',
        x.installment_total ? `${x.installment_number}/${x.installment_total}` : '',
        x.recurring_id ? 'Sim' : '',
      ]),
    ),
    ...section(
      'INVESTIMENTOS',
      ['Tipo', 'Nome', 'Investido (R$)', 'Valor hoje (R$)', 'Dólares', 'Data da compra', 'Vencimento', 'Cotas', 'Preço pago por cota'],
      t('investments').map((i) => [
        kindOf(i.kind).label,
        i.name,
        money(i.invested_brl),
        money(i.current_value_brl),
        num(i.usd_amount),
        i.date,
        i.maturity_date || '',
        num(i.quantity),
        money(i.unit_price),
      ]),
    ),
    ...section(
      'HISTÓRICO DOS INVESTIMENTOS',
      ['Data', 'Investimento', 'Valor (R$)'],
      t('investment_history').map((h) => [h.recorded_at, invName[h.investment_id] || '', money(h.value_brl)]),
    ),
    ...section(
      'PATRIMÔNIO (BENS E DÍVIDAS)',
      ['Tipo', 'Categoria', 'Nome', 'Valor (R$)', 'Desde'],
      t('assets').map((a) => [a.kind === 'divida' ? 'Dívida' : 'Bem', assetTypeOf(a.category).label, a.name, money(a.value), a.since]),
    ),
    ...section(
      'HISTÓRICO DO PATRIMÔNIO',
      ['Data', 'Item', 'Valor (R$)'],
      t('asset_history').map((h) => [h.recorded_at, assetName[h.asset_id] || '', money(h.value)]),
    ),
    ...section(
      'METAS',
      ['Meta', 'Valor (R$)', 'Início', 'Fim'],
      t('goals').map((g) => [
        g.kind === 'gasto_limite' ? 'Limite de gastos' : 'Investir por mês',
        money(g.amount),
        g.start_date || '',
        g.end_date || '',
      ]),
    ),
    ...section(
      'META DA CARTEIRA (DIVERSIFICAÇÃO)',
      ['Tipo', 'Percentual'],
      t('allocation_targets').map((a) => [kindOf(a.kind).label, num(a.percent)]),
    ),
    ...section(
      'CARTÕES',
      ['Nome', 'Dia que fecha', 'Dia que vence'],
      t('cards').map((c) => [c.name, c.closing_day, c.due_day]),
    ),
    ...section(
      'FATURAS PAGAS',
      ['Cartão', 'Mês da fatura', 'Pago em'],
      t('invoice_payments').map((p) => [cardName[p.card_id] || '', p.month, p.paid_at]),
    ),
    ...section(
      'GASTOS FIXOS',
      ['Nome', 'Tipo', 'Categoria', 'Valor (R$)', 'Dia do mês', 'Cartão'],
      t('recurring').map((r) => [
        r.description,
        r.type === 'entrada' ? 'Entrada' : 'Saída',
        categoryOf(r.category).label,
        money(r.amount),
        r.day,
        cardName[r.card_id] || '',
      ]),
    ),
  )
  return `﻿${out.join('\r\n')}`
}

/** Cópia técnica: tudo como está no banco. Serve para recuperar os dados com ajuda. */
export function backupJson(raw) {
  return JSON.stringify({ app: 'Nosso Bolso', gerado_em: new Date().toISOString(), dados: raw }, null, 1)
}

export function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
