import { memo, useMemo } from 'react'
import GoalCard from '../components/GoalCard'
import { EmptyState, Icon } from '../components/ui'
import { goalProgress } from '../lib/calc'

function Goals({ data, onAdd, onEdit }) {
  const items = useMemo(
    () =>
      data.goals.map((g) => ({
        goal: g,
        progress: goalProgress(g, data.transactions, data.investments),
      })),
    [data.goals, data.transactions, data.investments],
  )
  const active = items.filter((i) => i.progress.active)
  const closed = items.filter((i) => !i.progress.active)

  return (
    <>
      <header className="page-head">
        <h1>Metas</h1>
        {data.goalsReady && (
          <button type="button" className="btn primary" onClick={onAdd}>
            <Icon name="plus" size={20} /> Nova meta
          </button>
        )}
      </header>

      {!data.goalsReady ? (
        <section className="card">
          <EmptyState title="As metas ainda não foram ativadas.">
            Quem cuida do site precisa rodar o arquivo supabase/migrations/002_metas.sql no Supabase. Depois é só
            recarregar esta página.
          </EmptyState>
        </section>
      ) : items.length === 0 ? (
        <section className="card">
          <EmptyState
            title="Você ainda não criou nenhuma meta."
            action={
              <button type="button" className="btn primary" onClick={onAdd}>
                Criar a primeira meta
              </button>
            }
          >
            Exemplos: gastar no máximo um valor até uma data, ou investir um valor todo mês.
          </EmptyState>
        </section>
      ) : (
        <>
          {active.length > 0 && (
            <section className="list-section" aria-labelledby="goals-active">
              <h2 id="goals-active">Em andamento</h2>
              {active.map(({ goal, progress }) => (
                <GoalCard key={goal.id} goal={goal} progress={progress} onClick={onEdit} />
              ))}
            </section>
          )}
          {closed.length > 0 && (
            <section className="list-section" aria-labelledby="goals-closed">
              <h2 id="goals-closed">Encerradas</h2>
              {closed.map(({ goal, progress }) => (
                <GoalCard key={goal.id} goal={goal} progress={progress} onClick={onEdit} />
              ))}
            </section>
          )}
        </>
      )}
    </>
  )
}

export default memo(Goals)
