import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CSSProperties } from 'react'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function typeIcon(type: string): string {
  switch (type) {
    case 'vaccine':
      return '💉'
    case 'medication':
      return '💊'
    case 'vet_visit':
      return '🏥'
    default:
      return '📌'
  }
}

function formatDue(dueAtIso: string): string {
  return new Date(dueAtIso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfLocalWeek(d: Date): Date {
  const start = startOfLocalDay(d)
  const day = start.getDay()
  const daysUntilEndOfWeek = day === 0 ? 0 : 7 - day
  const end = new Date(start)
  end.setDate(end.getDate() + daysUntilEndOfWeek)
  end.setHours(23, 59, 59, 999)
  return end
}

function dueBucket(
  dueAtIso: string,
  now: Date
): 'overdue' | 'this_week' | 'upcoming' {
  const due = new Date(dueAtIso)
  const startToday = startOfLocalDay(now)
  const endWeek = endOfLocalWeek(now)

  if (due < startToday) return 'overdue'
  if (due <= endWeek) return 'this_week'
  return 'upcoming'
}

function dueBadgeStyle(
  bucket: 'overdue' | 'this_week' | 'upcoming'
): CSSProperties {
  const base: CSSProperties = {
    fontSize: '12px',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: '9999px',
    flexShrink: 0,
  }
  switch (bucket) {
    case 'overdue':
      return { ...base, backgroundColor: '#fef2f2', color: '#dc2626' }
    case 'this_week':
      return { ...base, backgroundColor: '#fffbeb', color: '#b45309' }
    default:
      return { ...base, backgroundColor: '#e8f5ed', color: '#2d7a4f' }
  }
}

const statCardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const statLabelStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const statNumberStyle: CSSProperties = {
  color: '#2d7a4f',
  fontSize: '36px',
  fontWeight: 700,
}

const statSubStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  marginTop: '4px',
}

const sectionHeaderStyle: CSSProperties = {
  color: '#111827',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const reminderRowStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '8px',
}

const reminderTitleStyle: CSSProperties = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 500,
}

const reminderSubStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
}

const quickCardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const quickTitleStyle: CSSProperties = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: 600,
}

const quickDescStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  marginTop: '4px',
}

type UpcomingReminder = {
  id: string
  title: string
  due_at: string
  type: string
  dog_name: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const now = new Date()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfMonthIso = startOfMonth.toISOString()

  const [dogsCountRes, remindersCountRes, remindersRes, dogsMapRes, symptomRes] =
    await Promise.all([
      supabase
        .from('dogs')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id),
      supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('reminders')
        .select('id, title, due_at, type, dog_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('due_at', { ascending: true })
        .limit(3),
      supabase.from('dogs').select('id, name').eq('owner_id', user.id),
      supabase
        .from('symptom_checks')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', startOfMonthIso),
    ])

  const dogsCount = dogsCountRes.count ?? 0
  const remindersTotal = remindersCountRes.count ?? 0
  const dogNameById = new Map(
    (dogsMapRes.data ?? []).map((d) => [d.id, d.name as string])
  )

  const upcomingReminders: UpcomingReminder[] = (remindersRes.data ?? []).map(
    (r) => ({
      id: r.id,
      title: r.title,
      due_at: r.due_at,
      type: r.type,
      dog_name: dogNameById.get(r.dog_id) ?? 'Dog',
    })
  )

  const symptomCountThisMonth = symptomRes.error
    ? 0
    : (symptomRes.count ?? 0)

  return (
    <div style={{ color: '#111827' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
          {greeting()} 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
          {user.email}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div style={statCardStyle}>
          <p className="mb-2" style={statLabelStyle}>
            Your dogs
          </p>
          <p style={statNumberStyle}>{dogsCount}</p>
          <p style={statSubStyle}>Profiles</p>
        </div>
        <div style={statCardStyle}>
          <p className="mb-2" style={statLabelStyle}>
            Upcoming reminders
          </p>
          <p style={statNumberStyle}>{remindersTotal}</p>
          <p style={statSubStyle}>Active reminders</p>
        </div>
        <div style={statCardStyle}>
          <p className="mb-2" style={statLabelStyle}>
            Symptom checks (this month)
          </p>
          <p style={statNumberStyle}>{symptomCountThisMonth}</p>
          <p style={statSubStyle}>AI checks run</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4" style={sectionHeaderStyle}>
          Upcoming reminders
        </h2>
        {upcomingReminders.length === 0 ? (
          <div
            className="rounded-xl px-6 py-10 text-center text-sm shadow-sm"
            style={{
              backgroundColor: '#ffffff',
              border: '1px dashed #e5e7eb',
              color: '#6b7280',
            }}
          >
            No upcoming reminders. Add one in Reminders.
          </div>
        ) : (
          <ul>
            {upcomingReminders.map((r) => {
              const bucket = dueBucket(r.due_at, now)
              return (
                <li key={r.id} style={reminderRowStyle}>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: '#2d7a4f' }}
                    aria-hidden
                  />
                  <span className="text-xl" aria-hidden>
                    {typeIcon(r.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p style={reminderTitleStyle}>{r.title}</p>
                    <p style={reminderSubStyle}>{r.dog_name}</p>
                  </div>
                  <span style={dueBadgeStyle(bucket)}>{formatDue(r.due_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4" style={sectionHeaderStyle}>
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/symptoms"
            className="flex cursor-pointer flex-col"
            style={quickCardStyle}
          >
            <span className="mb-2 text-2xl" aria-hidden>
              🩺
            </span>
            <span style={quickTitleStyle}>Check symptoms</span>
            <span style={quickDescStyle}>AI triage from observed signs</span>
          </Link>
          <Link
            href="/dashboard/legal"
            className="flex cursor-pointer flex-col"
            style={quickCardStyle}
          >
            <span className="mb-2 text-2xl" aria-hidden>
              ⚖️
            </span>
            <span style={quickTitleStyle}>Legal Hub</span>
            <span style={quickDescStyle}>Country guides & obligations</span>
          </Link>
          <Link
            href="/dashboard/vet"
            className="flex cursor-pointer flex-col"
            style={quickCardStyle}
          >
            <span className="mb-2 text-2xl" aria-hidden>
              🏥
            </span>
            <span style={quickTitleStyle}>Find vet</span>
            <span style={quickDescStyle}>Locate care near you</span>
          </Link>
          <Link
            href="/dashboard/dogs"
            className="flex cursor-pointer flex-col"
            style={quickCardStyle}
          >
            <span className="mb-2 text-2xl" aria-hidden>
              🐾
            </span>
            <span style={quickTitleStyle}>Add dog</span>
            <span style={quickDescStyle}>Manage profiles & details</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
