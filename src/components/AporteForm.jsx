import { useState } from 'react'
import { explain } from '../lib/api'
import { round2 } from '../lib/calc'
import { brl, brlOpen, newId, parseMoney, todayISO } from '../lib/format'
import { Field, Modal, MoneyField } from './ui'

/** Novo aporte em um investimento que já existe (renda fixa, dólar ou outros). */
export default function AporteForm({ investment, rate, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [requestId] = useState(newId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isDollar = investment.kind === 'dolar'
  const value = parseMoney(amount)
  const usd = isDollar && rate?.value > 0 && value > 0 ? round2(value / rate.value) : null

  async function submit(e) {
    e.preventDefault()
    if (!(value > 0)) return setError('Digite quanto você investiu agora. Exemplo: 150')
    if (!date) return setError('Escolha a data.')
    if (isDollar && !usd) return setError('Não consegui buscar a cotação do dólar agora. Tente de novo em instantes.')
    setBusy(true)
    setError('')
    try {
      await onSave({ id: requestId, investmentId: investment.id, amount: round2(value), date, usd })
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  return (
    <Modal title="Novo aporte" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">
          <strong>{investment.name}</strong>
          <br />
          Este valor sai do seu saldo, aparece no histórico e conta na meta do mês.
        </p>
        <MoneyField label="Quanto você investiu agora?" value={amount} onChange={setAmount} autoFocus big />
        {isDollar && (
          <p className="field-hint">
            {usd
              ? `Com a cotação de hoje (${brlOpen(rate.value)}), são cerca de US$ ${String(usd).replace('.', ',')}.`
              : 'Buscando a cotação do dólar…'}
          </p>
        )}
        <Field label="Data do aporte">
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {value > 0 && (
          <p className="calc-box" aria-live="polite">
            <span>
              Aporte: <strong>{brl(value)}</strong>
            </span>
          </p>
        )}
        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar aporte'}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
