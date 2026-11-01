import { useCallback, useEffect, useRef, useState } from 'react'
import InvestmentForm from './components/InvestmentForm'
import TransactionForm from './components/TransactionForm'
import GoalForm from './components/GoalForm'
import AssetForm from './components/AssetForm'
import { Brand, EmptyState, Icon, TextSize } from './components/ui'
import { useLocalSetting, useRoute, useUsdRate } from './hooks'
import * as api from './lib/api'
import { currentMonth, todayISO } from './lib/format'
import { isConfigured, supabase } from './lib/supabase'
import Auth, { NewPassword, SetupNeeded } from './pages/Auth'
import Goals from './pages/Goals'
import Home from './pages/Home'
import Investments from './pages/Investments'
import Patrimonio from './pages/Patrimonio'
import Simulator from './pages/Simulator'
import Settings from './pages/Settings'
import Transactions from './pages/Transactions'

const NAV = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'gastos', label: 'Gastos', icon: 'list' },
  { id: 'patrimonio', label: 'Patrimônio', icon: 'chart', also: ['investimentos', 'simulador'] },
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
      setSession(next)
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
  })
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState('')
  const [txModal, setTxModal] = useState(null)
  const [invModal, setInvModal] = useState(null)
  const [goalModal, setGoalModal] = useState(null)
  const [assetModal, setAssetModal] = useState(null)
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

  const reload = useCallback(async () => {
    try {
      setData(await api.loadAll())
      setStatus('ready')
    } catch (err) {
      setErrorMsg(api.explain(err))
      setStatus('error')
    }
  }, [])

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
      .then(reload)
      .catch(() => {})
  }, [status, rate, data, userId, reload])

  async function saveTx(payload, id) {
    if (id) await api.updateTransaction(id, payload)
    else await api.addTransaction(userId, payload)
    await reload()
    setTxModal(null)
    notify('Lançamento salvo.')
  }

  async function deleteTx(id) {
    await api.deleteTransaction(id)
    await reload()
    setTxModal(null)
    notify('Lançamento excluído.')
  }

  async function saveInv(payload, id) {
    await api.saveInvestment(userId, payload, id)
    await reload()
    setInvModal(null)
    notify('Investimento salvo.')
  }

  async function deleteInv(id) {
    await api.deleteInvestment(id)
    await reload()
    setInvModal(null)
    notify('Investimento excluído.')
  }

  async function saveAsset(payload, id) {
    await api.saveAsset(userId, payload, id)
    await reload()
    setAssetModal(null)
    notify('Item salvo.')
  }

  async function deleteAsset(id) {
    await api.deleteAsset(id)
    await reload()
    setAssetModal(null)
    notify('Item excluído.')
  }

  async function saveGoal(payload, id) {
    await api.saveGoal(userId, payload, id)
    await reload()
    setGoalModal(null)
    notify('Meta salva.')
  }

  async function deleteGoal(id) {
    await api.deleteGoal(id)
    await reload()
    setGoalModal(null)
    notify('Meta excluída.')
  }

  const openNewTx = (type) => setTxModal({ type })
  const openEditTx = (tx) => setTxModal({ tx })
  const signOut = () => supabase.auth.signOut()

  let content
  if (status === 'loading') {
    content = <p className="muted loading">Carregando seus dados…</p>
  } else if (status === 'error') {
    content = (
      <div className="card">
        <EmptyState
          title="Não foi possível carregar seus dados."
          action={
            <button type="button" className="btn primary" onClick={reload}>
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
      <Transactions data={data} month={month} setMonth={setMonth} onAdd={openNewTx} onEdit={openEditTx} />
    )
  } else if (route === 'investimentos') {
    content = (
      <Investments
        data={data}
        rate={rate}
        onAdd={() => setInvModal({})}
        onEdit={(inv) => setInvModal({ inv })}
      />
    )
  } else if (route === 'patrimonio') {
    content = (
      <Patrimonio
        data={data}
        rate={rate}
        onAdd={() => setAssetModal({})}
        onEdit={(asset) => setAssetModal({ asset })}
      />
    )
  } else if (route === 'simulador') {
    content = <Simulator data={data} rate={rate} />
  } else if (route === 'metas') {
    content = <Goals data={data} onAdd={() => setGoalModal({})} onEdit={(goal) => setGoalModal({ goal })} />
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
        month={month}
        setMonth={setMonth}
        rate={rate}
        onAdd={openNewTx}
        onEdit={openEditTx}
      />
    )
  }

  const renderNav = (useShort) =>
    NAV.map((n) => (
      <a
        key={n.id}
        href={`#/${n.id}`}
        aria-current={route === n.id || n.also?.includes(route) ? 'page' : undefined}
      >
        <Icon name={n.icon} size={26} />
        <span>{useShort ? n.short || n.label : n.label}</span>
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
          <p className="side-label">Tamanho da letra</p>
          <TextSize name="textsize-side" value={textSize} onChange={setTextSize} />
        </div>
      </aside>

      <header className="topbar">
        <Brand small />
        <TextSize name="textsize-top" value={textSize} onChange={setTextSize} />
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
          onSave={saveTx}
          onDelete={deleteTx}
          onClose={() => setTxModal(null)}
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
