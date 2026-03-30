import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function UpgradePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-10">
      <div
        className="w-full rounded-2xl border p-8 text-center"
        style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
      >
        <div className="mb-3 text-4xl" aria-hidden>
          👑
        </div>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>
          Upgrade to Premium+
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
          Premium+ unlocks AI tools and proactive health features.
        </p>
        <p className="mt-6 text-base font-semibold" style={{ color: '#111827' }}>
          €20/month — Premium+
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: '#2d7a4f' }}
          onClick={() => {}}
        >
          Upgrade to Premium+
        </button>
      </div>
    </div>
  )
}

