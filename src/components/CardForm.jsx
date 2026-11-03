import { useState } from 'react'
import { explain } from '../lib/api'
import { Field, Modal } from './ui'

const toDay = (v) => v.replace(/\D/g, '').slice(0, 2)

export default function CardForm({ initial, onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [name, setName] = useState(initial?.name || '')
  const [closing, setClosing] = useState(initial ? String(initial.closing_day) : '')
  const [due, setDue] = useState(initial ? String(initial.due_day) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const c = Number(closing)
    const d = Number(due)
    if (!name.trim()) return setError('Dê um nome para o cartão. Exemplo: Nubank')
    if (!(c >= 1 && c <= 31)) return setError('Digite o dia em que a fatura fecha, de 1 a 31.')
    if (!(d >= 1 && d <= 31)) return setError('Digite o dia em que a fatura vence, de 1 a 31.')
    setBusy(true)
    setError('')
    try {
      await onSave({ name: name.trim(), closing_day: c, due_day: d }, initial?.id)
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
    <Modal title={editing ? 'Editar cartão' : 'Novo cartão'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Nome do cartão">
          <input
            type="text"
            value={name}
            maxLength={40}
            placeholder="Ex.: Nubank"
            autoFocus={!editing}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Dia em que a fatura fecha" hint="Está no aplicativo do banco. Compras depois desse dia vão para a fatura seguinte.">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 25"
            value={closing}
            onChange={(e) => setClosing(toDay(e.target.value))}
          />
        </Field>
        <Field label="Dia em que a fatura vence" hint="O dia de pagar a fatura.">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 5"
            value={due}
            onChange={(e) => setDue(toDay(e.target.value))}
          />
        </Field>
        {editing && (
          <p className="muted">
            Mudar os dias vale para os próximos gastos. Os que já foram lançados ficam como estão.
          </p>
        )}

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
                <p>Excluir este cartão? Os gastos dele continuam anotados, só deixam de aparecer como do cartão.</p>
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
                Excluir cartão
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
