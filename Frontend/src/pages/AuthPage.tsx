import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

type Mode = 'login' | 'signup'

const COPY = {
  login: {
    eyebrow: 'Welcome back',
    title: 'Sign in',
    submit: 'SIGN IN',
    switchText: 'New to RACKT?',
    switchLink: 'Create an account',
    switchTo: '/signup',
  },
  signup: {
    eyebrow: 'Get started',
    title: 'Create account',
    submit: 'CREATE ACCOUNT',
    switchText: 'Already have an account?',
    switchLink: 'Sign in',
    switchTo: '/login',
  },
} as const

export default function AuthPage({ mode }: { mode: Mode }) {
  const copy = COPY[mode]

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (mode === 'signup') {
      if (password.length < 6) return setError('Password must be at least 6 characters.')
      if (password !== form.get('confirm')) return setError('Passwords do not match.')
    }

    setBusy(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const name = String(form.get('name') ?? '').trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      })
      if (error) setError(error.message)
      else if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
    }
    setBusy(false)
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__logo">
          RACK<span>T</span>
        </div>
        <p className="auth__tagline">
          Catalogue every piece.
          <br />
          Know what you actually wear.
        </p>
        <span className="auth__fine">Closet tracking, kept simple.</span>
      </aside>

      <main className="auth__panel">
        <form className="auth__form" onSubmit={handleSubmit}>
          <span className="auth__eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>

          <button type="button" className="btn auth__google" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5Z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5Z" />
              <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1Z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48Z" />
            </svg>
            CONTINUE WITH GOOGLE
          </button>

          <div className="auth__divider">
            <span>or</span>
          </div>

          {mode === 'signup' && (
            <label className="field">
              <span>Name</span>
              <input type="text" name="name" required autoComplete="name" placeholder="Jane Doe" />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" placeholder="jane@email.com" />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirm"
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </label>
          )}

          {mode === 'login' && (
            <button type="button" className="auth__forgot">
              Forgot password?
            </button>
          )}

          {error && (
            <p className="auth__message auth__message--error" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="auth__message">{notice}</p>}

          <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>
            {busy ? 'PLEASE WAIT…' : copy.submit}
          </button>

          <p className="auth__switch">
            {copy.switchText} <Link to={copy.switchTo}>{copy.switchLink}</Link>
          </p>
        </form>
      </main>
    </div>
  )
}
