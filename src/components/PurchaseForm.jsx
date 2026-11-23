import { useState } from 'react'
import { explain } from '../lib/api'
import { round2 } from '../lib/calc'
import { brl, parseMoney, parseQty, todayISO, toInput } from '../lib/format'
import { consolidate } from '../lib/purchases'
import { Field, Modal, MoneyField } from './ui'

/** Adicionar (ou corrigir) uma compra de uma ação que já está na carteira. */
export default function PurchaseForm({ investment, purchases, initial, onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [date, setDate] = useState(initial?.date || todayISO())
  const [qty, setQty] = useState(initial ? toInput(Number(initial.quantity)) : '')
  const [price, setPrice] = useState(initial ? toInput(Number(initial.unit_price)) : '')
  const [fees, setFees] = useState(initial && Number(initial.fees) > 0 ? toInput(Number(initial.fees)) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const q = parseQty(qty)
  const p = parseMoney(price)
  const f = fees.trim() === '' ? 0 : parseMoney(fees)
  const valid = q > 0 && p > 0 && f >= 0
  const total = valid ? round2(q * p + f) : null

  // Como ficará o ativo depois desta compra.
  const others = purchases.filter((x) => x.id !== initial?.id)
  const after = valid
    ? consolidate([...others, { date, quantity: q, unit_price: p, fees: f }])
    : null
  const isOnly = editing && others.length === 0

  async function submit(e) {
    e.preventDefault()
    if (!date) return setError('Escolha a data da compra.')
    if (!(q > 0)) return setError('Digite quantas ações você comprou. Exemplo: 20')
    if (!(p > 0)) return setError('Digite o preço de cada ação. Exemplo: 22,50')
    if (!(f >= 0)) return setError('Confira o valor dos custos. Deixe vazio se não teve.')
    setBusy(true)
    setError('')
    try {
      await onSave({ investment_id: investment.id, date, quantity: q, unit_price: p, fees: f }, initial?.id)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await onDelete(initial)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar compra' : 'Adicionar compra'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">
          <strong>
            {investment.name}
            {investment.ticker ? ` (${investment.ticker})` : ''}
          </strong>
        </p>
        <Field label="Data da compra">
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Quantas ações você comprou?" hint="Se tiver fração, use vírgula. Exemplo: 0,5">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="20"
            autoFocus={!editing}
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d,]/g, ''))}
          />
        </Field>
        <MoneyField label="Preço de cada ação" value={price} onChange={setPrice} />
        <MoneyField
          label="Custos da compra (se tiver)"
          value={fees}
          onChange={setFees}
          hint="Corretagem e taxas. Se informar, entram no preço médio. Pode deixar vazio."
        />

        <p className="calc-box" aria-live="polite">
          <span>
            Esta compra: <strong>{total === null ? '—' : brl(total)}</strong>
          </span>
          {after && (
            <>
              <span>
                Depois dela: <strong>{String(after.qty).replace('.', ',')} ações</strong>
              </span>
              <span>
                Preço médio: <strong>{brl(after.avg)}</strong>
              </span>
            </>
          )}
        </p>

        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar compra'}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>

        {editing && (
          <div className="danger-zone">
            {isOnly ? (
              <p className="muted">
                Esta é a única compra desta ação. Para tirar a ação da carteira, exclua o investimento.
              </p>
            ) : confirmDelete ? (
              <>
                <p>Excluir esta compra? A quantidade e o preço médio serão recalculados.</p>
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
                Excluir esta compra
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
