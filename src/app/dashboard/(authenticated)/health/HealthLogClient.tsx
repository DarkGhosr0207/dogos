'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { saveHealthLog } from './actions'
import { inputClass } from '@/lib/ui'

export type HealthDogOption = {
  id: string
  name: string
}

export type HealthLogRow = {
  id: string
  dog_id: string
  log_date: string
  mood: string | null
  appetite: string | null
  energy: string | null
  stool: string | null
  notes: string | null
}

const MOOD_OPTIONS = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'sad', label: 'Sad', emoji: '😟' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
] as const

const APPETITE_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '🍽️' },
  { value: 'normal', label: 'Normal', emoji: '😋' },
  { value: 'less', label: 'Less than usual', emoji: '😕' },
  { value: 'none', label: 'Not eating', emoji: '❌' },
] as const

const ENERGY_OPTIONS = [
  { value: 'high', label: 'High', emoji: '⚡' },
  { value: 'normal', label: 'Normal', emoji: '✅' },
  { value: 'low', label: 'Low', emoji: '🔋' },
  { value: 'very_low', label: 'Very low', emoji: '😴' },
] as const

const STOOL_OPTIONS = [
  { value: 'normal', label: 'Normal', emoji: '✅' },
  { value: 'soft', label: 'Soft', emoji: '💧' },
  { value: 'diarrhea', label: 'Diarrhea', emoji: '⚠️' },
  { value: 'none', label: 'None today', emoji: '❌' },
] as const

const MOOD_LABELS = Object.fromEntries(MOOD_OPTIONS.map((o) => [o.value, o.label])) as Record<
  string,
  string
