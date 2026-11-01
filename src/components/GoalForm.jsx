import { useState } from 'react'
import { explain } from '../lib/api'
import { currentMonth, lastDayOfMonth, parseMoney, todayISO, toInput } from '../lib/format'
import { Field, Modal, MoneyField, Segmented } from './ui'

export default function GoalForm({ initial, onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [kind, setKind] = useState(initial?.kind || 'gasto_limite')
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [start, setStart] = useState(initial?.start_date || todayISO())
  const [end, setEnd] = useState(initial?.end_date || lastDayOfMonth(currentMonth()))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const spending = kind === 'gasto_limite'

  async function submit(e) {
    e.preventDefault()
    const value = parseMoney(amount)
    if (!(value > 0)) {
      return setError(
        spending ? 'Digite o limite que você quer gastar. Exemplo: 1500' : 'Digite quanto quer investir por mês. Exemplo: 500',
      )
    }
    if (spending) {
      if (!start || !end) return setError('Escolha as duas datas.')
      if (end < start) return setError('A data final precisa ser depois da data inicial.')
    }
    setBusy(true)
    setError('')
    try {
      await onSave(
        {
          kind,
          amount: value,
          start_date: spending ? start : null,
          end_date: spending ? end : null,
        },
        initial?.id,
      )
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await onDelete(initial.id)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar meta' : 'Nova meta'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Segmented
          legend="Tipo de meta"
          name="goal-kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'gasto_limite', label: 'Limite de gastos' },
            { value: 'investir_mensal', label: 'Investir todo mês' },
          ]}
        />

        <p className="muted">
          {spending
            ? 'Você escolhe um valor e um período. Somamos tudo que você lançar como gasto nesse período e avisamos se chegar perto do limite.'
            : 'Você escolhe quanto quer investir por mês. Contamos os investimentos que você cadastrar em cada mês.'}
        </p>

        <MoneyField
          label={spending ? 'Quanto posso gastar, no máximo?' : 'Quanto quero investir por mês?'}
          value={amount}
          onChange={setAmount}
          autoFocus={!editing}
          big
        />

        {spending && (
          <>
            <Field label="Começa em">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Termina em">
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </>
        )}

        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar meta'}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>

        {editing && (
          <div className="danger-zone">
            {confirmDelete ? (
              <>
                <p>Excluir esta meta? Seus lançamentos não são apagados.</p>
                <div className="form-actions">
                  <button type="button" className="btn danger" onClick={remove} disabled={busy}>
                    Sim, excluir
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                    Não, manter
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn link-danger" onClick={() => setConfirmDelete(true)}>
                Excluir meta
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
