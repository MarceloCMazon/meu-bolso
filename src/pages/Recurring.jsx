import { memo } from 'react'
import { EmptyState, Icon } from '../components/ui'
import { categoryOf } from '../lib/constants'
import { brl } from '../lib/format'

function Recurring({ data, onAdd, onEdit }) {
  const { recurring, recurringReady, cards } = data

  if (!recurringReady) {
    return (
      <>
        <header className="page-head">
          <h1>Gastos fixos</h1>
        </header>
        <div className="card">
          <EmptyState title="Falta uma atualização no banco de dados.">
            Rode o arquivo 008_fixos_e_fatura.sql no Supabase (SQL Editor) e recarregue a página.
          </EmptyState>
        </div>
      </>
    )
  }

  const out = recurring.filter((r) => r.type === 'saida')
  const total = out.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <>
      <header className="page-head">
        <h1>Gastos fixos</h1>
        <button type="button" className="btn primary" onClick={onAdd}>
          <Icon name="plus" size={20} /> Novo
        </button>
      </header>
      <p className="muted">O que se repete todo mês. O app lança sozinho, sem você precisar anotar de novo.</p>

      {recurring.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Nenhum gasto fixo ainda."
            action={
              <button type="button" className="btn primary" onClick={onAdd}>
                Cadastrar o primeiro
              </button>
            }
          >
            Aluguel, internet, mensalidades, assinaturas, salário. Cadastre uma vez e pronto.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="card" aria-label="Gastos fixos">
            <div className="rows">
              {recurring.map((r) => {
                const c = categoryOf(r.category)
                const card = r.card_id ? cards.find((k) => k.id === r.card_id) : undefined
                const isIn = r.type === 'entrada'
                return (
                  <button type="button" key={r.id} className="row" onClick={() => onEdit(r)}>
                    <span className="row-icon" aria-hidden="true">
                      {c.icon}
                    </span>
                    <span className="row-main">
                      <span className="row-title">{r.description}</span>
                      <span className="row-sub">
                        Todo dia {r.day}
                        {card ? ` · Cartão ${card.name}` : ''}
                      </span>
                    </span>
                    <span className={`row-amount ${isIn ? 'pos' : 'neg'}`}>
                      {isIn ? '+ ' : '− '}
                      {brl(r.amount)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
          {out.length > 0 && (
            <p className="muted">
              Seus gastos fixos somam <strong>{brl(total)}</strong> por mês.
            </p>
          )}
        </>
      )}
    </>
  )
}

export default memo(Recurring)
