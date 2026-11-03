import { useEffect, useId, useRef } from 'react'
import { categoryOf } from '../lib/constants'
import { brl, currentMonth, monthLabel, parseMoney, shiftMonth, shortDate, toInput } from '../lib/format'

const ICONS = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  list: <path d="M4 6h16M4 12h16M4 18h10" />,
  chart: <path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7" />,
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeoff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h13v4" />
      <path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z" />
      <circle cx="16" cy="14" r="1.2" />
    </>
  ),
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
}

export function Icon({ name, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}

export function Brand({ small }) {
  return (
    <span className={`brand ${small ? 'brand-small' : ''}`}>
      <img src="/icon.svg" alt="" width={small ? 32 : 44} height={small ? 32 : 44} />
      <span>Nosso Bolso</span>
    </span>
  )
}

/** Janela de diálogo nativa: fecha com Esc e prende o foco sozinha. */
export function Modal({ title, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog && dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="modal-body">
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  )
}

export function MoneyField({ label, value, onChange, prefix = 'R$', hint, autoFocus, big }) {
  return (
    <Field label={label} hint={hint}>
      <span className={`money ${big ? 'money-big' : ''}`}>
        <span className="money-prefix" aria-hidden="true">
          {prefix}
        </span>
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        />
      </span>
    </Field>
  )
}

/** Campo de valor com botões − e +, como nos simuladores de banco. */
export function Stepper({ label, value, onChange, step, prefix = 'R$', hint }) {
  const id = useId()
  const move = (dir) => {
    const current = parseMoney(value)
    const base = Number.isFinite(current) ? current : 0
    const next = Math.max(0, Math.round((base + dir * step) * 100) / 100)
    onChange(toInput(next))
  }
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="stepper">
        <button
          type="button"
          className="icon-btn"
          onClick={() => move(-1)}
          aria-label={`Diminuir ${brl(step)}`}
        >
          <Icon name="minus" />
        </button>
        <span className="money money-big">
          <span className="money-prefix" aria-hidden="true">
            {prefix}
          </span>
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          />
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => move(1)}
          aria-label={`Aumentar ${brl(step)}`}
        >
          <Icon name="plus" />
        </button>
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  )
}

export function Segmented({ legend, name, value, onChange, options }) {
  return (
    <fieldset className="seg">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={`seg-item ${o.tone ? `tone-${o.tone}` : ''}`}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

export function ChoiceGrid({ legend, name, items, value, onChange }) {
  return (
    <fieldset className="choices">
      <legend className="field-label">{legend}</legend>
      <div className="choices-grid">
        {items.map((c) => (
          <label key={c.id} className="choice">
            <input
              type="radio"
              name={name}
              value={c.id}
              checked={value === c.id}
              onChange={() => onChange(c.id)}
            />
            <span>
              <span className="choice-icon" aria-hidden="true">
                {c.icon}
              </span>
              <span className="choice-label">{c.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function MonthNav({ month, onChange, maxMonth }) {
  const limit = maxMonth || currentMonth()
  return (
    <div className="monthnav">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mês anterior"
      >
        <Icon name="left" />
      </button>
      <span className="monthnav-label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= limit}
        aria-label="Próximo mês"
      >
        <Icon name="right" />
      </button>
    </div>
  )
}

/** Olhinho: esconde ou mostra todos os valores em dinheiro. */
export function EyeToggle({ hidden, onToggle, withLabel }) {
  const label = hidden ? 'Mostrar os valores' : 'Esconder os valores'
  if (withLabel) {
    return (
      <button type="button" className="btn ghost small eye-wide" onClick={onToggle} aria-pressed={hidden}>
        <Icon name={hidden ? 'eyeoff' : 'eye'} size={22} />
        {label}
      </button>
    )
  }
  return (
    <button type="button" className="icon-btn" onClick={onToggle} aria-pressed={hidden} aria-label={label} title={label}>
      <Icon name={hidden ? 'eyeoff' : 'eye'} />
    </button>
  )
}

export const TEXT_SIZES = [
  { value: 'normal', label: 'Normal', percent: 100 },
  { value: 'grande', label: 'Grande', percent: 120 },
  { value: 'enorme', label: 'Muito grande', percent: 140 },
]

export function TextSize({ value, onChange, name = 'textsize' }) {
  return (
    <fieldset className="textsize">
      <legend className="sr-only">Tamanho da letra</legend>
      {TEXT_SIZES.map((s, i) => (
        <label key={s.value} className="textsize-item">
          <input
            type="radio"
            name={name}
            value={s.value}
            checked={value === s.value}
            onChange={() => onChange(s.value)}
          />
          <span style={{ fontSize: `${0.9 + i * 0.2}rem` }}>
            A<span className="sr-only"> {s.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export function Tile({ label, value, tone }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <strong className={`tile-value ${tone || ''}`}>{value}</strong>
    </div>
  )
}

/** Barra de progresso de uma meta, sempre acompanhada do texto (nunca só cor). */
export function GoalBar({ progress }) {
  const { share, state } = progress
  return (
    <div className="goalbar" role="img" aria-label={`${Math.round(share * 100)}% da meta`}>
      <div className={`goalbar-fill state-${state}`} style={{ width: `${Math.max(share * 100, share > 0 ? 3 : 0)}%` }} />
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  )
}

export function TxRow({ tx, onClick, cardName }) {
  const c = categoryOf(tx.category)
  const isIn = tx.type === 'entrada'
  return (
    <button type="button" className="row" onClick={() => onClick(tx)}>
      <span className="row-icon" aria-hidden="true">
        {c.icon}
      </span>
      <span className="row-main">
        <span className="row-title">
          {tx.description || c.label}
          {tx.installment_total ? ` (${tx.installment_number}/${tx.installment_total})` : ''}
        </span>
        <span className="row-sub">
          {tx.description ? `${c.label} · ` : ''}
          {cardName
            ? `${cardName}${tx.purchase_date ? ` · comprado em ${shortDate(tx.purchase_date)}` : ''}`
            : shortDate(tx.date)}
        </span>
      </span>
      <span className={`row-amount ${isIn ? 'pos' : 'neg'}`}>
        {isIn ? '+ ' : '− '}
        {brl(tx.amount)}
      </span>
    </button>
  )
}
