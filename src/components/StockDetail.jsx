import { useState } from 'react'
import { explain } from '../lib/api'
import { round2 } from '../lib/calc'
import { brl, parseMoney, pct, qtyFmt, shortDate, toInput } from '../lib/format'
import { purchaseCost, purchasesOf } from '../lib/purchases'
import { Modal, Tile } from './ui'

/** Uma ação da carteira: totais, preço médio e o histórico de todas as compras. */
export default function StockDetail({ investment, purchases, onAddPurchase, onEditPurchase, onUpdatePrice, onEditAsset, onClose }) {
  const qty = Number(investment.quantity)
  const invested = Number(investment.invested_brl)
  const now = Number(investment.current_value_brl)
  const avg = Number(investment.unit_price)
  const gain = round2(now - invested)
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0
  const list = purchasesOf(purchases, investment.id)

  const [price, setPrice] = useState(toInput(round2(qty > 0 ? now / qty : 0)))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function updatePrice(e) {
    e.preventDefault()
    const v = parseMoney(price)
    if (!(v >= 0) || price.trim() === '') return setMsg('Digite o preço de hoje de cada ação. Exemplo: 28,40')
    setBusy(true)
    setMsg('')
    try {
      await onUpdatePrice(investment, v)
      setMsg('Preço atualizado.')
    } catch (err) {
      setMsg(explain(err))
    }
    setBusy(false)
  }

  return (
    <Modal title={`${investment.name}${investment.ticker ? ` (${investment.ticker})` : ''}`} onClose={onClose}>
      <div className="form">
        <div className="tiles stock-tiles">
          <Tile label="Quantidade" value={`${qtyFmt(qty)} ${qty === 1 ? 'ação' : 'ações'}`} />
          <Tile label="Total investido" value={brl(invested)} />
          <Tile label="Preço médio" value={brl(avg)} />
        </div>
        <p className="calc-box">
          <span>
            Hoje vale: <strong>{brl(now)}</strong>
          </span>
          <span>
            Resultado:{' '}
            <strong className={gain >= 0 ? 'pos' : 'neg'}>
              {gain >= 0 ? '+' : '−'}
              {brl(Math.abs(gain))} ({gain >= 0 ? '+' : '−'}
              {pct(Math.abs(gainPct))})
            </strong>
          </span>
        </p>

        <form onSubmit={updatePrice} className="price-now">
          <label className="field">
            <span className="field-label">Preço de hoje de cada ação</span>
            <span className="money">
              <span className="money-prefix" aria-hidden="true">
                R$
              </span>
              <input inputMode="decimal" autoComplete="off" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))} />
            </span>
            <small className="field-hint">Veja no app da corretora e atualize quando quiser.</small>
          </label>
          <button type="submit" className="btn secondary small" disabled={busy}>
            {busy ? 'Atualizando…' : 'Atualizar preço'}
          </button>
          {msg && (
            <p className="muted" role="status">
              {msg}
            </p>
          )}
        </form>

        <div className="list-head">
          <h3>Histórico de compras</h3>
          <button type="button" className="btn primary small" onClick={onAddPurchase}>
            Adicionar compra
          </button>
        </div>
        <div className="rows">
          {list.map((p) => (
            <button type="button" key={p.id} className="row" onClick={() => onEditPurchase(p)}>
              <span className="row-main">
                <span className="row-title">{shortDate(p.date)}</span>
                <span className="row-sub">
                  {qtyFmt(Number(p.quantity))} × {brl(p.unit_price)}
                  {Number(p.fees) > 0 ? ` + ${brl(p.fees)} de custos` : ''}
                </span>
              </span>
              <span className="row-amount">{brl(purchaseCost(p))}</span>
            </button>
          ))}
        </div>
        <p className="field-hint">
          O preço médio considera todas as compras e os custos informados. Toque numa compra para corrigir.
        </p>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onEditAsset}>
            Editar nome e código
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}
