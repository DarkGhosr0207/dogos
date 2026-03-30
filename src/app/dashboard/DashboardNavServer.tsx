import DashboardNav, { type DashboardNavItem } from './dashboard-nav'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/freemium'

export default async function DashboardNavServer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const base: DashboardNavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/dogs', label: 'My Dogs', icon: '🐾' },
    { href: '/dashboard/reminders', label: 'Reminders', icon: '🔔' },
    { href: '/dashboard/activity', label: 'Activity', icon: '🏃' },
    { href: '/dashboard/health', label: 'Health Log', icon: '❤️' },
    { href: '/dashboard/weight', label: 'Weight', icon: '⚖️' },
    { href: '/dashboard/insights', label: 'AI Insights', icon: '👑' },
    { href: '/dashboard/travel', label: 'Travel', icon: '✈️' },
    { href: '/dashboard/report', label: 'Report', icon: '📋' },
    { href: '/dashboard/symptoms', label: 'Symptoms', icon: '🩺' },
    { href: '/dashboard/legal', label: 'Legal Hub', icon: '⚖️' },
    { href: '/dashboard/vet', label: 'Find Vet', icon: '🏥' },
  ]

  if (!user) {
    return <DashboardNav items={base} unreadAlertsCount={0} />
  }

  const plan = await getUserPlan(user.id)
  if (plan !== 'premium_plus') {
    return <DashboardNav items={base} unreadAlertsCount={0} />
  }

  const { count } = await supabase
    .from('health_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const unreadAlertsCount = count ?? 0

  const items: DashboardNavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/alerts', label: 'Alerts', icon: '🔔' },
    ...base.filter((x) => x.href !== '/dashboard'),
  ]

  return <DashboardNav items={items} unreadAlertsCount={unreadAlertsCount} />
}

