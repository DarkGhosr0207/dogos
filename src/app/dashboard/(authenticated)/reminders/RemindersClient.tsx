'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import {
  createReminder,
  deleteReminder,
  type CreateReminderFieldErrors,
} from './actions'
import { inputClass } from '@/lib/ui'

export type ReminderDogOption = {
  id: string
  name: string
}

export type ReminderWithDog = {
  id: string
  dog_id: string
  type: string
  title: string
  due_at: string
  dog_name: string
}

const REMINDER_TYPES = [
  { value: 'vaccine', label: 'Vaccine' },
  { value: 'medication', label: 'Medication' },
  { value: 'vet_visit', label: 'Vet visit' },
  { value: 'other', label: 'Other' },
] as const

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

function bucketForDue(
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

function formatDue(dueAtIso: string): string {
  return new Date(dueAtIso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

type RemindersClientProps = {
  dogs: ReminderDogOption[]
  reminders: ReminderWithDog[]
}

const reminderCardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '14px 16px',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const titleStyle: CSSProperties = {
  color: '#111827',
  fontWeight: 500,
}

const subStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
}

const addReminderBtnStyle: CSSProperties = {
  backgroundColor: '#2d7a4f',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '10px',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
}

const secondaryBtn =
  'w-full rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:opacity-50'
const primaryBtnModal =
  'w-full rounded-xl bg-[#2d7a4f] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#236040] disabled:opacity-50'

const labelOverdue: CSSProperties = {
  color: '#ef4444',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '12px',
}

const labelThisWeek: CSSProperties = {
  color: '#d97706',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '12px',
}

const labelUpcoming: CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '12px',
}

function barStyle(
  bucket: 'overdue' | 'this_week' | 'upcoming'
): CSSProperties {
  const bg =
    bucket === 'overdue'
      ? '#f87171'
      : bucket === 'this_week'
        ? '#fbbf24'
        : '#e5e7eb'
  return {
    width: '4px',
    height: '32px',
    borderRadius: '9999px',
    flexShrink: 0,
    backgroundColor: bg,
  }
}

function ReminderListItem({
  r,
  pendingId,
  onDelete,
  bucket,
}: {
  r: ReminderWithDog
  pendingId: string | null
  onDelete: (id: string) => void
  bucket: 'overdue' | 'this_week' | 'upcoming'
}) {
  return (
    <li style={reminderCardStyle}>
      <div style={barStyle(bucket)} aria-hidden />
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: '#f9fafb' }}
        aria-hidden
      >
        {typeIcon(r.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p style={titleStyle}>{r.title}</p>
        <p style={subStyle}>
          {r.dog_name} · Due {formatDue(r.due_at)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(r.id)}
        disabled={pendingId === r.id}
        className="shrink-0 text-sm disabled:opacity-50"
        style={{ color: '#f87171', cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
      >
        {pendingId === r.id ? '…' : 'Delete'}
      </button>
    </li>
  )
}

function ReminderSection({
  variant,
  list,
  pendingId,
  onDelete,
}: {
  variant: 'overdue' | 'this_week' | 'upcoming'
  list: ReminderWithDog[]
  pendingId: string | null
  onDelete: (id: string) => void
}) {
  if (list.length === 0) return null

  const headingStyle =
    variant === 'overdue'
      ? labelOverdue
      : variant === 'this_week'
        ? labelThisWeek
        : labelUpcoming

  const labelText =
    variant === 'overdue'
      ? 'OVERDUE'
      : variant === 'this_week'
        ? 'THIS WEEK'
        : 'UPCOMING'

  return (
    <section>
      <h2 style={headingStyle}>{labelText}</h2>
      <ul>
        {list.map((r) => (
          <ReminderListItem
            key={r.id}
            r={r}
            pendingId={pendingId}
            onDelete={onDelete}
            bucket={variant}
          />
        ))}
      </ul>
    </section>
  )
}

export default function RemindersClient({
  dogs,
  reminders,
}: RemindersClientProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [formPending, setFormPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<CreateReminderFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])

  const defaultDueValue = useMemo(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }, [])

  const grouped = useMemo(() => {
    const overdue: ReminderWithDog[] = []
    const thisWeek: ReminderWithDog[] = []
    const upcoming: ReminderWithDog[] = []
    for (const r of reminders) {
      const b = bucketForDue(r.due_at, now)
      if (b === 'overdue') overdue.push(r)
      else if (b === 'this_week') thisWeek.push(r)
      else upcoming.push(r)
    }
    return { overdue, thisWeek, upcoming }
  }, [reminders, now])

  function handleDelete(id: string) {
    if (!confirm('Delete this reminder?')) return
    setPendingId(id)
    void (async () => {
      try {
        const result = await deleteReminder(id)
        if (!result.ok) {
          alert(result.error)
          return
        }
        router.refresh()
      } finally {
        setPendingId(null)
      }
    })()
  }

  async function onCreate(formData: FormData) {
    setFormPending(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const result = await createReminder(formData)
      if (result.ok) {
        router.refresh()
        setFormOpen(false)
        return
      }
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      if (result.error) setFormError(result.error)
    } finally {
      setFormPending(false)
    }
  }

  const labelClass = 'block text-sm font-medium text-gray-700'

  return (
    <div style={{ color: '#111827' }}>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            style={{
              color: '#111827',
              fontSize: '24px',
              fontWeight: 700,
            }}
          >
            Reminders
          </h1>
          <p
            className="mt-1"
            style={{ color: '#6b7280', fontSize: '14px' }}
          >
            Vaccines, meds, and visits—grouped by urgency.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          style={addReminderBtnStyle}
        >
          Add reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-200 px-6 py-16 text-center shadow-sm">
          <p className="text-gray-500">
            No reminders yet. Add your first reminder!
          </p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-10">
          <ReminderSection
            variant="overdue"
            list={grouped.overdue}
            pendingId={pendingId}
            onDelete={handleDelete}
          />
          <ReminderSection
            variant="this_week"
            list={grouped.thisWeek}
            pendingId={pendingId}
            onDelete={handleDelete}
          />
          <ReminderSection
            variant="upcoming"
            list={grouped.upcoming}
            pendingId={pendingId}
            onDelete={handleDelete}
          />
        </div>
      )}

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-reminder-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2
                id="add-reminder-title"
                className="text-lg font-bold text-gray-900"
              >
                Add reminder
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError ? (
              <p className="mb-4 text-sm text-red-500" role="alert">
                {formError}
              </p>
            ) : null}

            <form action={onCreate} className="space-y-5">
              <div>
                <label className={labelClass} htmlFor="reminder-dog">
                  Dog
                </label>
                <select
                  id="reminder-dog"
                  name="dog_id"
                  required
                  disabled={formPending || dogs.length === 0}
                  defaultValue={dogs[0]?.id ?? ''}
                  className={`mt-2 ${inputClass}`}
                >
                  {dogs.length === 0 ? (
                    <option value="">No dogs</option>
                  ) : (
                    dogs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  )}
                </select>
                {fieldErrors.dog_id ? (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldErrors.dog_id}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="reminder-type">
                  Type
                </label>
                <select
                  id="reminder-type"
                  name="type"
                  required
                  disabled={formPending}
                  defaultValue="vaccine"
                  className={`mt-2 ${inputClass}`}
                >
                  {REMINDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.type ? (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.type}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="reminder-title">
                  Title
                </label>
                <input
                  id="reminder-title"
                  name="title"
                  required
                  autoComplete="off"
                  disabled={formPending}
                  placeholder="e.g. Rabies booster"
                  className={`mt-2 ${inputClass}`}
                />
                {fieldErrors.title ? (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldErrors.title}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="reminder-due">
                  Due date
                </label>
                <input
                  id="reminder-due"
                  name="due_at"
                  type="datetime-local"
                  required
                  disabled={formPending}
                  defaultValue={defaultDueValue}
                  className={`mt-2 ${inputClass}`}
                />
                {fieldErrors.due_at ? (
                  <p className="mt-1 text-xs text-red-500">
                    {fieldErrors.due_at}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={formPending}
                  className={`w-full ${secondaryBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formPending || dogs.length === 0}
                  className={`w-full ${primaryBtnModal} mt-4`}
                >
                  {formPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
