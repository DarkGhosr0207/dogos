'use client'

import Link from 'next/link'
import {
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from 'react'
import { useRouter } from 'next/navigation'
import { saveHealthLog } from '@/app/dashboard/(authenticated)/health/actions'

const CARD_BORDER = '#e5e7eb'
const GREEN = '#2d7a4f'

const RING_R = 18
const RING_C = 2 * Math.PI * RING_R

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😟',
  tired: '😴',
}

const MOOD_LABEL: Record<string, string> = {
  happy: 'Happy',
  neutral: 'Neutral',
  sad: 'Sad',
  tired: 'Tired',
}

const APPETITE_LABEL: Record<string, string> = {
  great: 'Great',
  normal: 'Normal',
  less: 'Less than usual',
  none: 'Not eating',
}

const ENERGY_LABEL: Record<string, string> = {
  high: 'High',
  normal: 'Normal',
  low: 'Low',
  very_low: 'Very low',
}

const STOOL_LABEL: Record<string, string> = {
  normal: 'Normal',
  soft: 'Soft',
  diarrhea: 'Diarrhea',
  none: 'None today',
}

const ACTIVITY_LABEL: Record<string, string> = {
  walk: 'Walk',
  run: 'Run',
  fetch_play: 'Fetch/Play',
  swimming: 'Swimming',
  training: 'Training',
  indoor_play: 'Indoor play',
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

function reminderDotColor(bucket: 'overdue' | 'this_week' | 'upcoming'): string {
  switch (bucket) {
    case 'overdue':
      return '#dc2626'
    case 'this_week':
      return '#ca8a04'
    default:
      return '#2d7a4f'
  }
}

type DashboardClientProps = {
  userEmail: string
  greeting: string
  dogs: {
    id: string
    name: string
    breed: string | null
    ageLabel: string
    photo_url: string | null
  } | null
  todayHealthEmpty: boolean
  todayHealth: {
    mood: string | null
    appetite: string | null
    energy: string | null
    stool: string | null
    notes: string | null
  } | null
  lastActivity: {
    logged_at: string
    duration_minutes: number
    activity_type: string
  } | null
  lastWeightKg: number | null
  weightTrend: 'up' | 'down' | 'same'
  reminders: Array<{
    id: string
    title: string
    due_at: string
    type: string
    dog_name: string
    due_label: string
    bucket: 'overdue' | 'this_week' | 'upcoming'
  }>
  weekMinutes: number
  activityScore: number
  symptomChecksThisMonth: number
  healthStreak: number
}

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: '16px',
}

const subStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
}

