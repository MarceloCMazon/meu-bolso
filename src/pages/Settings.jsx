import { Segmented, TextSize } from '../components/ui'
import { categoryOf } from '../lib/constants'
import { toInput } from '../lib/format'

function downloadCsv(transactions) {
  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const lines = transactions.map((t) =>
    [
      t.date,
      t.type === 'entrada' ? 'Entrada' : 'Saída',
      categoryOf(t.category).label,
      (t.description || '') + (t.installment_total ? ` (${t.installment_number}/${t.installment_total})` : ''),
      toInput(Number(t.amount).toFixed(2)),
    ]
      .map(esc)
      .join(';'),
  )
  const csv = `﻿${[header.map(esc).join(';'), ...lines].join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'nosso-bolso-lancamentos.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Settings({ email, textSize, setTextSize, theme, setTheme, transactions, onSignOut }) {
  return (
    <>
      <header className="page-head">
        <h1>Ajustes</h1>
      </header>

      <section className="card setting">
        <h2>Tamanho da letra</h2>
        <p className="muted">Aumente para ler com mais conforto. Vale para todas as telas.</p>
        <TextSize name="textsize-settings" value={textSize} onChange={setTextSize} />
      </section>

      <section className="card setting">
        <h2>Cores da tela</h2>
        <Segmented
          legend="Cores da tela"
          name="theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'auto', label: 'Automático' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' },
          ]}
        />
      </section>

      <section className="card setting">
        <h2>Seus dados</h2>
        <p className="muted">
          Baixe uma planilha com seus lançamentos dos últimos 2 anos. Abre no Excel e no Google Planilhas.
        </p>
        <button type="button" className="btn secondary" onClick={() => downloadCsv(transactions)}>
          Baixar planilha (CSV)
        </button>
      </section>

      <section className="card setting">
        <h2>Usar como aplicativo</h2>
        <p className="muted">
          No celular, abra o menu do navegador e escolha &quot;Adicionar à tela inicial&quot;. O Nosso Bolso
          passa a abrir como um aplicativo.
        </p>
      </section>

      <section className="card setting">
        <h2>Sua conta</h2>
        <p className="muted">
          Você entrou como <strong>{email}</strong>
        </p>
        <button type="button" className="btn secondary" onClick={onSignOut}>
          Sair da conta
        </button>
      </section>
    </>
  )
}
