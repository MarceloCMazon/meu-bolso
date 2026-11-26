import { consolidate, purchaseCost } from './purchases'
import { supabase } from './supabase'
import { currentMonth, shiftMonth, todayISO } from './format'
import { round2 } from './calc'

const check = (res) => {
  if (res.error) throw res.error
  return res
}

/** Transforma erros técnicos em mensagens que qualquer pessoa entende. */
export function explain(err) {
  const text = String(err?.message || err || '')
  if (err?.code === '42P01' || err?.code === 'PGRST205' || /does not exist|schema cache/i.test(text)) {
    return 'O banco de dados ainda não foi preparado. Rode o arquivo supabase/schema.sql no Supabase (veja o README).'
  }
  if (err?.code === 'PGRST204' || /could not find the '.*' column/i.test(text)) {
    return 'O banco ainda precisa de uma atualização para esta função. Rode o arquivo SQL mais novo da pasta supabase/migrations no Supabase.'
  }
  if (/failed to fetch|networkerror|load failed/i.test(text)) {
    return 'Sem conexão com a internet. Confira o Wi-Fi ou os dados do celular e tente de novo.'
  }
  if (/jwt|not authenticated|permission denied|row-level security/i.test(text)) {
    return 'Sua sessão expirou. Saia e entre de novo.'
  }
  return text || 'Algo deu errado. Tente de novo.'
}

/**
 * Cada "parte" é um grupo de dados que pode ser buscado sozinho.
 * Assim, depois de salvar um gasto só recarregamos os gastos, e não o site inteiro.
 * Metas, patrimônio e meta da carteira são opcionais: se a tabela ainda não existe,
 * o resto do site segue funcionando.
 */
const PAGE = 1000

/**
 * O banco entrega no máximo 1000 linhas por vez. Esta função pede em páginas até acabar,
 * para nada ficar de fora. `build(from, to)` monta a consulta de cada página.
 */
async function fetchPages(build) {
  const all = []
  for (let from = 0; ; from += PAGE) {
    const r = await build(from, from + PAGE - 1)
    if (r.error) return { error: r.error, data: null }
    all.push(...r.data)
    if (r.data.length < PAGE) return { error: null, data: all }
  }
}

const FETCHERS = {
  async transactions() {
    const since = `${shiftMonth(currentMonth(), -24)}-01`
    const r = await fetchPages((from, to) =>
      supabase
        .from('transactions')
        .select('*')
        .gte('date', since)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to),
    )
    if (r.error) throw r.error
    return { transactions: r.data }
  },
  async investments() {
    const [i, h] = await Promise.all([
      supabase.from('investments').select('*').order('created_at', { ascending: true }),
      supabase.from('investment_history').select('*').order('recorded_at', { ascending: true }).limit(5000),
    ])
    for (const r of [i, h]) if (r.error) throw r.error
    return { investments: i.data, history: h.data }
  },
  async purchases() {
    const r = await supabase.from('stock_purchases').select('*').order('date', { ascending: true }).limit(5000)
    return { purchases: r.error ? [] : r.data, purchasesReady: !r.error }
  },
  async goals() {
    const g = await supabase.from('goals').select('*').order('created_at', { ascending: true })
    return { goals: g.error ? [] : g.data, goalsReady: !g.error }
  },
  async assets() {
    const [a, ah] = await Promise.all([
      supabase.from('assets').select('*').order('created_at', { ascending: true }),
      supabase.from('asset_history').select('*').order('recorded_at', { ascending: true }).limit(5000),
    ])
    const ready = !a.error && !ah.error
    return {
      assets: ready ? a.data : [],
      assetHistory: ready ? ah.data : [],
      patrimonioReady: ready,
    }
  },
  async cards() {
    const [c, p] = await Promise.all([
      supabase.from('cards').select('*').order('created_at', { ascending: true }),
      supabase.from('invoice_payments').select('*').limit(1000),
    ])
    return {
      cards: c.error ? [] : c.data,
      cardsReady: !c.error,
      payments: p.error ? [] : p.data,
      paymentsReady: !p.error,
    }
  },
  async recurring() {
    const r = await supabase.from('recurring').select('*').order('created_at', { ascending: true })
    return { recurring: r.error ? [] : r.data, recurringReady: !r.error }
  },
  async targets() {
    const tg = await supabase.from('allocation_targets').select('*')
    return { targets: tg.error ? [] : tg.data, targetsReady: !tg.error }
  },
}

