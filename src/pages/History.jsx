import { memo, useMemo, useState } from 'react'
import { EmptyState, Field, Tile, TxRow } from '../components/ui'
import { addMonthsISO, brl, currentMonth, lastDayOfMonth, monthKey, monthLabel, shiftMonth, todayISO } from '../lib/format'
import { MOVEMENT_TYPES, buildMovements, filterMovements, sortMovements, summarize } from '../lib/history'

const PAGE = 60
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const PERIODS = [
  { id: 'tudo', label: 'Todo o período' },
  { id: 'mes', label: 'Este mês' },
  { id: 'passado', label: 'Mês passado' },
  { id: '90d', label: 'Últimos 3 meses' },
  { id: 'ano', label: 'Este ano' },
  { id: 'escolher', label: 'Escolher mês e ano…' },
]

const SORTS = [
  { id: 'recentes', label: 'Mais recentes primeiro' },
  { id: 'antigas', label: 'Mais antigas primeiro' },
  { id: 'maior', label: 'Maior valor primeiro' },
  { id: 'menor', label: 'Menor valor primeiro' },
]

function rangeOf(period, pickMonth, pickYear, today) {
  const cur = currentMonth()
  if (period === 'mes') return { from: `${cur}-01`, to: lastDayOfMonth(cur) }
  if (period === 'passado') {
    const k = shiftMonth(cur, -1)
    return { from: `${k}-01`, to: lastDayOfMonth(k) }
  }
  if (period === '90d') return { from: addMonthsISO(today, -3), to: today }
  if (period === 'ano') return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` }
  if (period === 'escolher') {
    if (pickMonth) {
      const k = `${pickYear}-${pickMonth}`
      return { from: `${k}-01`, to: lastDayOfMonth(k) }
    }
    return { from: `${pickYear}-01-01`, to: `${pickYear}-12-31` }
  }
  return {}
}

function History({ data, onEdit }) {
  const today = todayISO()
  const [type, setType] = useState('todos')
  const [period, setPeriod] = useState('tudo')
  const [pickYear, setPickYear] = useState(today.slice(0, 4))
  const [pickMonth, setPickMonth] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recentes')
  const [future, setFuture] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  const all = useMemo(
    () =>
buildMovements({ transactions: data.transactions }),
    [data.transactions],
  )
  const cardNames = useMemo(() => new Map(data.cards.map((c) => [c.id, c.name])), [data.cards])

  const years = useMemo(() => {
    const set = new Set([today.slice(0, 4)])
    for (const m of all) set.add(m.date.slice(0, 4))
    return [...set].sort().reverse()
  }, [all, today])

  const found = useMemo(() => {
    const range = rangeOf(period, pickMonth, pickYear, today)
    const list = filterMovements(all, { type, range, query, includeFuture: future || period === 'escolher', today })
    return sortMovements(list, sort)
  }, [all, type, period, pickMonth, pickYear, query, future, sort, today])

  const totals = useMemo(() => summarize(found), [found])
  const shown = found.slice(0, limit)
  const grouped = sort === 'recentes' || sort === 'antigas'

  // Cabeçalho de mês antes da primeira linha de cada mês (só quando está por data).
  const rows = []
  let lastMonth = ''
  for (const m of shown) {
    const k = monthKey(m.date)
    if (grouped && k !== lastMonth) {
      rows.push(
        <h3 key={`h-${k}`} className="hist-month">
          {monthLabel(k)}
        </h3>,
      )
      lastMonth = k
    }
    rows.push(
      <TxRow key={m.id} tx={m.ref} onClick={onEdit} cardName={m.ref.card_id ? cardNames.get(m.ref.card_id) : undefined} />,
    )
  }

  const reset = (setter) => (e) => {
    setter(e.target.value)
    setLimit(PAGE)
  }

  return (
    <>
      <header className="page-head">
        <h1>Histórico</h1>
        <a className="link" href="#/inicio">
          ← Voltar ao início
        </a>
      </header>

      <section className="card hist-filters" aria-label="Filtros">
        <Field label="Buscar pela descrição">
          <input
            type="search"
            value={query}
            placeholder="Ex.: mercado, salário, PETR4"
            onChange={reset(setQuery)}
          />
        </Field>
        <div className="hist-grid">
          <Field label="Tipo">
            <select value={type} onChange={reset(setType)}>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Período">
            <select value={period} onChange={reset(setPeriod)}>
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          {period === 'escolher' && (
            <>
              <Field label="Ano">
                <select value={pickYear} onChange={reset(setPickYear)}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mês">
                <select value={pickMonth} onChange={reset(setPickMonth)}>
                  <option value="">O ano todo</option>
                  {MONTHS.map((n, i) => (
                    <option key={n} value={String(i + 1).padStart(2, '0')}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="Ordem">
            <select value={sort} onChange={reset(setSort)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={future} onChange={(e) => setFuture(e.target.checked)} />
          <span>Mostrar também o que ainda vai acontecer (parcelas e gastos fixos futuros)</span>
        </label>
      </section>

      <div className="tiles">
        <Tile label="Entrou" value={brl(totals.income)} tone="pos" />
        <Tile label="Saiu" value={brl(totals.spent)} tone="neg" />
        <Tile label="Investiu" value={brl(totals.invested)} />
      </div>

      <section className="card" aria-label="Movimentações">
        <p className="muted" aria-live="polite">
          {found.length === 0
            ? 'Nenhuma movimentação encontrada.'
            : `${found.length} ${found.length === 1 ? 'movimentação' : 'movimentações'}`}
        </p>
        {found.length === 0 ? (
          <EmptyState title="Nada por aqui.">Tente mudar o tipo, o período ou a busca.</EmptyState>
        ) : (
          <div className="rows">{rows}</div>
        )}
        {found.length > shown.length && (
          <button type="button" className="btn secondary" onClick={() => setLimit((n) => n + PAGE)}>
            Mostrar mais ({found.length - shown.length} restantes)
          </button>
        )}
      </section>
    </>
  )
}

export default memo(History)
