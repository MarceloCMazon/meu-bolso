import { useState } from 'react'
import { explain } from '../lib/api'
import { round2 } from '../lib/calc'
import { KINDS, kindOf } from '../lib/constants'
import { brl, parseMoney, todayISO, toInput } from '../lib/format'
import { ChoiceGrid, Field, Modal, MoneyField } from './ui'

export default function InvestmentForm({ initial, rate, onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [kind, setKind] = useState(initial?.kind || 'renda_fixa')
  const [name, setName] = useState(initial?.name || '')
  const [invested, setInvested] = useState(initial ? toInput(initial.invested_brl) : '')
  const [current, setCurrent] = useState(initial ? toInput(initial.current_value_brl) : '')
  const [usdAmount, setUsdAmount] = useState(initial?.usd_amount ? toInput(initial.usd_amount) : '')
  const [usdPrice, setUsdPrice] = useState(
    initial?.usd_amount > 0 ? toInput(round2(initial.invested_brl / initial.usd_amount)) : '',
  )
  const [date, setDate] = useState(initial?.date || todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isDollar = kind === 'dolar'
  const k = kindOf(kind)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Dê um nome para este investimento.')
    if (!date) return setError('Escolha a data da compra.')

    let payload
    if (isDollar) {
      const usd = parseMoney(usdAmount)
      const price = parseMoney(usdPrice)
      if (!(usd > 0)) return setError('Digite quantos dólares você tem. Exemplo: 500')
      if (!(price > 0)) return setError('Digite quanto pagou em reais por cada dólar. Exemplo: 5,40')
      payload = {
        kind,
        name: name.trim(),
        usd_amount: usd,
        invested_brl: round2(usd * price),
        current_value_brl: round2(usd * (rate?.value || price)),
        date,
      }
    } else {
      const inv = parseMoney(invested)
      if (!(inv >= 0)) return setError('Digite quanto você investiu. Exemplo: 1000')
      const now = current.trim() === '' ? inv : parseMoney(current)
      if (!(now >= 0)) return setError('Digite quanto vale hoje. Exemplo: 1050,30')
      payload = {
        kind,
        name: name.trim(),
        usd_amount: null,
        invested_brl: inv,
        current_value_brl: now,
        date,
      }
    }

    setBusy(true)
    setError('')
    try {
      await onSave(payload, initial?.id)
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
    <Modal title={editing ? 'Editar investimento' : 'Novo investimento'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <ChoiceGrid legend="Tipo" name="inv-kind" items={KINDS} value={kind} onChange={setKind} />
        <p className="field-hint">{k.help}</p>

        <Field label="Nome">
          <input
            type="text"
            value={name}
            maxLength={60}
            placeholder={k.example}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {isDollar ? (
          <>
            <MoneyField label="Quantos dólares você tem?" prefix="US$" value={usdAmount} onChange={setUsdAmount} />
            <MoneyField
              label="Quanto pagou por cada dólar?"
              value={usdPrice}
              onChange={setUsdPrice}
              hint={
                rate
                  ? `Cotação de hoje: ${brl(rate.value)}. O valor do seu dólar é atualizado sozinho.`
                  : 'Não consegui buscar a cotação de hoje. Ela será usada quando a internet voltar.'
              }
            />
            {rate && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setUsdPrice(toInput(round2(rate.value)))}
              >
                Usar a cotação de hoje
              </button>
            )}
          </>
        ) : (
          <>
            <MoneyField label="Quanto você investiu?" value={invested} onChange={setInvested} />
            <MoneyField
              label="Quanto vale hoje?"
              value={current}
              onChange={setCurrent}
              hint="Veja no app do banco ou da corretora. Se deixar vazio, usamos o valor investido."
            />
          </>
        )}

        <Field label="Data da compra">
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
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
                <p>Excluir este investimento e o histórico dele? Não dá para desfazer.</p>
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
                Excluir investimento
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
