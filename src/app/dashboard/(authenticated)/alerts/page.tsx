import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markAlertRead } from './actions'

type HealthAlertRow = {
  id: string
  dog_name: string
  message: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
  is_read: boolean
}

function severityBadge(sev: HealthAlertRow['severity']) {
  if (sev === 'high') return { bg: '#fee2e2', text: '#991b1b', label: 'High' }
  if (sev === 'medium') return { bg: '#fef9c3', text: '#a16207', label: 'Medium' }
  return { bg: '#f3f4f6', text: '#6b7280', label: 'Low' }
}

function unreadBorder(sev: HealthAlertRow['severity']): string {
  if (sev === 'high') return '#ef4444'
  if (sev === 'medium') return '#f59e0b'
  return '#9ca3af'
}

export default async function AlertsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data, error } = await supabase
    .from('health_alerts')
    .select('id, dog_name, message, severity, created_at, is_read')
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  const alerts: HealthAlertRow[] = (data ?? []) as HealthAlertRow[]

  const { data: remindersData } = await supabase
    .from('reminders')
    .select('id, dog_id, type, title, due_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('due_at', { ascending: true })
    .limit(8)

  const dogIds = Array.from(new Set((remindersData ?? []).map((r) => String(r.dog_id))))
  const { data: dogsData } = dogIds.length
    ? await supabase.from('dogs').select('id, name').in('id', dogIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const dogNameById = new Map((dogsData ?? []).map((d) => [String(d.id), String(d.name)]))
  const reminders = (remindersData ?? []).map((r) => ({
    id: String(r.id),
    type: String(r.type),
    title: String(r.title),
    due_at: String(r.due_at),
    dog_name: dogNameById.get(String(r.dog_id)) ?? 'Dog',
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
        🔔 Alerts & reminders
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
        Proactive health notifications and upcoming care reminders
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load alerts: {error.message}
        </div>
      ) : null}

      {alerts.length === 0 && !error ? (
        <p className="mt-8 text-center text-sm" style={{ color: '#6b7280' }}>
          No alerts yet. We&apos;ll notify you if we detect any health concerns.
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {alerts.map((a) => {
          const badge = severityBadge(a.severity)
          const action = markAlertRead.bind(null, a.id)
          return (
            <div
              key={a.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
              style={
                a.is_read
                  ? undefined
                  : { borderLeft: `4px solid ${unreadBorder(a.severity)}` }
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                    {a.dog_name}
                  </span>
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>

                {!a.is_read ? (
                  <form action={action}>
                    <button
                      type="submit"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium"
                      style={{ color: '#374151' }}
                    >
                      Mark as read
                    </button>
                  </form>
                ) : null}
              </div>

              <p className="mt-3 text-sm" style={{ color: '#374151' }}>
                {a.message}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
          🔔 Upcoming reminders
        </h2>
        {reminders.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            No active reminders.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: '#111827' }}>
                      {r.title}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: '#6b7280' }}>
                      {r.dog_name} · {r.type}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    {new Date(r.due_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

