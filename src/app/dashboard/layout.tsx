import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from './dashboard-nav'
import SignOutButton from './sign-out-button'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/10 px-4 py-4">
          <span className="text-sm font-semibold tracking-tight">DogOS</span>
        </div>
        <DashboardNav />
        <div className="mt-auto border-t border-white/10 p-3">
          <p
            className="truncate text-xs text-neutral-500"
            title={user.email ?? ''}
          >
            {user.email}
          </p>
          <SignOutButton className="mt-3 w-full" variant="sidebar" />
        </div>
      </aside>
      <main className="min-h-screen flex-1 overflow-auto">{children}</main>
    </div>
  )
}