export default function DashboardClient({
  userEmail,
  greeting,
  dogs,
  todayHealthEmpty,
  todayHealth,
  lastActivity,
  lastWeightKg,
  weightTrend,
  reminders,
  weekMinutes,
  activityScore,
  symptomChecksThisMonth,
  healthStreak,
}: DashboardClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [moodSaving, setMoodSaving] = useState<string | null>(null)

  const scoreRounded = Math.round(activityScore)
  const dashFilled = (activityScore / 100) * RING_C

  const moodLine = useMemo(() => {
    if (!todayHealth?.mood) return '—'
    const e = MOOD_EMOJI[todayHealth.mood] ?? ''
    const l = MOOD_LABEL[todayHealth.mood] ?? todayHealth.mood
    return `${e} ${l}`
  }, [todayHealth])

  function pillStyle(active: boolean): CSSProperties {
    return {
      fontSize: '12px',
      fontWeight: 500,
      padding: '6px 10px',
      borderRadius: '999px',
      border: `1px solid ${active ? '#bbf7d0' : CARD_BORDER}`,
      backgroundColor: active ? '#f0fdf4' : '#ffffff',
      color: '#374151',
      whiteSpace: 'nowrap',
    }
  }

  function quickMood(mood: string) {
    if (!dogs) return
    setMoodSaving(mood)
    const fd = new FormData()
    fd.set('dog_id', dogs.id)
    fd.set('mood', mood)
    startTransition(async () => {
      const r = await saveHealthLog(fd)
      setMoodSaving(null)
      if (r.ok) router.refresh()
    })
  }

  const lastActivityLabel = lastActivity
    ? `${ACTIVITY_LABEL[lastActivity.activity_type] ?? lastActivity.activity_type} · ${lastActivity.duration_minutes} min`
    : null

  return (
    <div style={{ color: '#111827' }}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
          {greeting} 👋
        </h1>
        <p className="mt-1 text-sm" style={subStyle}>
          {userEmail}
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: '#4b5563' }}>
          Here&apos;s your morning briefing — activity, weight, and how {dogs?.name ?? 'your dog'}{' '}
          is doing today.
        </p>
      </header>

      {/* Section 1 — Hero */}
      <section
        className="mb-5 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ ...cardStyle, border: `1px solid ${CARD_BORDER}` }}
      >
        {dogs ? (
          <>
            <div className="flex min-w-0 items-center gap-4">
              {dogs.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dogs.photo_url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                  style={{ backgroundColor: GREEN }}
                  aria-hidden
                >
                  {dogs.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold" style={{ color: '#111827' }}>
                  {dogs.name}
                </h2>
                <p className="text-sm" style={subStyle}>
                  {(dogs.breed && dogs.breed.trim()) || 'Mixed / unknown'} · {dogs.ageLabel}
                </p>
                {lastActivityLabel ? (
                  <p className="mt-0.5 text-xs" style={subStyle}>
                    Last activity: {lastActivityLabel}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:max-w-[55%]">
              <span style={pillStyle(true)}>
                ⚖️{' '}
                {lastWeightKg != null ? `${lastWeightKg.toFixed(1)} kg` : '—'}
              </span>
              <span style={pillStyle(true)}>
                🏃 {weekMinutes} min this week
              </span>
              <span style={pillStyle(true)}>❤️ {moodLine}</span>
            </div>
          </>
        ) : (
          <p className="text-sm" style={subStyle}>
            Add a dog profile to unlock your personalized briefing.
          </p>
        )}
      </section>

      {/* Section 2 — Daily check-in banner */}
      {dogs && todayHealthEmpty ? (
        <section
          className="mb-5 rounded-2xl border p-5"
          style={{
            backgroundColor: '#f0fdf4',
            borderColor: '#86efac',
          }}
        >
          <h3 className="text-base font-semibold" style={{ color: '#14532d' }}>
            How is {dogs.name} feeling today?
          </h3>
          <p className="mt-1 text-sm" style={{ color: '#166534' }}>
            Take 30 seconds to log {dogs.name}&apos;s daily health check-in
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['happy', 'neutral', 'sad', 'tired'] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={pending}
                className="rounded-xl border px-4 py-2 text-2xl transition-opacity"
                style={{
                  borderColor: '#86efac',
                  backgroundColor: '#ffffff',
                  opacity: pending ? 0.6 : 1,
                  cursor: pending ? 'wait' : 'pointer',
                }}
                onClick={() => quickMood(m)}
                aria-label={MOOD_LABEL[m]}
              >
                {moodSaving === m ? '…' : MOOD_EMOJI[m]}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Section 3 — Stats */}
      <section className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={subStyle}>
            Activity this week
          </p>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 50, height: 50 }}>
              <svg width="50" height="50" viewBox="0 0 50 50" className="absolute" aria-hidden>
                <circle
                  cx="25"
                  cy="25"
                  r={RING_R}
                  fill="none"
                  stroke={CARD_BORDER}
                  strokeWidth="5"
                />
                <circle
                  cx="25"
                  cy="25"
                  r={RING_R}
                  fill="none"
                  stroke={GREEN}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${dashFilled} ${RING_C}`}
                  transform="rotate(-90 25 25)"
                />
              </svg>
              <span
                className="relative z-10 text-xs font-bold tabular-nums"
                style={{ color: GREEN }}
              >
                {scoreRounded}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: '#111827' }}>
                {scoreRounded} pts
              </p>
              <p className="text-xs" style={subStyle}>
                {weekMinutes} min this week
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={subStyle}>
            Current weight
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums" style={{ color: '#111827' }}>
              {lastWeightKg != null ? lastWeightKg.toFixed(1) : '—'}
            </span>
            {lastWeightKg != null ? (
              <span className="text-sm font-medium" style={{ color: '#6b7280' }}>
                kg
              </span>
            ) : null}
            {lastWeightKg != null ? (
              <span
                className="text-xl"
                style={{
                  color:
                    weightTrend === 'up'
                      ? '#dc2626'
                      : weightTrend === 'down'
                        ? GREEN
                        : '#9ca3af',
                }}
                aria-hidden
              >
                {weightTrend === 'up' ? '↑' : weightTrend === 'down' ? '↓' : '→'}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs" style={subStyle}>
            vs previous entry
          </p>
        </div>

        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={subStyle}>
            Health streak
          </p>
          {healthStreak > 0 ? (
            <>
              <p className="text-2xl font-bold" style={{ color: '#111827' }}>
                🔥 {healthStreak} days
              </p>
              <p className="text-xs" style={subStyle}>
                days logged in a row
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Start your streak today
            </p>
          )}
        </div>
      </section>
      <p className="mb-5 text-center text-xs" style={subStyle}>
        Symptom checks this month:{' '}
        <span style={{ color: '#374151', fontWeight: 600 }}>{symptomChecksThisMonth}</span>
      </p>

      {/* Section 4 — Today’s health summary */}
      {todayHealth ? (
        <section className="mb-5 rounded-2xl p-4" style={cardStyle}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={subStyle}>
            Shine today
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ color: '#374151' }}>
            <span>
              <span style={{ color: '#9ca3af' }}>Mood</span> ·{' '}
              {todayHealth.mood
                ? `${MOOD_EMOJI[todayHealth.mood] ?? ''} ${MOOD_LABEL[todayHealth.mood] ?? todayHealth.mood}`
                : '—'}
            </span>
            <span>
              <span style={{ color: '#9ca3af' }}>Appetite</span> ·{' '}
              {todayHealth.appetite
                ? APPETITE_LABEL[todayHealth.appetite] ?? todayHealth.appetite
                : '—'}
            </span>
            <span>
              <span style={{ color: '#9ca3af' }}>Energy</span> ·{' '}
              {todayHealth.energy
                ? ENERGY_LABEL[todayHealth.energy] ?? todayHealth.energy
                : '—'}
            </span>
            <span>
              <span style={{ color: '#9ca3af' }}>Stool</span> ·{' '}
              {todayHealth.stool ? STOOL_LABEL[todayHealth.stool] ?? todayHealth.stool : '—'}
            </span>
          </div>
        </section>
      ) : null}

      {/* Section 5 — Reminders */}
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={subStyle}>
            Upcoming reminders
          </h3>
          <Link
            href="/dashboard/reminders"
            className="text-xs font-medium"
            style={{ color: GREEN }}
          >
            View all
          </Link>
        </div>
        {reminders.length === 0 ? (
          <div
            className="rounded-2xl px-4 py-6 text-center text-sm"
            style={{ ...cardStyle, color: '#6b7280' }}
          >
            No upcoming reminders.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
                style={cardStyle}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: reminderDotColor(r.bucket) }}
                  aria-hidden
                />
                <span className="text-base" aria-hidden>
                  {typeIcon(r.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: '#111827' }}>
                    {r.title}
                  </p>
                  <p className="truncate text-xs" style={subStyle}>
                    {r.dog_name}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                  }}
                >
                  {r.due_label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section 6 — Quick actions */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={subStyle}>
          Quick actions
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Link
            href="/dashboard/symptoms"
            className="rounded-2xl border px-3 py-3 transition-colors hover:bg-gray-50"
            style={{ ...cardStyle, padding: '12px' }}
          >
            <span className="text-lg" aria-hidden>
              🩺
            </span>
            <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>
              Check symptoms
            </p>
          </Link>
          <Link
            href="/dashboard/legal"
            className="rounded-2xl border px-3 py-3 transition-colors hover:bg-gray-50"
            style={{ ...cardStyle, padding: '12px' }}
          >
            <span className="text-lg" aria-hidden>
              ⚖️
            </span>
            <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>
              Legal Hub
            </p>
          </Link>
          <Link
            href="/dashboard/vet"
            className="rounded-2xl border px-3 py-3 transition-colors hover:bg-gray-50"
            style={{ ...cardStyle, padding: '12px' }}
          >
            <span className="text-lg" aria-hidden>
              🏥
            </span>
            <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>
              Find Vet
            </p>
          </Link>
          <Link
            href="/dashboard/reminders"
            className="rounded-2xl border px-3 py-3 transition-colors hover:bg-gray-50"
            style={{ ...cardStyle, padding: '12px' }}
          >
            <span className="text-lg" aria-hidden>
              🔔
            </span>
            <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>
              Add reminder
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