>
const APPETITE_LABELS = Object.fromEntries(
  APPETITE_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>
const ENERGY_LABELS = Object.fromEntries(
  ENERGY_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>
const STOOL_LABELS = Object.fromEntries(
  STOOL_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>

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

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayHeading(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return 'Today'
  const [y, m, d] = dayKey.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`
}

function moodDotColor(mood: string | null): string {
  if (!mood) return '#e5e7eb'
  if (mood === 'happy') return '#2d7a4f'
  if (mood === 'neutral') return '#eab308'
  return '#ef4444'
}

function streakDays(logs: HealthLogRow[], dogId: string): number {
  const days = new Set(logs.filter((l) => l.dog_id === dogId).map((l) => l.log_date))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const cur = new Date(today)
  while (days.has(localDateKey(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

function daysLoggedThisMonth(logs: HealthLogRow[], dogId: string): number {
  const now = new Date()
  const y = now.getFullYear()
  const mo = now.getMonth()
  const keys = new Set(
    logs
      .filter((l) => l.dog_id === dogId)
      .filter((l) => {
        const [yy, mm] = l.log_date.split('-').map(Number)
        return yy === y && mm - 1 === mo
      })
      .map((l) => l.log_date)
  )
  return keys.size
}

function mostCommonMood(logs: HealthLogRow[], dogId: string): string | null {
  const moods = logs
    .filter((l) => l.dog_id === dogId && l.mood)
    .map((l) => l.mood as string)
  if (moods.length === 0) return null
  const counts = new Map<string, number>()
  for (const m of moods) {
    counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  let best: string | null = null
  let max = -1
  for (const [k, c] of counts) {
    if (c > max) {
      max = c
      best = k
    }
  }
  return best
}

const whiteCard: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '20px',
}

const subStyle: CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
}

const greenBtn: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '10px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}

type HealthLogClientProps = {
  dogs: HealthDogOption[]
  healthLogs: HealthLogRow[]
}

export default function HealthLogClient({ dogs, healthLogs }: HealthLogClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dogId, setDogId] = useState(dogs[0]?.id ?? '')
  const [editingToday, setEditingToday] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [mood, setMood] = useState<string>('')
  const [appetite, setAppetite] = useState<string>('')
  const [energy, setEnergy] = useState<string>('')
  const [stool, setStool] = useState<string>('')
  const [notes, setNotes] = useState('')

  const todayKey = useMemo(() => localDateKey(new Date()), [])
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey)

  useEffect(() => {
    setSelectedDayKey(todayKey)
  }, [todayKey, dogId])

  const dogName = dogs.find((d) => d.id === dogId)?.name ?? 'your dog'

  const logsForDog = useMemo(
    () => healthLogs.filter((l) => l.dog_id === dogId),
    [healthLogs, dogId]
  )

  const logByDate = useMemo(() => {
    const m = new Map<string, HealthLogRow>()
    for (const l of logsForDog) {
      m.set(l.log_date, l)
    }
    return m
  }, [logsForDog])

  const todayLog = logByDate.get(todayKey) ?? null
  const loggedToday =
    todayLog !== null &&
    Boolean(
      todayLog.mood ||
        todayLog.appetite ||
        todayLog.energy ||
        todayLog.stool ||
        (todayLog.notes && todayLog.notes.trim())
    )

  const syncFormFromLog = useCallback((log: HealthLogRow | null) => {
    if (!log) {
      setMood('')
      setAppetite('')
      setEnergy('')
      setStool('')
      setNotes('')
      return
    }
    setMood(log.mood ?? '')
    setAppetite(log.appetite ?? '')
    setEnergy(log.energy ?? '')
    setStool(log.stool ?? '')
    setNotes(log.notes ?? '')
  }, [])

  useEffect(() => {
    if (editingToday || !loggedToday) {
      syncFormFromLog(todayLog)
    }
  }, [todayLog, loggedToday, editingToday, syncFormFromLog])

  const timelineDays = useMemo(() => {
    const out: { key: string; dayNum: number }[] = []
    const anchor = new Date()
    anchor.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(anchor)
      d.setDate(anchor.getDate() - i)
      out.push({ key: localDateKey(d), dayNum: d.getDate() })
    }
    return out
  }, [])

  const selectedLog = logByDate.get(selectedDayKey) ?? null

  const insights = useMemo(() => {
    const monthCount = daysLoggedThisMonth(healthLogs, dogId)
    const mood = mostCommonMood(healthLogs, dogId)
    const streak = streakDays(healthLogs, dogId)
    return {
      monthCount,
      moodLabel: mood ? MOOD_LABELS[mood] ?? mood : null,
      streak,
    }
  }, [healthLogs, dogId])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const fd = new FormData()
    fd.set('dog_id', dogId)
    fd.set('log_date', todayKey)
    if (mood) fd.set('mood', mood)
    if (appetite) fd.set('appetite', appetite)
    if (energy) fd.set('energy', energy)
    if (stool) fd.set('stool', stool)
    if (notes.trim()) fd.set('notes', notes.trim())

    startTransition(async () => {
      const result = await saveHealthLog(fd)
      if (!result.ok) {
        setFormError(result.error ?? 'Could not save.')
        return
      }
      setEditingToday(false)
      router.refresh()
    })
  }

  const showCheckinForm = !loggedToday || editingToday

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold" style={{ color: '#111827' }}>
        Daily Health Log
      </h1>
      <p className="mb-6 text-sm" style={subStyle}>
        A quick daily check-in for your dog&apos;s wellbeing.
      </p>

      <section style={{ ...whiteCard, marginBottom: '24px' }}>
        {dogs.length > 1 ? (
          <div className="mb-4">
            <label
              htmlFor="health-dog"
              className="mb-1.5 block text-sm font-medium"
              style={{ color: '#374151' }}
            >
              Dog
            </label>
            <select
              id="health-dog"
              className={inputClass}
              value={dogId}
              onChange={(e) => {
                setDogId(e.target.value)
                setEditingToday(false)
              }}
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <h2 className="mb-4 text-lg font-semibold" style={{ color: '#111827' }}>
          How is {dogName} today?
        </h2>

        {loggedToday && !editingToday ? (
          <div
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0' }}
          >
            <span className="text-sm font-medium" style={{ color: '#14532d' }}>
              ✅ Logged today
            </span>
            <button
              type="button"
              className="text-sm font-medium underline-offset-2 hover:underline"
              style={{ color: '#2d7a4f' }}
              onClick={() => setEditingToday(true)}
            >
              Edit
            </button>
          </div>
        ) : null}

        {showCheckinForm && dogs.length > 0 ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <span className="mb-2 block text-sm font-medium" style={{ color: '#374151' }}>
                Mood
              </span>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((opt) => {
                  const sel = mood === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMood(sel ? '' : opt.value)}
                      className="rounded-xl border px-3 py-2 text-sm font-medium"
                      style={{
                        borderColor: sel ? '#2d7a4f' : '#e5e7eb',
                        backgroundColor: sel ? '#ecfdf5' : '#ffffff',
                        color: sel ? '#14532d' : '#374151',
                      }}
                    >
                      <span className="mr-1" aria-hidden>
                        {opt.emoji}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium" style={{ color: '#374151' }}>
                Appetite
              </span>
              <div className="flex flex-wrap gap-2">
                {APPETITE_OPTIONS.map((opt) => {
                  const sel = appetite === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAppetite(sel ? '' : opt.value)}
                      className="rounded-xl border px-3 py-2 text-sm font-medium"
                      style={{
                        borderColor: sel ? '#2d7a4f' : '#e5e7eb',
                        backgroundColor: sel ? '#ecfdf5' : '#ffffff',
                        color: sel ? '#14532d' : '#374151',
                      }}
                    >
                      <span className="mr-1" aria-hidden>
                        {opt.emoji}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium" style={{ color: '#374151' }}>
                Energy
              </span>
              <div className="flex flex-wrap gap-2">
                {ENERGY_OPTIONS.map((opt) => {
                  const sel = energy === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEnergy(sel ? '' : opt.value)}
                      className="rounded-xl border px-3 py-2 text-sm font-medium"
                      style={{
                        borderColor: sel ? '#2d7a4f' : '#e5e7eb',
                        backgroundColor: sel ? '#ecfdf5' : '#ffffff',
                        color: sel ? '#14532d' : '#374151',
                      }}
                    >
                      <span className="mr-1" aria-hidden>
                        {opt.emoji}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium" style={{ color: '#374151' }}>
                Stool
              </span>
              <div className="flex flex-wrap gap-2">
                {STOOL_OPTIONS.map((opt) => {
                  const sel = stool === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStool(sel ? '' : opt.value)}
                      className="rounded-xl border px-3 py-2 text-sm font-medium"
                      style={{
                        borderColor: sel ? '#2d7a4f' : '#e5e7eb',
                        backgroundColor: sel ? '#ecfdf5' : '#ffffff',
                        color: sel ? '#14532d' : '#374151',
                      }}
                    >
                      <span className="mr-1" aria-hidden>
                        {opt.emoji}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="health-notes"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: '#374151' }}
              >
                Notes <span style={subStyle}>(optional)</span>
              </label>
              <textarea
                id="health-notes"
                rows={3}
                className={inputClass}
                placeholder="Anything else worth noting…"
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
              disabled={pending}
              style={{
                ...greenBtn,
                opacity: pending ? 0.65 : 1,
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              {pending ? 'Saving…' : "Save today's log"}
            </button>
          </form>
        ) : dogs.length === 0 ? (
          <p className="text-sm" style={subStyle}>
            Add a dog first to start logging.
          </p>
        ) : null}
      </section>

      <section style={{ ...whiteCard, marginBottom: '24px' }}>
        <h2 className="mb-3 text-base font-semibold" style={{ color: '#111827' }}>
          Last 14 days
        </h2>
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-min gap-2 px-1">
            {timelineDays.map(({ key, dayNum }) => {
              const log = logByDate.get(key)
              const dot = moodDotColor(log?.mood ?? null)
              const isSel = selectedDayKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDayKey(key)}
                  className="flex w-12 shrink-0 flex-col items-center gap-1 rounded-xl border py-2 text-xs font-medium transition-colors"
                  style={{
                    borderColor: isSel ? '#2d7a4f' : '#e5e7eb',
                    backgroundColor: isSel ? '#f0fdf4' : '#ffffff',
                    color: '#374151',
                  }}
                >
                  <span className="text-sm font-semibold tabular-nums" style={{ color: '#111827' }}>
                    {dayNum}
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: dot }}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 border-t pt-4" style={{ borderColor: '#e5e7eb' }}>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: '#374151' }}>
            {formatDayHeading(selectedDayKey, todayKey)}
          </h3>
          {selectedLog ? (
            <dl className="grid gap-2 text-sm">
              {selectedLog.mood ? (
                <div className="flex justify-between gap-2">
                  <dt style={subStyle}>Mood</dt>
                  <dd style={{ color: '#111827' }}>{MOOD_LABELS[selectedLog.mood] ?? selectedLog.mood}</dd>
                </div>
              ) : null}
              {selectedLog.appetite ? (
                <div className="flex justify-between gap-2">
                  <dt style={subStyle}>Appetite</dt>
                  <dd style={{ color: '#111827' }}>
                    {APPETITE_LABELS[selectedLog.appetite] ?? selectedLog.appetite}
                  </dd>
                </div>
              ) : null}
              {selectedLog.energy ? (
                <div className="flex justify-between gap-2">
                  <dt style={subStyle}>Energy</dt>
                  <dd style={{ color: '#111827' }}>
                    {ENERGY_LABELS[selectedLog.energy] ?? selectedLog.energy}
                  </dd>
                </div>
              ) : null}
              {selectedLog.stool ? (
                <div className="flex justify-between gap-2">
                  <dt style={subStyle}>Stool</dt>
                  <dd style={{ color: '#111827' }}>
                    {STOOL_LABELS[selectedLog.stool] ?? selectedLog.stool}
                  </dd>
                </div>
              ) : null}
              {selectedLog.notes?.trim() ? (
                <div>
                  <dt className="mb-1" style={subStyle}>
                    Notes
                  </dt>
                  <dd style={{ color: '#111827' }}>{selectedLog.notes}</dd>
                </div>
              ) : null}
              {!selectedLog.mood &&
              !selectedLog.appetite &&
              !selectedLog.energy &&
              !selectedLog.stool &&
              !selectedLog.notes?.trim() ? (
                <p style={subStyle}>No details for this day.</p>
              ) : null}
            </dl>
          ) : (
            <p style={subStyle}>No log for this day.</p>
          )}
        </div>
      </section>

      <section style={whiteCard}>
        <h2 className="mb-3 text-base font-semibold" style={{ color: '#111827' }}>
          Insights
        </h2>
        <ul className="flex flex-col gap-2 text-sm" style={{ color: '#374151' }}>
          <li>
            <strong style={{ color: '#111827' }}>{insights.monthCount}</strong> days logged this
            month
          </li>
          <li>
            Most common mood:{' '}
            <strong style={{ color: '#111827' }}>
              {insights.moodLabel ?? '—'}
            </strong>
          </li>
          <li>
            Streak:{' '}
            <strong style={{ color: '#111827' }}>
              {insights.streak} day{insights.streak === 1 ? '' : 's'} in a row
            </strong>
          </li>
        </ul>
      </section>
    </div>
  )
}
