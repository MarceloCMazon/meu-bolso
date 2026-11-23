import { useState } from 'react'
import { explain } from '../lib/api'
import { round2 } from '../lib/calc'
import { KINDS, kindOf } from '../lib/constants'
import { brl, brlOpen, parseMoney, parseQty, todayISO, toInput } from '../lib/format'
import { ChoiceGrid, Field, Modal, MoneyField } from './ui'

const round4 = (n) => Math.round((Number(n) + Number.EPSILON) * 10000) / 10000

export default function InvestmentForm({ initial, rate, purchasesReady, onSave, onDelete, onClose }) {
  const editing = Boolean(initial)
  // Registros lidos do banco já trazem as colunas novas (vazias nos antigos).
  const hasNewColumns = Boolean(initial && 'maturity_date' in initial)
  const hadQty = Number(initial?.quantity) > 0

  const [kind, setKind] = useState(initial?.kind || 'renda_fixa')
  const [name, setName] = useState(initial?.name || '')
  const [invested, setInvested] = useState(initial ? toInput(initial.invested_brl) : '')
  const [current, setCurrent] = useState(initial ? toInput(initial.current_value_brl) : '')
  const [usdAmount, setUsdAmount] = useState(initial?.usd_amount ? toInput(initial.usd_amount) : '')
  const [usdPrice, setUsdPrice] = useState(
    initial?.usd_amount > 0 ? toInput(round2(initial.invested_brl / initial.usd_amount)) : '',
  )
  const [maturity, setMaturity] = useState(initial?.maturity_date || '')
  const [byQty, setByQty] = useState(initial ? hadQty : true)
  const [qty, setQty] = useState(hadQty ? toInput(Number(initial.quantity)) : '')
  const [unitPrice, setUnitPrice] = useState(
    hadQty
      ? toInput(round4(initial.unit_price ?? Number(initial.invested_brl) / Number(initial.quantity)))
      : '',
  )
  const [unitNow, setUnitNow] = useState(
    hadQty ? toInput(round4(Number(initial.current_value_brl) / Number(initial.quantity))) : '',
  )
  const [date, setDate] = useState(initial?.date || todayISO())
  const [ticker, setTicker] = useState(initial?.ticker || '')
  const [fees, setFees] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isDollar = kind === 'dolar'
  const isFixed = kind === 'renda_fixa'
  const isVariable = kind === 'renda_variavel'
  const k = kindOf(kind)
  // Ação já cadastrada com compras: aqui só se muda o nome e o código. Quantidades ficam no histórico de compras.
  const locked = editing && isVariable && hadQty && Boolean(purchasesReady)
  const f = fees.trim() === '' ? 0 : parseMoney(fees)

  // Conta ao vivo: cotas x preço = total.
  const q = parseQty(qty)
  const p = parseMoney(unitPrice)
  const pn = unitNow.trim() === '' ? p : parseMoney(unitNow)
  const totalPaid = q > 0 && p > 0 ? round2(q * p + (f >= 0 ? f : 0)) : null
  const totalNow = q > 0 && pn >= 0 ? round2(q * pn) : null

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Dê um nome para este investimento.')
    if (locked) {
      setBusy(true)
      setError('')
      try {
        await onSave({ name: name.trim(), ticker: ticker.trim().toUpperCase() || null }, initial.id)
      } catch (err) {
        setError(explain(err))
        setBusy(false)
      }
      return
    }
    if (!date) return setError('Escolha a data da compra.')

    // Colunas novas só são enviadas quando há o que guardar (ou quando o registro já as tem).
    const details = hasNewColumns ? { maturity_date: null, quantity: null, unit_price: null } : {}

    let payload
    let firstPurchase
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
        ...details,
      }
    } else if (isVariable && byQty) {
      if (!(q > 0)) return setError('Digite quantas cotas ou ações você comprou. Exemplo: 30')
      if (!(p > 0)) return setError('Digite quanto pagou por cada cota. Exemplo: 10')
      if (!(pn >= 0)) return setError('Digite quanto vale cada cota hoje. Exemplo: 10,80')
      if (!(f >= 0)) return setError('Confira o valor dos custos. Deixe vazio se não teve.')
      const cost = round2(q * p + f)
      payload = {
        kind,
        name: name.trim(),
        usd_amount: null,
        invested_brl: cost,
        current_value_brl: round2(q * pn),
        date,
        ...details,
        quantity: q,
        unit_price: round4(cost / q),
      }
      if (purchasesReady) {
        payload.ticker = ticker.trim().toUpperCase() || null
        if (!editing) firstPurchase = { date, quantity: q, unit_price: p, fees: f }
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
        ...details,
      }
      if (isFixed && maturity) payload.maturity_date = maturity
    }

    setBusy(true)
    setError('')
    try {
      await onSave(payload, initial?.id, firstPurchase)
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
        {!locked && (
          <>
            <ChoiceGrid legend="Tipo" name="inv-kind" items={KINDS} value={kind} onChange={setKind} />
            <p className="field-hint">{k.help}</p>
          </>
        )}

        <Field label="Nome">
          <input
            type="text"
            value={name}
            maxLength={60}
            placeholder={k.example}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {isVariable && purchasesReady && (
          <Field label="Código da ação (ticker)" hint="Opcional. Exemplo: BBAS3">
            <input
              type="text"
              value={ticker}
              maxLength={12}
              autoComplete="off"
              placeholder="BBAS3"
              onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, ''))}
            />
          </Field>
        )}

        {locked && (
          <p className="muted">
            Para mudar quantidades, preços ou datas, use o histórico de compras desta ação: toque na compra para corrigir
            ou em "Adicionar compra".
          </p>
        )}

        {isDollar && (
          <>
            <MoneyField label="Quantos dólares você tem?" prefix="US$" value={usdAmount} onChange={setUsdAmount} />
            <MoneyField
              label="Quanto pagou por cada dólar?"
              value={usdPrice}
              onChange={setUsdPrice}
              hint={
                rate
                  ? `Cotação de hoje: ${brlOpen(rate.value)}. O valor do seu dólar é atualizado sozinho.`
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
        )}

        {isVariable && !locked && (
          <label className="check">
            <input type="checkbox" checked={byQty} onChange={(e) => setByQty(e.target.checked)} />
            <span>Quero informar a quantidade de cotas</span>
          </label>
        )}

        {isVariable && byQty && !locked && (
          <>
            <Field label="Quantas cotas ou ações você comprou?" hint="Se tiver fração, use vírgula. Exemplo: 0,5">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="30"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^\d,]/g, ''))}
              />
            </Field>
            <MoneyField label="Quanto pagou por cada cota?" value={unitPrice} onChange={setUnitPrice} />
            <MoneyField
              label="Quanto vale cada cota hoje?"
              value={unitNow}
              onChange={setUnitNow}
              hint="Veja no app da corretora. Se deixar vazio, usamos o preço que você pagou."
            />
            {!editing && purchasesReady && (
              <MoneyField
                label="Custos da compra (se tiver)"
                value={fees}
                onChange={setFees}
                hint="Corretagem e taxas. Pode deixar vazio."
              />
            )}
            <p className="calc-box" aria-live="polite">
              <span>
                Você investiu: <strong>{totalPaid === null ? '—' : brl(totalPaid)}</strong>
              </span>
              <span>
                Hoje vale: <strong>{totalNow === null ? '—' : brl(totalNow)}</strong>
              </span>
            </p>
          </>
        )}

        {!isDollar && !(isVariable && byQty) && !locked && (
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

        {isFixed && !locked && (
          <Field
            label="Vencimento (se tiver)"
            hint="Dia em que o dinheiro fica disponível. Deixe vazio na poupança ou se não tiver data."
          >
            <input type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
          </Field>
        )}

        {!locked && (
          <Field label="Data da compra">
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
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
