'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function Page() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function signIn() {
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.push('/dashboard')
    } finally {
      setBusy(false)
    }
  }

  async function signUp() {
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        router.push('/dashboard')
        return
      }

      setMessage('Check your email to confirm your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-900/40 p-6">
        <h1 className="text-2xl font-semibold">DogOS</h1>
        <p className="text-sm text-neutral-400 mt-1 mb-6">
          Sign in or create an account.
        </p>

        {error ? (
          <p className="text-sm text-red-400 mb-4" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-emerald-300 mb-4" role="status">
            {message}
          </p>
        ) : null}

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-neutral-300">Email</span>
            <input
              className="mt-1 w-full rounded-lg bg-neutral-950/50 border border-white/10 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm text-neutral-300">Password</span>
            <input
              className="mt-1 w-full rounded-lg bg-neutral-950/50 border border-white/10 px-3 py-2 text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={signIn}
              disabled={busy}
              className="h-11 rounded-lg bg-white text-neutral-950 font-medium disabled:opacity-50"
            >
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={busy}
              className="h-11 rounded-lg border border-white/10 bg-neutral-950/30 text-neutral-50 font-medium disabled:opacity-50"
            >
              {busy ? 'Please wait…' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
