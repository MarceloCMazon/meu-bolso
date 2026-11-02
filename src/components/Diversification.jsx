import { useMemo } from 'react'
import { diversification } from '../lib/calc'
import { brl } from '../lib/format'
import { EmptyState } from './ui'

const whole = (n) => `${Math.round(n)}%`

const BADGE = {
  ok: { cls: 'badge-ok', text: 'Na meta' },
  above: { cls: 'badge-warn', text: 'Acima da meta' },
  below: { cls: 'badge-going', text: 'Abaixo da meta' },
}

export default function Diversification({ investments, targets, targetsReady, rate, onEdit }) {
  const d = useMemo(
    () => diversification(investments, targets, rate?.value),
    [investments, targets, rate],
  )

  return (
    <section className="card" aria-labelledby="div-title">
      <h2 id="div-title">Diversificação da carteira</h2>

      {!targetsReady ? (
        <EmptyState title="A meta da carteira ainda não foi ativada.">
          Quem cuida do site precisa rodar o arquivo supabase/migrations/005_diversificacao.sql no Supabase. Depois é
          só recarregar esta página.
        </EmptyState>
      ) : !d.hasTargets ? (
        <EmptyState
          title="Quanto você quer ter em cada tipo de investimento?"
          action={
            <button type="button" className="btn primary" onClick={onEdit}>
              Definir minha meta
            </button>
          }
        >
          Diversificar é não deixar todo o dinheiro num lugar só. Escolha a divisão que você quer (por exemplo, metade
          em renda fixa) e o site mostra se você está no caminho e para onde ir nos próximos investimentos.
        </EmptyState>
      ) : (
        <>
          <ul className="div-list">
            {d.rows.map((r) => (
              <li key={r.id} className="div-row">
                <div className="div-head">
                  <span className="div-name">
                    <span aria-hidden="true">{r.icon}</span> {r.label}
                  </span>
                  <span className={`badge ${BADGE[r.state].cls}`}>{BADGE[r.state].text}</span>
                </div>
                <div
                  className="div-bar"
                  role="img"
                  aria-label={`${r.label}: hoje ${whole(r.pct)}, meta ${whole(r.target)}`}
                >
                  <div className="div-track">
                    <div className="div-fill" style={{ width: `${Math.min(r.pct, 100)}%`, background: r.color }} />
                  </div>
                  {r.target > 0 && <span className="div-mark" style={{ left: `${Math.min(r.target, 100)}%` }} />}
                </div>
                <p className="muted">
                  Hoje {whole(r.pct)} · Meta {whole(r.target)}
                </p>
              </li>
            ))}
          </ul>
          <p className="muted div-legend">A marca preta em cada barra é a sua meta.</p>

          {d.allOk ? (
            <p className="div-tip">Sua carteira está de acordo com a meta. Continue assim.</p>
          ) : d.suggest.length > 0 ? (
            <p className="div-tip">
              Para chegar mais perto da meta, os próximos investimentos podem ir para:{' '}
              {d.suggest.map((r, i) => (
                <span key={r.id}>
                  {i > 0 ? '; ' : ''}
                  <strong>{r.label}</strong> (faltam cerca de {brl(r.need)})
                </span>
              ))}
              .
            </p>
          ) : null}

          {d.top && (
            <p className="muted">
              Maior posição: <strong>{d.top.name}</strong>, com {whole(d.top.share)} da carteira.
              {d.top.share > 50 && ' Mais da metade do seu dinheiro está em um só investimento.'}
            </p>
          )}

          <button type="button" className="btn secondary small" onClick={onEdit}>
            Editar minha meta
          </button>
        </>
      )}
    </section>
  )
}
