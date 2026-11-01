import { useState } from 'react'
import { explain } from '../lib/api'
import { ASSET_TYPES } from '../lib/constants'
import { parseMoney, todayISO, toInput } from '../lib/format'
import { ChoiceGrid, Field, Modal, MoneyField, Segmented } from './ui'

export default function AssetForm({ initial, onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  const [kind, setKind] = useState(initial?.kind || 'bem')
  const [category, setCategory] = useState(initial?.category || '')
  const [name, setName] = useState(initial?.name || '')
  const [value, setValue] = useState(initial ? toInput(initial.value) : '')
  const [since, setSince] = useState(initial?.since || todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isDebt = kind === 'divida'
  const types = ASSET_TYPES.filter((t) => t.kind === kind)

  function changeKind(next) {
    setKind(next)
    if (!ASSET_TYPES.some((t) => t.kind === next && t.id === category)) setCategory('')
  }

  async function submit(e) {
    e.preventDefault()
    const v = parseMoney(value)
    if (!category) return setError('Escolha o tipo.')
    if (!name.trim()) return setError('Dê um nome. Exemplo: Apartamento, Carro, Cartão do banco.')
    if (!(v >= 0)) return setError(isDebt ? 'Digite quanto falta pagar. Exemplo: 8000' : 'Digite quanto vale. Exemplo: 250000')
    if (!since) return setError('Escolha a data.')
    setBusy(true)
    setError('')
    try {
      await onSave({ kind, category, name: name.trim(), value: v, since }, initial?.id)
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
    <Modal title={editing ? 'Editar item' : 'Novo item'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Segmented
          legend="O que você quer anotar"
          name="asset-kind"
          value={kind}
          onChange={changeKind}
          options={[
            { value: 'bem', label: 'Algo que tenho', tone: 'pos' },
            { value: 'divida', label: 'Algo que devo', tone: 'neg' },
          ]}
        />

        <ChoiceGrid legend="Tipo" name="asset-type" items={types} value={category} onChange={setCategory} />

        <Field label="Nome">
          <input
            type="text"
            value={name}
            maxLength={60}
            placeholder={isDebt ? 'Ex.: Financiamento da casa' : 'Ex.: Apartamento'}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <MoneyField
          label={isDebt ? 'Quanto falta pagar?' : 'Quanto vale hoje?'}
          value={value}
          onChange={setValue}
          hint={isDebt ? 'Valor que ainda resta da dívida.' : 'Um valor aproximado já ajuda.'}
          big
        />

        <Field
          label={isDebt ? 'Desde quando você deve?' : 'Desde quando você tem?'}
          hint="Serve para o gráfico de crescimento. Se não lembrar, deixe a data de hoje."
        >
          <input type="date" value={since} max={todayISO()} onChange={(e) => setSince(e.target.value)} />
        </Field>

        {editing && (
          <p className="muted">Mudou o valor? É só trocar acima e salvar. O gráfico guarda o histórico.</p>
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
                <p>Excluir este item e o histórico dele? Não dá para desfazer.</p>
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
                Excluir item
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
