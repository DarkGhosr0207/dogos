'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

type SignOutButtonProps = {
  className?: string
  variant?: 'default' | 'sidebar'
}

export default function SignOutButton({
  className = '',
  variant = 'default',
}: SignOutButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setBusy(false)
      router.push('/')
    }
  }

  const base =
    variant === 'sidebar'
      ? 'cursor-pointer text-sm transition-colors disabled:opacity-50'
      : 'rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:opacity-50'

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={`${base} ${className}`.trim()}
      style={
        variant === 'sidebar'
          ? { color: '#8aab8f' }
          : undefined
      }
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
