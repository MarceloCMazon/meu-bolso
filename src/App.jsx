import { useCallback, useEffect, useRef, useState } from 'react'
import InvestmentForm from './components/InvestmentForm'
import TransactionForm from './components/TransactionForm'
import GoalForm from './components/GoalForm'
import AllocationForm from './components/AllocationForm'
import AssetForm from './components/AssetForm'
import { Brand, EmptyState, EyeToggle, Icon, TextSize } from './components/ui'
import { useLocalSetting, useRoute, useUsdRate } from './hooks'
import * as api from './lib/api'
import { currentMonth, setHidden, todayISO } from './lib/format'
import { isConfigured, supabase } from './lib/supabase'
import Auth, { NewPassword, SetupNeeded } from './pages/Auth'
import CardForm from './components/CardForm'
import Cards from './pages/Cards'
import Goals from './pages/Goals'
import Home from './pages/Home'
import Investments from './pages/Investments'
import Patrimonio from './pages/Patrimonio'
import Simulator from './pages/Simulator'
import Settings from './pages/Settings'
import Transactions from './pages/Transactions'

const NAV = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'gastos', label: 'Gastos', icon: 'list', also: ['cartoes'], mobileAlso: ['cartoes'] },
  {
    id: 'investimentos',
    label: 'Investimentos',
    short: 'Investir',
    icon: 'chart',
    mobileAlso: ['patrimonio', 'simulador'],
  },
  { id: 'patrimonio', label: 'Patrimônio', icon: 'wallet', also: ['simulador'], desktopOnly: true },
  { id: 'metas', label: 'Metas', icon: 'flag' },
  { id: 'ajustes', label: 'Ajustes', icon: 'sliders' },
]

const FONT_PERCENT = { normal: '100%', grande: '120%', enorme: '140%' }

export default function App() {
  if (!isConfigured) return <SetupNeeded />
  return <Root />
}

function Root() {
  const [session, setSession] = useState(undefined)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // O Supabase avisa de novo quando a aba volta a ficar visível. Se a pessoa e a
      // sessão são as mesmas, mantemos o mesmo objeto para não redesenhar o site à toa.
      setSession((prev) =>
        prev && next && prev.user.id === next.user.id && prev.access_token === next.access_token ? prev : next,
      )
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <main className="auth">
        <Brand />
      </main>
    )
  }
  if (recovering) return <NewPassword onDone={() => setRecovering(false)} />
  if (!session) return <Auth />
  return <Shell key={session.user.id} session={session} />
}

