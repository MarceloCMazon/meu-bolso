import { useId, useMemo, useState } from 'react'
import { GrowthChart } from '../components/charts'
import PatrimonioNav from '../components/PatrimonioNav'
import { Segmented, Stepper } from '../components/ui'
import { useCdi } from '../hooks'
import { POUPANCA_ANUAL, portfolio, round2, simulate } from '../lib/calc'
import { brl, parseMoney, toInput } from '../lib/format'

const years = (n) => `${n} ${n === 1 ? 'ano' : 'anos'}`
const rateText = (n) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% ao ano`

function pointLabel(month) {
  if (month === 0) return 'Hoje'
  if (month % 12 === 0) return years(month / 12)
  return `${month} meses`
}

export default function Simulator({ data, rate }) {
  const cdi = useCdi()
  const sliderId = useId()
  const customId = useId()

  const [initial, setInitial] = useState('1000')
  const [monthly, setMonthly] = useState('300')
  const [period, setPeriod] = useState(10)
  const [option, setOption] = useState('cdi100')
  const [custom, setCustom] = useState('10')

  const annualRate = useMemo(() => {
    if (option === 'poupanca') return POUPANCA_ANUAL
    if (option === 'cdi110') return cdi.value * 1.1
    if (option === 'custom') {
      const c = parseMoney(custom)
      return Number.isFinite(c) && c >= 0 && c < 100 ? c : 0
    }
    return cdi.value
  }, [option, cdi.value, custom])

  const startValue = Math.max(parseMoney(initial) || 0, 0)
  const monthlyValue = Math.max(parseMoney(monthly) || 0, 0)

  const sim = useMemo(
    () => simulate({ initial: startValue, monthly: monthlyValue, years: period, annualRate }),
    [startValue, monthlyValue, period, annualRate],
  )
  const poup = useMemo(
    () => simulate({ initial: startValue, monthly: monthlyValue, years: period, annualRate: POUPANCA_ANUAL }),
    [startValue, monthlyValue, period],
  )

  const chart = useMemo(() => {
    const step = period <= 2 ? 3 : period <= 10 ? 12 : 24
    return sim.points
      .filter((p) => p.month % step === 0 || p.month === sim.months)
      .map((p) => ({ name: pointLabel(p.month), 'Você guardou': p.invested, 'Com rendimento': p.balance }))
  }, [sim, period])

  const myInvested = portfolio(data.investments, rate?.value).value
  const myGoal = data.goals.find((g) => g.kind === 'investir_mensal')
  const diff = sim.balance - poup.balance

  return (
    <>
      <PatrimonioNav current="simulador" />

      <header className="page-head">
        <h1>Simulador</h1>
      </header>

      <section className="hero hero-invest" aria-labelledby="sim-title" aria-live="polite">
        <h2 id="sim-title" className="hero-label">
          Em {years(period)} você terá
        </h2>
        <p className="hero-number">{brl(sim.balance)}</p>
        <dl className="hero-stats">
          <div>
            <dt>Você guardou</dt>
            <dd>{brl(sim.invested)}</dd>
          </div>
          <div>
            <dt>Rendimento</dt>
            <dd className="hero-in">{brl(sim.gain)}</dd>
          </div>
        </dl>
        {option !== 'poupanca' && (
          <p className="ruler-note">
            {diff >= 0
              ? `Na poupança você teria ${brl(poup.balance)}. Aqui são ${brl(diff)} a mais.`
              : `Na poupança você teria ${brl(poup.balance)}. Aqui são ${brl(Math.abs(diff))} a menos.`}
          </p>
        )}
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="sim-inputs">
          <h2 id="sim-inputs">Ajuste os valores</h2>

          <Stepper label="Quanto você tem para começar?" value={initial} onChange={setInitial} step={500} />
          {myInvested > 0 && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setInitial(toInput(Math.round(myInvested)))}
            >
              Usar meus investimentos de hoje ({brl(myInvested)})
            </button>
          )}

          <Stepper label="Quanto vai guardar por mês?" value={monthly} onChange={setMonthly} step={50} />
          {myGoal && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setMonthly(toInput(Number(myGoal.amount)))}
            >
              Usar minha meta ({brl(myGoal.amount)} por mês)
            </button>
          )}

          <div className="field">
            <label className="field-label" htmlFor={sliderId}>
              Por quanto tempo? <strong className="slider-value">{years(period)}</strong>
            </label>
            <input
              id={sliderId}
              className="slider"
              type="range"
              min="1"
              max="40"
              step="1"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            />
            <div className="slider-scale" aria-hidden="true">
              <span>1 ano</span>
              <span>40 anos</span>
            </div>
          </div>

          <Segmented
            legend="Onde vai guardar"
            name="sim-option"
            value={option}
            onChange={setOption}
            options={[
              { value: 'poupanca', label: 'Poupança' },
              { value: 'cdi100', label: '100% CDI' },
              { value: 'cdi110', label: '110% CDI' },
              { value: 'custom', label: 'Outro' },
            ]}
          />

          {option === 'custom' ? (
            <div className="field">
              <label className="field-label" htmlFor={customId}>
                Rendimento por ano
              </label>
              <span className="money">
                <input
                  id={customId}
                  inputMode="decimal"
                  autoComplete="off"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ''))}
                />
                <span className="money-prefix" aria-hidden="true">
                  % ao ano
                </span>
              </span>
            </div>
          ) : (
            <p className="muted">
              Rendimento usado: <strong>{rateText(round2(annualRate))}</strong>
              {option === 'poupanca'
                ? ' (0,5% ao mês).'
                : cdi.live
                  ? ` (CDI de hoje: ${rateText(cdi.value)}).`
                  : ` (CDI de referência: ${rateText(cdi.value)}, pode estar desatualizado).`}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="sim-growth">
          <h2 id="sim-growth">Como o dinheiro cresce</h2>
          <GrowthChart
            data={chart}
            ariaLabel={`Crescimento do dinheiro em ${years(period)}. ${chart
              .map((c) => `${c.name}: guardou ${brl(c['Você guardou'])}, com rendimento ${brl(c['Com rendimento'])}`)
              .join('. ')}.`}
          />
          <p className="legend-inline">
            <span>
              <i style={{ background: '#7F95A0' }} aria-hidden="true" /> Você guardou
            </span>
            <span>
              <i style={{ background: '#1F8A84' }} aria-hidden="true" /> Com rendimento
            </span>
          </p>
        </section>
      </div>

      <p className="muted fineprint">
        Isto é uma estimativa feita com o rendimento escolhido, que muda com o tempo e não é garantido. Os valores
        são brutos, antes do Imposto de Renda e de taxas.
      </p>
    </>
  )
}
