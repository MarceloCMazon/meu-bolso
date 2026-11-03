import { useState } from 'react'
import { explain } from '../lib/api'
import { invoiceDueDate } from '../lib/cards'
import { round2 } from '../lib/calc'
import { CATEGORIES_IN, CATEGORIES_OUT } from '../lib/constants'
import { addMonthsISO, brl, parseMoney, shortDate, todayISO, toInput } from '../lib/format'
import { ChoiceGrid, Field, Modal, MoneyField, Segmented } from './ui'

/** Identificador único para ligar as parcelas de uma mesma compra. */
function newGroupId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function TransactionForm({
  initial,
  defaultType = 'saida',
  cards = [],
  onSave,
  onSaveInstallments,
  onDelete,
  onClose,
}) {
  const editing = Boolean(initial)
  const isInstallment = Boolean(initial?.installment_group)
  const [type, setType] = useState(initial?.type || defaultType)
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [cardId, setCardId] = useState('')
  const [parcelado, setParcelado] = useState(false)
  const [count, setCount] = useState('12')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categories = type === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT
  // Parcelar só faz sentido para um gasto novo.
  const canSplit = !editing && type === 'saida'
  const splitting = canSplit && parcelado
  const card = canSplit ? cards.find((c) => c.id === cardId) : undefined
  const owner = editing && initial.card_id ? cards.find((c) => c.id === initial.card_id) : undefined

  const n = Math.floor(Number(count))
  const each = parseMoney(amount)
  const totalText = n >= 2 && each > 0 ? `${n} × ${brl(each)} = ${brl(round2(n * each))}` : '—'

  function changeType(next) {
    setType(next)
    const list = next === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT
    if (!list.some((c) => c.id === category)) setCategory('')
  }

  async function submit(e) {
    e.preventDefault()
    const value = parseMoney(amount)
    if (!(value > 0)) {
      return setError(splitting ? 'Digite o valor de cada parcela. Exemplo: 300' : 'Digite quanto foi. Exemplo: 45,90')
    }
    if (!category) return setError('Escolha uma categoria.')
    if (!date) return setError('Escolha a data.')
    if (splitting && !(n >= 2 && n <= 60)) {
      return setError('Digite em quantas parcelas foi dividido, de 2 a 60. Exemplo: 12')
    }
    setBusy(true)
    setError('')
    try {
      const note = description.trim() || null
      if (splitting) {
        const group = newGroupId()
        const rows = Array.from({ length: n }, (_, i) => ({
          type: 'saida',
          amount: value,
          category,
          description: note,
          date: card ? invoiceDueDate(date, card, i) : addMonthsISO(date, i),
          ...(card ? { card_id: card.id, purchase_date: addMonthsISO(date, i) } : {}),
          installment_group: group,
          installment_number: i + 1,
          installment_total: n,
        }))
        await onSaveInstallments(rows)
      } else {
        const extra = card ? { date: invoiceDueDate(date, card), card_id: card.id, purchase_date: date } : { date }
        await onSave({ type, amount: value, category, description: note, ...extra }, initial?.id)
      }
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  async function remove(scope) {
    setBusy(true)
    setError('')
    try {
      await onDelete(initial, scope)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  const isLastInstallment = isInstallment && initial.installment_number >= initial.installment_total

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

        {isInstallment && (
          <p className="muted">
            Esta é a <strong>parcela {initial.installment_number} de {initial.installment_total}</strong> de uma compra
            parcelada. O que você mudar aqui vale só para esta parcela.
          </p>
        )}

        {canSplit && (
          <label className="check">
            <input type="checkbox" checked={parcelado} onChange={(e) => setParcelado(e.target.checked)} />
            <span>Foi parcelado?</span>
          </label>
        )}

        {canSplit && cards.length > 0 && (
          <Field label="Como foi pago?">
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

        {owner && (
          <p className="muted">
            Gasto no cartão <strong>{owner.name}</strong>
            {initial.purchase_date ? `, comprado em ${shortDate(initial.purchase_date)}` : ''}. A data abaixo é o
            vencimento da fatura.
          </p>
        )}

        <MoneyField
          label={splitting ? 'Valor de cada parcela' : 'Quanto?'}
          value={amount}
          onChange={setAmount}
          autoFocus={!editing}
          big
        />

        {splitting && (
          <>
            <Field label="Em quantas parcelas?" hint="Uma parcela por mês, de 2 a 60.">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="12"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
            </Field>
            <p className="calc-box" aria-live="polite">
              <span>
                Total da compra: <strong>{totalText}</strong>
              </span>
            </p>
          </>
        )}

        <ChoiceGrid
          legend="Categoria"
          name="tx-category"
          items={categories}
          value={category}
          onChange={setCategory}
        />

        <Field label={splitting ? 'O que você comprou? (se quiser)' : 'Descrição (se quiser)'}>
          <input
            type="text"
            value={description}
            maxLength={80}
            placeholder={
              splitting ? 'Ex.: TV da sala' : type === 'entrada' ? 'Ex.: pagamento de outubro' : 'Ex.: compras da semana'
            }
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field
          label={card ? 'Data da compra' : splitting ? 'Data da primeira parcela' : 'Data'}
          hint={
            card && date
              ? `Cai na fatura que vence em ${shortDate(invoiceDueDate(date, card))}${splitting ? ', e as outras nas faturas seguintes.' : '.'}`
              : splitting
                ? 'As outras caem nos meses seguintes, no mesmo dia.'
                : undefined
          }
        >
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : splitting ? 'Salvar parcelas' : 'Salvar'}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>

        {editing && (
          <div className="danger-zone">
            {confirmDelete ? (
              isInstallment ? (
                <>
                  <p>Esta compra foi parcelada em {initial.installment_total} vezes. O que você quer excluir?</p>
                  <div className="form-actions">
                    <button type="button" className="btn danger" onClick={() => remove('one')} disabled={busy}>
                      Só esta parcela
                    </button>
                    {!isLastInstallment && (
                      <button type="button" className="btn danger" onClick={() => remove('from')} disabled={busy}>
                        Esta e as próximas
                      </button>
                    )}
                    <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                      Não, manter
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>Excluir este lançamento? Não dá para desfazer.</p>
                  <div className="form-actions">
                    <button type="button" className="btn danger" onClick={() => remove('one')} disabled={busy}>
                      Sim, excluir
                    </button>
                    <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                      Não, manter
                    </button>
                  </div>
                </>
              )
            ) : (
              <button type="button" className="btn link-danger" onClick={() => setConfirmDelete(true)}>
                {isInstallment ? 'Excluir parcela' : 'Excluir lançamento'}
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
