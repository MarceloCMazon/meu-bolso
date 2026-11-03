import { memo, useMemo } from 'react'
import { Donut, NetWorthLine } from '../components/LazyCharts'
import PatrimonioNav from '../components/PatrimonioNav'
import { EmptyState, Icon } from '../components/ui'
import { lastMonths, netWorth, netWorthEvolution } from '../lib/calc'
import { assetTypeOf, CHART_COLORS } from '../lib/constants'
import { brl, currentMonth, monthShort, shortDate } from '../lib/format'

function AssetRow({ asset, onEdit }) {
  const t = assetTypeOf(asset.category)
  const debt = asset.kind === 'divida'
  return (
    <button type="button" className="row" onClick={() => onEdit(asset)}>
      <span className="row-icon" aria-hidden="true">
        {t.icon}
      </span>
      <span className="row-main">
        <span className="row-title">{asset.name}</span>
        <span className="row-sub">
          {t.label} · desde {shortDate(asset.since)}
        </span>
      </span>
      <span className={`row-amount ${debt ? 'neg' : ''}`}>
        {debt ? '− ' : ''}
        {brl(asset.value)}
      </span>
    </button>
  )
}

function Patrimonio({ data, rate, onAdd, onEdit }) {
  const rateValue = rate?.value
  const nw = useMemo(
    () => netWorth(data.investments, data.assets, rateValue),
    [data.investments, data.assets, rateValue],
  )
  const series = useMemo(
    () =>
      netWorthEvolution(
        data.investments,
        data.history,
        data.assets,
        data.assetHistory,
        lastMonths(currentMonth(), 6),
        rateValue,
      ).map((p) => ({ name: monthShort(p.key), Patrimônio: p.value })),
    [data.investments, data.history, data.assets, data.assetHistory, rateValue],
  )

  const goods = data.assets.filter((a) => a.kind === 'bem')
  const debts = data.assets.filter((a) => a.kind === 'divida')

  const slices = useMemo(() => {
    const list = []
    if (nw.investments > 0) list.push({ id: 'inv', label: 'Investimentos', icon: '📊', value: nw.investments })
    const byType = new Map()
    for (const a of goods) byType.set(a.category, (byType.get(a.category) || 0) + Number(a.value))
    for (const [id, value] of byType) {
      const t = assetTypeOf(id)
      if (value > 0) list.push({ id, label: t.label, icon: t.icon, value })
    }
    return list
      .sort((x, y) => y.value - x.value)
      .map((s, i) => ({ ...s, color: CHART_COLORS[i % CHART_COLORS.length] }))
  }, [nw.investments, goods])

  const first = series[0]?.Patrimônio ?? 0
  const last = series[series.length - 1]?.Patrimônio ?? 0
  const change = last - first
  const hasAnything = data.investments.length > 0 || data.assets.length > 0

  return (
    <>
      <PatrimonioNav current="patrimonio" />

      <header className="page-head">
        <h1>Patrimônio</h1>
        {data.patrimonioReady && (
          <button type="button" className="btn primary" onClick={onAdd}>
            <Icon name="plus" size={20} /> Novo
          </button>
        )}
      </header>

      {!hasAnything && data.patrimonioReady ? (
        <section className="card">
          <EmptyState
            title="Vamos descobrir quanto você tem?"
            action={
              <button type="button" className="btn primary" onClick={onAdd}>
                Anotar o primeiro item
              </button>
            }
          >
            Seu patrimônio é tudo que você tem (casa, carro, dinheiro guardado, investimentos) menos o que você
            deve.
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="hero hero-invest" aria-labelledby="nw-title">
            <h2 id="nw-title" className="hero-label">
              Seu patrimônio hoje
            </h2>
            <p className={`hero-number ${nw.total < 0 ? 'is-negative' : ''}`}>{brl(nw.total)}</p>
            <dl className="hero-stats">
              <div>
                <dt>Você tem</dt>
                <dd className="hero-in">{brl(nw.have)}</dd>
              </div>
              <div>
                <dt>Você deve</dt>
                <dd className="hero-out">{brl(nw.debts)}</dd>
              </div>
            </dl>
            {first !== 0 && (
              <p className="ruler-note">
                {change >= 0
                  ? `Em 6 meses seu patrimônio cresceu ${brl(change)}.`
                  : `Em 6 meses seu patrimônio diminuiu ${brl(Math.abs(change))}.`}
              </p>
            )}
          </section>

          <div className="grid-2">
            <section className="card" aria-labelledby="nw-evo">
              <h2 id="nw-evo">Crescimento nos últimos 6 meses</h2>
              <NetWorthLine
                data={series}
                ariaLabel={`Patrimônio mês a mês. ${series.map((s) => `${s.name}: ${brl(s.Patrimônio)}`).join('. ')}.`}
              />
              <p className="muted">
                O gráfico começa a ficar completo conforme você atualiza os valores ao longo dos meses.
              </p>
            </section>

            {slices.length > 0 && (
              <section className="card" aria-labelledby="nw-comp">
                <h2 id="nw-comp">De onde vem</h2>
                <div className="split">
                  <Donut
                    slices={slices}
                    centerLabel="Você tem"
                    centerValue={brl(nw.have)}
                    ariaLabel={`Composição do que você tem. ${slices.map((s) => `${s.label}: ${brl(s.value)}`).join('. ')}.`}
                  />
                  <ul className="legend-list">
                    {slices.map((s) => (
                      <li key={s.id}>
                        <i style={{ background: s.color }} aria-hidden="true" />
                        <span className="legend-name">
                          <span aria-hidden="true">{s.icon}</span> {s.label}
                        </span>
                        <span className="legend-value">{brl(s.value)}</span>
                        <span />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          {!data.patrimonioReady ? (
            <section className="card">
              <EmptyState title="Bens e dívidas ainda não foram ativados.">
                Quem cuida do site precisa rodar o arquivo supabase/migrations/003_patrimonio.sql no Supabase. Depois
                é só recarregar esta página. Enquanto isso, o patrimônio mostra só os investimentos.
              </EmptyState>
            </section>
          ) : (
            <>
              <section className="list-section" aria-labelledby="goods-title">
                <div className="list-head">
                  <h2 id="goods-title">O que você tem</h2>
                  <span className="muted">{brl(nw.goods)}</span>
                </div>
                {goods.length === 0 ? (
                  <div className="card">
                    <EmptyState title="Nenhum bem anotado.">
                      Toque em &quot;Novo&quot; para anotar casa, carro ou dinheiro guardado. Seus investimentos já
                      entram na conta sozinhos.
                    </EmptyState>
                  </div>
                ) : (
                  <div className="card rows">
                    {goods.map((a) => (
                      <AssetRow key={a.id} asset={a} onEdit={onEdit} />
                    ))}
                  </div>
                )}
              </section>

              <section className="list-section" aria-labelledby="debts-title">
                <div className="list-head">
                  <h2 id="debts-title">O que você deve</h2>
                  <span className="muted">{brl(nw.debts)}</span>
                </div>
                {debts.length === 0 ? (
                  <div className="card">
                    <EmptyState title="Nenhuma dívida anotada." />
                  </div>
                ) : (
                  <div className="card rows">
                    {debts.map((a) => (
                      <AssetRow key={a.id} asset={a} onEdit={onEdit} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </>
  )
}

export default memo(Patrimonio)
