'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createReminder,
  deleteReminder,
  type CreateReminderFieldErrors,
} from './actions'

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

function typeLabel(type: string): string {
  const row = REMINDER_TYPES.find((t) => t.value === type)
  return row?.label ?? type
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

function bucketForDue(dueAtIso: string, now: Date): 'overdue' | 'this_week' | 'upcoming' {
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

function ReminderListItem({
  r,
  pendingId,
  onDelete,
}: {
  r: ReminderWithDog
  pendingId: string | null
  onDelete: (id: string) => void
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-neutral-950/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            {typeIcon(r.type)}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {typeLabel(r.type)}
          </span>
        </div>
        <p className="mt-1 font-medium text-neutral-100">{r.title}</p>
        <p className="mt-0.5 text-sm text-neutral-400">{r.dog_name}</p>
        <p className="mt-1 text-xs text-neutral-500">
          Due {formatDue(r.due_at)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(r.id)}
        disabled={pendingId === r.id}
        className="shrink-0 text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        {pendingId === r.id ? '…' : 'Delete'}
      </button>
    </li>
  )
}

function ReminderSection({
  title,
  list,
  accent,
  pendingId,
  onDelete,
}: {
  title: string
  list: ReminderWithDog[]
  accent: 'red' | 'yellow' | 'white'
  pendingId: string | null
  onDelete: (id: string) => void
}) {
  if (list.length === 0) return null
  const border =
    accent === 'red'
      ? 'border-red-500/30'
      : accent === 'yellow'
        ? 'border-yellow-500/25'
        : 'border-white/10'
  const titleColor =
    accent === 'red'
      ? 'text-red-300'
      : accent === 'yellow'
        ? 'text-yellow-200/90'
        : 'text-neutral-200'

  return (
    <section className="space-y-3">
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${titleColor}`}>
        {title}
      </h2>
      <ul className={`space-y-2 rounded-xl border ${border} bg-neutral-900/30 p-3`}>
        {list.map((r) => (
          <ReminderListItem
            key={r.id}
            r={r}
            pendingId={pendingId}
            onDelete={onDelete}
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

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Vaccines, meds, and visits—grouped by urgency.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
        >
          Add reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-white/15 bg-neutral-900/40 px-6 py-16 text-center">
          <p className="text-neutral-400">
            No reminders yet. Add your first reminder!
          </p>
        </div>
      ) : (
        <div className="mt-8 max-w-2xl space-y-8">
          <ReminderSection
            title="Overdue"
            list={grouped.overdue}
            accent="red"
            pendingId={pendingId}
            onDelete={handleDelete}
          />
          <ReminderSection
            title="This week"
            list={grouped.thisWeek}
            accent="yellow"
            pendingId={pendingId}
            onDelete={handleDelete}
          />
          <ReminderSection
            title="Upcoming"
            list={grouped.upcoming}
            accent="white"
            pendingId={pendingId}
            onDelete={handleDelete}
          />
        </div>
      )}

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-reminder-title"
        >
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-900 p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2
                id="add-reminder-title"
                className="text-lg font-semibold text-white"
              >
                Add reminder
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError ? (
              <p className="mb-4 text-sm text-red-400" role="alert">
                {formError}
              </p>
            ) : null}

            <form action={onCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="reminder-dog"
                  className="block text-sm text-neutral-400"
                >
                  Dog
                </label>
                <select
                  id="reminder-dog"
                  name="dog_id"
                  required
                  disabled={formPending || dogs.length === 0}
                  defaultValue={dogs[0]?.id ?? ''}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
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
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.dog_id}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="reminder-type"
                  className="block text-sm text-neutral-400"
                >
                  Type
                </label>
                <select
                  id="reminder-type"
                  name="type"
                  required
                  disabled={formPending}
                  defaultValue="vaccine"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                >
                  {REMINDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.type ? (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.type}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="reminder-title"
                  className="block text-sm text-neutral-400"
                >
                  Title
                </label>
                <input
                  id="reminder-title"
                  name="title"
                  required
                  autoComplete="off"
                  disabled={formPending}
                  placeholder="e.g. Rabies booster"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                />
                {fieldErrors.title ? (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="reminder-due"
                  className="block text-sm text-neutral-400"
                >
                  Due date
                </label>
                <input
                  id="reminder-due"
                  name="due_at"
                  type="datetime-local"
                  required
                  disabled={formPending}
                  defaultValue={defaultDueValue}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:invert"
                />
                {fieldErrors.due_at ? (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.due_at}</p>
                ) : null}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={formPending}
                  className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formPending || dogs.length === 0}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
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