/** Tudo o que a pessoa tem no banco, sem limite de data, para o backup. Tabela que não existe é pulada. */
export async function exportEverything() {
  const tables = [
    'transactions',
    'investments',
    'investment_history',
    'stock_purchases',
    'assets',
    'asset_history',
    'goals',
    'allocation_targets',
    'cards',
    'invoice_payments',
    'recurring',
  ]
  const results = await Promise.all(
    tables.map((name) =>
      fetchPages((from, to) => supabase.from(name).select('*').order('id', { ascending: true }).range(from, to)),
    ),
  )
  const raw = {}
  tables.forEach((name, i) => {
    if (!results[i].error) raw[name] = results[i].data
    else if (name === 'transactions' || name === 'investments') throw results[i].error
  })
  return raw
}

/** Busca as partes pedidas ao mesmo tempo. Sem argumento, busca tudo. */
export async function loadParts(parts) {
  const names = parts && parts.length ? parts : Object.keys(FETCHERS)
  const results = await Promise.all(names.map((n) => FETCHERS[n]()))
  return Object.assign({}, ...results)
}

export const loadAll = () => loadParts()

/** map = { renda_fixa: 50, renda_variavel: 35, dolar: 10, outros: 5 } */
export async function saveTargets(userId, map) {
  const rows = Object.entries(map).map(([kind, percent]) => ({ user_id: userId, kind, percent }))
  check(await supabase.from('allocation_targets').upsert(rows, { onConflict: 'user_id,kind' }))
}

export async function clearTargets(userId) {
  check(await supabase.from('allocation_targets').delete().eq('user_id', userId))
}

async function setAssetToday(userId, assetId, value) {
  const today = todayISO()
  check(await supabase.from('asset_history').delete().eq('asset_id', assetId).eq('recorded_at', today))
  check(
    await supabase
      .from('asset_history')
      .insert({ user_id: userId, asset_id: assetId, value, recorded_at: today }),
  )
}

export async function saveAsset(userId, payload, id) {
  const today = todayISO()
  if (!id) {
    const { data } = check(
      await supabase
        .from('assets')
        .insert({ ...payload, user_id: userId })
        .select()
        .single(),
    )
    if (payload.since < today) {
      check(
        await supabase.from('asset_history').insert({
          user_id: userId,
          asset_id: data.id,
          value: payload.value,
          recorded_at: payload.since,
        }),
      )
    }
    await setAssetToday(userId, data.id, payload.value)
  } else {
    check(await supabase.from('assets').update(payload).eq('id', id))
    await setAssetToday(userId, id, payload.value)
  }
}

export async function deleteAsset(id) {
  check(await supabase.from('assets').delete().eq('id', id))
}

export async function saveGoal(userId, payload, id) {
  if (id) check(await supabase.from('goals').update(payload).eq('id', id))
  else check(await supabase.from('goals').insert({ ...payload, user_id: userId }))
}

export async function deleteGoal(id) {
  check(await supabase.from('goals').delete().eq('id', id))
}

export async function saveCard(userId, payload, id) {
  if (id) check(await supabase.from('cards').update(payload).eq('id', id))
  else check(await supabase.from('cards').insert({ ...payload, user_id: userId }))
}

/** Os gastos do cartão continuam; só deixam de apontar para ele. */
export async function deleteCard(id) {
  check(await supabase.from('cards').delete().eq('id', id))
}

/** Marca (ou desmarca) uma fatura como paga. */
export async function setInvoicePaid(userId, cardId, month, paid) {
  if (paid) {
    check(
      await supabase
        .from('invoice_payments')
        .upsert({ user_id: userId, card_id: cardId, month, paid_at: todayISO() }, { onConflict: 'card_id,month' }),
    )
  } else {
    check(await supabase.from('invoice_payments').delete().eq('card_id', cardId).eq('month', month))
  }
}

