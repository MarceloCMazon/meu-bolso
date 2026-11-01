import { brl, shortDate } from '../lib/format'
import { GoalBar } from './ui'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const BADGES = {
  ok: 'Dentro do limite',
  warn: 'Quase no limite',
  over: 'Passou do limite',
  going: 'Em andamento',
  reached: 'Meta cumprida',
  closed: 'Encerrada',
}

function describe(goal, p) {
  if (goal.kind === 'investir_mensal') {
    return p.state === 'ok'
      ? {
          title: `Investir ${brl(p.target)} por mês`,
          sub: 'Neste mês',
          badge: 'reached',
          text: `Meta do mês cumprida! Você já investiu ${brl(p.done)}.`,
        }
      : {
          title: `Investir ${brl(p.target)} por mês`,
          sub: 'Neste mês',
          badge: 'going',
          text: `Você investiu ${brl(p.done)} neste mês. Faltam ${brl(p.left)}.`,
        }
  }

  const title = `Gastar no máximo ${brl(p.target)}`
  const sub = `De ${shortDate(goal.start_date)} até ${shortDate(goal.end_date)}`
  if (p.finished) {
    return p.state === 'over'
      ? { title, sub, badge: 'over', text: `Meta encerrada. Você gastou ${brl(p.exceeded)} a mais que o limite.` }
      : { title, sub, badge: 'reached', text: `Meta cumprida! Você gastou ${brl(p.done)} e ficou dentro do limite.` }
  }
  if (p.notStarted) {
    return { title, sub, badge: 'going', text: `Começa em ${shortDate(goal.start_date)}.` }
  }
  if (p.state === 'over') {
    return { title, sub, badge: 'over', text: `Você gastou ${brl(p.done)} e passou do limite em ${brl(p.exceeded)}.` }
  }
  return {
    title,
    sub,
    badge: p.state,
    text: `Você gastou ${brl(p.done)}. Ainda pode gastar ${brl(p.left)} nos próximos ${plural(p.daysLeft, 'dia', 'dias')}.`,
  }
}

export default function GoalCard({ goal, progress, onClick, compact }) {
  const d = describe(goal, progress)
  const body = (
    <>
      <span className="goal-top">
        <span className="goal-title">{d.title}</span>
        <span className={`badge badge-${d.badge}`}>{BADGES[d.badge]}</span>
      </span>
      <span className="goal-sub">{d.sub}</span>
      <GoalBar progress={progress} />
      <span className="goal-text">{d.text}</span>
    </>
  )
  if (compact) return <div className="goal goal-compact">{body}</div>
  return (
    <button type="button" className="goal" onClick={() => onClick(goal)}>
      {body}
    </button>
  )
}
