'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteActivity,
  logActivity,
  type LogActivityFieldErrors,
} from './actions'
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

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const s = new Date(d)
  s.setDate(d.getDate() + diff)
  s.setHours(0, 0, 0, 0)
  return s
}

function endOfWeekMonday(d: Date): Date {
  const s = startOfWeekMonday(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}

function localDateKey(iso: string): string {
  const t = new Date(iso)
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLoggedDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

type ActivityClientProps = {
  dogs: ActivityDogOption[]
  activities: ActivityLogRow[]
}

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px 18px',
}

const summaryCardStyle: CSSProperties = {
  ...cardStyle,
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

export default function ActivityClient({
  dogs,
  activities,
}: ActivityClientProps) {
  const router = useRouter()
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

  const now = useMemo(() => new Date(), [])

  const weekStats = useMemo(() => {
    const start = startOfWeekMonday(now)
    const end = endOfWeekMonday(now)
    const inWeek = activities.filter((a) => {
      const t = new Date(a.logged_at)
      return t >= start && t <= end
    })
    const totalActivities = inWeek.length
    const totalMinutes = inWeek.reduce((s, a) => s + a.duration_minutes, 0)

    const minutesByDay = new Map<string, number>()
    for (const a of inWeek) {
      const key = localDateKey(a.logged_at)
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + a.duration_minutes)
    }

    let mostActiveDay: string | null = null
    let maxM = -1
    for (const [dayKey, mins] of minutesByDay) {
      if (mins > maxM) {
        maxM = mins
        const [y, m, d] = dayKey.split('-').map(Number)
        mostActiveDay = new Date(y, m - 1, d).toLocaleDateString(undefined, {
          weekday: 'long',
        })
      }
    }
    if (totalActivities === 0) {
      mostActiveDay = null
    }

    return {
      totalActivities,
      totalMinutes,
      mostActiveDay: mostActiveDay ?? '—',
    }
  }, [activities, now])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold" style={{ color: '#111827' }}>
        Activity Tracker
      </h1>
      <p className="mb-6 text-sm" style={subStyle}>
        Log walks, runs, and play — see your week at a glance.
      </p>

      <section style={summaryCardStyle} aria-label="Weekly summary">
        <h2 className="mb-3 text-sm font-semibold" style={{ color: '#1f2937' }}>
          This week
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div style={{ ...subStyle, fontSize: '12px' }}>Total activities</div>
            <div className="text-xl font-semibold" style={{ color: '#111827' }}>
              {weekStats.totalActivities}
            </div>
          </div>
          <div>
            <div style={{ ...subStyle, fontSize: '12px' }}>Total minutes</div>
            <div className="text-xl font-semibold" style={{ color: '#111827' }}>
              {weekStats.totalMinutes}
            </div>
          </div>
          <div>
            <div style={{ ...subStyle, fontSize: '12px' }}>Most active day</div>
            <div className="text-xl font-semibold" style={{ color: '#111827' }}>
              {weekStats.mostActiveDay}
            </div>
          </div>
        </div>
      </section>

      <section style={cardStyle} className="mb-8">
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
            <span className="mb-1.5 block text-sm font-medium" style={{ color: '#374151' }}>
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
              <p className="mt-1 text-sm text-red-600">{fieldErrors.activity_type}</p>
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
              <p className="mt-1 text-sm text-red-600">{fieldErrors.duration_minutes}</p>
            ) : null}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium" style={{ color: '#374151' }}>
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
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm" style={{ color: '#6b7280' }}>
            No activities logged yet. Start tracking!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activities.map((a) => (
              <li
                key={a.id}
                style={{
                  ...cardStyle,
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
                      {formatLoggedDate(a.logged_at)}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span style={intensityBadge(a.intensity)}>{intensityLabel(a.intensity)}</span>
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
    </div>
  )
}
