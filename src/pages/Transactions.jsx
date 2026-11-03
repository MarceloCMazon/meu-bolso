import { memo, useMemo, useState } from 'react'
import { Donut } from '../components/LazyCharts'
import { EmptyState, Icon, MonthNav, Segmented, Tile, TxRow } from '../components/ui'
import { monthTotals, spendingByCategory } from '../lib/calc'
import { brl, currentMonth, dayLabel, monthKey, pct, shiftMonth } from '../lib/format'

function Transactions({ data, month, setMonth, onAdd, onEdit }) {
  const [filter, setFilter] = useState('todos')
  // Meses que ainda não chegaram mostram o que já foi anotado (como as parcelas).
  const future = month > currentMonth()

  const cardNames = useMemo(() => Object.fromEntries((data.cards || []).map((c) => [c.id, c.name])), [data.cards])
  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month])
  const slices = useMemo(() => spendingByCategory(data.transactions, month), [data.transactions, month])

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of data.transactions) {
      if (monthKey(t.date) !== month) continue
      if (filter === 'entradas' && t.type !== 'entrada') continue
      if (filter === 'saidas' && t.type !== 'saida') continue
      if (!map.has(t.date)) map.set(t.date, [])
      map.get(t.date).push(t)
    }
    return [...map.entries()]
  }, [data.transactions, month, filter])

  return (
    <>
      <header className="page-head">
        <h1>Entradas e saídas</h1>
        <button type="button" className="btn primary" onClick={() => onAdd('saida')}>
          <Icon name="plus" size={20} /> Lançar
        </button>
      </header>

      {data.cardsReady && (
        <a className="btn secondary small card-link" href="#/cartoes">
          Meus cartões e faturas
        </a>
      )}

      <MonthNav month={month} onChange={setMonth} maxMonth={shiftMonth(currentMonth(), 24)} />

      {future ? (
        <>
          <div className="tiles tiles-one">
            <Tile label="Já comprometido neste mês" value={brl(totals.spent)} tone="neg" />
          </div>
          <p className="muted">
            Este mês ainda não chegou. Aqui aparecem as parcelas e os gastos que você já anotou para ele.
          </p>
        </>
      ) : (
        <div className="tiles">
          <Tile label="Entrou" value={brl(totals.income)} tone="pos" />
          <Tile label="Saiu" value={brl(totals.spent)} tone="neg" />
          <Tile
            label={totals.balance < 0 ? 'Faltou' : 'Sobrou'}
            value={brl(Math.abs(totals.balance))}
            tone={totals.balance < 0 ? 'neg' : ''}
          />
        </div>
      )}

      {slices.length > 0 && (
        <section className="card" aria-labelledby="cat-title">
          <h2 id="cat-title">Para onde foi o dinheiro</h2>
          <div className="split">
            <Donut
              slices={slices}
              centerLabel="Total gasto"
              centerValue={brl(totals.spent)}
              ariaLabel={`Gastos do mês por categoria. ${slices
                .map((s) => `${s.label}: ${brl(s.value)}`)
                .join('. ')}.`}
            />
            <ul className="legend-list">
              {slices.map((s) => (
                <li key={s.id}>
                  <i style={{ background: s.color }} aria-hidden="true" />
                  <span className="legend-name">
                    <span aria-hidden="true">{s.icon}</span> {s.label}
                  </span>
                  <span className="legend-value">{brl(s.value)}</span>
                  <span className="legend-pct">{pct(s.share)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="list-title" className="list-section">
        <div className="list-head">
          <h2 id="list-title">Lançamentos</h2>
          <Segmented
            legend="Mostrar"
            name="tx-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todos', label: 'Tudo' },
              { value: 'entradas', label: 'Entradas' },
              { value: 'saidas', label: 'Saídas' },
            ]}
          />
        </div>

        {groups.length === 0 ? (
          <div className="card">
            <EmptyState title="Nenhum lançamento aqui.">
              Toque em &quot;Lançar&quot; para anotar o primeiro gasto ou entrada do mês.
            </EmptyState>
          </div>
        ) : (
          groups.map(([date, items]) => (
            <div key={date} className="day">
              <h3 className="day-title">{dayLabel(date)}</h3>
              <div className="card rows">
                {items.map((t) => (
                  <TxRow key={t.id} tx={t} onClick={onEdit} cardName={cardNames[t.card_id]} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  )
}

export default memo(Transactions)
