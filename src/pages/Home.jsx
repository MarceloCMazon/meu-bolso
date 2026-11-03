import { memo, useMemo } from 'react'
import { MonthlyBars } from '../components/LazyCharts'
import { IN_COLOR, OUT_COLOR } from '../lib/constants'
import GoalCard from '../components/GoalCard'
import { EmptyState, MonthNav, TxRow } from '../components/ui'
import { goalProgress, lastMonths, monthTotals, portfolio } from '../lib/calc'
import { brl, currentMonth, monthKey, monthName, monthShort, pct } from '../lib/format'

function Ruler({ income, spent }) {
  const share = income > 0 ? Math.min(spent / income, 1) : spent > 0 ? 1 : 0
  const over = spent > income
  let note = 'Nenhum lançamento neste mês ainda.'
  if (income > 0 && spent > 0) {
    note = over
      ? 'Você gastou mais do que entrou.'
      : `Você gastou ${Math.round((spent / income) * 100)}% do que entrou.`
  } else if (income > 0) {
    note = 'Ainda não saiu nada neste mês.'
  } else if (spent > 0) {
    note = 'Ainda não há entradas neste mês.'
  }
  return (
    <div className="ruler">
      <div className="ruler-bar" role="img" aria-label={note}>
        <div className={`ruler-fill ${over ? 'over' : ''}`} style={{ width: `${share * 100}%` }} />
      </div>
      <p className="ruler-note">{note}</p>
    </div>
  )
}

function Home({ data, month: monthChosen, setMonth, rate, onEdit, onAdd }) {
  // A tela inicial vai só até o mês atual (os meses futuros ficam em Gastos).
  const month = monthChosen > currentMonth() ? currentMonth() : monthChosen
  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month])
  const chart = useMemo(
    () =>
      lastMonths(month, 6).map((k) => {
        const t = monthTotals(data.transactions, k)
        return { name: monthShort(k), Entrou: t.income, Saiu: t.spent }
      }),
    [data.transactions, month],
  )
  const port = useMemo(() => portfolio(data.investments, rate?.value), [data.investments, rate])
  const recent = useMemo(
    () => data.transactions.filter((t) => monthKey(t.date) === month).slice(0, 5),
    [data.transactions, month],
  )

  const activeGoals = useMemo(
    () =>
      data.goals
        .map((g) => ({ goal: g, progress: goalProgress(g, data.transactions, data.investments) }))
        .filter((i) => i.progress.active),
    [data.goals, data.transactions, data.investments],
  )

  const negative = totals.balance < 0
  const name = monthName(month)

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <MonthNav month={month} onChange={setMonth} />
        <h1 id="hero-title" className="hero-label">
          {negative ? `Faltou em ${name}` : `Sobrou em ${name}`}
        </h1>
        <p className={`hero-number ${negative ? 'is-negative' : ''}`}>{brl(Math.abs(totals.balance))}</p>
        <Ruler income={totals.income} spent={totals.spent} />
        <dl className="hero-stats">
          <div>
            <dt>Entrou</dt>
            <dd className="hero-in">{brl(totals.income)}</dd>
          </div>
          <div>
            <dt>Saiu</dt>
            <dd className="hero-out">{brl(totals.spent)}</dd>
          </div>
        </dl>
        <button type="button" className="btn gold" onClick={() => onAdd('saida')}>
          Lançar um gasto
        </button>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="months-title">
          <h2 id="months-title">Últimos 6 meses</h2>
          <MonthlyBars
            data={chart}
            ariaLabel={`Gráfico de barras com o que entrou e saiu nos últimos seis meses. ${chart
              .map((c) => `${c.name}: entrou ${brl(c.Entrou)}, saiu ${brl(c.Saiu)}`)
              .join('. ')}.`}
          />
          <p className="legend-inline">
            <span>
              <i style={{ background: IN_COLOR }} aria-hidden="true" /> Entrou
            </span>
            <span>
              <i style={{ background: OUT_COLOR }} aria-hidden="true" /> Saiu
            </span>
          </p>
        </section>

        <div className="stack">
          {data.goalsReady && (
            <section className="card" aria-labelledby="goals-title">
              <h2 id="goals-title">Suas metas</h2>
              {activeGoals.length === 0 ? (
                <EmptyState
                  title="Você ainda não tem metas."
                  action={
                    <a className="btn secondary" href="#/metas">
                      Criar uma meta
                    </a>
                  }
                >
                  Defina um limite de gastos ou quanto quer investir por mês.
                </EmptyState>
              ) : (
                <>
                  {activeGoals.slice(0, 3).map(({ goal, progress }) => (
                    <GoalCard key={goal.id} goal={goal} progress={progress} compact />
                  ))}
                  <a className="link" href="#/metas">
                    Ver todas as metas
                  </a>
                </>
              )}
            </section>
          )}

          <section className="card" aria-labelledby="inv-title">
            <h2 id="inv-title">Investimentos</h2>
            {data.investments.length === 0 ? (
              <EmptyState
                title="Você ainda não cadastrou investimentos."
                action={
                  <a className="btn secondary" href="#/investimentos">
                    Cadastrar o primeiro
                  </a>
                }
              />
            ) : (
              <>
                <p className="big-number">{brl(port.value)}</p>
                <p className="muted">
                  Investido: {brl(port.invested)}
                  <br />
                  <span className={port.gain >= 0 ? 'pos' : 'neg'}>
                    {port.gain >= 0 ? 'Rendeu' : 'Perdeu'} {brl(Math.abs(port.gain))} ({pct(Math.abs(port.gainPct))})
                  </span>
                </p>
                <a className="link" href="#/investimentos">
                  Ver todos os investimentos
                </a>
              </>
            )}
          </section>

          <section className="card" aria-labelledby="recent-title">
            <h2 id="recent-title">Últimos lançamentos</h2>
            {recent.length === 0 ? (
              <EmptyState title="Nada lançado neste mês.">
                Toque em &quot;Lançar um gasto&quot; para começar.
              </EmptyState>
            ) : (
              <div className="rows">
                {recent.map((t) => (
                  <TxRow key={t.id} tx={t} onClick={onEdit} />
                ))}
              </div>
            )}
            <a className="link" href="#/gastos">
              Ver todos os lançamentos
            </a>
          </section>
        </div>
      </div>
    </>
  )
}

export default memo(Home)