export async function saveRecurring(userId, payload, id) {
  if (id) {
    check(await supabase.from('recurring').update(payload).eq('id', id))
    // Valor, categoria e nome novos valem para os meses que ainda não chegaram.
    check(
      await supabase
        .from('transactions')
        .update({ amount: payload.amount, category: payload.category, description: payload.description })
        .eq('recurring_id', id)
        .gt('date', todayISO()),
    )
  } else {
    check(await supabase.from('recurring').insert({ ...payload, user_id: userId }))
  }
}

export async function deleteRecurring(id, alsoFuture) {
  if (alsoFuture) {
    check(await supabase.from('transactions').delete().eq('recurring_id', id).gt('date', todayISO()))
  }
  check(await supabase.from('recurring').delete().eq('id', id))
}

/** Exclui o gasto fixo: apaga este lançamento e os seguintes e para de lançar os próximos meses. */
export async function stopRecurringFrom(recurringId, fromDate) {
  check(await supabase.from('transactions').delete().eq('recurring_id', recurringId).gte('date', fromDate))
  check(await supabase.from('recurring').delete().eq('id', recurringId))
}

/** Cria os lançamentos dos gastos fixos. Se já existir o do mês, não duplica. */
export async function addRecurringRows(userId, rows, touched) {
  if (rows.length) {
    check(
      await supabase
        .from('transactions')
        .upsert(rows.map((r) => ({ ...r, user_id: userId })), {
          onConflict: 'recurring_id,recurring_month',
          ignoreDuplicates: true,
        }),
    )
  }
  for (const t of touched) {
    check(await supabase.from('recurring').update({ generated_until: t.generated_until }).eq('id', t.id))
  }
}

export async function addTransaction(userId, payload) {
  check(await supabase.from('transactions').insert({ ...payload, user_id: userId }))
}

/** Vários lançamentos de uma vez (compra parcelada). Uma só ida ao banco. */
export async function addTransactions(userId, rows) {
  check(await supabase.from('transactions').insert(rows.map((r) => ({ ...r, user_id: userId }))))
}

/** Exclui esta parcela e todas as seguintes da mesma compra. */
export async function deleteInstallmentsFrom(group, number) {
  check(
    await supabase
      .from('transactions')
      .delete()
      .eq('installment_group', group)
      .gte('installment_number', number),
  )
}

export async function updateTransaction(id, payload) {
  check(await supabase.from('transactions').update(payload).eq('id', id))
}

export async function deleteTransaction(id) {
  check(await supabase.from('transactions').delete().eq('id', id))
}

/** Grava (ou troca) o valor de hoje no histórico do investimento. */
export async function setTodayValue(userId, investmentId, value) {
  const today = todayISO()
  check(
    await supabase
      .from('investment_history')
      .delete()
      .eq('investment_id', investmentId)
      .eq('recorded_at', today),
  )
  check(
    await supabase.from('investment_history').insert({
      user_id: userId,
      investment_id: investmentId,
      value_brl: value,
      recorded_at: today,
    }),
  )
}

export async function saveInvestment(userId, payload, id, firstPurchase) {
  const today = todayISO()
  if (!id) {
    const res = await supabase
      .from('investments')
      .insert({ ...payload, user_id: userId })
      .select()
      .single()
    // Mesmo pedido repetido (clique duplo, internet que falhou e voltou): já foi gravado, não grava de novo.
    if (res.error?.code === '23505') return
    const { data } = check(res)
    const rows = []
    if (payload.date < today) {
      rows.push({
        user_id: userId,
        investment_id: data.id,
        value_brl: payload.invested_brl,
        recorded_at: payload.date,
      })
    }
    rows.push({
      user_id: userId,
      investment_id: data.id,
      value_brl: payload.current_value_brl,
      recorded_at: today,
    })
    check(await supabase.from('investment_history').insert(rows))
    if (firstPurchase) {
      check(
        await supabase
          .from('stock_purchases')
          .insert({ ...firstPurchase, user_id: userId, investment_id: data.id }),
      )
    }
  } else {
    check(await supabase.from('investments').update(payload).eq('id', id))
    await setTodayValue(userId, id, payload.current_value_brl)
  }
}

