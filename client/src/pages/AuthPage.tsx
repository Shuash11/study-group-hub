import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signIn, signUp } from '../services/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Form'
import { ErrorBanner } from '../components/ui/Feedback'
import { BookOpenIcon, CheckIcon } from '../components/icons'

type Mode = 'login' | 'signup'

function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password.'
  if (message.includes('already registered'))
    return 'An account with this email already exists. Try signing in instead.'
  if (message.includes('rate limit') || message.includes('Too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (message.includes('Email not confirmed'))
    return 'Please confirm your email first — check your inbox for the confirmation link.'
  return message
}

export default function AuthPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    fullName?: string
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [loading, user, navigate])

  function validate(): boolean {
    const errors: typeof fieldErrors = {}
    if (!email.trim()) errors.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Password is required.'
    else if (mode === 'signup' && password.length < 6)
      errors.password = 'Password must be at least 6 characters.'
    if (mode === 'signup' && !fullName.trim()) errors.fullName = 'Please enter your name.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const session = await signUp(email.trim(), password, fullName.trim())
        if (!session) {
          // Email confirmation is required before a session is issued.
          setAwaitingConfirmation(true)
          return
        }
      } else {
        await signIn(email.trim(), password)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(
        friendlyAuthError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (awaitingConfirmation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckIcon size={24} />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Check your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            We sent a confirmation link to <strong>{email}</strong>. Confirm your email,
            then sign in.
          </p>
          <Button variant="secondary" className="mt-5 w-full" onClick={() => setMode('login')}>
            Back to sign in
          </Button>
        </div>
      </main>
    )
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setFieldErrors({})
    setFormError(null)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <BookOpenIcon size={24} />
          </span>
          <h1 className="text-xl font-semibold text-slate-900">Study Group Hub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Find your people. Pass your classes.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {formError && (
            <div className="mb-4">
              <ErrorBanner message={formError} />
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                className={`min-h-[36px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none ${
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={fieldErrors.fullName}
                autoComplete="name"
                maxLength={80}
                required
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              hint={mode === 'signup' ? 'At least 6 characters' : undefined}
              required
            />
            <Button type="submit" loading={submitting} className="w-full">
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
