import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '../sign-out-button'
import Sidebar from '@/components/dashboard/Sidebar'
import { ageLabelFromDateOfBirth } from '@/app/dashboard/dogs/dog-age'

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

  const { data: profile } = await supabase
    .from('users_profile')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()
  const plan =
    (profile as { plan?: 'free' | 'premium' | 'premium_plus' } | null)?.plan ??
    'free'

  const { data: dog } = await supabase
    .from('dogs')
    .select('id, name, breed, date_of_birth, photo_url')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle()

  const dogId = (dog as { id?: string } | null)?.id ?? null
  const dogName = (dog as { name?: string } | null)?.name ?? 'Your dog'
  const dogBreed = (dog as { breed?: string | null } | null)?.breed ?? undefined
  const dogDob = (dog as { date_of_birth?: string | null } | null)?.date_of_birth ?? null
  const dogAge = ageLabelFromDateOfBirth(dogDob)
  const dogPhotoUrl = (dog as { photo_url?: string | null } | null)?.photo_url ?? undefined

  const { count } = await supabase
    .from('health_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const alertsCount = count ?? 0

  const todayStr = new Date().toISOString().split('T')[0]
  let healthLogDue = false
  if (dogId) {
    const { data: todayLog } = await supabase
      .from('health_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('dog_id', dogId)
      .eq('log_date', todayStr)
      .maybeSingle()
    healthLogDue = !todayLog
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        plan={plan}
        dogName={dogName}
        dogBreed={dogBreed ?? undefined}
        dogAge={dogAge}
        dogPhotoUrl={dogPhotoUrl ?? undefined}
        alertsCount={alertsCount}
        healthLogDue={healthLogDue}
      />

      <main
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: '#f7f9f7',
          minHeight: '100vh',
          padding: '32px',
          color: '#111827',
        }}
      >
        <div className="md:hidden" style={{ height: 56 }} />
        <div className="flex items-center justify-between">
          <p className="truncate text-xs" style={{ color: '#6b7280' }} title={user.email ?? ''}>
            {user.email}
          </p>
          <SignOutButton variant="sidebar" />
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  )
}
