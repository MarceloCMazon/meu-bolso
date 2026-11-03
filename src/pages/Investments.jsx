import { memo, useMemo } from 'react'
import { Donut, EvolutionLines } from '../components/LazyCharts'
import { LINE_INVESTED, LINE_VALUE } from '../lib/constants'
import Diversification from '../components/Diversification'
import PatrimonioNav from '../components/PatrimonioNav'
import { EmptyState, Icon } from '../components/ui'
import { allocation, evolution, investValue, lastMonths, portfolio } from '../lib/calc'
import { brl, brlOpen, currentMonth, maturityInfo, monthShort, pct, qtyFmt, shortDate, usd } from '../lib/format'

function Gain({ value, percent }) {
  const up = value >= 0
  return (
    <span className={up ? 'pos' : 'neg'}>
      {up ? 'Rendeu' : 'Perdeu'} {brl(Math.abs(value))} ({pct(Math.abs(percent))})
    </span>
  )
}

function Investments({ data, rate, onAdd, onEdit, onEditTargets }) {
  const rateValue = rate?.value
  const port = useMemo(() => portfolio(data.investments, rateValue), [data.investments, rateValue])
  const groups = useMemo(() => allocation(data.investments, rateValue), [data.investments, rateValue])
  const series = useMemo(
    () =>
      evolution(data.investments, data.history, lastMonths(currentMonth(), 6), rateValue).map((p) => ({
        name: monthShort(p.key),
        Investido: p.invested,
        'Valor hoje': p.value,
      })),
    [data.investments, data.history, rateValue],
  )

  return (
    <>
      <PatrimonioNav current="investimentos" />

      <header className="page-head">
        <h1>Investimentos</h1>
        <button type="button" className="btn primary" onClick={onAdd}>
          <Icon name="plus" size={20} /> Novo
        </button>
      </header>

      {rate && (
        <p className="rate-chip">
          Dólar hoje: <strong>{brlOpen(rate.value)}</strong>
          {!rate.live && <span> (última cotação salva)</span>}
        </p>
      )}

      {data.investments.length === 0 ? (
        <section className="card">
          <EmptyState
            title="Nenhum investimento cadastrado."
            action={
              <button type="button" className="btn primary" onClick={onAdd}>
                Cadastrar o primeiro
              </button>
            }
          >
            Anote renda fixa, ações, fundos ou dólar para acompanhar quanto cada um rende.
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="hero hero-invest" aria-labelledby="inv-hero">
            <h2 id="inv-hero" className="hero-label">
              Tudo que você tem investido
            </h2>
            <p className="hero-number">{brl(port.value)}</p>
            <dl className="hero-stats">
              <div>
                <dt>Você investiu</dt>
                <dd>{brl(port.invested)}</dd>
              </div>
              <div>
                <dt>{port.gain >= 0 ? 'Rendeu' : 'Perdeu'}</dt>
                <dd className={port.gain >= 0 ? 'hero-in' : 'hero-out'}>
                  {brl(Math.abs(port.gain))} ({pct(Math.abs(port.gainPct))})
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid-2">
            <section className="card" aria-labelledby="alloc-title">
              <h2 id="alloc-title">Onde está o dinheiro</h2>
              <div className="split">
                <Donut
                  slices={groups.map((g) => ({ id: g.id, label: g.label, value: g.value, color: g.color }))}
                  centerLabel="Total"
                  centerValue={brl(port.value)}
                  ariaLabel={`Divisão dos investimentos. ${groups
                    .map((g) => `${g.label}: ${brl(g.value)}`)
                    .join('. ')}.`}
                />
                <ul className="legend-list">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <i style={{ background: g.color }} aria-hidden="true" />
                      <span className="legend-name">
                        <span aria-hidden="true">{g.icon}</span> {g.label}
                      </span>
                      <span className="legend-value">{brl(g.value)}</span>
                      <span className="legend-pct">{pct(port.value ? (g.value / port.value) * 100 : 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="card" aria-labelledby="evo-title">
              <h2 id="evo-title">Evolução nos últimos 6 meses</h2>
              <EvolutionLines
                data={series}
                ariaLabel={`Evolução dos investimentos. ${series
                  .map((s) => `${s.name}: investido ${brl(s.Investido)}, valendo ${brl(s['Valor hoje'])}`)
                  .join('. ')}.`}
              />
              <p className="legend-inline">
                <span>
                  <i style={{ background: LINE_INVESTED }} aria-hidden="true" /> Investido
                </span>
                <span>
                  <i style={{ background: LINE_VALUE }} aria-hidden="true" /> Valor hoje
                </span>
              </p>
            </section>
          </div>

          <Diversification
            investments={data.investments}
            targets={data.targets}
            targetsReady={data.targetsReady}
            rate={rate}
            onEdit={onEditTargets}
          />

          {groups.map((g) => (
            <section key={g.id} className="list-section" aria-label={g.label}>
              <div className="list-head">
                <h2>
                  <span aria-hidden="true">{g.icon}</span> {g.label}
                </h2>
                <span className="muted">{brl(g.value)}</span>
              </div>
              <div className="card rows">
                {g.items.map((inv) => {
                  const now = investValue(inv, rateValue)
                  const gain = now - Number(inv.invested_brl)
                  const gainPct = inv.invested_brl > 0 ? (gain / Number(inv.invested_brl)) * 100 : 0
                  return (
                    <button type="button" key={inv.id} className="row row-invest" onClick={() => onEdit(inv)}>
                      <span className="row-main">
                        <span className="row-title">{inv.name}</span>
                        <span className="row-sub">
                          {inv.kind === 'dolar' && inv.usd_amount
                            ? `${usd(inv.usd_amount)} · `
                            : ''}
                          Investiu {brl(inv.invested_brl)} em {shortDate(inv.date)}
                        </span>
                        {Number(inv.quantity) > 0 && (
                          <span className="row-sub">
                            {qtyFmt(inv.quantity)} {Number(inv.quantity) === 1 ? 'cota' : 'cotas'} · pagou{' '}
                            {brl(inv.unit_price ?? Number(inv.invested_brl) / Number(inv.quantity))} cada · hoje{' '}
                            {brl(now / Number(inv.quantity))} cada
                          </span>
                        )}
                        {inv.maturity_date && (
                          <span className={`row-sub ${maturityInfo(inv.maturity_date).soon ? 'soon' : ''}`}>
                            {maturityInfo(inv.maturity_date).text}
                          </span>
                        )}
                        <span className="row-sub">
                          <Gain value={gain} percent={gainPct} />
                        </span>
                      </span>
                      <span className="row-amount">{brl(now)}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  )
}

export default memo(Investments)
