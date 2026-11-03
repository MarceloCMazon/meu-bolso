import { memo, useMemo } from 'react'
import { EmptyState, Icon, MonthNav, TxRow } from '../components/ui'
import { invoiceDates } from '../lib/cards'
import { brl, currentMonth, daysUntil, monthKey, monthLabel, shiftMonth, shortDate, todayISO } from '../lib/format'

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

function statusOf(dates, total, paid) {
  const today = todayISO()
  if (paid) return { text: `Paga em ${shortDate(paid.paid_at)}`, tone: 'paid' }
  if (total <= 0) return { text: 'Sem gastos nesta fatura', tone: '' }
  if (today <= dates.closes) return { text: `Aberta · fecha em ${shortDate(dates.closes)}`, tone: '' }
  if (today <= dates.due) {
    const d = daysUntil(dates.due)
    const when = d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : `vence em ${shortDate(dates.due)} (faltam ${d} dias)`
    return { text: `Fechada · ${when}`, tone: 'soon' }
  }
  return { text: `Venceu em ${shortDate(dates.due)}`, tone: '' }
}

function Cards({ data, month, setMonth, onAddCard, onEditCard, onEdit, onTogglePaid }) {
  const { cards, transactions, cardsReady, payments, paymentsReady } = data
  const paidMap = useMemo(() => new Map(payments.map((p) => [`${p.card_id}|${p.month}`, p])), [payments])
  const maxMonth = shiftMonth(currentMonth(), 24)

  // Uma passada só: total e lançamentos de cada cartão, por mês de vencimento.
  const byCard = useMemo(() => {
    const map = new Map()
    for (const t of transactions) {
      if (!t.card_id) continue
      const key = `${t.card_id}|${monthKey(t.date)}`
      const e = map.get(key) || { total: 0, items: [] }
      e.total += Number(t.amount)
      e.items.push(t)
      map.set(key, e)
    }
    return map
  }, [transactions])

  const upcoming = useMemo(() => {
    const out = []
    for (let i = 0; i < 6; i += 1) {
      const m = shiftMonth(currentMonth(), i)
      let total = 0
      let open = 0
      for (const c of cards) {
        const v = byCard.get(`${c.id}|${m}`)?.total || 0
        total += v
        if (!paidMap.has(`${c.id}|${m}`)) open += v
      }
      out.push({ month: m, total: round2(total), open: round2(open) })
    }
    return out
  }, [cards, byCard, paidMap])

  if (!cardsReady) {
    return (
      <>
        <header className="page-head">
          <h1>Cartões</h1>
        </header>
        <div className="card">
          <EmptyState title="Falta uma atualização no banco de dados.">
            Rode o arquivo 007_cartoes.sql no Supabase (SQL Editor) e recarregue a página.
          </EmptyState>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="page-head">
        <h1>Cartões</h1>
        <button type="button" className="btn primary" onClick={onAddCard}>
          <Icon name="plus" size={20} /> Novo cartão
        </button>
      </header>

      {cards.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nenhum cartão cadastrado."
            action={
              <button type="button" className="btn primary" onClick={onAddCard}>
                Cadastrar meu cartão
              </button>
            }
          >
            Cadastre o dia em que a fatura fecha e o dia em que vence. Depois, ao lançar um gasto, é só escolher o
            cartão e o app coloca na fatura certa.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="card" aria-labelledby="up-title">
            <h2 id="up-title">Faturas dos próximos meses</h2>
            <ul className="upcoming">
              {upcoming.map((u) => (
                <li key={u.month}>
                  <button type="button" className={`upcoming-item ${u.month === month ? 'on' : ''}`} onClick={() => setMonth(u.month)}>
                    <span>{monthLabel(u.month)}</span>
                    <strong>{brl(u.total)}</strong>
                    {u.open > 0 && u.open < u.total && <small className="muted">falta pagar {brl(u.open)}</small>}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <MonthNav month={month} onChange={setMonth} maxMonth={maxMonth} />
          <p className="muted">Faturas que vencem em {monthLabel(month)}.</p>

          {cards.map((card) => {
            const e = byCard.get(`${card.id}|${month}`)
            const total = round2(e?.total || 0)
            const dates = invoiceDates(month, card)
            const paid = paidMap.get(`${card.id}|${month}`)
            const st = statusOf(dates, total, paid)
            return (
              <section key={card.id} className="card invoice" aria-label={`Fatura ${card.name}`}>
                <div className="invoice-head">
                  <div>
                    <h2>{card.name}</h2>
                    <p className={`muted ${st.tone}`}>{st.text}</p>
                  </div>
                  <div className="invoice-total">
                    <strong>{brl(total)}</strong>
                    <small>vence {shortDate(dates.due)}</small>
                  </div>
                </div>
                {e && (
                  <div className="rows">
                    {[...e.items]
                      .sort((a, b) => String(b.purchase_date || b.date).localeCompare(String(a.purchase_date || a.date)))
                      .map((t) => (
                        <TxRow key={t.id} tx={t} onClick={onEdit} cardName={card.name} />
                      ))}
                  </div>
                )}
                <div className="invoice-actions">
                  {paymentsReady && (total > 0 || paid) && (
                    <button
                      type="button"
                      className={`btn small ${paid ? 'ghost' : 'primary'}`}
                      onClick={() => onTogglePaid(card.id, month, !paid)}
                    >
                      {paid ? 'Desmarcar pagamento' : 'Já paguei esta fatura'}
                    </button>
                  )}
                  <button type="button" className="btn ghost small" onClick={() => onEditCard(card)}>
                    Editar cartão
                  </button>
                </div>
              </section>
            )
          })}
        </>
      )}
    </>
  )
}

export default memo(Cards)
