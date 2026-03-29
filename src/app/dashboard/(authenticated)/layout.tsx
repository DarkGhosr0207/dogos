import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from '../dashboard-nav'
import SignOutButton from '../sign-out-button'

export default async function AuthenticatedDashboardLayout({
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: '#1a2e1f',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="p-6">
          <div className="flex items-center">
            <span className="text-2xl" aria-hidden>
              🐾
            </span>
            <div className="ml-2">
              <p className="text-xl font-bold" style={{ color: '#ffffff' }}>
                DogOS
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: '#8aab8f' }}
              >
                Pet Health Manager
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-1">
          <DashboardNav />
        </div>
        <div
          className="mt-auto p-4"
          style={{ borderTop: '1px solid #2d4a34' }}
        >
          <p
            className="mb-2 truncate text-xs"
            style={{ color: '#8aab8f' }}
            title={user.email ?? ''}
          >
            {user.email}
          </p>
          <SignOutButton variant="sidebar" />
        </div>
      </aside>
      <main
        style={{
          marginLeft: '240px',
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f7f9f7',
          minHeight: '100vh',
          padding: '32px',
          color: '#111827',
        }}
      >
        {children}
      </main>
    </div>
  )
}
