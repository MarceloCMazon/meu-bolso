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
  if (/failed to fetch|networkerror|load failed/i.test(text)) {
    return 'Sem conexão com a internet. Confira o Wi-Fi ou os dados do celular e tente de novo.'
  }
  if (/jwt|not authenticated|permission denied|row-level security/i.test(text)) {
    return 'Sua sessão expirou. Saia e entre de novo.'
  }
  return text || 'Algo deu errado. Tente de novo.'
}

export async function loadAll() {
  const since = `${shiftMonth(currentMonth(), -24)}-01`
  const [t, i, h] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .gte('date', since)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('investments').select('*').order('created_at', { ascending: true }),
    supabase
      .from('investment_history')
      .select('*')
      .order('recorded_at', { ascending: true })
      .limit(5000),
  ])
  for (const r of [t, i, h]) if (r.error) throw r.error

  // Metas são opcionais: se a tabela ainda não existe, o resto do site segue funcionando.
  const g = await supabase.from('goals').select('*').order('created_at', { ascending: true })
  // Patrimônio também é opcional pelo mesmo motivo.
  const [a, ah] = await Promise.all([
    supabase.from('assets').select('*').order('created_at', { ascending: true }),
    supabase.from('asset_history').select('*').order('recorded_at', { ascending: true }).limit(5000),
  ])
  const patrimonioReady = !a.error && !ah.error
  return {
    assets: patrimonioReady ? a.data : [],
    assetHistory: patrimonioReady ? ah.data : [],
    patrimonioReady,
    transactions: t.data,
    investments: i.data,
    history: h.data,
    goals: g.error ? [] : g.data,
    goalsReady: !g.error,
  }
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

export async function addTransaction(userId, payload) {
  check(await supabase.from('transactions').insert({ ...payload, user_id: userId }))
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

export async function saveInvestment(userId, payload, id) {
  const today = todayISO()
  if (!id) {
    const { data } = check(
      await supabase
        .from('investments')
        .insert({ ...payload, user_id: userId })
        .select()
        .single(),
    )
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
  } else {
    check(await supabase.from('investments').update(payload).eq('id', id))
    await setTodayValue(userId, id, payload.current_value_brl)
  }
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