/**
 * Recalcula a ação a partir das compras: quantidade, total investido, preço médio e data da 1ª compra.
 * O preço de hoje de cada cota é mantido; só o total acompanha a nova quantidade.
 * `dateOfChange` (se vier) grava no gráfico quanto estava investido naquele dia.
 */
export async function syncStock(userId, investmentId, dateOfChange) {
  const [invRes, psRes] = await Promise.all([
    supabase.from('investments').select('*').eq('id', investmentId).single(),
    supabase.from('stock_purchases').select('*').eq('investment_id', investmentId),
  ])
  const inv = check(invRes).data
  const ps = check(psRes).data
  const c = consolidate(ps)
  if (!(c.qty > 0)) return
  const oldQty = Number(inv.quantity)
  const unitNow = oldQty > 0 ? Number(inv.current_value_brl) / oldQty : c.avg
  const value = round2(c.qty * unitNow)
  check(
    await supabase
      .from('investments')
      .update({
        quantity: c.qty,
        unit_price: c.avg,
        invested_brl: c.invested,
        current_value_brl: value,
        date: c.first,
      })
      .eq('id', investmentId),
  )
  await setTodayValue(userId, investmentId, value)

  const today = todayISO()
  if (dateOfChange && dateOfChange < today) {
    const upTo = ps.filter((p) => p.date <= dateOfChange).reduce((sum, p) => sum + purchaseCost(p), 0)
    check(
      await supabase.from('investment_history').delete().eq('investment_id', investmentId).eq('recorded_at', dateOfChange),
    )
    check(
      await supabase.from('investment_history').insert({
        user_id: userId,
        investment_id: investmentId,
        value_brl: round2(upTo),
        recorded_at: dateOfChange,
      }),
    )
  }
}

export async function savePurchase(userId, payload, id) {
  if (id) check(await supabase.from('stock_purchases').update(payload).eq('id', id))
  else {
    const res = await supabase.from('stock_purchases').insert({ ...payload, user_id: userId })
    // Pedido repetido: a compra já foi gravada (e o lançamento dela também). Só confere os totais.
    if (res.error && res.error.code !== '23505') throw res.error
  }
  await syncStock(userId, payload.investment_id, payload.date)
}

/** Desfaz um aporte: o valor sai do investimento, volta ao saldo e deixa de contar na meta. */
export async function undoContribution(txId) {
  check(await supabase.rpc('undo_contribution', { p_tx: txId, p_today: todayISO() }))
}

/**
 * Novo aporte em renda fixa, dólar ou outros. O banco faz tudo de uma vez (investimento, saldo,
 * histórico) e, com o mesmo `id`, nunca conta o mesmo aporte duas vezes.
 */
export async function addContribution({ id, investmentId, amount, date, usd }) {
  check(
    await supabase.rpc('invest_contribution', {
      p_id: id,
      p_investment: investmentId,
      p_amount: amount,
      p_date: date,
      p_today: todayISO(),
      p_usd: usd ?? null,
    }),
  )
}

export async function deletePurchase(userId, purchase) {
  check(await supabase.from('stock_purchases').delete().eq('id', purchase.id))
  await syncStock(userId, purchase.investment_id)
}

/** Atualiza o preço de hoje de cada cota: o valor total é cotas x preço. */
export async function updateStockPrice(userId, inv, price) {
  const value = round2(Number(inv.quantity) * price)
  check(await supabase.from('investments').update({ current_value_brl: value }).eq('id', inv.id))
  await setTodayValue(userId, inv.id, value)
}

export async function deleteInvestment(id) {
  check(await supabase.from('investments').delete().eq('id', id))
}

/** Registra o valor de hoje dos investimentos em dólar, usando a cotação do dia. */
export async function snapshotDollars(userId, investments, rate) {
  for (const inv of investments) {
    const value = round2(Number(inv.usd_amount) * rate)
    check(await supabase.from('investments').update({ current_value_brl: value }).eq('id', inv.id))
    await setTodayValue(userId, inv.id, value)
  }
}
