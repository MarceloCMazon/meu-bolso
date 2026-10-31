import { useState } from 'react'
import { explain } from '../lib/api'
import { CATEGORIES_IN, CATEGORIES_OUT } from '../lib/constants'
import { parseMoney, todayISO, toInput } from '../lib/format'
import { ChoiceGrid, Field, Modal, MoneyField, Segmented } from './ui'

export default function TransactionForm({ initial, defaultType = 'saida', onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [type, setType] = useState(initial?.type || defaultType)
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categories = type === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT

  function changeType(next) {
    setType(next)
    const list = next === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT
    if (!list.some((c) => c.id === category)) setCategory('')
  }

  async function submit(e) {
    e.preventDefault()
    const value = parseMoney(amount)
    if (!(value > 0)) return setError('Digite quanto foi. Exemplo: 45,90')
    if (!category) return setError('Escolha uma categoria.')
    if (!date) return setError('Escolha a data.')
    setBusy(true)
    setError('')
    try {
      await onSave(
        { type, amount: value, category, description: description.trim() || null, date },
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
    <Modal title={editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Segmented
          legend="Tipo de lançamento"
          name="tx-type"
          value={type}
          onChange={changeType}
          options={[
            { value: 'saida', label: 'Saiu dinheiro', tone: 'neg' },
            { value: 'entrada', label: 'Entrou dinheiro', tone: 'pos' },
          ]}
        />

        <MoneyField label="Quanto?" value={amount} onChange={setAmount} autoFocus={!editing} big />

        <ChoiceGrid
          legend="Categoria"
          name="tx-category"
          items={categories}
          value={category}
          onChange={setCategory}
        />

        <Field label="Descrição (se quiser)">
          <input
            type="text"
            value={description}
            maxLength={80}
            placeholder={type === 'entrada' ? 'Ex.: pagamento de outubro' : 'Ex.: compras da semana'}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

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
                <p>Excluir este lançamento? Não dá para desfazer.</p>
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
                Excluir lançamento
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
