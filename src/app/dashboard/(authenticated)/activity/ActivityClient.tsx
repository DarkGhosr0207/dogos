'use client'

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  deleteActivity,
  logActivity,
  type LogActivityFieldErrors,
} from './actions'
import {
  endOfWeekMonday,
  localDateKey,
  startOfWeekMonday,
  type WeeklyActivityStats,
} from './weekly-stats'
import { inputClass } from '@/lib/ui'

export type ActivityDogOption = {
  id: string
  name: string
}

export type ActivityLogRow = {
  id: string
  dog_id: string
  activity_type: string
  duration_minutes: number
  distance_km: number | null
  intensity: string
  notes: string | null
  logged_at: string
  dog_name: string
}

const ACTIVITY_OPTIONS = [
  { value: 'walk', label: 'Walk', emoji: '🚶' },
  { value: 'run', label: 'Run', emoji: '🏃' },
  { value: 'fetch_play', label: 'Fetch/Play', emoji: '🎾' },
  { value: 'swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'training', label: 'Training', emoji: '🧘' },
  { value: 'indoor_play', label: 'Indoor play', emoji: '🏠' },
] as const

const INTENSITY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'intense', label: 'Intense' },
] as const

/** Circumference for r=54: matches stroke-dasharray spec (~339.3) */
const RING_C = 339.3

