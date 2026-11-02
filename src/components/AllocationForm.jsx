import { useState } from 'react'
import { explain } from '../lib/api'
import { KINDS } from '../lib/constants'
import { Modal } from './ui'

// Exemplos para começar. Não são recomendação: cada pessoa ajusta como preferir.
const PRESETS = [
  { id: 'conservador', label: 'Conservador', values: { renda_fixa: 80, renda_variavel: 10, dolar: 5, outros: 5 } },
  { id: 'moderado', label: 'Moderado', values: { renda_fixa: 50, renda_variavel: 35, dolar: 10, outros: 5 } },
  { id: 'arrojado', label: 'Arrojado', values: { renda_fixa: 20, renda_variavel: 60, dolar: 15, outros: 5 } },
]

export default function AllocationForm({ targets, onSave, onClear, onClose }) {
  const has = targets.some((t) => Number(t.percent) > 0)
  const [vals, setVals] = useState(() => {
    const start = {}
    for (const k of KINDS) {
      const t = targets.find((x) => x.kind === k.id)
      start[k.id] = t ? String(Math.round(Number(t.percent))) : ''
    }
    return start
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const sum = KINDS.reduce((s, k) => s + (Number(vals[k.id]) || 0), 0)

  function applyPreset(values) {
    const next = {}
    for (const k of KINDS) next[k.id] = String(values[k.id] ?? 0)
    setVals(next)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (sum !== 100) {
      return setError(`As porcentagens precisam somar 100%. Agora somam ${sum}%.`)
    }
    const map = {}
    for (const k of KINDS) map[k.id] = Number(vals[k.id]) || 0
    setBusy(true)
    setError('')
    try {
      await onSave(map)
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    setError('')
    try {
      await onClear()
    } catch (err) {
      setError(explain(err))
      setBusy(false)
    }
  }

  const status =
    sum === 100 ? 'Tudo certo.' : sum < 100 ? `Faltam ${100 - sum}%.` : `Passou ${sum - 100}%.`

  return (
    <Modal title="Minha meta de diversificação" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">
          Escolha quantos % do seu dinheiro você quer ter em cada tipo de investimento. A soma precisa dar 100%.
        </p>

        <div>
          <p className="field-label">Começar por um exemplo</p>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="btn ghost small" onClick={() => applyPreset(p.values)}>
                {p.label}
              </button>
            ))}
          </div>
          <small className="field-hint">São só exemplos, não uma recomendação. Ajuste como preferir.</small>
        </div>

        {KINDS.map((k) => (
          <label key={k.id} className="field">
            <span className="field-label">
              <span aria-hidden="true">{k.icon}</span> {k.label}
            </span>
            <span className="money">
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={vals[k.id]}
                onChange={(e) => setVals({ ...vals, [k.id]: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              />
              <span className="money-prefix" aria-hidden="true">
                %
              </span>
            </span>
          </label>
        ))}

        <p className="calc-box" aria-live="polite">
          <span>
            Soma: <strong>{sum}%</strong> {status}
          </span>
        </p>

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

        {has && (
          <div className="danger-zone">
            {confirmClear ? (
              <>
                <p>Remover a meta? Seus investimentos não são apagados.</p>
                <div className="form-actions">
                  <button type="button" className="btn danger" onClick={clear} disabled={busy}>
                    Sim, remover
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setConfirmClear(false)}>
                    Não, manter
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn link-danger" onClick={() => setConfirmClear(true)}>
                Remover minha meta
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
