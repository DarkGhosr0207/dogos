'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { inputClass } from '@/lib/ui'
import type { CSSProperties } from 'react'

const supabase = createClient()

const labelStyle: CSSProperties = {
  color: '#374151',
  fontWeight: 500,
  fontSize: '14px',
}

const signInBtnStyle: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}

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
    <div className="flex min-h-screen flex-col bg-[#f7f9f7] lg:flex-row">
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-8">
        <div className="w-full" style={{ backgroundColor: '#ffffff' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl" aria-hidden>
                🐾
              </span>
              <h1 className="text-3xl font-bold text-gray-900">DogOS</h1>
            </div>
            <p className="mb-8 mt-1 text-gray-500">
              Your dog&apos;s health companion
            </p>
          </div>

          {error ? (
            <p
              className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block" style={labelStyle}>
                Email
              </span>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block" style={labelStyle}>
                Password
              </span>
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            <button
              type="button"
              onClick={signIn}
              disabled={busy}
              className="disabled:opacity-50"
              style={signInBtnStyle}
            >
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:opacity-50"
            >
              {busy ? 'Please wait…' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden min-h-screen flex-1 flex-col justify-center bg-[#1a2e1f] p-12 lg:flex">
        <h2 className="mb-3 text-3xl font-bold text-white">
          Everything your dog needs.
        </h2>
        <p className="mb-10 text-base text-[#8aab8f]">
          DogOS helps you track health, compliance, and care—in one calm,
          organized place.
        </p>
        <ul>
          <li className="mb-3 flex items-start gap-3 rounded-2xl bg-[#2d4a34] p-5">
            <span className="text-2xl leading-none" aria-hidden>
              🩺
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                AI Symptom Checker
              </p>
              <p className="mt-1 text-xs text-[#8aab8f]">
                Structured guidance from signs you observe—share with your vet.
              </p>
            </div>
          </li>
          <li className="mb-3 flex items-start gap-3 rounded-2xl bg-[#2d4a34] p-5">
            <span className="text-2xl leading-none" aria-hidden>
              ⚖️
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Legal Hub</p>
              <p className="mt-1 text-xs text-[#8aab8f]">
                Country guides for owners—plus AI Q&amp;A on each article.
              </p>
            </div>
          </li>
          <li className="mb-3 flex items-start gap-3 rounded-2xl bg-[#2d4a34] p-5">
            <span className="text-2xl leading-none" aria-hidden>
              🔔
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Reminders</p>
              <p className="mt-1 text-xs text-[#8aab8f]">
                Vaccines, meds, and visits—never miss what matters.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
