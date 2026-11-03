import { useState } from 'react'
import { explain } from '../lib/api'
import { CATEGORIES_IN, CATEGORIES_OUT } from '../lib/constants'
import { parseMoney, toInput } from '../lib/format'
import { recurringStartMonth } from '../lib/extras'
import { ChoiceGrid, Field, Modal, MoneyField, Segmented } from './ui'

export default function RecurringForm({ initial, cards = [], onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [type, setType] = useState(initial?.type || 'saida')
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [day, setDay] = useState(initial ? String(initial.day) : '')
  const [cardId, setCardId] = useState(initial?.card_id || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categories = type === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT

  function changeType(next) {
    setType(next)
    const list = next === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT
    if (!list.some((c) => c.id === category)) setCategory('')
    if (next === 'entrada') setCardId('')
  }

  async function submit(e) {
    e.preventDefault()
    const value = parseMoney(amount)
    const d = Number(day)
    if (!description.trim()) return setError('Dê um nome. Exemplo: Aluguel')
    if (!(value > 0)) return setError('Digite o valor. Exemplo: 1200')
    if (!category) return setError('Escolha uma categoria.')
    if (!(d >= 1 && d <= 31)) return setError('Digite o dia do mês, de 1 a 31. Exemplo: 5')
    setBusy(true)
    setError('')
    try {
      const payload = {
        type,
        amount: value,
        category,
        description: description.trim(),
        day: d,
        card_id: type === 'saida' && cardId ? cardId : null,
      }
      if (!editing) payload.start_month = recurringStartMonth(d)
      await onSave(payload, initial?.id)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  async function remove(alsoFuture) {
    setBusy(true)
    setError('')
    try {
      await onDelete(initial.id, alsoFuture)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar gasto fixo' : 'Novo gasto fixo'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Segmented
          legend="Tipo"
          name="rec-type"
          value={type}
          onChange={changeType}
          options={[
            { value: 'saida', label: 'Gasto fixo', tone: 'neg' },
            { value: 'entrada', label: 'Entrada fixa', tone: 'pos' },
          ]}
        />
        <Field label="Nome">
          <input
            type="text"
            value={description}
            maxLength={80}
            placeholder={type === 'entrada' ? 'Ex.: Salário' : 'Ex.: Aluguel'}
            autoFocus={!editing}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <MoneyField label="Quanto, todo mês?" value={amount} onChange={setAmount} big />
        <ChoiceGrid legend="Categoria" name="rec-category" items={categories} value={category} onChange={setCategory} />
        <Field label="Em que dia do mês?" hint="Se o mês for mais curto, vale o último dia dele.">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 5"
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </Field>
        {type === 'saida' && cards.length > 0 && (
          <Field label="Como é pago?">
            <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Dinheiro, Pix ou débito</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  Cartão {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <p className="muted">
          {editing
            ? 'Mudar o valor, o nome ou a categoria vale para os próximos meses. O que já passou fica como está.'
            : 'O app lança sozinho todo mês, e você ainda vê os próximos meses em Gastos.'}
        </p>

        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>

        {editing && (
          <div className="danger-zone">
            {confirmDelete ? (
              <>
                <p>Parar este gasto fixo? O que você quer fazer com os meses que já foram lançados à frente?</p>
                <div className="form-actions">
                  <button type="button" className="btn danger" onClick={() => remove(true)} disabled={busy}>
                    Parar e apagar os próximos
                  </button>
                  <button type="button" className="btn danger" onClick={() => remove(false)} disabled={busy}>
                    Só parar
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                    Não, manter
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn link-danger" onClick={() => setConfirmDelete(true)}>
                Parar este gasto fixo
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