function Shell({ session }) {
  const userId = session.user.id
  const route = useRoute()
  const rate = useUsdRate()

  const [textSize, setTextSize] = useLocalSetting('nb-textsize', 'normal')
  const [theme, setTheme] = useLocalSetting('nb-theme', 'auto')
  const [hideRaw, setHideRaw] = useLocalSetting('nb-hide', '0')
  const hidden = hideRaw === '1'
  // Precisa valer antes de qualquer tela desenhar um valor em dinheiro.
  setHidden(hidden)
  const toggleHidden = () => setHideRaw(hidden ? '0' : '1')

  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState({
    transactions: [],
    investments: [],
    history: [],
    goals: [],
    goalsReady: true,
    assets: [],
    assetHistory: [],
    patrimonioReady: true,
    targets: [],
    targetsReady: true,
    cards: [],
    cardsReady: true,
  })
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState('')
  const [txModal, setTxModal] = useState(null)
  const [invModal, setInvModal] = useState(null)
  const [goalModal, setGoalModal] = useState(null)
  const [assetModal, setAssetModal] = useState(null)
  const [targetModal, setTargetModal] = useState(false)
  const [cardModal, setCardModal] = useState(null)
  const toastTimer = useRef(0)
  const snapshotKey = useRef('')

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_PERCENT[textSize] || '100%'
  }, [textSize])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme
    else delete root.dataset.theme
  }, [theme])

  const notify = useCallback((text) => {
    setToast(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }, [])

  /**
   * Busca dados no banco. `parts` diz o que recarregar (ex.: ['transactions']);
   * sem isso, busca tudo. Com `quiet`, uma falha só avisa, sem trocar a tela por um erro.
   */
  const reload = useCallback(
    async (parts, { quiet = false } = {}) => {
      try {
        const next = await api.loadParts(parts)
        setData((prev) => ({ ...prev, ...next }))
        setStatus('ready')
      } catch (err) {
        if (quiet) {
          notify('Salvo, mas não consegui atualizar a tela. Recarregue a página.')
          return
        }
        setErrorMsg(api.explain(err))
        setStatus('error')
      }
    },
    [notify],
  )

  useEffect(() => {
    reload()
  }, [reload])

  // Guarda todo dia o valor dos investimentos em dólar, para o gráfico de evolução.
  useEffect(() => {
    if (status !== 'ready' || !rate?.live) return
    const today = todayISO()
    const pending = data.investments.filter(
      (i) =>
        i.kind === 'dolar' &&
        Number(i.usd_amount) > 0 &&
        !data.history.some((h) => h.investment_id === i.id && h.recorded_at === today),
    )
    const key = `${today}:${pending.map((i) => i.id).join(',')}`
    if (pending.length === 0 || snapshotKey.current === key) return
    snapshotKey.current = key
    api
      .snapshotDollars(userId, pending, rate.value)
      .then(() => reload(['investments'], { quiet: true }))
      .catch(() => {})
  }, [status, rate, data, userId, reload])

  // Depois de gravar, a janela fecha na hora e só o que mudou é recarregado em segundo plano.
  async function saveTx(payload, id) {
    if (id) await api.updateTransaction(id, payload)
    else await api.addTransaction(userId, payload)
    setTxModal(null)
    notify('Lançamento salvo.')
    reload(['transactions'], { quiet: true })
  }

  async function saveInstallments(rows) {
    await api.addTransactions(userId, rows)
    setTxModal(null)
    notify(`${rows.length} parcelas salvas.`)
    reload(['transactions'], { quiet: true })
  }

  async function deleteTx(tx, scope) {
    if (scope === 'from' && tx.installment_group) {
      await api.deleteInstallmentsFrom(tx.installment_group, tx.installment_number)
    } else {
      await api.deleteTransaction(tx.id)
    }
    setTxModal(null)
    notify(scope === 'from' ? 'Parcelas excluídas.' : 'Lançamento excluído.')
    reload(['transactions'], { quiet: true })
  }

  async function saveInv(payload, id) {
    await api.saveInvestment(userId, payload, id)
    setInvModal(null)
    notify('Investimento salvo.')
    reload(['investments'], { quiet: true })
  }

  async function deleteInv(id) {
    await api.deleteInvestment(id)
    setInvModal(null)
    notify('Investimento excluído.')
    reload(['investments'], { quiet: true })
  }

  async function saveTargets(map) {
    await api.saveTargets(userId, map)
    setTargetModal(false)
    notify('Meta da carteira salva.')
    reload(['targets'], { quiet: true })
  }

  async function clearTargets() {
    await api.clearTargets(userId)
    setTargetModal(false)
    notify('Meta da carteira removida.')
    reload(['targets'], { quiet: true })
  }

  async function saveAsset(payload, id) {
    await api.saveAsset(userId, payload, id)
    setAssetModal(null)
    notify('Item salvo.')
    reload(['assets'], { quiet: true })
  }

  async function deleteAsset(id) {
    await api.deleteAsset(id)
    setAssetModal(null)
    notify('Item excluído.')
    reload(['assets'], { quiet: true })
  }

  async function saveCard(payload, id) {
    await api.saveCard(userId, payload, id)
    setCardModal(null)
    notify('Cartão salvo.')
    reload(['cards'], { quiet: true })
  }

  async function deleteCard(id) {
    await api.deleteCard(id)
    setCardModal(null)
    notify('Cartão excluído. Os gastos dele continuam anotados.')
    reload(['cards', 'transactions'], { quiet: true })
  }

  async function saveGoal(payload, id) {
    await api.saveGoal(userId, payload, id)
    setGoalModal(null)
    notify('Meta salva.')
    reload(['goals'], { quiet: true })
  }

  async function deleteGoal(id) {
    await api.deleteGoal(id)
    setGoalModal(null)
    notify('Meta excluída.')
    reload(['goals'], { quiet: true })
  }

  // Funções estáveis: as telas só são redesenhadas quando os dados delas mudam,
  // e não a cada aviso ou janela que abre.
  const openNewTx = useCallback((type) => setTxModal({ type }), [])
  const openEditTx = useCallback((tx) => setTxModal({ tx }), [])
  const openNewInv = useCallback(() => setInvModal({}), [])
  const openEditInv = useCallback((inv) => setInvModal({ inv }), [])
  const openTargets = useCallback(() => setTargetModal(true), [])
  const openNewAsset = useCallback(() => setAssetModal({}), [])
  const openEditAsset = useCallback((asset) => setAssetModal({ asset }), [])
  const openNewCard = useCallback(() => setCardModal({}), [])
  const openEditCard = useCallback((card) => setCardModal({ card }), [])
  const openNewGoal = useCallback(() => setGoalModal({}), [])
  const openEditGoal = useCallback((goal) => setGoalModal({ goal }), [])
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  let content
  if (status === 'loading') {
    content = <p className="muted loading">Carregando seus dados…</p>
  } else if (status === 'error') {
    content = (
      <div className="card">
        <EmptyState
          title="Não foi possível carregar seus dados."
          action={
            <button type="button" className="btn primary" onClick={() => reload()}>
              Tentar de novo
            </button>
          }
        >
          {errorMsg}
        </EmptyState>
      </div>
    )
  } else if (route === 'gastos') {
    content = (
      <Transactions
        data={data}
        hidden={hidden}
        month={month}
        setMonth={setMonth}
        onAdd={openNewTx}
        onEdit={openEditTx}
      />
    )
  } else if (route === 'investimentos') {
    content = (
      <Investments
        data={data}
        hidden={hidden}
        rate={rate}
        onAdd={openNewInv}
        onEdit={openEditInv}
        onEditTargets={openTargets}
      />
    )
  } else if (route === 'patrimonio') {
    content = <Patrimonio data={data} hidden={hidden} rate={rate} onAdd={openNewAsset} onEdit={openEditAsset} />
  } else if (route === 'simulador') {
    content = <Simulator data={data} hidden={hidden} rate={rate} />
  } else if (route === 'cartoes') {
    content = (
      <Cards
        data={data}
        hidden={hidden}
        month={month}
        setMonth={setMonth}
        onAddCard={openNewCard}
        onEditCard={openEditCard}
        onEdit={openEditTx}
      />
    )
  } else if (route === 'metas') {
    content = <Goals data={data} hidden={hidden} onAdd={openNewGoal} onEdit={openEditGoal} />
  } else if (route === 'ajustes') {
    content = (
      <Settings
        email={session.user.email}
        textSize={textSize}
        setTextSize={setTextSize}
        theme={theme}
        setTheme={setTheme}
        transactions={data.transactions}
        onSignOut={signOut}
      />
    )
  } else {
    content = (
      <Home
        data={data}
        hidden={hidden}
        month={month}
        setMonth={setMonth}
        rate={rate}
        onAdd={openNewTx}
        onEdit={openEditTx}
      />
    )
  }

  // No celular o menu de baixo tem 5 itens: Patrimônio fica dentro de Investimentos.
  const renderNav = (mobile) =>
    NAV.filter((n) => !(mobile && n.desktopOnly)).map((n) => (
      <a
        key={n.id}
        href={`#/${n.id}`}
        aria-current={route === n.id || (mobile ? n.mobileAlso : n.also)?.includes(route) ? 'page' : undefined}
      >
        <Icon name={n.icon} size={26} />
        <span>{mobile ? n.short || n.label : n.label}</span>
      </a>
    ))

  return (
    <div className="app">
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <aside className="side">
        <Brand />
        <nav aria-label="Principal" className="side-nav">
          {renderNav(false)}
        </nav>
        <div className="side-foot">
          <EyeToggle hidden={hidden} onToggle={toggleHidden} withLabel />
          <p className="side-label">Tamanho da letra</p>
          <TextSize name="textsize-side" value={textSize} onChange={setTextSize} />
        </div>
      </aside>

      <header className="topbar">
        <Brand small />
        <div className="topbar-tools">
          <EyeToggle hidden={hidden} onToggle={toggleHidden} />
          <TextSize name="textsize-top" value={textSize} onChange={setTextSize} />
        </div>
      </header>

      <main id="conteudo" className="main" tabIndex={-1}>
        {content}
      </main>

      <nav aria-label="Principal" className="tabbar">
        {renderNav(true)}
      </nav>

      {(route === 'inicio' || route === 'gastos') && status === 'ready' && (
        <button type="button" className="fab" onClick={() => openNewTx('saida')} aria-label="Lançar gasto ou entrada">
          <Icon name="plus" size={28} />
          <span>Lançar</span>
        </button>
      )}

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {txModal && (
        <TransactionForm
          initial={txModal.tx}
          defaultType={txModal.type}
          cards={data.cards}
          onSave={saveTx}
          onSaveInstallments={saveInstallments}
          onDelete={deleteTx}
          onClose={() => setTxModal(null)}
        />
      )}
      {cardModal && (
        <CardForm
          initial={cardModal.card}
          onSave={saveCard}
          onDelete={deleteCard}
          onClose={() => setCardModal(null)}
        />
      )}
      {targetModal && (
        <AllocationForm
          targets={data.targets}
          onSave={saveTargets}
          onClear={clearTargets}
          onClose={() => setTargetModal(false)}
        />
      )}
      {assetModal && (
        <AssetForm
          initial={assetModal.asset}
          onSave={saveAsset}
          onDelete={deleteAsset}
          onClose={() => setAssetModal(null)}
        />
      )}
      {goalModal && (
        <GoalForm
          initial={goalModal.goal}
          onSave={saveGoal}
          onDelete={deleteGoal}
          onClose={() => setGoalModal(null)}
        />
      )}
      {invModal && (
        <InvestmentForm
          initial={invModal.inv}
          rate={rate}
          onSave={saveInv}
          onDelete={deleteInv}
          onClose={() => setInvModal(null)}
        />
      )}
    </div>
  )
}