/** English weekday names — avoids locale mismatch between server and client (getDay(): 0=Sun … 6=Sat) */
const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Deterministic English date/time (local components) — only use after mount to avoid TZ hydration mismatch */
function formatLoggedDateEnglish(iso: string): string {
  const d = new Date(iso)
  const mo = MONTHS_SHORT[d.getMonth()]
  const day = d.getDate()
  const y = d.getFullYear()
  let h = d.getHours()
  const min = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${mo} ${day}, ${y}, ${h12}:${pad2(min)} ${ampm}`
}

function activityEmoji(type: string): string {
  const found = ACTIVITY_OPTIONS.find((o) => o.value === type)
  return found?.emoji ?? '📍'
}

function activityLabel(type: string): string {
  const found = ACTIVITY_OPTIONS.find((o) => o.value === type)
  return found?.label ?? type
}

function intensityLabel(i: string): string {
  const found = INTENSITY_OPTIONS.find((o) => o.value === i)
  return found?.label ?? i
}

type ActivityClientProps = {
  dogs: ActivityDogOption[]
  activities: ActivityLogRow[]
  weeklyStats: WeeklyActivityStats
}

const whiteCard: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const summaryCardStyle: CSSProperties = {
  ...whiteCard,
  marginBottom: '20px',
  backgroundColor: '#f8faf8',
  borderColor: '#d1e0d4',
}

const greenBtnStyle: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}

const subStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
}

const intensityBadge = (intensity: string): CSSProperties => {
  const base: CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '999px',
    textTransform: 'capitalize' as const,
  }
  switch (intensity) {
    case 'easy':
      return { ...base, backgroundColor: '#dcfce7', color: '#166534' }
    case 'intense':
      return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' }
    default:
      return { ...base, backgroundColor: '#e0f2fe', color: '#0369a1' }
  }
}

function heatmapBg(minutes: number): string {
  if (minutes <= 0) return '#e5e7eb'
  if (minutes <= 30) return '#86efac'
  if (minutes <= 60) return '#4ade80'
  return '#16a34a'
}

function lastWeekMinutes(activities: ActivityLogRow[], now: Date): number {
  const thisStart = startOfWeekMonday(now)
  const lastStart = new Date(thisStart)
  lastStart.setDate(lastStart.getDate() - 7)
  const lastEnd = new Date(lastStart)
  lastEnd.setDate(lastStart.getDate() + 6)
  lastEnd.setHours(23, 59, 59, 999)
  return activities
    .filter((a) => {
      const t = new Date(a.logged_at)
      return t >= lastStart && t <= lastEnd
    })
    .reduce((s, a) => s + a.duration_minutes, 0)
}

export default function ActivityClient({
  dogs,
  activities,
  weeklyStats,
}: ActivityClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'log' | 'analytics'>('log')
  const [pending, startTransition] = useTransition()
  const [deletePending, setDeletePending] = useState<string | null>(null)

  const [dogId, setDogId] = useState(dogs[0]?.id ?? '')
  const [activityType, setActivityType] =
    useState<(typeof ACTIVITY_OPTIONS)[number]['value']>('walk')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [intensity, setIntensity] =
    useState<(typeof INTENSITY_OPTIONS)[number]['value']>('moderate')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<LogActivityFieldErrors>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const now = useMemo(() => new Date(), [])

  const mostActiveDayLabel = useMemo(() => {
    const start = startOfWeekMonday(now)
    const end = endOfWeekMonday(now)
    const inWeek = activities.filter((a) => {
      const t = new Date(a.logged_at)
      return t >= start && t <= end
    })
    const minutesByDay = new Map<string, number>()
    for (const a of inWeek) {
      const key = localDateKey(a.logged_at)
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + a.duration_minutes)
    }
    let best: string | null = null
    let maxM = -1
    for (const [dayKey, mins] of minutesByDay) {
      if (mins > maxM) {
        maxM = mins
        const [y, m, d] = dayKey.split('-').map(Number)
        const date = new Date(y, m - 1, d)
        best = DAYS[date.getDay()]
      }
    }
    if (inWeek.length === 0) return '—'
    return best ?? '—'
  }, [activities, now])

  const weekBarData = useMemo(() => {
    const start = startOfWeekMonday(now)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = localDateKey(d.toISOString())
      const minutes = activities
        .filter((a) => localDateKey(a.logged_at) === key)
        .reduce((s, a) => s + a.duration_minutes, 0)
      return {
        day: SHORT_DAYS[d.getDay()],
        minutes,
        hasActivity: minutes > 0,
      }
    })
  }, [activities, now])

  const breakdown30 = useMemo(() => {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 30)
    cutoff.setHours(0, 0, 0, 0)
    const byType = new Map<string, number>()
    for (const a of activities) {
      if (new Date(a.logged_at) < cutoff) continue
      byType.set(
        a.activity_type,
        (byType.get(a.activity_type) ?? 0) + a.duration_minutes
      )
    }
    const entries = [...byType.entries()]
      .filter(([, m]) => m > 0)
      .sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, [, m]) => s + m, 0)
    return entries.map(([type, mins]) => ({
      type,
      minutes: mins,
      pct: total > 0 ? Math.round((mins / total) * 100) : 0,
    }))
  }, [activities, now])

  const heatmapCells = useMemo(() => {
    const cells: { minutes: number }[] = []
    for (let offset = 0; offset < 35; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      d.setDate(d.getDate() - (34 - offset))
      const key = localDateKey(d.toISOString())
      const minutes = activities
        .filter((a) => localDateKey(a.logged_at) === key)
        .reduce((s, a) => s + a.duration_minutes, 0)
      cells.push({ minutes })
    }
    return cells
  }, [activities, now])

  const bestWeekdayInsight = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    for (const a of activities) {
      const d = new Date(a.logged_at)
      const idx = d.getDay()
      const monIdx = idx === 0 ? 6 : idx - 1
      totals[monIdx] += a.duration_minutes
    }
    const mondayFirstLong: readonly string[] = [
      DAYS[1],
      DAYS[2],
      DAYS[3],
      DAYS[4],
      DAYS[5],
      DAYS[6],
      DAYS[0],
    ]
    let bestIdx = 0
    let max = -1
    totals.forEach((m, i) => {
      if (m > max) {
        max = m
        bestIdx = i
      }
    })
    if (max <= 0) return null
    return mondayFirstLong[bestIdx]
  }, [activities])

  const progressInsight = useMemo(() => {
    const thisM = weeklyStats.totalMinutesThisWeek
    const lastM = lastWeekMinutes(activities, now)
    if (lastM === 0 && thisM === 0) {
      return { kind: 'empty' as const }
    }
    if (lastM === 0 && thisM > 0) {
      return { kind: 'start' as const }
    }
    const pct = Math.round(((thisM - lastM) / lastM) * 100)
    if (thisM >= lastM) {
      return { kind: 'up' as const, pct }
    }
    return { kind: 'down' as const, pct: Math.abs(pct) }
  }, [activities, now, weeklyStats.totalMinutesThisWeek])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const fd = new FormData()
    fd.set('dog_id', dogId)
    fd.set('activity_type', activityType)
    fd.set('duration_minutes', String(durationMinutes))
    fd.set('intensity', intensity)
    if (notes.trim()) fd.set('notes', notes.trim())

    startTransition(async () => {
      const result = await logActivity(fd)
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        if (result.error) setFormError(result.error)
        return
      }
      setNotes('')
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    setDeletePending(id)
    const result = await deleteActivity(id)
    setDeletePending(null)
    if (result.ok) router.refresh()
  }

  const dashFilled = (weeklyStats.activityScore / 100) * RING_C

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold" style={{ color: '#111827' }}>
        Activity Tracker
      </h1>
      <p className="mb-6 text-sm" style={subStyle}>
        Log walks, runs, and play — see your week at a glance.
      </p>

      <div className="mb-6 flex gap-1 border-b" style={{ borderColor: '#e5e7eb' }}>
        <button
          type="button"
          onClick={() => setTab('log')}
          className="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            borderColor: tab === 'log' ? '#2d7a4f' : 'transparent',
            color: tab === 'log' ? '#2d7a4f' : '#6b7280',
          }}
        >
          Log Activity
        </button>
        <button
          type="button"
          onClick={() => setTab('analytics')}
          className="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            borderColor: tab === 'analytics' ? '#2d7a4f' : 'transparent',
            color: tab === 'analytics' ? '#2d7a4f' : '#6b7280',
          }}
        >
          Analytics
        </button>
      </div>

      {tab === 'log' ? (
        <>
          <section style={summaryCardStyle} aria-label="Weekly summary">
            <h2 className="mb-3 text-sm font-semibold" style={{ color: '#1f2937' }}>
              This week
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <div style={{ ...subStyle, fontSize: '12px' }}>Total activities</div>
                <div className="text-xl font-semibold" style={{ color: '#111827' }}>
                  {weeklyStats.totalActivitiesThisWeek}
                </div>
              </div>
              <div>
                <div style={{ ...subStyle, fontSize: '12px' }}>Total minutes</div>
                <div className="text-xl font-semibold" style={{ color: '#111827' }}>
                  {weeklyStats.totalMinutesThisWeek}
                </div>
              </div>
              <div>
                <div style={{ ...subStyle, fontSize: '12px' }}>Most active day</div>
                <div className="text-xl font-semibold" style={{ color: '#111827' }}>
                  {mostActiveDayLabel}
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...whiteCard, marginBottom: '32px' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#111827' }}>
              Log Activity
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="activity-dog"
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: '#374151' }}
                >
                  Dog
                </label>
                <select
                  id="activity-dog"
                  name="dog_id"
                  className={inputClass}
                  value={dogId}
                  onChange={(e) => setDogId(e.target.value)}
                  required
                >
                  {dogs.length === 0 ? (
                    <option value="">No dogs yet</option>
                  ) : (
                    dogs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  )}
                </select>
                {fieldErrors.dog_id ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.dog_id}</p>
                ) : null}
              </div>

              <div>
                <span
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: '#374151' }}
                >
                  Activity type
                </span>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => {
                    const selected = activityType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setActivityType(opt.value)}
                        className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                        style={{
                          borderColor: selected ? '#2d7a4f' : '#e5e7eb',
                          backgroundColor: selected ? '#ecfdf5' : '#ffffff',
                          color: selected ? '#14532d' : '#374151',
                        }}
                      >
                        <span className="mr-1.5" aria-hidden>
                          {opt.emoji}
                        </span>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {fieldErrors.activity_type ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.activity_type}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="duration"
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: '#374151' }}
                >
                  Duration (minutes)
                </label>
                <input
                  id="duration"
                  name="duration_minutes"
                  type="number"
                  min={1}
                  className={inputClass}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Number.parseInt(e.target.value, 10) || 0)
                  }
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      className="rounded-lg border px-3 py-1.5 text-sm"
                      style={{
                        borderColor: '#d1d5db',
                        backgroundColor: '#f9fafb',
                        color: '#374151',
                      }}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                {fieldErrors.duration_minutes ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.duration_minutes}
                  </p>
                ) : null}
              </div>

              <div>
                <span
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: '#374151' }}
                >
                  Intensity
                </span>
                <div className="flex flex-wrap gap-2">
                  {INTENSITY_OPTIONS.map((opt) => {
                    const selected = intensity === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntensity(opt.value)}
                        className="rounded-xl border px-4 py-2 text-sm font-medium"
                        style={{
                          borderColor: selected ? '#2d7a4f' : '#e5e7eb',
                          backgroundColor: selected ? '#ecfdf5' : '#ffffff',
                          color: selected ? '#14532d' : '#374151',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {fieldErrors.intensity ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.intensity}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: '#374151' }}
                >
                  Notes <span style={subStyle}>(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className={inputClass}
                  placeholder="Anything worth noting…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {formError ? (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending || dogs.length === 0}
                style={{
                  ...greenBtnStyle,
                  opacity: pending || dogs.length === 0 ? 0.6 : 1,
                  cursor: pending || dogs.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {pending ? 'Logging…' : 'Log Activity'}
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold" style={{ color: '#111827' }}>
              Activity history
            </h2>
            {activities.length === 0 ? (
              <p
                className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm"
                style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb', color: '#6b7280' }}
              >
                No activities logged yet. Start tracking!
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {activities.map((a) => (
                  <li
                    key={a.id}
                    style={{
                      ...whiteCard,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: 0,
                    }}
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className="text-2xl leading-none" aria-hidden>
                        {activityEmoji(a.activity_type)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium" style={{ color: '#111827' }}>
                          {activityLabel(a.activity_type)}
                        </div>
                        <div className="text-sm" style={subStyle}>
                          {a.dog_name} · {a.duration_minutes} min
                        </div>
                        <div className="mt-1 text-xs" style={subStyle}>
                          {mounted ? formatLoggedDateEnglish(a.logged_at) : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span style={intensityBadge(a.intensity)}>
                        {intensityLabel(a.intensity)}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-medium underline-offset-2 hover:underline"
                        style={{ color: '#9ca3af' }}
                        disabled={deletePending === a.id}
                        onClick={() => handleDelete(a.id)}
                      >
                        {deletePending === a.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <section style={whiteCard}>
            <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-center gap-3">
                <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
                  <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      fill="none"
                      stroke="#2d7a4f"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${dashFilled} ${RING_C}`}
                      transform="rotate(-90 70 70)"
                    />
                  </svg>
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    aria-live="polite"
                  >
                    <span
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: '#2d7a4f' }}
                    >
                      {Math.round(weeklyStats.activityScore)}
                    </span>
                  </div>
                </div>
                <div className="text-center text-sm font-medium" style={{ color: '#374151' }}>
                  Weekly Activity Score
                </div>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-md">
                <div>
                  <div style={{ ...subStyle, fontSize: '12px' }}>Total minutes</div>
                  <div className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {weeklyStats.totalMinutesThisWeek}
                  </div>
                </div>
                <div>
                  <div style={{ ...subStyle, fontSize: '12px' }}>Activities</div>
                  <div className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {weeklyStats.totalActivitiesThisWeek}
                  </div>
                </div>
                <div>
                  <div style={{ ...subStyle, fontSize: '12px' }}>
                    Streak <span aria-hidden>🔥</span>
                  </div>
                  <div className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {weeklyStats.currentStreak} day
                    {weeklyStats.currentStreak === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section style={whiteCard}>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#111827' }}>
              This week
            </h2>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [
                      `${value ?? 0} min`,
                      'Minutes',
                    ]}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {weekBarData.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={entry.hasActivity ? '#2d7a4f' : '#e5e7eb'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={whiteCard}>
            <h2 className="mb-4 text-base font-semibold" style={{ color: '#111827' }}>
              Activity breakdown
            </h2>
            <p className="mb-4 text-sm" style={subStyle}>
              Last 30 days by type (minutes)
            </p>
            {breakdown30.length === 0 ? (
              <p className="text-sm" style={subStyle}>
                No activity in the last 30 days yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {breakdown30.map((row) => (
                  <li key={row.type} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium" style={{ color: '#111827' }}>
                        <span aria-hidden>{activityEmoji(row.type)}</span>
                        {activityLabel(row.type)}
                      </span>
                      <span style={{ color: '#6b7280' }}>{row.pct}%</span>
                    </div>
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: '#e5e7eb' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.pct}%`,
                          backgroundColor: '#2d7a4f',
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={whiteCard}>
            <div className="mb-3 text-sm font-medium" style={{ color: '#374151' }}>
              Last 35 days
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {heatmapCells.map((cell, i) => (
                <div
                  key={i}
                  title={`${cell.minutes} min`}
                  className="aspect-square rounded-sm"
                  style={{ backgroundColor: heatmapBg(cell.minutes) }}
                />
              ))}
            </div>
            <div
              className="mt-4 flex flex-wrap items-center gap-4 text-xs"
              style={{ color: '#6b7280' }}
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#e5e7eb' }} />
                None
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#86efac' }} />
                Light
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#4ade80' }} />
                Moderate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#16a34a' }} />
                High
              </span>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <section style={whiteCard}>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                {weeklyStats.currentStreak > 0 ? (
                  <>
                    <span aria-hidden>🔥</span> {weeklyStats.currentStreak} day
                    {weeklyStats.currentStreak === 1 ? '' : 's'} streak!
                  </>
                ) : (
                  <>Start a streak today!</>
                )}
              </p>
            </section>
            <section style={whiteCard}>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                {bestWeekdayInsight ? (
                  <>
                    <span aria-hidden>📅</span> Most active on {bestWeekdayInsight}
                  </>
                ) : (
                  <>
                    <span aria-hidden>📅</span> Log activities to see your best day
                  </>
                )}
              </p>
            </section>
            <section style={whiteCard}>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                {progressInsight.kind === 'empty' && (
                  <>Log activity to compare weeks.</>
                )}
                {progressInsight.kind === 'start' && (
                  <>
                    <span aria-hidden>📈</span> You&apos;re off to a strong start this week!
                  </>
                )}
                {progressInsight.kind === 'up' && (
                  <>
                    <span aria-hidden>📈</span> {progressInsight.pct}% more active than last week
                  </>
                )}
                {progressInsight.kind === 'down' && (
                  <>
                    <span aria-hidden>📉</span> {progressInsight.pct}% less active than last week
                  </>
                )}
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
