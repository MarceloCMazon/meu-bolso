import { useState } from 'react'
import { Brand } from '../components/ui'
import { supabase } from '../lib/supabase'

function authError(err) {
  const text = String(err?.message || err || '')
  if (/invalid login credentials/i.test(text)) return 'E-mail ou senha incorretos. Confira e tente de novo.'
  if (/email not confirmed/i.test(text)) return 'Falta confirmar seu e-mail. Abra o e-mail que enviamos e toque no link.'
  if (/already registered|already been registered/i.test(text)) return 'Este e-mail já tem conta. Toque em "Entrar".'
  if (/at least 6/i.test(text)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/rate limit|too many/i.test(text)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  if (/valid email|invalid email|unable to validate email/i.test(text)) return 'Esse e-mail não parece certo. Confira se digitou tudo.'
  if (/failed to fetch|networkerror|load failed/i.test(text)) return 'Sem conexão com a internet. Tente de novo.'
  return text || 'Algo deu errado. Tente de novo.'
}

export default function Auth() {
  const [mode, setMode] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const signingIn = mode === 'entrar'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (signingIn) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) {
          setMsg({
            kind: 'ok',
            text: 'Conta criada! Enviamos um e-mail para confirmar. Abra o e-mail, toque no link e depois volte aqui para entrar.',
          })
          setMode('entrar')
        }
      }
    } catch (err) {
      setMsg({ kind: 'error', text: authError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setMsg({ kind: 'error', text: 'Digite seu e-mail acima e toque em "Esqueci minha senha" de novo.' })
      return
    }
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    setMsg(
      error
        ? { kind: 'error', text: authError(error) }
        : { kind: 'ok', text: 'Pronto! Enviamos um e-mail com o link para criar uma nova senha.' },
    )
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <Brand />
        <h1 className="auth-title">{signingIn ? 'Que bom ver você' : 'Crie sua conta'}</h1>
        <p className="muted">
          {signingIn
            ? 'Entre para ver o dinheiro da casa em ordem.'
            : 'Cada pessoa da família tem a sua conta, e só você vê os seus números.'}
        </p>

        <form onSubmit={submit} className="form" noValidate>
          <label className="field">
            <span className="field-label">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Senha</span>
            <input
              type={show ? 'text' : 'password'}
              autoComplete={signingIn ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <small className="field-hint">{signingIn ? '' : 'Use pelo menos 6 caracteres.'}</small>
          </label>

          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Mostrar a senha</span>
          </label>

          {msg && (
            <p className={`msg ${msg.kind === 'ok' ? 'msg-ok' : 'msg-error'}`} role="alert">
              {msg.text}
            </p>
          )}

          <button type="submit" className="btn primary" disabled={busy || !email || !password}>
            {busy ? 'Aguarde…' : signingIn ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {signingIn && (
          <button type="button" className="btn link" onClick={forgot} disabled={busy}>
            Esqueci minha senha
          </button>
        )}

        <hr className="auth-sep" />
        <p className="muted">{signingIn ? 'Ainda não tem conta?' : 'Já tem conta?'}</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setMode(signingIn ? 'criar' : 'entrar')
            setMsg(null)
          }}
        >
          {signingIn ? 'Criar conta' : 'Entrar'}
        </button>
      </div>
    </main>
  )
}

export function NewPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setMsg({ kind: 'error', text: authError(error) })
    else onDone()
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <Brand />
        <h1 className="auth-title">Crie uma nova senha</h1>
        <form onSubmit={submit} className="form" noValidate>
          <label className="field">
            <span className="field-label">Nova senha</span>
            <input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <small className="field-hint">Use pelo menos 6 caracteres.</small>
          </label>
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Mostrar a senha</span>
          </label>
          {msg && (
            <p className="msg msg-error" role="alert">
              {msg.text}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={busy || password.length < 6}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </main>
  )
}

export function SetupNeeded() {
  return (
    <main className="auth">
      <div className="auth-card">
        <Brand />
        <h1 className="auth-title">Falta ligar o banco de dados</h1>
        <p className="muted">
          O site está no ar, mas ainda não sabe onde guardar os dados. Adicione estas duas variáveis de
          ambiente (no Vercel: Settings &gt; Environment Variables) e publique de novo:
        </p>
        <pre className="code">
          VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY
        </pre>
        <p className="muted">Os valores ficam em Supabase &gt; Project Settings &gt; API. O passo a passo completo está no arquivo README.</p>
      </div>
    </main>
  )
}
