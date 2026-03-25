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
      ? 'rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-white/5 disabled:opacity-50'
      : 'rounded-lg border border-white/10 bg-neutral-950/30 px-4 py-2 text-sm text-neutral-50 disabled:opacity-50'

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={`${base} ${className}`.trim()}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
